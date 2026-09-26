import type p5 from 'p5'
import { mixHex, R, type Pt, type Seg } from '../../../../../parts'
import { HALF } from '../cast'
import { alpha, box, carried, part, smooth, type Company, type Pose } from '../kit'
import { CUT } from '../music'
import { BASKET, drawBasket } from '../props/basket'
import { CUTS } from '../seams'
import { HILL, HOME, INK } from '../worlds'
import { autumn, LANE_Y, ridge, ridgeSlope, STEP } from './hill'

/**
 * CLIMB (167.706 to 180.413): the same hill, years later, in autumn. A held note, and then the piano.
 *
 * They come along the lane at the hill's foot, walking right, Ellie a step ahead as she always is, the picnic basket
 * (the tickets in it) on Carl's top. At the fieldstone where the path leaves the lane he stops, and for once he
 * leads: he steps up onto it (169.482) and starts up the flank toward the tree on the crest, the picnic place, eager
 * with his surprise. She has gone on a little; she comes back, and follows him up onto the stone, slowly (171.543).
 *
 * The held note: he climbs, slower and slower, and stops to wait for her, turned to look back. She climbs the flank
 * behind him, a good length of it, tiring: she stops to rest, goes on, and can go no further. She slips a little,
 * and on 174.672 she gives way: she rolls back down the whole length she climbed, across the stone and off it onto
 * the lane (176.060), one small bounce (176.274), and a long, slow roll along the lane to rest. No hit on her: the
 * struck thing is the basket, thrown off his top as he starts toward her, landing on the path behind him (174.672)
 * and tipping over onto its side (175.409). Then he goes back down to her, old and careful, off the stone
 * (178.556), and along the lane, and comes to rest beside her with a little space between them (`CUTS.hospital`:
 * Ellie at +0.45, level). The basket lies where it fell, up the path.
 *
 * The camera: from the cut's framing it keeps pulling out to the establishing shot of the whole hill (the tree on
 * its crest, the two of them small at its foot), holds it while he climbs, pushes in on the two of them as she
 * climbs and tires, and has settled on them before she gives way (3.4 cells by 173.8); then it goes slowly with her
 * down to the lane, and on to him beside her.
 */

/** Where Carl comes in, in the hill's cells: on the lane, a little short of the stone (he stops clear of it). */
const START_X = STEP.x1 + 0.24 - 0.36

/** Where this part's entry cell is, in its world's cells (the score starts its leg here). */
export const CLIMB_AT: Pt = [START_X + 0.5, LANE_Y]

const BEGIN = CUT.climb
const END = CUT.hospital
/** A point of the hill's cells, in this part's. */
const L = (x: number, y: number): Pt => [x - CLIMB_AT[0], y - CLIMB_AT[1]]

/* ------------------------------------------------------------------ the times */

const T = {
  /** He stops at the stone, and steps up onto it. */
  stop: BEGIN + 1.2,
  up: 169.1,
  onStep: 169.482,
  go: 169.7,
  /** He stops on the slope to wait for her, and looks back. */
  top: 173.3,
  /** He starts, and the basket is thrown; it lands, and it tips over. */
  jolt: 174.42,
  fall: 174.672,
  tip: 175.409,
  /** He goes back down to her, off the step, and along the lane to her side. */
  down: 175.25,
  edge: 178.15,
  offStep: 178.556,
  lane: 178.8,
  beside: 180.05,
}

/** How long a fall off the stone takes, from its top to the lane (0.13 cells, at the house's gravity, 12). */
const DROP_T = Math.sqrt((2 * (LANE_Y - STEP.y)) / 12)

/** Her times: past the stone, back, up onto it, the climb, the rest, the last push, the slip, the fall, the settle. */
const E = {
  stop: 169.639,
  back: 170.05,
  foot: 171.2,
  hop: 171.25,
  onStep: 171.543,
  /** Up the flank after him, eager at first, tiring; she stops to rest. */
  on: 171.66,
  rest: 172.62,
  /** On again, slower; and she can go no further. */
  push: 173.02,
  still: 173.9,
  /** She starts to slip, the smallest way; and she gives way. */
  sag: 174.3,
  give: 174.672,
  /** Off the stone's edge, onto the lane, one small bounce, and the long slow roll to rest. */
  edge: 176.06 - DROP_T,
  land: 176.06,
  bounce: 176.274,
  rest2: 176.274 + 2.4,
}

/* ------------------------------------------------------------------ her fall, worked out once */

/** Her places: where she lands on the stone, where she stops to rest, how far up the flank she gets. */
const TREAD = STEP.x1 - 0.15
const MID = STEP.x0 - 0.5
const HIGH = STEP.x0 - 1.0
/** How fast she is slipping back when she gives way (cells/s, downhill), and where she is then. */
const SLIP_V = 0.15
const GIVE_X = HIGH + (SLIP_V * (E.give - E.sag)) / 2
/**
 * The roll back down: her speed eases up from the slip toward a steady roll (grass and straw hold her back), and she
 * leaves the stone's edge at `E.edge`. `v(τ) = VMAX - (VMAX - SLIP_V) e^(-τ/TC)`, VMAX chosen so she gets there.
 */
const TC = 0.4
const ROLL_T = E.edge - E.give
const Q = TC * (1 - Math.exp(-ROLL_T / TC))
const VMAX = (STEP.x1 - GIVE_X - SLIP_V * Q) / (ROLL_T - Q)
const rollX = (tau: number) => GIVE_X + VMAX * tau - (VMAX - SLIP_V) * TC * (1 - Math.exp(-tau / TC))
const EDGE_V = VMAX - (VMAX - SLIP_V) * Math.exp(-ROLL_T / TC)
/** Where she lands on the lane; the bounce (it keeps three quarters of her speed); the settle, and where she rests. */
const LAND_X = STEP.x1 + EDGE_V * DROP_T
const BOUNCE_V = 0.75 * EDGE_V
const BOUNCE_H = 0.045
const BOUNCE_X = LAND_X + BOUNCE_V * (E.bounce - E.land)
const SETTLE_N = 2.5
const SETTLE_D = (BOUNCE_V * (E.rest2 - E.bounce)) / SETTLE_N
/** Where they come to rest: her, then him, at the cut's distance. */
const HER_REST = BOUNCE_X + SETTLE_D
const HIS_REST = HER_REST - CUTS.hospital.ellie![0]

/* ------------------------------------------------------------------ Carl */

const lerp = (a: number, b: number, u: number) => a + (b - a) * u
const clamp01 = (u: number) => Math.max(0, Math.min(1, u))
const ease = (u: number) => {
  const v = clamp01(u)
  return v * v * (3 - 2 * v)
}
/** A hop's clock: it leaves the ground from rest (no kick), and comes down with its weight (the landing is the strike). */
const lift = (u: number) => {
  const v = clamp01(u)
  return v * v
}

/** The climb's pace: eager at first, slowing all the way, easing to a stop. The fraction of it done at `u`. */
const CLIMB = (() => {
  const n = 400
  const acc: number[] = [0]
  for (let i = 1; i <= n; i++) {
    const u = (i - 0.5) / n
    acc.push(acc[i - 1] + Math.sin(Math.PI * Math.pow(u, 0.8)) * (1 - 0.55 * u))
  }
  return (u: number) => {
    const f = clamp01(u) * n
    const i = Math.floor(f)
    const a = acc[Math.min(n, i)]
    const b = acc[Math.min(n, i + 1)]
    return (a + (b - a) * (f - i)) / acc[n]
  }
})()

/** How far up the skyline he gets, and where he stands to look back. */
const B = STEP.x1
const CLIMB_FROM = B - 0.18
const CLIMB_TO = B - 2.3
const JOLT_TO = CLIMB_TO + 0.07
/** Where he steps off the stone (its outer edge), and where he lands on the lane, clear of it. */
const DOWN_TO = B
const LANDS = B + 0.31

/** Carl in the hill's cells at show time `t`. */
function carl(t: number): Pt {
  if (t < T.stop) {
    const tau = t - BEGIN
    const a = 0.6 / (T.stop - BEGIN)
    return [START_X + 0.6 * tau - 0.5 * a * tau * tau, LANE_Y]
  }
  const stopX = START_X + 0.3 * (T.stop - BEGIN)
  if (t < T.up) return [stopX, LANE_Y]
  if (t < T.onStep) {
    // Up onto the step: he gathers himself and lifts (from rest, no kick), and comes down onto it.
    const u = lift((t - T.up) / (T.onStep - T.up))
    return [lerp(stopX, CLIMB_FROM, u), lerp(LANE_Y, STEP.y, u) - 4 * 0.17 * u * (1 - u)]
  }
  if (t < T.go) return [CLIMB_FROM, STEP.y]
  if (t < T.top) {
    const x = lerp(CLIMB_FROM, CLIMB_TO, CLIMB((t - T.go) / (T.top - T.go)))
    return [x, ridge(x)]
  }
  if (t < T.jolt) return [CLIMB_TO, ridge(CLIMB_TO)]
  if (t < T.fall) {
    const u = lift((t - T.jolt) / (T.fall - T.jolt))
    const x = lerp(CLIMB_TO, JOLT_TO, u)
    return [x, ridge(x) - 4 * 0.05 * u * (1 - u)]
  }
  if (t < T.down) return [JOLT_TO, ridge(JOLT_TO)]
  if (t < T.edge) {
    // Down the slope to her: slow to start, careful at the step.
    const u = (t - T.down) / (T.edge - T.down)
    const x = lerp(JOLT_TO, DOWN_TO, ease(u))
    return [x, ridge(x)]
  }
  if (t < T.offStep) {
    const u = lift((t - T.edge) / (T.offStep - T.edge))
    return [lerp(DOWN_TO, LANDS, u), lerp(STEP.y, LANE_Y, u) - 4 * 0.1 * u * (1 - u)]
  }
  if (t < T.lane) return [LANDS, LANE_Y]
  if (t < T.beside) return [lerp(LANDS, HIS_REST, ease((t - T.lane) / (T.beside - T.lane))), LANE_Y]
  return [HIS_REST, LANE_Y]
}

/** Whether he is off the ground at `t` (a hop): upright then. */
const aloft = (t: number) => (t > T.up && t < T.onStep) || (t > T.edge && t < T.offStep)

/** The lean of the ground under a square standing at `x`: the skyline's slope averaged over his footprint. */
function groundTilt(x: number): number {
  let s = 0
  for (let i = -4; i <= 4; i++) s += Math.atan(ridgeSlope(x + (i / 4) * HALF))
  return s / 9
}

/** How Carl holds himself: with the ground, upright in a hop, a look back at her, and a small squash on each landing. */
function bearing(t: number): { tilt: number; squash: number } {
  const [x] = carl(t)
  let tilt = aloft(t) ? 0 : groundTilt(x)
  if (aloft(t)) {
    // Up off the step and down off it again: from the ground's lean to upright and back, smoothly.
    const [a, b] = t < T.onStep ? [T.up, T.onStep] : [T.edge, T.offStep]
    const u = (t - a) / (b - a)
    const from = groundTilt(carl(a)[0])
    const to = groundTilt(carl(b)[0])
    tilt = u < 0.5 ? from * (1 - ease(u * 2)) : to * ease((u - 0.5) * 2)
  }
  // He stops and looks back down at her, and holds the look.
  tilt += 0.1 * smooth(t, T.top, T.top + 0.35) * (1 - smooth(t, T.down, T.down + 0.6))
  let squash = 0
  for (const at of [T.onStep, T.fall, T.offStep]) {
    const ago = t - at
    if (ago >= 0 && ago < 0.8) squash += 0.1 * Math.exp(-ago / 0.12) * Math.max(0, Math.cos(ago * 9))
  }
  return { tilt, squash }
}

/* ------------------------------------------------------------------ Ellie */

/** Up the flank: eager at first and tiring, from rest to rest (its speed peaks a third of the way). */
const tire = (u: number) => {
  const v = clamp01(u)
  return v * v * (6 - 8 * v + 3 * v * v)
}

/** Ellie in the hill's cells at show time `t`. */
function ellie(t: number): Pt {
  const x0 = START_X + CUTS.climb.ellie![0]
  if (t < E.stop) {
    const tau = t - BEGIN
    const a = 0.6 / (E.stop - BEGIN)
    return [x0 + 0.6 * tau - 0.5 * a * tau * tau, LANE_Y]
  }
  const far = x0 + 0.3 * (E.stop - BEGIN)
  const foot = STEP.x1 + 0.16
  if (t < E.back) return [far, LANE_Y]
  if (t < E.foot) return [lerp(far, foot, ease((t - E.back) / (E.foot - E.back))), LANE_Y]
  if (t < E.hop) return [foot, LANE_Y]
  if (t < E.onStep) {
    const u = lift((t - E.hop) / (E.onStep - E.hop))
    return [lerp(foot, TREAD, u), lerp(LANE_Y, STEP.y, u) - 4 * 0.13 * u * (1 - u)]
  }
  const on = (x: number): Pt => [x, ridge(x)]
  if (t < E.on) return on(TREAD)
  if (t < E.rest) return on(lerp(TREAD, MID, tire((t - E.on) / (E.rest - E.on))))
  if (t < E.push) return on(MID)
  if (t < E.still) return on(lerp(MID, HIGH, tire((t - E.push) / (E.still - E.push))))
  if (t < E.sag) return on(HIGH)
  if (t < E.give) {
    // She slips back, the smallest way, gathering: the slope is taking her.
    const tau = t - E.sag
    return on(HIGH + (0.5 * SLIP_V * tau * tau) / (E.give - E.sag))
  }
  if (t < E.edge) return on(rollX(t - E.give))
  if (t < E.land) {
    // Off the stone's edge: the smallest drop.
    const tau = t - E.edge
    return [STEP.x1 + EDGE_V * tau, STEP.y + 6 * tau * tau]
  }
  if (t < E.bounce) {
    // One small bounce.
    const u = (t - E.land) / (E.bounce - E.land)
    return [LAND_X + BOUNCE_V * (t - E.land), LANE_Y - 4 * BOUNCE_H * u * (1 - u)]
  }
  if (t < E.rest2) {
    // Along the lane, slower and slower, a long way to stillness.
    const u = (t - E.bounce) / (E.rest2 - E.bounce)
    return [HER_REST - SETTLE_D * Math.pow(1 - u, SETTLE_N), LANE_Y]
  }
  return [HER_REST, LANE_Y]
}

/* ------------------------------------------------------------------ the stone */

/**
 * The fieldstone where the path leaves the lane: a big, low, rounded stone, set into the hill's foot, its top worn
 * flat where the path steps onto it. It is drawn over the hill set's step (the same place and height, so everything
 * that stands on the step stands on it), in the hill's earth tones; the hill set draws a plain slab there.
 */
function drawStone(p: p5, k: number, weight: number, t: number): void {
  const au = autumn(t)
  const top = STEP.y + R
  const ground = LANE_Y + R
  const x0 = STEP.x0 - 0.18
  const x1 = STEP.x1 + 0.06
  const [ox, oy] = L(0, 0)
  const X = (x: number) => (x + ox) * k
  const Y = (y: number) => (y + oy) * k
  const body = mixHex(mixHex(HOME.stone, HILL.bark, 0.32), HILL.grassAutumn, 0.18 * au)
  const lit = mixHex(body, HILL.cloud, 0.32)
  const shade = mixHex(body, HILL.bark, 0.4)
  // Its outline, round from the lane on the left, over the worn top, and down to the lane on the right.
  const outlinePath = () => {
    p.vertex(X(x0 + 0.005), Y(ground + 0.004))
    p.bezierVertex(X(x0 - 0.01), Y(ground - 0.045), X(x0 + 0.01), Y(top + 0.004), X(x0 + 0.09), Y(top))
    p.bezierVertex(X(x0 + 0.25), Y(top - 0.012), X(x1 - 0.22), Y(top - 0.007), X(x1 - 0.045), Y(top))
    p.bezierVertex(X(x1 + 0.004), Y(top + 0.006), X(x1 + 0.014), Y(ground - 0.045), X(x1 + 0.006), Y(ground + 0.004))
  }
  p.push()
  // A soft contact shadow on the lane.
  p.noStroke()
  p.fill(alpha(p, INK, 0.16))
  p.ellipse(X((x0 + x1) / 2 + 0.02), Y(ground + 0.02), (x1 - x0 + 0.1) * k, 0.06 * k)
  // The body, and its shade and light (clipped to it).
  p.fill(body)
  p.beginShape()
  outlinePath()
  p.bezierVertex(X(x1 - 0.12), Y(ground + 0.03), X(x0 + 0.12), Y(ground + 0.03), X(x0 + 0.005), Y(ground + 0.004))
  p.endShape(p.CLOSE)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.clip()
  p.fill(alpha(p, shade, 0.55))
  p.ellipse(X((x0 + x1) / 2 + 0.05), Y(ground + 0.02), (x1 - x0 + 0.1) * k, 0.12 * k)
  p.fill(alpha(p, lit, 0.7))
  p.ellipse(X((x0 + x1) / 2 - 0.05), Y(top + 0.005), (x1 - x0 - 0.12) * k, 0.045 * k)
  ctx.restore()
  // Inked once, over the top and down both sides; not along the ground.
  p.noFill()
  p.stroke(INK)
  p.strokeWeight(weight * 0.9)
  p.beginShape()
  outlinePath()
  p.endShape()
  // A tuft of straw at each end, where the stone goes into the ground.
  p.stroke(alpha(p, mixHex(HILL.grassAutumn, HILL.bark, 0.3), 0.9))
  p.strokeWeight(Math.max(1, weight * 0.55))
  const lean = 0.02 * Math.sin(t * 1.2)
  for (const [x, h] of [[x0 + 0.01, 0.08], [x1 + 0.01, 0.06]] as const) {
    p.line(X(x), Y(ground + 0.01), X(x - 0.03 + lean), Y(ground - h))
    p.line(X(x + 0.03), Y(ground + 0.01), X(x + 0.045 + lean), Y(ground - h * 0.8))
  }
  p.pop()
}

/* ------------------------------------------------------------------ the basket */

const THROW = T.jolt + 0.02
/** Where the basket lands, up the path behind him, and how it sits there. */
const BASKET_X = CLIMB_TO - 0.62
/** The basket's bottom-middle and its tilt at `t`, and how far its lid is open; null before the part. */
function basketAt(t: number): { x: number; y: number; tilt: number; open: number } | null {
  if (t < BEGIN - 0.001) return null
  const onTop = (s: number) => {
    const [x, y] = carl(s)
    const { tilt, squash } = bearing(s)
    const ty = -HALF + 2 * HALF * squash
    return { x: x - ty * Math.sin(tilt), y: y + ty * Math.cos(tilt), tilt }
  }
  if (t < THROW) return { ...onTop(t), open: 0 }
  const from = onTop(THROW)
  const land = { x: BASKET_X, y: ridge(BASKET_X) + R, tilt: Math.atan(ridgeSlope(BASKET_X)) }
  if (t < T.fall) {
    const u = (t - THROW) / (T.fall - THROW)
    return { x: lerp(from.x, land.x, u), y: lerp(from.y, land.y, u) - 4 * 0.14 * u * (1 - u), tilt: lerp(from.tilt, land.tilt - 0.5, u), open: 0.3 * u }
  }
  // Down askew, rocking once and settling; then it goes over onto its side, and its lid falls open.
  const fall = t - T.fall
  const tipFrom = T.tip - 0.24
  const settle = land.tilt - 0.5 * Math.exp(-fall / 0.09) - 0.06 * Math.exp(-fall / 0.35) * Math.sin(fall * 11)
  if (t < tipFrom) return { x: land.x, y: land.y, tilt: settle, open: 0.3 * Math.exp(-fall / 0.2) }
  // Over its uphill corner, away from him: slow to start, gathering, onto its side on the tip; its lid falls open.
  const u = clamp01((t - tipFrom) / (T.tip - tipFrom))
  const after = Math.max(0, t - T.tip)
  const side = Math.PI / 2 - 0.35
  const phi = side * u * u + (after > 0 ? -0.07 * Math.exp(-after / 0.14) * Math.sin(after * 18) : 0)
  const base = land.tilt
  const half = BASKET.w / 2 - 0.04
  // The corner it goes over, and the basket's bottom-middle turned about it.
  const cx = land.x - Math.cos(base) * half
  const cy = land.y - Math.sin(base) * half
  const a = base - phi
  const open = after > 0 ? 1 - 0.9 * Math.exp(-after / 0.18) * Math.cos(after * 6) : 0
  return { x: cx + Math.cos(a) * half, y: cy + Math.sin(a) * half, tilt: a, open: Math.max(0, Math.min(1.1, open)) }
}

/* ------------------------------------------------------------------ the part */

export interface ClimbState {
  begin: number
}

export const climb = part<ClimbState>(
  {
    name: 'climb',
    draw: (p: p5, s, c) => drawStone(p, c.k, c.weight, s.begin + c.t),
    over: (p: p5, s, c) => {
      const t = s.begin + c.t
      if (c.t < -0.001 || c.t > END - BEGIN + 2) return
      const b = basketAt(t)
      if (!b) return
      const [x, y] = L(b.x, b.y)
      drawBasket(p, c.k, c.weight, x, y, { tilt: b.tilt, open: b.open })
    },
  },
  (slot) => {
    // Carl's lane: his path sampled phase by phase, so every landing is a segment's end, exactly.
    const phases = [BEGIN, T.stop, T.up, T.onStep, T.go, T.top, T.jolt, T.fall, T.down, T.edge, T.offStep, T.lane, T.beside, END]
    const at = (t: number): Pt => {
      const [x, y] = carl(t)
      return L(x, y)
    }
    // (`carried` samples in whatever clock it is handed: here, show time.)
    const segs: Seg[] = []
    for (let i = 0; i + 1 < phases.length; i++) segs.push(...carried(at, phases[i], phases[i + 1], Math.max(1, Math.ceil((phases[i + 1] - phases[i]) * 60))))
    const company: Company[] = [
      {
        from: slot.begin,
        to: slot.end,
        at: (t) => {
          const [x, y] = ellie(t)
          const [lx, ly] = L(x, y)
          return { x: lx, y: ly }
        },
      },
    ]
    const pose: Pose[] = [{ from: slot.begin, to: slot.end, at: (t) => bearing(t) }]
    const [ex, ey] = L(HIS_REST, LANE_Y)
    return {
      cells: box(ex - 5.5, -2.4, ex + 1.5, 0.5),
      exit: [ex + 0.5, ey],
      lane: { segs, fire: T.fall - slot.begin },
      state: { begin: slot.begin },
      company,
      pose,
    }
  },
  (slot) => {
    const h = (x: number, y: number): Pt => L(x, y)
    const [cx, cy] = L(HIS_REST, LANE_Y)
    return [
      // The cut's pull-out carries on out to the establishing shot: the whole hill, the tree on its crest, the two of
      // them small at its foot. It holds while he climbs, easing in a little.
      { t: 169.95, cells: 9.4, hold: h(4.75, -0.2) },
      { t: 171.6, cells: 8.3, hold: h(5.15, 0.0) },
      // In on the two of them as she climbs after him and tires; settled before she gives way.
      { t: 173.8, cells: 3.4, hold: h(7.6, LANE_Y - 0.75) },
      { t: 174.95, cells: 3.36, hold: h(7.72, LANE_Y - 0.72) },
      // Slowly with her down to the lane, and on to him beside her.
      { t: 177.4, cells: 3.45, hold: h(9.0, LANE_Y - 0.66) },
      { t: slot.end, cells: CUTS.hospital.cells, hold: [cx + CUTS.hospital.frame[0], cy + CUTS.hospital.frame[1]] },
    ]
  },
)

/** Every strike of this part, in show seconds (check:shows holds each to the music). */
export const CLIMB_HITS: number[] = [T.onStep, E.onStep, T.fall, T.tip, E.land, E.bounce, T.offStep]
