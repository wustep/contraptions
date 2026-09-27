import type { Pt } from '../../../../../parts'
import { inkRing, type Ring } from '../cast'
import { smooth } from '../kit'
import { SEAM, beats, chords, nearestBeat } from '../music'

/**
 * Beyond the glass, as a plan: where everything in the fog is at every show time, in the fog's own world cells (y
 * down). The drawing (`draw.ts`) and the lanes (`fog.ts`) both read it, so the ink she rides is the ink drawn.
 *
 *   231.039  out of the white (the director's veil clears): Louise alone, at rest, hanging in the fog; Costello comes
 *            to her out of it, near; far back, Abbott sinks and pales.
 *   233.924  Costello's limb points at her and its ink jets to her: the great logogram begins under her and is written
 *            both ways round at once, and she is lifted on it.
 *   235.892  a stroke on the hard beat.
 *   238.713  a stroke: the two fronts surge up its sides, the ink lifting her higher.
 *   240.582  a stroke: the fronts race for the top.
 *   242.480  the fronts meet over her (the tonic): it closes and flings out its strokes.
 *   242.480 → 246.340  it turns half round, carrying her with it up its side to its top.
 *   246.340  at the top the ink lets her go: she falls through the middle of it in the fog's low gravity...
 *   248.216  ...and lands where its two ends met, now its bottom (the hard beat): it gives under her; the great one,
 *            read, spreads and pales into the white beneath her; and Costello, drawn back into the white, holds out its
 *            palm on her right and begins a small logogram there, where Hannah will be on the other side of the cut.
 *   250.120  at rest in the white, the small ring half written. (The swing on the lawn: what she is shown.)
 *   257.683  back: the small ring writing on from Costello's palm and growing on each stroke (the chord, and the two
 *            strongest beats after it) until it and she are the whole frame; the fog gathers grey round it as its ends
 *            come round to her, and she floats to it...
 *   262.374  ...and touches it as its two ends meet on her side, the palm on the other: it closes, and the white floods
 *            out from it over everything but it and her, for a beat: she knows.
 *   264.237  the vision lets her go: the palm draws back, the ring rises and pales, and she comes down out of it.
 *   266.124  at rest, the ring a ghost over her on her right. (The gala, years on.)
 */

export const TAU = Math.PI * 2
export const RB = 0.13
const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 2

/* ------------------------------------------------------------------ the clock */

const [C0, C1, C2, C3, C4, C5, C6] = chords(SEAM.fog, SEAM.sees)
/** The cut in, out of the white. */
export const T_IN = C0
/** The first ink. */
export const T_TOUCH = C1
/** The fronts' two strokes. */
export const T_S2 = C2
export const T_S3 = C3
/** The ring closes over her (B-flat minor). */
export const T_CLOSE = C4
/** At the top of its half turn, it lets her go. */
export const T_RELEASE = C5
/** She lands where its ends met: the hard beat between the release and the cut. */
export const T_LAND = nearestBeat(248.2)
/** The cut to the swing. */
export const T_OUT = C6
/** Back from the swing. */
export const T_BACK = SEAM.fog2
/** The small ring's strokes: on the chord she comes back on, and on the two strongest beats after it. */
export const SMALL_STEPS = [SEAM.fog2, beats(259.3, 259.6)[0], beats(260.3, 260.6)[0]]
/** It closes; and the vision lets her go. */
export const [T_KNOW, T_DOWN] = chords(SEAM.fog2 + 1, SEAM.gala - 1)
export const T_GALA = SEAM.gala

/** The hard beat between the first two chords: a stroke of its own. */
export const T_B1 = nearestBeat(235.9)

/** Every strike beyond the glass. */
export const FOG_STRIKES: number[] = [T_TOUCH, T_B1, T_S2, T_S3, T_CLOSE, T_RELEASE, T_LAND, ...SMALL_STEPS, T_KNOW, T_DOWN]

/* ------------------------------------------------------------------ the great ring */

/** Sentence 253: heavy down its left, thin and clean where it begins and where it closes. */
export const GREAT: Ring = inkRing(253)
export const RG = 1.25

/**
 * How far the ring is written: a burst out of the jet, then its strokes, each surging and easing: on the chords, and
 * on the hard beat between the first two; the last gathers pace so that its two fronts run into each other.
 */
const STROKES: [number, number][] = [
  [T_TOUCH, 0],
  [T_B1, 0.3],
  [T_S2, 0.42],
  [T_S3, 0.68],
  [T_CLOSE, 1],
]
function stroked(t: number, ends: number[]): number {
  if (t <= STROKES[0][0]) return 0
  for (let i = 1; i < STROKES.length; i++) {
    const [ta] = STROKES[i - 1]
    const [tb] = STROKES[i]
    if (t < tb) {
      const s = (t - ta) / (tb - ta)
      const e = i === STROKES.length - 1 && ends === U_ENDS ? 0.35 * s + 0.65 * s * s : easeOut(s)
      return ends[i - 1] + (ends[i] - ends[i - 1]) * e
    }
  }
  return ends[ends.length - 1]
}
const U_ENDS = STROKES.map(([, u]) => u)
export function greatU(t: number): number {
  if (t <= T_TOUCH) return 0
  return Math.min(1, stroked(t, U_ENDS) + 0.08 * easeOut((t - T_TOUCH) / 0.35) * (1 - smooth(t, T_TOUCH + 0.4, T_B1)))
}
/** Its strokes flung out as it closes. */
export const greatTendrils = (t: number): number => easeOut((t - T_CLOSE) / 1.2)
/** The ink's breath as it settles: over by the time it lets her go. */
export const greatBloom = (t: number): number => smooth(t, T_CLOSE, T_RELEASE - 0.4)
/** Read: after her landing it pales into the white where it is, gone by the cut. */
export const greatPale = (t: number): number => smooth(t, T_LAND + 0.3, T_OUT - 0.1)

/** Its drawn radius and band, as `drawInk` has them, at ring angle `a`. */
function band(a: number, t: number): { mid: number; half: number } {
  const Rp = RG * (1 + 0.04 * greatBloom(t))
  return { mid: Rp * GREAT.r(a), half: (Rp * GREAT.w(a)) / 2 }
}
/** How far from its centre a ball riding its inner edge at ring angle `a` is: on the ink's wet edge, not in it. */
export const rideR = (a: number, t: number): number => {
  const b = band(a, t)
  return b.mid - 1.3 * b.half - RB
}

/**
 * Its turn: the start of the writing turned to its bottom, and from the close a half turn, her side going up the left;
 * at the top it lets her go with a start, rocking on a little past the half and back, damped.
 */
const PHI0 = Math.PI / 2 - GREAT.start
const letGo = (t: number): number => (t <= T_RELEASE ? 0 : 0.09 * Math.sin(((t - T_RELEASE) / 1.5) * TAU) * Math.exp(-(t - T_RELEASE) / 0.6))
export const greatTurn = (t: number): number => PHI0 + Math.PI * smooth(t, T_CLOSE, T_RELEASE) + letGo(t)

/** Where she hangs out of the white, and so where the ring is written round. */
export const P0: Pt = [-0.5, 0]
const LIFT = 0.4
/** The lift the ink gives her on each stroke (a share of LIFT), easing out of each. */
const LIFT_ENDS = [0, 0.25, 0.4, 0.7, 1]
const lift = (t: number): number => stroked(t, LIFT_ENDS)
/** A heave of the ink under her as the jet lands: it takes her weight. */
const heave = (t: number): number => (t < T_TOUCH ? 0 : 0.08 * Math.sin(Math.min(Math.PI, ((t - T_TOUCH) / 0.9) * Math.PI)) * Math.exp(-(t - T_TOUCH) / 0.9))

export const G0: Pt = [P0[0], P0[1] - rideR(GREAT.start, T_TOUCH)]
/** The fall from its top to its bottom, and the gravity of the fog that makes it take exactly the gap to the beat. */
const FALL_T = T_LAND - T_RELEASE
const DROP = rideR(GREAT.start, T_RELEASE) + rideR(GREAT.start + Math.PI, T_RELEASE)
export const G_FOG = (2 * DROP) / (FALL_T * FALL_T)
/** The ring giving under her as she lands, and springing back: still by the cut. */
function recoil(t: number): number {
  const s = t - T_LAND
  if (s <= 0) return 0
  return 0.1 * Math.sin((s / 0.95) * TAU) * Math.exp(-s / 0.42) * (1 - smooth(s, 1.1, 1.75))
}
/** The ring's centre. */
export function greatC(t: number): Pt {
  return [G0[0], G0[1] - LIFT * lift(t) - heave(t) + recoil(t)]
}
/** Where she lands, as the ring has it then. */
const LANDED = G0[1] - LIFT + rideR(GREAT.start + Math.PI, T_RELEASE)

/* ------------------------------------------------------------------ the small ring */

/** Sentence 205: Hannah's. Clean, thin at its top, few blots. */
export const SMALL: Ring = inkRing(205)
/** Its size when she is shown the swing: small, where Hannah will be; and what it grows to as she reads it. */
export const RS = 0.36
const RK = 1.3
/** Where she hangs when she is shown the swing (the landing, the ring's spring spent): at rest. */
const LANDED_AT: Pt = [G0[0], LANDED]
/** Where Hannah will be on the other side of the cut: at HANNAH_BY from her. */
const SMALL_AT: Pt = [LANDED_AT[0] + 1.0, LANDED_AT[1] - 0.35]
/** The way from it to her, and the angle it closes at: facing her, so that she closes it. */
const TOWARD = Math.atan2(LANDED_AT[1] - SMALL_AT[1], LANDED_AT[0] - SMALL_AT[0])
const DIR: Pt = [Math.cos(TOWARD), Math.sin(TOWARD)]
const CLOSE_A = SMALL.start + Math.PI
/** Turned so its writing begins on its far side and its two ends meet on the side toward her. */
export const SMALL_TURN = TOWARD - CLOSE_A
/** Its size: small through the swing; then, as she comes back to it, growing on each of its strokes until it is the
 * whole of what she sees when it closes. */
export function smallR(t: number): number {
  const pts: [number, number][] = [
    [T_BACK, RS],
    [SMALL_STEPS[1], 0.78],
    [SMALL_STEPS[2], 1.08],
    [T_KNOW, RK],
  ]
  if (t <= pts[0][0]) return RS
  for (let i = 1; i < pts.length; i++) {
    const [ta, ra] = pts[i - 1]
    const [tb, rb] = pts[i]
    if (t < tb) return ra + (rb - ra) * easeOut((t - ta) / (tb - ta))
  }
  return RK
}
export const smallTendrils = (t: number): number => easeOut((t - T_KNOW) / 1.1)
export const smallBloom = (t: number): number => smooth(t, T_KNOW, T_KNOW + 3.2)
/** Read: as the vision lets her go it pales where it is, drifting off. */
export const smallPale = (t: number): number => 0.8 * smooth(t, T_DOWN, T_GALA + 0.3)
/** Its drawn radius, as `drawInk` has it. */
const smallRp = (t: number): number => smallR(t) * (1 + 0.04 * smallBloom(t))
/** The point of its ink nearest her (where its ends meet): it stays put as it grows, so it grows away from her. */
const NEAR_PT: Pt = [SMALL_AT[0] + DIR[0] * RS * SMALL.r(CLOSE_A), SMALL_AT[1] + DIR[1] * RS * SMALL.r(CLOSE_A)]
/** Where it is: grown away from her; as the vision lets her go, rising away up on her right. */
export function smallC(t: number): Pt {
  const r = smallRp(t) * SMALL.r(CLOSE_A)
  const u = t <= T_DOWN ? 0 : easeOut((t - T_DOWN) / (T_GALA - T_DOWN))
  return [NEAR_PT[0] - DIR[0] * r + 0.25 * u, NEAR_PT[1] - DIR[1] * r - 0.55 * u]
}
/** Where she touches it: her edge on its wet edge where its ends meet, as it is when they meet. */
const TOUCH_AT: Pt = [NEAR_PT[0] + DIR[0] * ((1.3 * RK * SMALL.w(CLOSE_A)) / 2 + RB + 0.005), NEAR_PT[1] + DIR[1] * ((1.3 * RK * SMALL.w(CLOSE_A)) / 2 + RB + 0.005)]
/** Its far side, where its writing begins and Costello's palm holds it. */
export function smallFar(t: number, out = 0): Pt {
  const c = smallC(t)
  const r = smallRp(t) * SMALL.r(SMALL.start) + out
  return [c[0] - DIR[0] * r, c[1] - DIR[1] * r]
}
/** How far it is written: out of Costello's palm on her landing, on through the swing unseen, a stroke on each of three,
 * and closed. */
export function smallU(t: number): number {
  if (t <= T_LAND) return 0
  const pts: [number, number][] = [
    [T_LAND, 0],
    [T_OUT, 0.5],
    [SMALL_STEPS[0], 0.6],
    [SMALL_STEPS[1], 0.72],
    [SMALL_STEPS[2], 0.84],
    [T_KNOW, 1],
  ]
  for (let i = 1; i < pts.length; i++) {
    const [ta, ua] = pts[i - 1]
    const [tb, ub] = pts[i]
    if (t < tb) {
      const s = (t - ta) / (tb - ta)
      // Out of the landing it bursts and eases; while she is away it creeps; each stroke after surges and eases, and
      // the last runs its ends into each other as she reaches it.
      if (i === 1) return ua + (ub - ua) * (1 - (1 - s) ** 3)
      if (i === 2) return ua + (ub - ua) * s
      if (i === pts.length - 1) return ua + (ub - ua) * (0.3 * s + 0.7 * s * s)
      return ua + (ub - ua) * easeOut(s)
    }
  }
  return 1
}
/** Before she knows: from the second stroke the white round them goes to a grey dusk as its ends come round to her;
 * the flood on the chord takes it away. */
export const gathering = (t: number): number => 0.68 * smooth(t, SMALL_STEPS[1], T_KNOW - 0.05) * (1 - smooth(t, T_KNOW + 0.05, T_KNOW + 0.3))
/** She knows: on the chord the white floods out from the ring over everything but it and her, holds for a beat, and
 * settles. `a` its strength, `r` how far out it has come (a share of the frame). */
export function flood(t: number): { a: number; r: number } {
  if (t <= T_KNOW) return { a: 0, r: 0 }
  const s = t - T_KNOW
  const a = 0.95 * smooth(s, 0, 0.12) * (1 - 0.72 * smooth(t, T_KNOW + 0.94, T_DOWN + 0.4)) * (1 - 0.6 * smooth(t, T_DOWN + 0.4, T_GALA))
  return { a, r: easeOut(s / 0.45) }
}

/* ------------------------------------------------------------------ her */

/** Drawn to it: from the second stroke she floats to it and touches it as its ends meet. */
const toward = (t: number): number => smooth(t, SMALL_STEPS[1], T_KNOW)
/** The vision letting her go: she comes down out of it, easing to rest. */
const DOWN = 0.42
const down = (t: number): number => DOWN * easeOut((t - T_DOWN) / (T_GALA - 0.2 - T_DOWN))

/** Louise, beyond the glass, at show time `t` (fog world cells). */
export function herAt(t: number): Pt {
  if (t <= T_TOUCH) return P0
  const c = greatC(t)
  if (t <= T_RELEASE) {
    // Riding the ring where its writing began: its bottom until the close, then carried round.
    const a = greatTurn(t) + GREAT.start
    const r = rideR(GREAT.start, t)
    return [c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r]
  }
  if (t < T_LAND) {
    const top = c[1] - rideR(GREAT.start, T_RELEASE)
    const s = t - T_RELEASE
    return [c[0], top + 0.5 * G_FOG * s * s]
  }
  // Where its ends met, giving under her with the ring and springing back; hanging there as it goes; then to the small
  // ring, and down.
  const u = toward(t)
  return [LANDED_AT[0] + (TOUCH_AT[0] - LANDED_AT[0]) * u, LANDED_AT[1] + recoil(t) + (TOUCH_AT[1] - LANDED_AT[1]) * u + (t > T_DOWN ? down(t) : 0)]
}

/** Where she rests when she is shown the swing, and when she comes back: the same place. */
export const P_SEES: Pt = herAt(T_OUT)

/* ------------------------------------------------------------------ the heptapods */

/** fog2's frame's centre, from her at the cut back: what the far things are placed to be seen from. */
export const FC2: Pt = [P_SEES[0] + 1.05, P_SEES[1] - 1.0]
/** A point at depth `d` placed to be seen at `off` from her from fog2's frame. */
export const behind = (d: number, off: Pt): Pt => [FC2[0] + (P_SEES[0] + off[0] - FC2[0]) / d, FC2[1] + (P_SEES[1] + off[1] - FC2[1]) / d]

/**
 * Costello: out of the fog to her, near on her right, in her own depth, its limb pointing at her for the first ink;
 * then, as the great ring turns, drawn back into the white, where it stands far off on her right, whole in the close
 * frames, holds out its palm and writes the small ring, and holds it there while she is shown, until she has read it.
 */
const COSTELLO_S = 8.5
/** The wide on the ring: the whole of it, and Costello's body over it on the right. */
const WIDE_C: Pt = [G0[0] + 1.0, G0[1] - 0.35]
/** Near: in the fog on her right, a little back, its body whole beside the ring in the wide, its feet lost below. */
const NEAR_D = 0.6
const NEAR: Pt = [WIDE_C[0] + 3.15 / NEAR_D, WIDE_C[1] + (-0.6 + 0.72 * COSTELLO_S * NEAR_D) / NEAR_D]
const FAR_D = 0.5
/** Far: standing in the white on her right, whole in the close frames, its feet lost in the fog under her. */
const FAR: Pt = behind(FAR_D, [6.4, 2.1])
export function costelloAt(t: number): { at: Pt; d: number; fog: number; s: number } {
  const come = smooth(t, T_IN + 0.2, T_TOUCH - 0.3)
  const go = smooth(t, T_CLOSE + 0.6, T_RELEASE + 0.4)
  const d = NEAR_D + (FAR_D - NEAR_D) * go
  const x = NEAR[0] + 2.2 * (1 - come) + (FAR[0] - NEAR[0]) * go
  const y = NEAR[1] + (FAR[1] - NEAR[1]) * go
  const fog = 0.94 - 0.34 * come + 0.08 * go + 0.03 * Math.sin(t * 0.3)
  return { at: [x, y], d, fog, s: COSTELLO_S }
}
/** Its first pointing: its tip a little under her on her right, where its jet comes from. */
const TIP1: Pt = [P0[0] + 0.75, P0[1] + 0.32]
/** Its pointing limb, in her plane: at her for the first ink; at the small ring's far side for the second. */
export function costelloReach(t: number): { to: Pt; u: number; open: number } | undefined {
  const u1 = smooth(t, T_IN + 1.0, T_TOUCH - 0.3) * (1 - smooth(t, T_TOUCH + 1.2, T_TOUCH + 4.2))
  if (u1 > 0.001) return { to: TIP1, u: u1, open: 0.3 * smooth(t, T_TOUCH - 0.9, T_TOUCH - 0.3) }
  const u2 = smooth(t, T_RELEASE + 0.2, T_LAND - 0.1) * (1 - smooth(t, T_DOWN, T_DOWN + 2.2))
  // Its fingers spread wider as she touches the other side of the ring.
  const spread = 0.28 * smooth(t, T_KNOW - 0.25, T_KNOW + 0.35) * (1 - smooth(t, T_DOWN - 0.4, T_DOWN + 0.6))
  // Its palm just off the ring's far side, its fingertips on the ink, following the ring as it grows.
  if (u2 > 0.001) return { to: smallFar(t, 0.4), u: u2, open: (0.5 + spread) * smooth(t, T_LAND - 0.6, T_LAND) * (1 - 0.5 * smooth(t, T_DOWN, T_DOWN + 1.2)) }
  return undefined
}
/** The jets: from the limb's tip to where the ink begins, landing on the beat. */
export const JETS = [
  { from: T_TOUCH - 0.32, to: T_TOUCH, fade: T_TOUCH + 0.9, tip: TIP1, at: [P0[0], P0[1] + RB + 0.06] as Pt, sag: 0.16 },
]
/**
 * Abbott: far back on the left, in the white: seen as the frame opens, then sinking and paling as it dies. Placed from
 * the wide's frame: its feet under the frame's foot, its body low on the left, clear of the ring.
 */
const ABBOTT_D = 0.3
export const ABBOTT = { at: [WIDE_C[0] - 3.4 / ABBOTT_D, WIDE_C[1] + 2.5 / ABBOTT_D] as Pt, s: 11, seed: 1, depth: ABBOTT_D }
export const abbottFog = (t: number): number => 1 - 0.5 * smooth(t, T_TOUCH + 1.3, T_S2 - 0.8) + 0.46 * smooth(t, T_S2 - 0.5, T_LAND)
export const abbottSink = (t: number): number => 2.6 * smooth(t, T_S2 - 2, T_OUT + 1)

/* ------------------------------------------------------------------ the camera, in world cells */

export interface WorldShot {
  t: number
  cells: number
  hold: Pt
}
const her = (t: number, off: Pt): Pt => {
  const h = herAt(t)
  return [h[0] + off[0], h[1] + off[1]]
}
/** The wide: the whole ring and Costello's body over it. */
const WIDE = (dx: number, dy: number): Pt => [WIDE_C[0] + dx, WIDE_C[1] + dy]
export const FOG1_SHOTS: WorldShot[] = [
  { t: T_IN + 1.1, cells: 5.1, hold: her(T_IN, [0.65, -0.75]) },
  { t: T_TOUCH + 0.4, cells: 5.3, hold: [P0[0] + 0.9, P0[1] - 0.65] },
  { t: T_S2, cells: 5.5, hold: WIDE(0, 0) },
  { t: T_CLOSE, cells: 5.4, hold: WIDE(-0.05, -0.1) },
  { t: T_RELEASE, cells: 5.3, hold: WIDE(-0.1, -0.15) },
  { t: T_LAND, cells: 5.0, hold: her(T_OUT, [0.8, -0.95]) },
  { t: T_OUT, cells: 4.6, hold: her(T_OUT, [1.05, -0.95]) },
]
/** When she knows: the ring and her, the whole of the frame. */
const KNOW_MID: Pt = [0.4 * TOUCH_AT[0] + 0.6 * smallC(T_KNOW)[0], 0.4 * TOUCH_AT[1] + 0.6 * smallC(T_KNOW)[1] - 0.05]
export const FOG2_SHOTS: WorldShot[] = [
  { t: T_BACK + 1.8, cells: 4.35, hold: [(her(T_OUT, [1.05, -0.95])[0] + KNOW_MID[0]) / 2, (her(T_OUT, [1.05, -0.95])[1] + KNOW_MID[1]) / 2] },
  { t: T_KNOW, cells: 4.25, hold: KNOW_MID },
  { t: T_KNOW + 0.94, cells: 4.1, hold: KNOW_MID },
  { t: T_DOWN, cells: 4.2, hold: [KNOW_MID[0] - 0.05, KNOW_MID[1] - 0.1] },
  { t: T_GALA, cells: 4.4, hold: her(T_GALA, [0.8, -0.8]) },
]
