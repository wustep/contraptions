import type p5 from 'p5'
import { clipBox, outline, solid, teeth } from '../../core/draw'
import { clamp, easeInOutCubic, easeInQuad, easeOutCubic, lerp, seg } from '../../core/ease'
import { BY, D, FLOOR, PY } from '../lanes'
import { definePort, type Link, type PortMachine } from './types'

/**
 * The port machines. Everything is drawn in units of the cell, y down.
 *
 * Lanes are fixed per kind so any out-port meets any in-port of the same kind
 * on the shared edge without negotiation:
 *   ball, sideways  — rolling on the floor, centre at BY
 *   ball, vertical  — falling down the middle, x = 0
 *   push            — a rod or a toppling bar at PY
 *   shaft           — a gear centred in the cell whose teeth reach the edge
 */
export { BY, D, FLOOR, PY }
const GR = 0.42
const GT = 0.08
export const GN = 8
/** Loop fraction to roll across one cell, and to fall through one. */
const ROLL = 0.1
const FALL = 0.06
/**
 * Phases are whole frames, so a machine's u can land a hair past its exit time
 * on the very frame the neighbour takes over. Keep drawing that little longer,
 * or the ball loses half of itself for a frame at every seam.
 */
const EPS = 0.006

type Ctx = { size: number; u: number; ink: string; weight: number; w: number; h: number }

function ball(p: p5, link: Link, k: number, ink: string, weight: number, x: number, y: number): void {
  solid(p, ink, weight, link.ball)
  p.circle(x * k, y * k, D * k)
}

function floorLine(p: p5, k: number, x1: number, x2: number, y = FLOOR): void {
  p.line(x1 * k, y * k, x2 * k, y * k)
}

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

/**
 * A magazine of balls in a tube from the top edge. The bottom ball drops out at
 * `release`; the column shifts down after it and a fresh ball comes in under
 * the clip, so the supply never visibly pops into existence.
 */
function magazine(p: p5, link: Link, c: Ctx, release: number): void {
  const k = c.size
  const y0 = -0.02
  outline(p, c.ink, c.weight)
  p.line(-0.16 * k, -0.5 * k, -0.16 * k, 0.1 * k)
  p.line(0.16 * k, -0.5 * k, 0.16 * k, 0.1 * k)
  p.line(-0.16 * k, 0.1 * k, -0.07 * k, 0.1 * k)
  p.line(0.16 * k, 0.1 * k, 0.07 * k, 0.1 * k)

  const u = c.u
  if (u >= release && u < release + 0.16) {
    const fall = easeInQuad(seg(u, release, release + FALL))
    if (u < release + FALL + EPS) ball(p, link, k, c.ink, c.weight, 0, lerp(y0, 0.5, fall))
    const shift = easeOutCubic(seg(u, release + 0.02, release + 0.16))
    for (let i = 0; i < 3; i++) ball(p, link, k, c.ink, c.weight, 0, y0 - D * (i + 1) + D * shift)
  } else {
    for (let i = 0; i < 3; i++) ball(p, link, k, c.ink, c.weight, 0, y0 - D * i)
  }
}

/** A magazine that lets one ball go at the start of every loop. */
export const hopper = definePort({
  name: 'hopper',
  label: 'Hopper',
  source: 3,
  ins: [],
  outs: [{ side: 'S', kind: 'ball', t: FALL }],
  setup: ({ color }) => ({ color }),
  draw: (p, s, c) => clipBox(p, c.w, c.h, () => magazine(p, s.link, c, 0)),
})

/** A magazine held shut by a latch; a push from the side trips it. */
export const latch = definePort({
  name: 'latch',
  label: 'Latch',
  ins: [{ side: 'W', kind: 'push', t: 0 }],
  outs: [{ side: 'S', kind: 'ball', t: 0.03 + FALL }],
  setup: ({ color }) => ({ color }),
  draw: (p, s, c) => {
    const k = c.size
    // The catch slides in under the push and springs back once the ball is away.
    const slide = 0.08 * (easeOutCubic(seg(c.u, 0, 0.04)) - easeInOutCubic(seg(c.u, 0.2, 0.35)))
    clipBox(p, c.w, c.h, () => magazine(p, s.link, c, 0.03))
    solid(p, c.ink, c.weight, s.color)
    p.rect((-0.27 + slide) * k, PY * k, 0.2 * k, 0.07 * k)
    outline(p, c.ink, c.weight)
    p.line(-0.17 * k, (PY + 0.035) * k, -0.17 * k, 0.1 * k)
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
      p.line(-0.3 * k, FLOOR * k, -0.3 * k, 0.5 * k)
      p.line(0.3 * k, FLOOR * k, 0.3 * k, 0.5 * k)
      if (c.u <= ROLL + EPS) ball(p, s.link, k, c.ink, c.weight, lerp(-0.5, 0.5, clamp(c.u / ROLL)), BY)
    })
  },
})

/** A belt between two rollers, running the ball's way. */
export const conveyor = definePort({
  name: 'conveyor',
  label: 'Conveyor',
  ins: [{ side: 'W', kind: 'ball', t: 0 }],
  outs: [{ side: 'E', kind: 'ball', t: 0.12 }],
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
        p.rotate(c.u * Math.PI * 2 * 6)
        outline(p, c.ink, c.weight)
        p.circle(0, 0, r * 2 * k)
        p.line(-r * k, 0, r * k, 0)
        p.line(0, -r * k, 0, r * k)
        p.pop()
      }
      // Ramps in and out so the belt joins the neighbours' floors.
      floorLine(p, k, -0.5, -0.3)
      floorLine(p, k, 0.3, 0.5)
      if (c.u <= 0.12 + EPS) ball(p, s.link, k, c.ink, c.weight, lerp(-0.5, 0.5, clamp(c.u / 0.12)), BY)
    })
  },
})

/** A quarter-pipe: the ball falls in from above and is turned onto the floor. */
export const landing = definePort({
  name: 'landing',
  label: 'Landing',
  ins: [{ side: 'N', kind: 'ball', t: 0 }],
  outs: [{ side: 'E', kind: 'ball', t: 0.09 }],
  setup: ({ color }) => ({ color }),
  draw: (p, s, c) => {
    const k = c.size
    const R = 0.22
    clipBox(p, c.w, c.h, () => {
      outline(p, c.ink, c.weight)
      p.line(-0.12 * k, -0.5 * k, -0.12 * k, 0)
      p.arc(R * k, 0, (R + D / 2) * 2 * k, (R + D / 2) * 2 * k, Math.PI / 2, Math.PI)
      floorLine(p, k, R, 0.5)
      const u = c.u
      if (u <= 0.09 + EPS) {
        let x = 0
        let y = 0
        if (u < 0.03) {
          y = lerp(-0.5, 0, u / 0.03)
        } else if (u < 0.065) {
          // Ball centre sweeps a quarter circle about (R, 0), from (0, 0) to (R, R).
          const a = Math.PI - (Math.PI / 2) * seg(u, 0.03, 0.065)
          x = R + R * Math.cos(a)
          y = R * Math.sin(a)
        } else {
          x = lerp(R, 0.5, seg(u, 0.065, 0.09))
          y = R
        }
        ball(p, s.link, k, c.ink, c.weight, x, y)
      }
    })
  },
})

/** The floor stops short and the ball goes over the edge. */
export const dropoff = definePort({
  name: 'dropoff',
  label: 'Drop',
  ins: [{ side: 'W', kind: 'ball', t: 0 }],
  outs: [{ side: 'S', kind: 'ball', t: 0.09 }],
  setup: ({ color }) => ({ color }),
  draw: (p, s, c) => {
    const k = c.size
    clipBox(p, c.w, c.h, () => {
      outline(p, c.ink, c.weight)
      floorLine(p, k, -0.5, -0.06)
      p.line(-0.06 * k, FLOOR * k, -0.06 * k, (FLOOR + 0.08) * k)
      p.line(-0.32 * k, FLOOR * k, -0.32 * k, 0.5 * k)
      const u = c.u
      if (u <= 0.09 + EPS) {
        if (u < 0.044) {
          ball(p, s.link, k, c.ink, c.weight, lerp(-0.5, -0.06, u / 0.044), BY)
        } else {
          const f = seg(u, 0.044, 0.09)
          ball(p, s.link, k, c.ink, c.weight, lerp(-0.06, 0, f), lerp(BY, 0.5, easeInQuad(f)))
        }
      }
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
      p.line(-0.17 * k, -0.5 * k, -0.17 * k, 0.5 * k)
      p.line(0.17 * k, -0.5 * k, 0.17 * k, 0.5 * k)
      p.line(-0.24 * k, 0, -0.17 * k, 0)
      p.line(0.17 * k, 0, 0.24 * k, 0)
      if (c.u <= FALL + EPS) ball(p, s.link, k, c.ink, c.weight, 0, lerp(-0.5, 0.5, clamp(c.u / FALL)))
    })
  },
})

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
  outs: [{ side: 'E', kind: 'ball', t: 0.34, cell: [0, 0] }],
  setup: ({ color }) => ({ color }),
  draw: (p, s, c) => {
    const k = c.size
    const lowY = 0.5 + BY
    const highY = -0.5 + BY
    const u = c.u
    let bx = 0
    let by = lowY
    let carY = lowY
    if (u < 0.05) {
      bx = lerp(-0.5, 0, u / 0.05)
    } else if (u < 0.28) {
      by = lerp(lowY, highY, easeInOutCubic(seg(u, 0.05, 0.28)))
      carY = by
    } else if (u < 0.34) {
      bx = lerp(0, 0.5, seg(u, 0.28, 0.34))
      by = highY
      carY = highY
    } else {
      carY = lerp(highY, lowY, easeInOutCubic(seg(u, 0.36, 0.62)))
    }

    clipBox(p, c.w, c.h, () => {
      outline(p, c.ink, c.weight)
      p.line(-0.26 * k, -0.9 * k, -0.26 * k, (0.5 + FLOOR) * k)
      p.line(0.26 * k, -0.9 * k, 0.26 * k, (0.5 + FLOOR) * k)
      floorLine(p, k, -0.5, -0.2, 0.5 + FLOOR)
      floorLine(p, k, 0.2, 0.5, -0.5 + FLOOR)
      p.circle(0, -0.9 * k, 0.14 * k)
      p.line(0, -0.83 * k, 0, (carY - 0.2) * k)
      if (u <= 0.34 + EPS) ball(p, s.link, k, c.ink, c.weight, bx, by)
      // The car is an open frame, so the ball shows through it.
      outline(p, c.ink, c.weight)
      p.rect(0, (carY - 0.075) * k, 0.36 * k, 0.25 * k)
      solid(p, c.ink, c.weight, s.color)
      p.rect(0, (carY + 0.15) * k, 0.36 * k, 0.06 * k)
    })
  },
})

/** Kick-driven rotation: one full turn that spins up fast and coasts to rest. */
const KICK = {
  drive: (u: number) => Math.PI * 2 * easeOutCubic(seg(u, 0.03, 0.5)),
  camAt: 0.14,
}

/** Steady rotation: one turn per loop. */
const STEADY = {
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
    { side: 'S', kind: 'ball', t: 0.1 },
    { side: 'E', kind: 'shaft', t: 0 },
  ],
  driver: KICK,
  setup: ({ color }) => ({ color }),
  draw: (p, s, c) => {
    const k = c.size
    clipBox(p, c.w, c.h, () => {
      if (c.u <= 0.1 + EPS) ball(p, s.link, k, c.ink, c.weight, 0, lerp(-0.5, 0.5, clamp(c.u / 0.1)))
    })
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

/** A plain gear. Meshes with any neighbour on any side. */
export const gearWheel = definePort({
  name: 'gear',
  label: 'Gear',
  mirror: false,
  ins: (['N', 'E', 'S', 'W'] as const).map((side) => ({ side, kind: 'shaft' as const, t: 0 })),
  outs: (['N', 'E', 'S', 'W'] as const).map((side) => ({ side, kind: 'shaft' as const, t: 0 })),
  outsOptional: true,
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
    const near = clamp(1 - Math.abs(delta) / 0.45)
    const ext = 0.12 * near * near * (3 - 2 * near)

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

/** A row of bars: pushed at the west edge, the last one falls out through the east. */
export const dominoes = definePort({
  name: 'dominoes',
  label: 'Dominoes',
  ins: [{ side: 'W', kind: 'push', t: 0 }],
  outs: [{ side: 'E', kind: 'push', t: (s: { tOut: number }) => s.tOut }],
  setup: ({ color, rng }) => {
    const count = rng.pick([5, 6])
    const gap = 0.74 / (count - 1)
    const contact = Math.asin(clamp(gap / DOM_H, 0, 1))
    const lead = Math.sqrt(clamp(contact / DOM_REST, 0, 1))
    return { color, count, gap, lead, tOut: (count - 1) * lead * DOM_FALL + DOM_FALL * 0.9 }
  },
  draw: (p, s, c) => {
    const k = c.size
    outline(p, c.ink, c.weight)
    floorLine(p, k, -0.5, 0.5)
    for (let i = 0; i < s.count; i++) {
      const x = -0.38 + s.gap * i
      const last = i === s.count - 1
      const start = i * s.lead * DOM_FALL
      const drop = easeInQuad(seg(c.u, start, start + DOM_FALL))
      const riseAt = 0.62 + (s.count - 1 - i) * 0.03
      const rise = easeInOutCubic(seg(c.u, riseAt, riseAt + 0.1))
      p.push()
      p.translate(x * k, FLOOR * k)
      p.rotate((last ? 1 : DOM_REST) * drop * (1 - rise))
      solid(p, c.ink, c.weight, s.color)
      p.rect(0, (-DOM_H / 2) * k, DOM_W * k, DOM_H * k)
      p.pop()
    }
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
    const u = c.u
    clipBox(p, c.w, c.h, () => {
      outline(p, c.ink, c.weight)
      if (s.link.inSide === 'W') {
        floorLine(p, k, -0.5, -0.22)
        if (u < 0.03) ball(p, s.link, k, c.ink, c.weight, lerp(-0.5, -0.28, u / 0.03), BY)
        else if (u < 0.07) {
          const f = seg(u, 0.03, 0.07)
          ball(p, s.link, k, c.ink, c.weight, lerp(-0.28, -0.05, f), lerp(BY, 0.18, f))
        }
      } else if (u < 0.045) {
        ball(p, s.link, k, c.ink, c.weight, 0, lerp(-0.5, 0.16, easeInQuad(u / 0.045)))
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
