import type { Pt } from '../../../../../parts'
import { smooth } from '../kit'
import { SEAM, beats, chords } from '../music'

/**
 * The gala, years on, as a plan (gala world cells, y down; the floor's top at y = R, so a ball on it has y = 0).
 *
 *   266.124  at rest in the room, in champagne light, beside the tower of coupes and its pouring stand; the ring she
 *            was shown carried in with her, its ghost paling over the room.
 *   267.012  she rolls onto the stand's pedal: the bottle over the tower tips and pours.
 *   267.964  the top coupe brims and runs over into the tier below...
 *   268.968  ...the second tier brims...
 *   269.915  ...the third (and across the room, out of the picture, Shang sets off toward her)...
 *   270.878  ...the fourth: the tower full, alight tier by tier; the bottle runs dry.
 *   272.869  she rolls off the pedal and goes to him (the bottle rights itself); the room raises its glasses; he
 *            comes on to her.
 *   274.802  he leans in and they touch: he tells her (his number, his wife's last words: a whisper is a touch), and a
 *            ghost of the sat phone comes up beside them, lighting the first of his number.
 *   277.647  at rest, Shang on her right at [0.34, 0]. (The tent: the call.)
 */

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 2
const easeInOut = (u: number) => smooth(u, 0, 1)

/* ------------------------------------------------------------------ the clock */

export const T_IN = SEAM.gala
export const T_OUT = SEAM.call
/** The pedal, then the five tiers brimming, one on each beat. */
export const [T_PEDAL, T_T1, T_T2, T_T3, T_T4, T_T5] = beats(SEAM.gala + 0.5, SEAM.gala + 5.9)
/** The chords Shang comes on: he sets off; he comes on to her as she goes to him. */
export const [T_SHANG, T_TOAST] = chords(SEAM.gala + 1, SEAM.call - 1)
/** The whisper: he leans in and they touch. */
export const T_TOUCH = beats(274.6, 275)[0]

export const GALA_STRIKES: number[] = [T_PEDAL, T_T1, T_T2, T_T3, T_T4, T_T5, T_TOAST, T_TOUCH]

/* ------------------------------------------------------------------ the tower and its stand */

export const P0: Pt = [-0.5, 0]
/** The table the tower stands on: its top's height and span. */
export const TABLE = { x: -2.3, top: -0.5, half: 1.05 }
/** The tower: coupes this wide, this far apart, this tall (foot to rim), tiers from the top. */
export const COUPE = { w: 0.39, gap: 0.4, h: 0.32, bowl: 0.12 }
export const TIERS = 5
/** Where coupe `j` of tier `i` (0 the top) stands: its rim's centre. */
export const coupeAt = (i: number, j: number): Pt => [TABLE.x + (j - i / 2) * COUPE.gap, TABLE.top - (TIERS - i) * COUPE.h]
/** When each tier brims. */
export const BRIM = [T_T1, T_T2, T_T3, T_T4, T_T5]
/** How full tier `i` is, 0..1: from when the tier over it brims (the pour, for the top) to its own brim. */
export function tierFill(i: number, t: number): number {
  const a = i === 0 ? T_PEDAL + 0.3 : BRIM[i - 1]
  const b = BRIM[i]
  if (t <= a) return 0
  // Filling fastest at first, easing as it comes to the brim, like a glass poured into.
  return Math.min(1, easeOut((t - a) / (b - a)) * 1.0)
}

/** The stand: a slender post by the table, the bottle's cradle over the tower, the pedal at its foot. */
// Its free end still under her as she rests on it, and a ball's width short of where she ends beside him, so it never
// touches her side after (it ended against her, and read as a rod from the stand to her).
export const PEDAL = { hinge: -1.15, end: -0.8, lift: 0.07 }
/** The bottle turns in its cradle about this point: at rest leaning back, pouring tipped over the top coupe. */
const POUR = (-40 * Math.PI) / 180
const MOUTH: Pt = [TABLE.x, TABLE.top - TIERS * COUPE.h - 0.25]
export const BOTTLE = { c: [MOUTH[0] + 0.5 * Math.cos(POUR), MOUTH[1] + 0.5 * Math.sin(POUR)] as Pt, half: 0.5, rest: (25 * Math.PI) / 180, pour: POUR }
export const POST = { x: -1.2, top: BOTTLE.c[1] }
/** The pedal pressed, 0..1: under her weight from the moment she is on it, and up again when she rolls off. */
export const pedalDown = (t: number): number => smooth(t, T_PEDAL - 0.05, T_PEDAL + 0.22) * (1 - smooth(t, T_TOAST, T_TOAST + 0.35))
/** The bottle's tip, 0 at rest to 1 pouring: it follows the pedal, a little behind it, and overshoots and settles. */
export function bottleTip(t: number): number {
  const down = smooth(t, T_PEDAL, T_PEDAL + 0.38)
  const settle = t > T_PEDAL + 0.38 ? 0.06 * Math.sin((t - T_PEDAL - 0.38) * 9) * Math.exp(-(t - T_PEDAL - 0.38) / 0.3) : 0
  const up = smooth(t, T_TOAST + 0.05, T_TOAST + 0.75)
  return Math.max(0, down + settle) * (1 - up)
}
export const bottleAngle = (t: number): number => BOTTLE.rest + (BOTTLE.pour - BOTTLE.rest) * bottleTip(t)
/** How much is running out of the bottle: from when it has tipped to when it is righted. */
export const pourFlow = (t: number): number => smooth(t, T_PEDAL + 0.22, T_PEDAL + 0.42) * (1 - smooth(t, T_TOAST - 0.1, T_TOAST + 0.3))
/** The bottle's mouth. */
export function mouthAt(t: number): Pt {
  const a = bottleAngle(t)
  return [BOTTLE.c[0] - Math.cos(a) * BOTTLE.half, BOTTLE.c[1] - Math.sin(a) * BOTTLE.half]
}

/** The hush as he tells her: the room falls back into its haze round the two of them, and stays back. */
export const hush = (t: number): number => smooth(t, T_TOAST + 0.6, T_TOUCH + 1.0)

/* ------------------------------------------------------------------ Louise and Shang */

/** She rests on the pedal here, and comes back to where she began to meet him. */
const ON_PEDAL = -0.93
/** Her height over the pedal as she rolls onto its raised end and it goes down under her. */
function pedalTop(x: number, t: number): number {
  if (x > PEDAL.end + 0.13 || x < PEDAL.hinge) return 0
  const u = clamp01((x - PEDAL.hinge) / (PEDAL.end - PEDAL.hinge))
  // The plate's top at x: raised at its free end, flat when pressed.
  const plate = -PEDAL.lift * u * (1 - pedalDown(t))
  // Over its end, she rolls up onto the step.
  const over = x > PEDAL.end ? -PEDAL.lift * (1 - pedalDown(t)) * Math.sqrt(Math.max(0, 1 - ((x - PEDAL.end) / 0.13) ** 2)) : plate
  return x > PEDAL.end ? over : plate
}
/** Louise at the gala, at show time `t`. */
export function herAt(t: number): Pt {
  let x: number
  if (t <= T_IN + 0.15) x = P0[0]
  else if (t < T_PEDAL) x = P0[0] + (ON_PEDAL - P0[0]) * easeInOut((t - T_IN - 0.15) / (T_PEDAL - T_IN - 0.15))
  else if (t < T_TOAST) x = ON_PEDAL
  else x = ON_PEDAL + (HER_END[0] - ON_PEDAL) * easeInOut((t - T_TOAST) / 1.2)
  return [x, pedalTop(x, t)]
}
/** Where she ends: a little short of where she began, the tower whole in the frame behind the two of them. */
export const HER_END: Pt = [-0.54, 0]

/** Shang: from out of the picture on her right, in two pushes on the two chords, then the lean and the whisper. */
export const SHANG_FROM = 8.2
const S1 = 2.4
const NEAR_S = HER_END[0] + 0.62
const TOUCH_S = HER_END[0] + 0.26
const REST_S = HER_END[0] + 0.34
export function shangAt(t: number): Pt {
  let x: number
  if (t <= T_SHANG) x = SHANG_FROM
  else if (t < T_SHANG + 2.1) x = SHANG_FROM + (S1 - SHANG_FROM) * easeOut((t - T_SHANG) / 2.1)
  else if (t < T_TOAST) x = S1
  else if (t < T_TOAST + 1.45) x = S1 + (NEAR_S - S1) * easeOut((t - T_TOAST) / 1.45)
  else if (t < T_TOUCH) x = NEAR_S + (TOUCH_S - NEAR_S) * easeInOut((t - T_TOAST - 1.45) / (T_TOUCH - T_TOAST - 1.45))
  else if (t < T_TOUCH + 1.5) x = TOUCH_S
  else x = TOUCH_S + (REST_S - TOUCH_S) * easeInOut((t - T_TOUCH - 1.5) / (T_OUT - 0.25 - T_TOUCH - 1.5))
  return [x, 0]
}

/* ------------------------------------------------------------------ the camera */

export interface WorldShot {
  t: number
  cells: number
  hold: Pt
}
export const GALA_SHOTS: WorldShot[] = [
  { t: T_PEDAL + 0.25, cells: 5.0, hold: [-1.3, -1.35] },
  { t: T_T3 + 0.4, cells: 6.5, hold: [0.2, -1.75] },
  { t: T_TOAST + 0.25, cells: 5.4, hold: [-0.4, -1.3] },
  // The whisper: in close on the two of them touching, the tower's light behind them, and out again to the seam.
  { t: T_TOUCH + 1.2, cells: 3.0, hold: [HER_END[0] - 0.08, HER_END[1] - 0.32] },
  { t: T_OUT, cells: 4.4, hold: [HER_END[0] + 0.8, HER_END[1] - 0.8] },
]
