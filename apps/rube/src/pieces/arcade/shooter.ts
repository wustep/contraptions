import type p5 from 'p5'
import { coil, outline, solid } from '../../../../../src/core/draw'
import { easeInOutSine, easeOutCubic, lerp } from '../../../../../src/core/ease'
import { FLOOR, R, ROLL, arcPts, arrive, arriveAt, definePiece, laneAt, over, post, rail, ramp, rankBy, segTime, wait, type Lane, type Pt, type Seg } from '../../parts'
import { flash, glow, score } from './neon'

/**
 * A pinball shooter lane. The rail ends at a wire lane that stands a floor
 * or two tall; the ball rolls off it onto the cup on the plunger's tip and
 * the knob under it lights. The knob draws down, the cup and the ball with
 * it, the spring closing coil on coil — and lets go: the spring
 * drives the cup up to its stop and the ball goes on up the lane between
 * the wires, slowing all the way, round the arch at the top and out along
 * the upper rail, shouldering through a one-way gate that drops shut
 * behind it and clicks on its pin. The outer wire is a tube that lights
 * behind the ball as it climbs, and stays lit a while.
 *
 * The climb is one law: the pace at every height is what a ball thrown up
 * the lane would have there, so it leaves the cup fast, is slowest over
 * the top of the arch, and is at the rail's pace when it gets there. The
 * cup's motion is one function that the lane and the drawing share.
 */
export interface ShooterState {
  color: string
  floors: number
  turn: 1 | -1
}

/** The lane stands this far off the cell's middle, on the side away from the way out. */
const LANE_X = 0.2
/** The arch's radius, on the ball's line. */
const ARCH = 0.28
/** Room between the ball and the outer wire. */
const GAP = 0.03
/** The cup's seat, a hair under the rail's line; how far the knob draws it down; how far past its seat the spring throws it. */
const SEAT = 0.02
const DRAW = 0.06
const THROUGH = 0.03
const SETTLE = 0.14
const DRAW_T = 0.42
const HOLD = 0.07
/** When the ball is on the cup: the lane stands on the far side of the cell for a ball that is sent back. */
const arriveFor = (turn: 1 | -1) => arriveAt(-turn * LANE_X)
/** Show gravity up the lane, and the pace left at the top of the arch. */
const G = 9
const V_TOP = ROLL
/** The housing the rod runs through, and the knob under it. */
const HOUSING = 0.335
const HOUSING_H = 0.03
const KNOB = 0.4
/** The gate: hinged on the end of the top wire, a flap that hangs into the ball's way. */
const GATE_X = 0.2
const HINGE = R + GAP
const FLAP = 0.15
const FLAP_HALF = 0.012
/** The west wire stops this far above the rail's line, to let the ball in under it. */
const DOOR = -R - 0.06

/** The pace a ball has at height `y` on its way to the top of a lane `floors` tall. */
const paceAt = (y: number, floors: number) => Math.sqrt(V_TOP * V_TOP + 2 * G * (y + floors))

/** The cup's height: the ball's centre line while it carries the ball. `t` is from the moment the ball is on it. */
function cupAt(t: number, floors: number): number {
  if (t < SETTLE) return SEAT
  if (t < SETTLE + DRAW_T) return SEAT + DRAW * easeInOutSine(over(t, SETTLE, SETTLE + DRAW_T))
  if (t < SETTLE + DRAW_T + HOLD) return SEAT + DRAW
  // Off the spring: up to the stop at the pace the ball leaves with, a judder, and back to the seat.
  const stroke = (DRAW + THROUGH) / (paceAt(SEAT - THROUGH, floors) / 2)
  const s = t - (SETTLE + DRAW_T + HOLD)
  if (s < stroke) return SEAT + DRAW - (DRAW + THROUGH) * (s / stroke) * (s / stroke)
  const after = s - stroke
  return SEAT - THROUGH * Math.exp(-after * 9) * Math.cos(after * 38)
}

/**
 * The flap's angle forward of hanging with the ball at (bx, by) from the
 * hinge, in the lane's own hand: the least it must be lifted to lie on the
 * ball rather than in it. Zero when the ball is out of its reach.
 */
function lifted(bx: number, by: number): number {
  const rr = R + FLAP_HALF
  if (Math.hypot(bx, by) > FLAP + rr) return 0
  for (let a = 1.9; a > 0; a -= 0.004) {
    const ux = Math.sin(a)
    const uy = Math.cos(a)
    const s = Math.max(0, Math.min(FLAP, bx * ux + by * uy))
    if (Math.hypot(bx - ux * s, by - uy * s) < rr) return a + 0.004
  }
  return 0
}

interface Build {
  lane: Lane
  /** When the ball leaves the cup, and when it is over the top of the arch. */
  leave: number
  crest: number
  /** The outer wire, foot to gate, with how far along the ball's way each point is. */
  wire: { at: Pt; along: number }[]
  /** When the flap slips off the ball's back, and how far it was lifted. */
  letGo: number
  letGoAt: number
}

const builds = new Map<string, Build>()

function build(floors: number, turn: 1 | -1): Build {
  const key = `${floors}:${turn}`
  const hit = builds.get(key)
  if (hit) return hit
  const x = -turn * LANE_X
  const top = -floors
  const spring = top + ARCH
  const low: Pt = [x, SEAT + DRAW]
  const off: Pt = [x, SEAT - THROUGH]
  // Round the arch, the pace falling with the height gained.
  const a0 = turn > 0 ? Math.PI : 0
  const a1 = turn > 0 ? Math.PI * 1.5 : -Math.PI / 2
  const pts = arcPts(x + turn * ARCH, spring, ARCH, a0, a1, 10)
  const arch: Seg[] = []
  for (let i = 1; i < pts.length; i++) arch.push(ramp(pts[i - 1], pts[i], paceAt(pts[i - 1][1], floors), paceAt(pts[i][1], floors)))
  const gate: Pt = [turn * GATE_X, top]
  const before: Seg[] = [
    ...arrive([-0.5, 0], [x, SEAT]),
    wait([x, SEAT], SETTLE),
    { from: [x, SEAT], to: low, dur: DRAW_T, ease: 'inout' },
    wait(low, HOLD),
    ramp(low, off, 0, paceAt(off[1], floors)),
  ]
  const climb = ramp(off, [x, spring], paceAt(off[1], floors), paceAt(spring, floors))
  const segs: Seg[] = [
    ...before,
    climb,
    ...arch,
    // Checked a little by the gate, and back to pace by the edge.
    ramp(pts[pts.length - 1], gate, V_TOP, V_TOP * 0.85),
    ramp(gate, [turn * 0.5, top], V_TOP * 0.85, ROLL),
  ]
  const lane: Lane = { segs, fire: arriveFor(turn) + SETTLE + DRAW_T + HOLD }
  const leave = segTime(before)
  const crest = leave + climb.dur + segTime(arch)
  // The outer wire: up the lane's far side from its foot, round the arch, and along to the gate's hinge.
  const wire: Build['wire'] = []
  const wx = x - turn * (R + GAP)
  if (turn > 0) wire.push({ at: [wx - 0.04, DOOR + 0.035], along: -0.05 })
  const foot = turn > 0 ? DOOR : HOUSING - HOUSING_H / 2
  const n = Math.ceil((foot - spring) / 0.04)
  for (let i = 0; i <= n; i++) {
    const y = lerp(foot, spring, i / n)
    wire.push({ at: [wx, y], along: DOOR - y })
  }
  arcPts(x + turn * ARCH, spring, ARCH + R + GAP, a0, a1, 14).forEach((at, i) => {
    if (i > 0) wire.push({ at, along: DOOR - spring + (i / 14) * (Math.PI / 2) * ARCH })
  })
  wire.push({ at: [turn * GATE_X, top - HINGE], along: DOOR - spring + (Math.PI / 2) * ARCH + GATE_X - (ARCH - LANE_X) })
  // Walk the ball past the gate to find where the flap slips off its back.
  let letGo = segTime(segs)
  let letGoAt = 0
  for (let t = leave; t < segTime(segs); t += 1 / 480) {
    const at = laneAt(lane, t)
    const a = lifted(turn * at.x - GATE_X, at.y - (top - HINGE))
    if (a > 0) {
      letGo = t + 1 / 480
      letGoAt = a
    }
  }
  const out = { lane, leave, crest, wire, letGo, letGoAt }
  builds.set(key, out)
  return out
}

/** How far along its way up and over the ball is at `t`, in the wire's measure: what the tube is lit up to. */
function alongAt(b: Build, floors: number, turn: 1 | -1, t: number): number {
  if (t < b.leave) return -1
  const spring = -floors + ARCH
  const at = laneAt(b.lane, t)
  if (at.y >= spring) return DOOR - at.y
  const round = DOOR - spring + Math.asin(Math.min(1, (spring - at.y) / ARCH)) * ARCH
  return round + Math.max(0, turn * at.x - (ARCH - LANE_X))
}

/** The flap after the ball has let it go: it falls to its pin and clicks on it, twice, smaller. */
const FALL = 0.11
function falling(s: number, from: number): number {
  if (s < FALL) return from * (1 - (s / FALL) * (s / FALL))
  const after = s - FALL
  return after < 0.3 ? from * 0.2 * Math.abs(Math.sin((Math.PI * after) / 0.1)) * Math.exp(-after * 10) : 0
}

/** A lit tube along a path: the halo laid once along the whole of it, so the joints do not bead. */
function tubePath(p: p5, k: number, ink: string, weight: number, color: string, pts: Pt[], f: number): void {
  const path = () => {
    p.beginShape()
    for (const [x, y] of pts) p.vertex(x * k, y * k)
    p.endShape()
  }
  p.push()
  p.noFill()
  if (f > 0.02) {
    const halo = p.color(color)
    halo.setAlpha(40 * f)
    p.stroke(halo)
    p.strokeWeight(weight * 3.2)
    path()
  }
  p.stroke(f > 0.5 ? color : ink)
  p.strokeWeight(weight * 1.3)
  path()
  p.pop()
}

export const shooter = definePiece<ShooterState>({
  name: 'shooter',
  points: 100,
  weight: 0.8,
  flight: true,
  place: ({ rng, color, fits, taste }) => {
    const tall = taste.weights['lift-tall'] ?? 1
    const options = rng.shuffle([1, 2].flatMap((floors) => [1, -1].map((turn) => ({ floors, turn: turn as 1 | -1 }))))
    for (const { floors, turn } of rankBy(rng, options, (o) => Math.pow(tall, o.floors - 1))) {
      const cells: Pt[] = []
      for (let i = 0; i <= floors; i++) cells.push([0, -i])
      const exit: Pt = [turn, -floors]
      if (!fits(cells, exit)) continue
      return { cells, exit: { at: exit, dir: turn }, lane: build(floors, turn).lane, state: { color, floors, turn } }
    }
    return null
  },
  // The gate at the top is what scores, as a pinball table's does: over it, as the flap lets the ball go. Off the plunger it lay across the lane.
  scores: (p, s, { k, t, bg }) => score(p, k, s.color, bg, s.turn * GATE_X, -s.floors - HINGE - 0.05 + 0.1, '+100', t - build(s.floors, s.turn).letGo, 1),
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    const { floors, turn } = s
    const b = build(floors, turn)
    const x = -turn * LANE_X
    const top = -floors
    const spring = top + ARCH
    const landed = arriveFor(turn)
    const cup = cupAt(t - landed, floors)
    const west = x - R - (turn > 0 ? GAP : 0)
    const east = x + R + (turn < 0 ? GAP : 0)

    // The rail in, to the cup; the rail out, from the arch's foot, on a post that stands behind everything.
    rail(p, k, ink, weight, -0.5, x - R - 0.04)
    rail(p, k, ink, weight, turn * (ARCH - LANE_X), turn * 0.5, top + FLOOR)
    post(p, k, ink, weight, turn * 0.42, top + FLOOR, 0.5)
    // The ties that hold the two wires apart, behind the ball.
    outline(p, ink, weight * 0.6)
    for (let y = -0.36; y > spring + 0.05; y -= 0.44) p.line(west * k, y * k, east * k, y * k)

    // The inner wire: up from the housing — or from over the way in — and round the arch's inside to become the rail out.
    const inner: Pt[] = [[x + turn * R, turn > 0 ? HOUSING - HOUSING_H / 2 : DOOR], ...arcPts(x + turn * ARCH, spring, ARCH - R, turn > 0 ? Math.PI : 0, turn > 0 ? Math.PI * 1.5 : -Math.PI / 2, 10)]
    outline(p, ink, weight)
    p.beginShape()
    for (const [ix, iy] of inner) p.vertex(ix * k, iy * k)
    p.endShape()
    if (turn < 0) p.line(west * k, DOOR * k, (west - 0.04) * k, (DOOR + 0.035) * k)
    // The outer wire is a tube, lit from its foot as far as the ball has got, and for a while after it has gone.
    const reach = alongAt(b, floors, turn, t)
    const glowing = 1 - over(t, b.crest + 1.0, b.crest + 2.0)
    const cut = b.wire.findIndex((w) => w.along > reach)
    const lit = cut < 0 ? b.wire : b.wire.slice(0, cut)
    const dark = cut < 0 ? [] : b.wire.slice(Math.max(0, cut - 1))
    if (cut > 0) {
      // The joint between lit and dark rides with the ball rather than stepping point to point.
      const a = b.wire[cut - 1]
      const c = b.wire[cut]
      const f = (reach - a.along) / (c.along - a.along)
      const mid = { at: [lerp(a.at[0], c.at[0], f), lerp(a.at[1], c.at[1], f)] as Pt, along: reach }
      lit.push(mid)
      dark[0] = mid
    }
    if (dark.length > 1) tubePath(p, k, ink, weight, s.color, dark.map((w) => w.at), 0)
    if (lit.length > 1) tubePath(p, k, ink, weight, s.color, lit.map((w) => w.at), glowing)

    // The plunger. A plate across the lane's foot on two legs; the rod through it, from the cup to the knob; the
    // spring round the rod, between the cup and the plate. The knob lights while the ball is on the cup.
    const sensed = t > landed && since < 0 ? 1 : since >= 0 ? 1 - over(since, 0, 0.3) : 0
    for (const lx of [x - 0.2, x + 0.2]) post(p, k, ink, weight, lx, HOUSING, 0.5)
    outline(p, ink, weight)
    p.line(x * k, (cup + R + 0.03) * k, x * k, (KNOB + cup - SEAT) * k)
    outline(p, ink, weight * 0.7)
    coil(p, x * k, (cup + R + 0.04) * k, x * k, (HOUSING - HOUSING_H / 2) * k, 3, 0.085 * k)
    solid(p, ink, weight, ink)
    p.rect(x * k, HOUSING * k, 0.46 * k, HOUSING_H * k, 0.01 * k)
    glow(p, k, s.color, x, KNOB + cup - SEAT, 0.07, sensed)
    solid(p, ink, weight, sensed > 0.5 ? s.color : bg)
    p.circle(x * k, (KNOB + cup - SEAT) * k, 0.08 * k)
    // The cup: a shallow dish on the rod's tip, the ball's seat.
    solid(p, ink, weight, s.color)
    p.arc(x * k, (cup + R - 0.05) * k, 0.26 * k, 0.17 * k, 0.1, Math.PI - 0.1, p.CHORD)

    // The gate's pin, on the side the flap may not swing to.
    p.fill(ink)
    p.noStroke()
    p.circle(turn * (GATE_X - 0.035) * k, (top - HINGE + 0.06) * k, 0.025 * k)
    // The shot.
    flash(p, k, s.color, weight, x, SEAT + R, since, 0.2, 0.1, 0.24)
  },
  over: (p, s, { k, t, ink, bg, weight }) => {
    const { floors, turn } = s
    const { lane, letGo, letGoAt } = build(floors, turn)
    const top = -floors
    // The flap, in front of the ball: lying on it while it shoulders through, falling to its pin once it is let go.
    const at = laneAt(lane, t)
    const angle = t >= letGo ? falling(t - letGo, letGoAt) : lifted(turn * at.x - GATE_X, at.y - (top - HINGE))
    p.push()
    p.translate(turn * GATE_X * k, (top - HINGE) * k)
    p.rotate(-turn * angle)
    solid(p, ink, weight, s.color)
    p.rect(0, (FLAP / 2) * k, FLAP_HALF * 2 * k, FLAP * k, 0.006 * k)
    p.pop()
    solid(p, ink, weight, bg)
    p.circle(turn * GATE_X * k, (top - HINGE) * k, 0.04 * k)
    // The click as it meets its pin.
    const click = t - letGo - FALL
    if (click > 0 && click < 0.14) {
      const f = easeOutCubic(click / 0.14)
      p.push()
      p.stroke(ink)
      p.strokeWeight(weight)
      for (const dy of [0.03, 0.08, 0.13]) {
        p.line(turn * (GATE_X - 0.06 - 0.03 * f) * k, (top - HINGE + dy) * k, turn * (GATE_X - 0.1 - 0.05 * f) * k, (top - HINGE + dy + (dy - 0.08) * 0.5) * k)
      }
      p.pop()
    }
  },
})
