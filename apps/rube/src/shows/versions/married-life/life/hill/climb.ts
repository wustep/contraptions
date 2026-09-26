import type p5 from 'p5'
import { R, type Pt, type Seg } from '../../../../../parts'
import { HALF } from '../cast'
import { box, carried, part, smooth, type Company, type Pose } from '../kit'
import { CUT } from '../music'
import { BASKET, drawBasket } from '../props/basket'
import { CUTS } from '../seams'
import { LANE_Y, ridge, ridgeSlope, STEP } from './hill'

/**
 * CLIMB (167.706 to 180.413): the same hill, years later, in autumn. A held note, and then the piano.
 *
 * They come along the lane at the hill's foot, walking right, Ellie a step ahead as she always is, the picnic basket
 * (the tickets in it) on Carl's top. At the stone step where the path leaves the lane he stops, and for once he leads:
 * he steps up (169.482) and starts up the skyline toward the tree on the crest, the picnic place, eager with his
 * surprise. She has gone on a little; she comes back, and follows him up the step, slowly (171.543).
 *
 * The held note: he climbs, slower and slower; she has only just made the step. She rests there. She tries the slope,
 * a little. He stops and turns to look back at her. She lets go: she rolls back across the step and over its edge,
 * the smallest drop, and down onto the lane (174.672), and rolls a little way along it and comes to rest. No hit on
 * her: the strike is the basket, thrown off his top as he starts, landing on the path behind him (174.672), and
 * tipping over onto its side (175.409). He stands a moment; then he goes back down to her, old and careful, off the
 * step (178.556), and along the lane, and comes to rest beside her with a little space between them (`CUTS.hospital`:
 * Ellie at +0.45, level). The basket lies where it fell, up the path.
 *
 * The camera: from the cut's framing out to a long shot of the whole hill, the two of them small on its flank below
 * the tree; in on the two of them as she falters; and slowly down with him to her.
 */

/** Where Carl comes in, in the hill's cells: on the lane, a little short of the step. */
const START_X = STEP.x1 + 0.14 - 0.36

/** Where this part's entry cell is, in its world's cells (the score starts its leg here). */
export const CLIMB_AT: Pt = [START_X + 0.5, LANE_Y]

const BEGIN = CUT.climb
const END = CUT.hospital
/** A point of the hill's cells, in this part's. */
const L = (x: number, y: number): Pt => [x - CLIMB_AT[0], y - CLIMB_AT[1]]

/* ------------------------------------------------------------------ the times */

const T = {
  /** He stops at the step, and steps up onto it. */
  stop: BEGIN + 1.2,
  up: 169.1,
  onStep: 169.482,
  go: 169.7,
  /** He stands on the slope and looks back. */
  top: 173.9,
  /** He starts, and the basket is thrown; it lands, and it tips over. */
  jolt: 174.42,
  fall: 174.672,
  tip: 175.409,
  /** He goes back down to her, off the step, and along the lane to her side. */
  down: 175.25,
  edge: 178.15,
  offStep: 178.556,
  lane: 178.8,
  beside: 180.0,
}

/** Her times: past the step, back, up the step, the rest, the try, the letting go, the drop, the roll. */
const E = {
  stop: 169.639,
  back: 170.05,
  foot: 171.2,
  hop: 171.25,
  onStep: 171.543,
  on: 171.9,
  rest: 172.9,
  push: 173.35,
  still: 173.75,
  go: 173.95,
  edge: 174.525,
  land: 174.672,
  rest2: 175.95,
}

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
const CLIMB_TO = B - 1.73
const JOLT_TO = CLIMB_TO + 0.07
const DOWN_TO = B - 0.21
const LANDS = B + 0.15
/** Where they come to rest: her, then him, at the cut's distance. */
const HER_REST = B + 0.897
const HIS_REST = HER_REST - CUTS.hospital.ellie![0]

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
    return [lerp(DOWN_TO, LANDS, u), lerp(STEP.y, LANE_Y, u) - 4 * 0.12 * u * (1 - u)]
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

/** Her places on the step: where she lands on it, how far she creeps along it, how far onto the slope she tries. */
const TREAD = STEP.x1 - 0.15
const CREEP = STEP.x1 - 0.29
const PUSH = STEP.x0 - 0.03

/** Ellie in the hill's cells at show time `t`. */
function ellie(t: number): Pt {
  const x0 = START_X + CUTS.climb.ellie![0]
  if (t < E.stop) {
    const tau = t - BEGIN
    const a = 0.6 / (E.stop - BEGIN)
    return [x0 + 0.6 * tau - 0.5 * a * tau * tau, LANE_Y]
  }
  const far = x0 + 0.3 * (E.stop - BEGIN)
  const foot = STEP.x1 + 0.14
  if (t < E.back) return [far, LANE_Y]
  if (t < E.foot) return [lerp(far, foot, ease((t - E.back) / (E.foot - E.back))), LANE_Y]
  if (t < E.hop) return [foot, LANE_Y]
  if (t < E.onStep) {
    const u = lift((t - E.hop) / (E.onStep - E.hop))
    return [lerp(foot, TREAD, u), lerp(LANE_Y, STEP.y, u) - 4 * 0.13 * u * (1 - u)]
  }
  if (t < E.on) return [TREAD, STEP.y]
  if (t < E.rest) return [lerp(TREAD, CREEP, ease((t - E.on) / (E.rest - E.on))), STEP.y]
  if (t < E.push) return [CREEP, STEP.y]
  if (t < E.still) {
    const x = lerp(CREEP, PUSH, ease((t - E.push) / (E.still - E.push)))
    return [x, ridge(x)]
  }
  if (t < E.go) return [PUSH, ridge(PUSH)]
  const v = (2 * (STEP.x1 - PUSH)) / (E.edge - E.go)
  if (t < E.edge) {
    // She lets go: back across the step, gathering a little speed.
    const u = (t - E.go) / (E.edge - E.go)
    const x = PUSH + (STEP.x1 - PUSH) * u * u
    return [x, ridge(x)]
  }
  if (t < E.land) {
    // Over its edge: the smallest drop.
    const tau = t - E.edge
    const d = E.land - E.edge
    const g = (2 * (LANE_Y - STEP.y)) / (d * d)
    return [STEP.x1 + v * tau, STEP.y + 0.5 * g * tau * tau]
  }
  const landX = STEP.x1 + v * (E.land - E.edge)
  if (t < E.rest2) {
    // Along the lane a little way, slowing, and still.
    const tau = t - E.land
    const d = E.rest2 - E.land
    const v0 = (2 * (HER_REST - landX)) / d
    return [landX + v0 * tau - (0.5 * v0 * tau * tau) / d, LANE_Y]
  }
  return [HER_REST, LANE_Y]
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
    draw: () => {},
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
      cells: box(ex - 5, -2.2, ex + 1.5, 0.5),
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
      // Out as he steps up; the long shot of the whole hill, the tree on its crest, the two of them small below it.
      { t: 169.6, cells: 5.7, hold: h(B - 0.25, LANE_Y - 1.25) },
      { t: 171.8, cells: 9.8, hold: h(B - 5.45, LANE_Y - 2.6) },
      { t: 172.6, cells: 9.6, hold: h(B - 5.6, LANE_Y - 2.55) },
      // In on the two of them as she rests, tries, and stops; the fall; slowly down with him to her.
      { t: 174.5, cells: 4.4, hold: h(B - 0.95, LANE_Y - 1.05) },
      { t: 177.2, cells: 4.0, hold: h(B - 0.1, LANE_Y - 0.85) },
      { t: slot.end, cells: CUTS.hospital.cells, hold: [cx + CUTS.hospital.frame[0], cy + CUTS.hospital.frame[1]] },
    ]
  },
)

/** Every strike of this part, in show seconds (check:shows holds each to the music). */
export const CLIMB_HITS: number[] = [T.onStep, E.onStep, T.fall, T.tip, T.offStep]
