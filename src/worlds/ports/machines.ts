import type p5 from 'p5'
import { clipBox, outline, solid, teeth } from '../../core/draw'
import { clamp, easeInOutCubic, easeInQuad, easeOutCubic, lerp, seg } from '../../core/ease'
import { ARC_R, ARC_T, ARC_WALL, BY, D, FALL, FALL_V, FLOOR, LIFT_W, PY, ROLL, ROLL_V, TW } from '../lanes'
import { definePort, type Link, type PortMachine } from './types'

/**
 * The port machines. Everything is drawn in units of the cell, y down.
 *
 * Lanes are fixed per kind so any out-port meets any in-port of the same kind
 * on the shared edge without negotiation:
 *   ball, sideways  — rolling on the floor, centre at BY, at ROLL_V
 *   ball, vertical  — falling down the middle, x = 0, at FALL_V
 *   push            — a rod or a toppling bar at PY
 *   shaft           — a gear centred in the cell whose teeth reach the edge
 *
 * A ball is drawn by whichever cell it is in, and a ball is a quarter of a
 * cell wide, so each machine draws its ball from a little before it arrives to
 * a little after it leaves, extending the path straight past the edge. The
 * clip keeps each cell to its own side of the seam, and because both sides
 * move the ball at the same speed there, the two halves line up.
 */
const GR = 0.42
const GT = 0.08
export const GN = 8
const LEAD = 0.02
const TAIL = 0.02

/** u with the end of the loop folded to just below zero, for the lead-in. */
const near = (u: number) => (u > 0.5 ? u - 1 : u)
/** Unclamped progress through [a, b]. */
const lin = (u: number, a: number, b: number) => (u - a) / (b - a)

/**
 * A fall from rest that leaves the edge at FALL_V: a parabola over `dist`
 * cells, then straight on at the exit speed. Returns [time it takes, y at f].
 */
const dropTime = (dist: number) => (2 * dist) / FALL_V
const drop = (from: number, dist: number, f: number) =>
  f <= 1 ? from + dist * f * f : from + dist + 2 * dist * (f - 1)

type Ctx = { size: number; u: number; ink: string; weight: number; w: number; h: number }
type Pt = [number, number]

function ball(p: p5, link: Link, k: number, ink: string, weight: number, [x, y]: Pt): void {
  solid(p, ink, weight, link.ball)
  p.circle(x * k, y * k, D * k)
}

/** Draw the ball along `path(u)` while u is inside [-LEAD, tOut + TAIL]. */
function rolling(p: p5, s: { link: Link }, c: Ctx, tOut: number, path: (u: number) => Pt): void {
  const u = near(c.u)
  if (u >= -LEAD && u <= tOut + TAIL) ball(p, s.link, c.size, c.ink, c.weight, path(u))
}

const floorLine = (p: p5, k: number, x1: number, x2: number, y = FLOOR) =>
  p.line(x1 * k, y * k, x2 * k, y * k)
const wall = (p: p5, k: number, x: number, y1: number, y2: number) => p.line(x * k, y1 * k, x * k, y2 * k)

/** A gear at the cell centre, turned to `angle`. */
function gear(p: p5, k: number, ink: string, weight: number, angle: number, spokes = 3): void {
  p.push()
  p.rotate(angle)
  outline(p, ink, weight)
  p.circle(0, 0, GR * 2 * k)
  teeth(p, GR * k, GN, GT * k)
  for (let i = 0; i < spokes; i++) {
    p.line(0, 0, GR * 0.8 * k, 0)
    p.rotate((Math.PI * 2) / spokes)
  }
  p.pop()
}

const gearAngle = (link: Link, u: number) => (link.drive ? link.spin * link.drive(u) : 0) + link.mesh

/** Stacked balls resting in a tube from the top edge. */
const MAG_Y = -0.02
const MAG_T = dropTime(0.5 - MAG_Y)

/**
 * A hopper of balls: a funnel from the top edge necking into a short tube.
 * The bottom ball drops out at `release`; the column shifts down after it and
 * a fresh ball comes in under the clip, so the supply never visibly pops into
 * existence.
 */
function magazine(p: p5, link: Link, c: Ctx, release: number): void {
  const k = c.size
  outline(p, c.ink, c.weight)
  p.line(-0.34 * k, -0.5 * k, -TW * k, -0.14 * k)
  p.line(0.34 * k, -0.5 * k, TW * k, -0.14 * k)
  wall(p, k, -TW, -0.14, 0.1)
  wall(p, k, TW, -0.14, 0.1)
  p.line(-TW * k, 0.1 * k, -0.06 * k, 0.1 * k)
  p.line(TW * k, 0.1 * k, 0.06 * k, 0.1 * k)

  const u = c.u
  if (u >= release && u < release + 0.16) {
    if (u < release + MAG_T + TAIL) {
      ball(p, link, k, c.ink, c.weight, [0, drop(MAG_Y, 0.5 - MAG_Y, lin(u, release, release + MAG_T))])
    }
    const shift = easeOutCubic(seg(u, release + 0.02, release + 0.16))
    for (let i = 0; i < 3; i++) ball(p, link, k, c.ink, c.weight, [0, MAG_Y - D * (i + 1) + D * shift])
  } else {
    for (let i = 0; i < 3; i++) ball(p, link, k, c.ink, c.weight, [0, MAG_Y - D * i])
  }
}

/** A magazine that lets one ball go at the start of every loop. */
export const hopper = definePort({
  name: 'hopper',
  label: 'Hopper',
  source: 3,
  ins: [],
  outs: [{ side: 'S', kind: 'ball', t: MAG_T }],
  setup: ({ color }) => ({ color }),
  draw: (p, s, c) => clipBox(p, c.w, c.h, () => magazine(p, s.link, c, 0)),
})

/** A magazine held shut by a catch; a push from the side trips it. */
export const latch = definePort({
  name: 'latch',
  label: 'Latch',
  ins: [{ side: 'W', kind: 'push', t: 0 }],
  outs: [{ side: 'S', kind: 'ball', t: 0.03 + MAG_T }],
  setup: ({ color }) => ({ color }),
  draw: (p, s, c) => {
    const k = c.size
    // The catch slides in under the push and springs back once the ball is away.
    const slide = 0.09 * (easeOutCubic(seg(c.u, 0, 0.04)) - easeInOutCubic(seg(c.u, 0.2, 0.35)))
    clipBox(p, c.w, c.h, () => magazine(p, s.link, c, 0.03))
    solid(p, c.ink, c.weight, s.color)
    p.rect((-0.29 + slide) * k, PY * k, 0.2 * k, 0.07 * k)
    outline(p, c.ink, c.weight)
    p.line((-0.19 + slide) * k, (PY + 0.035) * k, (-0.19 + slide) * k, 0.1 * k)
  },
})

/** A flat rail. The cheapest way to carry a ball one cell along. */
export const roll = definePort({
  name: 'roll',
  label: 'Rail',
  ins: [{ side: 'W', kind: 'ball', t: 0 }],
  outs: [{ side: 'E', kind: 'ball', t: ROLL }],
  setup: ({ color }) => ({ color }),
  draw: (p, s, c) => {
    const k = c.size
    clipBox(p, c.w, c.h, () => {
      outline(p, c.ink, c.weight)
      floorLine(p, k, -0.5, 0.5)
      wall(p, k, 0, FLOOR, 0.5)
      rolling(p, s, c, ROLL, (u) => [-0.5 + u * ROLL_V, BY])
    })
  },
})

/** A belt between two rollers, running the ball's way. */
export const conveyor = definePort({
  name: 'conveyor',
  label: 'Conveyor',
  ins: [{ side: 'W', kind: 'ball', t: 0 }],
  outs: [{ side: 'E', kind: 'ball', t: ROLL }],
  setup: ({ color }) => ({ color }),
  draw: (p, s, c) => {
    const k = c.size
    const r = 0.08
    clipBox(p, c.w, c.h, () => {
      outline(p, c.ink, c.weight)
      floorLine(p, k, -0.3, 0.3)
      floorLine(p, k, -0.3, 0.3, FLOOR + r * 2)
      for (const x of [-0.3, 0.3]) {
        p.push()
        p.translate(x * k, (FLOOR + r) * k)
        p.rotate(c.u * Math.PI * 2 * 3)
        outline(p, c.ink, c.weight)
        p.circle(0, 0, r * 2 * k)
        p.line(-r * k, 0, r * k, 0)
        p.line(0, -r * k, 0, r * k)
        p.pop()
      }
      // Short rails in and out so the belt joins the neighbours' floors.
      floorLine(p, k, -0.5, -0.3)
      floorLine(p, k, 0.3, 0.5)
      rolling(p, s, c, ROLL, (u) => [-0.5 + u * ROLL_V, BY])
    })
  },
})

const LAND_T1 = 0.5 / FALL_V
const LAND_T2 = LAND_T1 + ARC_T
const LAND_T3 = LAND_T2 + (0.5 - ARC_R) / ROLL_V

/** A quarter-pipe: the ball falls in from above and is turned onto the floor. */
export const landing = definePort({
  name: 'landing',
  label: 'Landing',
  ins: [{ side: 'N', kind: 'ball', t: 0 }],
  outs: [{ side: 'E', kind: 'ball', t: LAND_T3 }],
  setup: ({ color }) => ({ color }),
  draw: (p, s, c) => {
    const k = c.size
    clipBox(p, c.w, c.h, () => {
      outline(p, c.ink, c.weight)
      wall(p, k, -TW, -0.5, 0)
      wall(p, k, TW, -0.5, -0.14)
      p.arc(ARC_R * k, 0, ARC_WALL * 2 * k, ARC_WALL * 2 * k, Math.PI / 2, Math.PI)
      floorLine(p, k, ARC_R, 0.5)
      rolling(p, s, c, LAND_T3, (u) => {
        if (u < LAND_T1) return [0, -0.5 + u * FALL_V]
        if (u < LAND_T2) {
          const a = Math.PI - (Math.PI / 2) * lin(u, LAND_T1, LAND_T2)
          return [ARC_R + ARC_R * Math.cos(a), ARC_R * Math.sin(a)]
        }
        return [ARC_R + (u - LAND_T2) * ROLL_V, BY]
      })
    })
  },
})

const DROP_X = -0.1
const DROP_T1 = (DROP_X + 0.5) / ROLL_V
const DROP_T2 = DROP_T1 + dropTime(0.5 - BY)

/** The floor stops short and the ball goes over the edge into a chute. */
export const dropoff = definePort({
  name: 'dropoff',
  label: 'Drop',
  ins: [{ side: 'W', kind: 'ball', t: 0 }],
  outs: [{ side: 'S', kind: 'ball', t: DROP_T2 }],
  setup: ({ color }) => ({ color }),
  draw: (p, s, c) => {
    const k = c.size
    clipBox(p, c.w, c.h, () => {
      outline(p, c.ink, c.weight)
      floorLine(p, k, -0.5, -TW)
      wall(p, k, -TW, FLOOR, 0.5)
      wall(p, k, TW, 0.12, 0.5)
      rolling(p, s, c, DROP_T2, (u) => {
        if (u < DROP_T1) return [-0.5 + u * ROLL_V, BY]
        const f = lin(u, DROP_T1, DROP_T2)
        return [lerp(DROP_X, 0, clamp(f)), drop(BY, 0.5 - BY, f)]
      })
    })
  },
})

/** A vertical tube. */
export const fall = definePort({
  name: 'fall',
  label: 'Tube',
  ins: [{ side: 'N', kind: 'ball', t: 0 }],
  outs: [{ side: 'S', kind: 'ball', t: FALL }],
  setup: ({ color }) => ({ color }),
  draw: (p, s, c) => {
    const k = c.size
    clipBox(p, c.w, c.h, () => {
      outline(p, c.ink, c.weight)
      wall(p, k, -TW, -0.5, 0.5)
      wall(p, k, TW, -0.5, 0.5)
      p.line(-0.2 * k, 0, -TW * k, 0)
      p.line(TW * k, 0, 0.2 * k, 0)
      rolling(p, s, c, FALL, (u) => [0, -0.5 + u * FALL_V])
    })
  },
})

const LIFT_IN = 0.5 / ROLL_V
const LIFT_UP = 0.3
const LIFT_OUT = LIFT_UP + 0.5 / ROLL_V

/**
 * A two-cell elevator: the ball rolls onto the car at the bottom, rides up,
 * and rolls off at the top. The only way a ball gains height, so the only way
 * a chain can climb back through the grid.
 */
export const lift = definePort({
  name: 'lift',
  label: 'Lift',
  span: [1, 2],
  ins: [{ side: 'W', kind: 'ball', t: 0, cell: [0, 1] }],
  outs: [{ side: 'E', kind: 'ball', t: LIFT_OUT, cell: [0, 0] }],
  setup: ({ color }) => ({ color }),
  draw: (p, s, c) => {
    const k = c.size
    const lowY = 0.5 + BY
    const highY = -0.5 + BY
    const u = near(c.u)
    const carY =
      u < LIFT_IN ? lowY
      : u < LIFT_UP - 0.02 ? lerp(lowY, highY, easeInOutCubic(seg(u, LIFT_IN, LIFT_UP - 0.02)))
      : u < LIFT_OUT + 0.04 ? highY
      : lerp(highY, lowY, easeInOutCubic(seg(u, LIFT_OUT + 0.04, LIFT_OUT + 0.34)))

    clipBox(p, c.w, c.h, () => {
      outline(p, c.ink, c.weight)
      // The shaft, with a gap at the bottom left and the top right for the ball.
      wall(p, k, -LIFT_W, -0.9, 0.5 + FLOOR - D - 0.05)
      wall(p, k, LIFT_W, -0.9, -0.5 + FLOOR - D - 0.05)
      wall(p, k, LIFT_W, -0.5 + FLOOR, 0.5 + FLOOR)
      floorLine(p, k, -0.5, -LIFT_W, 0.5 + FLOOR)
      floorLine(p, k, LIFT_W, 0.5, -0.5 + FLOOR)
      p.circle(0, -0.9 * k, 0.16 * k)
      p.line(0, -0.82 * k, 0, (carY - D / 2 - 0.08) * k)
      rolling(p, s, c, LIFT_OUT, (u) => {
        if (u < LIFT_IN) return [-0.5 + u * ROLL_V, lowY]
        if (u < LIFT_UP) return [0, carY]
        return [(u - LIFT_UP) * ROLL_V, highY]
      })
      // The car: a platform under the ball with an open frame around it.
      outline(p, c.ink, c.weight)
      p.rect(0, (carY - 0.04) * k, 0.38 * k, (D + 0.08) * k)
      solid(p, c.ink, c.weight, s.color)
      p.rect(0, (carY + D / 2 + 0.03) * k, 0.38 * k, 0.06 * k)
    })
  },
})

/** Kick-driven rotation: one full turn that spins up fast and coasts to rest. */
const KICK = {
  drive: (u: number) => Math.PI * 2 * easeOutCubic(seg(u, 0.02, 0.5)),
  camAt: 0.12,
}

/** Steady rotation: one turn per loop. */
export const STEADY = {
  drive: (u: number) => Math.PI * 2 * u,
  camAt: 0.5,
}

/**
 * A paddle wheel in a toothed rim. The falling ball spins it, and the rim
 * meshes with whatever gear sits beside it — the converter from ball to shaft.
 */
export const paddle = definePort({
  name: 'paddle',
  label: 'Paddle Wheel',
  ins: [{ side: 'N', kind: 'ball', t: 0 }],
  outs: [
    { side: 'S', kind: 'ball', t: FALL },
    { side: 'E', kind: 'shaft', t: 0 },
  ],
  driver: KICK,
  setup: ({ color }) => ({ color }),
  draw: (p, s, c) => {
    const k = c.size
    clipBox(p, c.w, c.h, () => rolling(p, s, c, FALL, (u) => [0, -0.5 + u * FALL_V]))
    gear(p, k, c.ink, c.weight, gearAngle(s.link, c.u), 0)
    p.push()
    p.rotate(s.link.spin * (s.link.drive?.(c.u) ?? 0))
    for (let i = 0; i < 4; i++) {
      solid(p, c.ink, c.weight, s.color)
      p.rect(0.2 * k, 0, 0.26 * k, 0.09 * k)
      p.rotate(Math.PI / 2)
    }
    p.pop()
    solid(p, c.ink, c.weight, s.color)
    p.circle(0, 0, 0.1 * k)
  },
})

/** Four sails in a toothed rim, turning all the time. The steady shaft source. */
export const windmill = definePort({
  name: 'windmill',
  label: 'Windmill',
  source: 1,
  ins: [],
  outs: [{ side: 'E', kind: 'shaft', t: 0 }],
  driver: STEADY,
  setup: ({ color }) => ({ color }),
  draw: (p, s, c) => {
    const k = c.size
    gear(p, k, c.ink, c.weight, gearAngle(s.link, c.u), 0)
    p.push()
    p.rotate(s.link.spin * (s.link.drive?.(c.u) ?? 0))
    for (let i = 0; i < 4; i++) {
      solid(p, c.ink, c.weight, s.color)
      p.beginShape()
      p.vertex(0.06 * k, 0)
      p.vertex(0.34 * k, -0.11 * k)
      p.vertex(0.34 * k, 0.06 * k)
      p.endShape(p.CLOSE)
      p.rotate(Math.PI / 2)
    }
    p.pop()
    solid(p, c.ink, c.weight, s.color)
    p.circle(0, 0, 0.1 * k)
  },
})

const SIDES = ['N', 'E', 'S', 'W'] as const

/** A plain gear. Takes rotation in on any side and passes it on through one other. */
export const gearWheel = definePort({
  name: 'gear',
  label: 'Gear',
  mirror: false,
  ins: SIDES.map((side) => ({ side, kind: 'shaft' as const, t: 0 })),
  outs: SIDES.map((side) => ({ side, kind: 'shaft' as const, t: 0 })),
  pickOne: true,
  setup: ({ color }) => ({ color }),
  draw: (p, s, c) => {
    const k = c.size
    gear(p, k, c.ink, c.weight, gearAngle(s.link, c.u))
    solid(p, c.ink, c.weight, s.color)
    p.circle(0, 0, 0.12 * k)
  },
})

/** Where the follower's tip rests on the rim. */
const CAM_X = Math.sqrt(GR * GR - PY * PY)
const CAM_A = Math.atan2(PY, CAM_X)

/**
 * A pin on a gear's rim flicks a follower rod out through the east edge once
 * per turn — the converter from shaft to push.
 */
export const cam = definePort({
  name: 'cam',
  label: 'Cam',
  ins: [{ side: 'W', kind: 'shaft', t: 0 }],
  outs: [{ side: 'E', kind: 'push', t: (s: { link: Link }) => s.link.camAt }],
  setup: ({ color }) => ({ color }),
  draw: (p, s, c) => {
    const k = c.size
    const { link } = s
    const drive = link.drive ?? (() => 0)
    // Start the pin so it meets the follower exactly when the train says a cam should trip.
    const a0 = CAM_A - link.spin * drive(link.camAt)
    const pin = a0 + link.spin * drive(c.u)
    let delta = (pin - CAM_A) % (Math.PI * 2)
    if (delta > Math.PI) delta -= Math.PI * 2
    if (delta < -Math.PI) delta += Math.PI * 2
    const nearPin = clamp(1 - Math.abs(delta) / 0.45)
    const ext = 0.12 * nearPin * nearPin * (3 - 2 * nearPin)

    gear(p, k, c.ink, c.weight, gearAngle(link, c.u))
    solid(p, c.ink, c.weight, s.color)
    p.circle(Math.cos(pin) * GR * k, Math.sin(pin) * GR * k, 0.13 * k)
    p.circle(0, 0, 0.12 * k)

    outline(p, c.ink, c.weight)
    p.line(0.46 * k, (PY - 0.07) * k, 0.46 * k, (PY + 0.07) * k)
    solid(p, c.ink, c.weight, s.color)
    p.rect((CAM_X + 0.05 + ext) * k, PY * k, 0.2 * k, 0.06 * k)
    p.circle((CAM_X + 0.15 + ext) * k, PY * k, 0.06 * k)
  },
})

const DOM_H = 0.32
const DOM_W = 0.08
const DOM_FALL = 0.065
const DOM_REST = 0.85
const DOM_X0 = -0.36
/** Time for a ball from the top edge to land on the first bar. */
const DOM_LAND = (FLOOR - DOM_H - D / 2 + 0.5) / FALL_V

/**
 * A row of bars. Pushed at the west edge — or hit by a ball dropped on the
 * first bar — they go over in sequence and the last one falls out through the
 * east. A dropped ball rests beside the row until the reset, when a trapdoor
 * lets it out. The converter from ball to push.
 */
export const dominoes = definePort({
  name: 'dominoes',
  label: 'Dominoes',
  ins: [
    { side: 'W', kind: 'push', t: 0 },
    { side: 'N', kind: 'ball', t: 0 },
  ],
  outs: [{ side: 'E', kind: 'push', t: (s: { tOut: number; link: Link }) => s.tOut + (s.link.inSide === 'N' ? DOM_LAND : 0) }],
  setup: ({ color, rng }) => {
    const count = rng.pick([5, 6])
    const gap = 0.7 / (count - 1)
    const contact = Math.asin(clamp(gap / DOM_H, 0, 1))
    const lead = Math.sqrt(clamp(contact / DOM_REST, 0, 1))
    return { color, count, gap, lead, tOut: (count - 1) * lead * DOM_FALL + DOM_FALL * 0.9 }
  },
  draw: (p, s, c) => {
    const k = c.size
    const byBall = s.link.inSide === 'N'
    const start0 = byBall ? DOM_LAND : 0
    const u = near(c.u)

    clipBox(p, c.w, c.h, () => {
      outline(p, c.ink, c.weight)
      floorLine(p, k, -0.5, 0.5)
      if (byBall) {
        // Fall onto the first bar, roll off it as it tips, rest, then leave
        // through the trapdoor just before the bars stand back up.
        const restX = DOM_X0 - D / 2 - 0.01
        const restY = BY
        let pos: Pt | null = null
        if (u >= -LEAD && u < DOM_LAND) pos = [DOM_X0, -0.5 + u * FALL_V]
        else if (u < DOM_LAND + DOM_FALL) {
          const f = easeInQuad(seg(u, DOM_LAND, DOM_LAND + DOM_FALL))
          pos = [lerp(DOM_X0, restX, f), lerp(FLOOR - DOM_H - D / 2, restY, f)]
        } else if (u < 0.6) pos = [restX, restY]
        else if (u < 0.66) pos = [restX, drop(restY, 0.5 - restY, lin(u, 0.6, 0.64))]
        if (pos) ball(p, s.link, k, c.ink, c.weight, pos)
        // The trapdoor swings down and shuts again.
        const open = easeOutCubic(seg(u, 0.6, 0.64)) - easeInOutCubic(seg(u, 0.68, 0.76))
        p.push()
        p.translate((restX + 0.14) * k, FLOOR * k)
        p.rotate(open * 1.3)
        outline(p, c.ink, c.weight)
        p.line(0, 0, -0.28 * k, 0)
        p.pop()
      }
      for (let i = 0; i < s.count; i++) {
        const x = DOM_X0 + s.gap * i
        const last = i === s.count - 1
        const start = start0 + i * s.lead * DOM_FALL
        const fallen = easeInQuad(seg(c.u, start, start + DOM_FALL))
        const riseAt = 0.7 + (s.count - 1 - i) * 0.03
        const rise = easeInOutCubic(seg(c.u, riseAt, riseAt + 0.1))
        p.push()
        p.translate(x * k, FLOOR * k)
        p.rotate((last ? 1 : DOM_REST) * fallen * (1 - rise))
        solid(p, c.ink, c.weight, s.color)
        p.rect(0, (-DOM_H / 2) * k, DOM_W * k, DOM_H * k)
        p.pop()
      }
    })
  },
})

/** A bell with a striker arm: the push from the west swings the arm into it. */
export const bell = definePort({
  name: 'bell',
  label: 'Bell',
  ins: [{ side: 'W', kind: 'push', t: 0 }],
  outs: [],
  setup: ({ color }) => ({ color }),
  draw: (p, s, c) => {
    const k = c.size
    const hit = 1 - seg(c.u, 0, 0.14)
    const swing = hit * 0.3 * Math.sin(hit * Math.PI * 4)
    const arm = 0.5 * (easeOutCubic(seg(c.u, 0, 0.03)) - easeInOutCubic(seg(c.u, 0.08, 0.2)))
    const bw = 0.4
    const bh = 0.3

    outline(p, c.ink, c.weight)
    p.line(-0.5 * k, -0.5 * k, 0.5 * k, -0.5 * k)
    floorLine(p, k, -0.5, 0.5)
    if (hit > 0.02) {
      p.push()
      p.stroke(s.color)
      p.noFill()
      for (let i = 1; i <= 2; i++) {
        const r = bw * (0.9 + i * 0.3 + hit * 0.2) * k
        p.arc(bw * 0.4 * k, -0.15 * k, r, r, -0.5, 0.5)
      }
      p.pop()
    }
    p.push()
    p.translate(0.02 * k, -0.5 * k)
    p.rotate(swing)
    outline(p, c.ink, c.weight)
    p.line(0, 0, 0, 0.1 * k)
    p.translate(0, 0.1 * k)
    p.fill(s.color)
    p.beginShape()
    p.vertex((-bw / 2) * k, bh * k)
    p.bezierVertex((-bw / 2) * k, 0, -bw * 0.22 * k, 0, 0, 0)
    p.bezierVertex(bw * 0.22 * k, 0, (bw / 2) * k, 0, (bw / 2) * k, bh * k)
    p.endShape(p.CLOSE)
    p.line((-bw / 2) * k, bh * k, (bw / 2) * k, bh * k)
    p.circle(0, (bh + 0.05) * k, 0.1 * k)
    p.pop()

    // The striker: pushed at the floor, it pivots up into the bell's lip.
    p.push()
    p.translate(-0.3 * k, FLOOR * k)
    p.rotate(arm)
    outline(p, c.ink, c.weight)
    p.line(0, 0, 0, -0.42 * k)
    solid(p, c.ink, c.weight, s.color)
    p.circle(0, -0.42 * k, 0.1 * k)
    p.pop()
    outline(p, c.ink, c.weight)
    p.line(-0.3 * k, FLOOR * k, -0.3 * k, (FLOOR - PY) * k)
  },
})

const CUP_IN = (0.5 - 0.28) / ROLL_V
const CUP_DROP = (0.16 + 0.5) / FALL_V

/** A cup that keeps whatever rolls or drops into it. */
export const cup = definePort({
  name: 'cup',
  label: 'Cup',
  ins: [
    { side: 'W', kind: 'ball', t: 0 },
    { side: 'N', kind: 'ball', t: 0 },
  ],
  outs: [],
  setup: ({ color }) => ({ color }),
  draw: (p, s, c) => {
    const k = c.size
    const u = near(c.u)
    clipBox(p, c.w, c.h, () => {
      outline(p, c.ink, c.weight)
      if (s.link.inSide === 'W') {
        floorLine(p, k, -0.5, -0.22)
        if (u >= -LEAD && u < CUP_IN) ball(p, s.link, k, c.ink, c.weight, [-0.5 + u * ROLL_V, BY])
        else if (u >= CUP_IN && u < CUP_IN + 0.04) {
          const f = seg(u, CUP_IN, CUP_IN + 0.04)
          ball(p, s.link, k, c.ink, c.weight, [lerp(-0.28, -0.05, f), lerp(BY, 0.18, f * f)])
        }
      } else if (u >= -LEAD && u < CUP_DROP + 0.03) {
        const y = u < CUP_DROP ? -0.5 + u * FALL_V : 0.16 - 0.05 * Math.sin(lin(u, CUP_DROP, CUP_DROP + 0.03) * Math.PI)
        ball(p, s.link, k, c.ink, c.weight, [0, y])
      }
      solid(p, c.ink, c.weight, s.color)
      p.rect(0, 0.19 * k, 0.44 * k, 0.3 * k)
      outline(p, c.ink, c.weight)
      floorLine(p, k, -0.22, 0.22, 0.5)
    })
  },
})

export const portMachines: PortMachine<any>[] = [
  hopper,
  latch,
  roll,
  conveyor,
  landing,
  dropoff,
  fall,
  lift,
  paddle,
  windmill,
  gearWheel,
  cam,
  dominoes,
  bell,
  cup,
]
