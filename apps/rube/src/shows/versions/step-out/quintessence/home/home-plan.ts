import type { Pt, Seg } from '../../../../../parts'
import { carried, route, type Way } from '../kit'
import { at, SEAM } from '../music'
import { G } from '../physics'
import { bez, lengths, along } from './pen'

/**
 * Home's clock and geometry (133.278 → 146.519, bars 75 to 82): his mother's new apartment at evening, and her baby
 * grand. The place's frame is the part's: the ball comes in at (-0.5, 0), on the floor; the floor's near line is at
 * y = 0.13 (a ball's radius under him).
 *
 * The piano is seen from its curved side and a little above, so the shape that matters (the bentside: straight off
 * the keyboard's cheek, in, and out again round the tail) is the line of its rim against the dark. It is laid out in
 * its own two measures, `d` along it from the keyboard (to the tail) and `u` across it from the spine (at the back)
 * to the curved side (at the front, nearest us), and put on the screen by `scr`.
 */

export const T0 = SEAM.home
export const T1 = SEAM.himalaya

/* ------------------------------------------------------------------ the piano */

/** The keyboard's back line (d = 0) at the front, in cells. */
export const PX = 1.6
/** The rim's height at the front, and how wide the case is. */
export const RIM_Y = -1.2
export const W = 2.2
/** How the depth (W - u) goes up and to the right on the screen. */
const OX = 0.2
const OY = 0.4
/** The case's wall under the rim, and the keys' top under the rim. */
export const WALL = 0.5
export const KEY_DROP = 0.22
export const KEY_LEN = 0.42

/** A point of the piano at height `h` (the screen y it would have at the front) to the screen. */
export const scr = (d: number, u: number, h = RIM_Y): Pt => [PX + d + OX * (W - u), h - OY * (W - u)]

/**
 * The outline of the case in (d, u): from the treble cheek, the bentside (straight a little, in, then out round the
 * tail), and back along the spine to the keyboard. `CURVE_D` is where the bentside turns from in to out: the curve.
 */
const BENT: Pt[] = [
  [0, W],
  ...bez([0.5, W], [1.3, W], [1.55, 1.55], [2.3, 1.3], 24),
  ...bez([2.3, 1.3], [2.95, 1.05], [3.75, 1.08], [3.88, 0.55], 24).slice(1),
  ...bez([3.88, 0.55], [3.95, 0.2], [3.78, 0], [3.45, 0], 12).slice(1),
]
export const OUTLINE: Pt[] = [...BENT, [0, 0]]
export const CURVE_D = 2.3

/** The bentside's width at `d` (where a string of that width ends). */
export function bentU(d: number): number {
  if (d <= 0.5) return W
  for (let i = 1; i < BENT.length; i++) {
    if (BENT[i][0] >= d && BENT[i - 1][0] <= d) {
      const f = (d - BENT[i - 1][0]) / Math.max(1e-9, BENT[i][0] - BENT[i - 1][0])
      return BENT[i - 1][1] + (BENT[i][1] - BENT[i - 1][1]) * f
    }
  }
  return 0
}
/** Where a string `u` wide ends: the first d at which the bentside comes in to it. */
export function stringEnd(u: number): number {
  for (let i = 1; i < BENT.length; i++) if (BENT[i][1] <= u) {
    const f = (BENT[i - 1][1] - u) / Math.max(1e-9, BENT[i - 1][1] - BENT[i][1])
    return BENT[i - 1][0] + (BENT[i][0] - BENT[i - 1][0]) * f
  }
  return BENT[BENT.length - 1][0]
}

/** The rim along the front, on the screen, from the cheek to where the tail turns away: what he rolls on. */
/** The bentside from the cheek to `dMax`, going out: the tail's turn back to the spine left off. */
export const frontTo = (dMax: number): Pt[] => {
  const out: Pt[] = []
  for (const q of BENT) {
    if (q[0] > dMax || (out.length && q[0] < out[out.length - 1][0])) break
    out.push(q)
  }
  return out
}
const RIM_PTS: Pt[] = frontTo(3.7).map(([d, u]) => scr(d, u))
const RIM_CUM = lengths(RIM_PTS)
/** How far over the rim's top line his centre is. */
const ON_RIM = 0.16
export const onRim = (s: number): Pt => {
  const { p } = along(RIM_PTS, RIM_CUM, s)
  return [p[0], p[1] - ON_RIM]
}
/** The arc length along the rim at the point nearest `d` on it. */
const rimS = (d: number): number => {
  const [x] = scr(d, bentU(d))
  let best = 0
  for (let i = 0; i < RIM_PTS.length; i++) if (Math.abs(RIM_PTS[i][0] - x) < Math.abs(RIM_PTS[best][0] - x)) best = i
  return RIM_CUM[best]
}

/** The curve on the screen: where the negative hangs. */
export const CURVE_PT: Pt = scr(CURVE_D, bentU(CURVE_D))

/* ------------------------------------------------------------------ the clock */

/** The mother's notes before he is on the rim: the pulse coming back under the hush. */
export const EARLY_NOTES = [at(75, 1), at(75, 2), at(75, 4), at(76, 1)]
/** He sets off along the floor; is up on the bench beside her; on a key (his own note); on the rim. */
export const ROLL = at(76, 1)
export const HOP1 = at(76, 3)
export const BENCH = at(76, 4)
export const HOP2 = at(77, 1)
export const KEY = at(77, 2)
export const HOP3 = at(77, 3)
export const RIM = at(77, 4)
/** Her notes that carry him: each string she strikes ends under him on the rim, and its ring moves him on. */
export const NUDGES = [at(78, 1), at(78, 4), at(79, 2), at(79, 4), at(80, 4), at(81, 2), at(82, 1)]
/** He comes to rest at the curve, and the negative stops turning, face on: the clue solved. */
export const SOLVED = at(82, 3)
/** Her last note, low, at the back: nothing moves for it. */
export const LAST_NOTE = at(82, 4)
/** Every note she plays. */
export const NOTES = [...EARLY_NOTES, ...NUDGES, LAST_NOTE]

/* ------------------------------------------------------------------ his way */

export const BENCH_PT: Pt = [0.66, -0.66]
export const KEY_PT: Pt = [1.42, scr(-0.22, 2.0, RIM_Y + KEY_DROP)[1] - 0.13]
const RIM_S0 = rimS(0.22)
export const RIM_PT: Pt = onRim(RIM_S0)
/** Where he stops: just short of the curve, the negative beside him. */
const REST_D = 1.86
const RIM_S1 = rimS(REST_D)
export const REST_PT: Pt = onRim(RIM_S1)

/** How each kick dies away (s), and how far each goes: as far as a kick of the same strength goes in its gap. */
const TAU = 0.34
const KICKS = [...NUDGES, SOLVED]
const reach = KICKS.slice(0, -1).map((t, i) => 1 - Math.exp(-(KICKS[i + 1] - t) / TAU))
const sumReach = reach.reduce((a, b) => a + b, 0)
/** The arc length along the rim at each kick, and at rest. */
const S_AT: number[] = [RIM_S0]
for (const r of reach) S_AT.push(S_AT[S_AT.length - 1] + ((RIM_S1 - RIM_S0) * r) / sumReach)

/** Where he is along the rim at show time `t` (from the rim landing to rest). */
export function rimAt(t: number): Pt {
  if (t <= KICKS[0]) return onRim(RIM_S0)
  for (let i = 0; i < KICKS.length - 1; i++) {
    if (t <= KICKS[i + 1]) {
      const g = KICKS[i + 1] - KICKS[i]
      const f = (1 - Math.exp(-(t - KICKS[i]) / TAU)) / (1 - Math.exp(-g / TAU))
      return onRim(S_AT[i] + (S_AT[i + 1] - S_AT[i]) * f)
    }
  }
  return onRim(RIM_S1)
}

/** His whole way through the place, as segments, from T0 to T1 (seconds into the slot). */
export function homeLane(begin: number, end: number): Seg[] {
  const r = (t: number) => t - begin
  const arc = (T: number) => (G * T * T) / 8
  const ways: Way[] = [
    { at: 0, p: [-0.5, 0] },
    { at: r(ROLL), p: [-0.5, 0] },
    // A slow roll from rest to the foot of the bench, gathering.
    { at: r(HOP1), p: [-0.06, 0], ramp: [0, (2 * 0.44) / (HOP1 - ROLL)] },
    { at: r(BENCH), p: BENCH_PT, arc: arc(BENCH - HOP1) },
    { at: r(HOP2), p: BENCH_PT },
    { at: r(KEY), p: KEY_PT, arc: arc(KEY - HOP2) },
    { at: r(HOP3), p: KEY_PT },
    { at: r(RIM), p: RIM_PT, arc: arc(RIM - HOP3) },
    { at: r(KICKS[0]), p: RIM_PT },
  ]
  const segs = route(ways)
  // Along the rim on her notes, sampled finely so the lane is the rim's curve.
  for (let i = 0; i < KICKS.length - 1; i++) {
    const n = Math.max(8, Math.ceil((KICKS[i + 1] - KICKS[i]) / 0.025))
    segs.push(...carried((s) => rimAt(s + begin), r(KICKS[i]), r(KICKS[i + 1]), n))
  }
  segs.push({ from: REST_PT, to: REST_PT, dur: r(end) - r(SOLVED) })
  return segs
}
