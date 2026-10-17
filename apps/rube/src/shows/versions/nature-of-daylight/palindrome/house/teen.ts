import type p5 from 'p5'
import { R, type Pt } from '../../../../../parts'
import { launch, G } from '../physics'
import { SEAM, chord, nearestBeat } from '../music'
import { HANNAH_BY } from '../seams'
import { HANNAH_AGE } from '../worlds'
import { FLASH_X, STOOL, stool } from './flash'
import { FLOOR, hermite, ss, type Light } from './time'

/**
 * Years on, at the window (59.362 → 71.953): between the swing and the bed. The film's prologue has one hard moment
 * between the child and the illness, Hannah grown into a teenager who turns on her mother ("I hate you"), and the show
 * had none: a swing, then a deathbed. The same room toward evening, the light going; Hannah on the tall stool she drew
 * from as a child, by the glass, her back to the room. Her mother comes to her and touches the stool (the beat);
 * Hannah rounds on her (the beat), and on the chord shoves off it and away, the stool clattering on its feet behind
 * her and her mother flinching back, and rolls out of the room on the right without once looking back. Louise stays.
 * On the next chord she comes to the empty stool and touches it, and stays by it as the light goes; the cut to the bed
 * finds her beside it with Hannah where the stool stood, home, and ill.
 *
 * The house's world cells; she rests on the floor at (TEEN_X, 0), Hannah on her right a little above (HANNAH_BY).
 */

const b = (t: number): number => nearestBeat(t)

/** Where Louise rests: the flash's place at the glass, the same stool. */
export const TEEN_X = FLASH_X
/** Hannah on the stool: on Louise's right, a little above, as at every cut into the room. */
const ON: Pt = [TEEN_X + HANNAH_BY[0], HANNAH_BY[1]]
const SCALE = HANNAH_AGE.teen
/** The seat under her: a girl grown sits where the child sat. */
const SEAT_TOP = ON[1] + R * SCALE

export const TN = {
  in: SEAM.teen,
  /** Her mother at the stool. */
  touch: b(61.365),
  /** Hannah rounds on her. */
  rounds: b(62.357),
  /** And shoves off it and away, on the chord. */
  off: chord(15),
  /** Her mother at the empty stool, on the chord. */
  again: chord(16),
  out: SEAM.bed,
}
/** Every strike at the window: the room years on, the touch, Hannah rounding on her, her going, the empty stool. */
export const TEEN_HITS = [TN.in, TN.touch, TN.rounds, TN.off, TN.again]

/* ------------------------------------------------------------------ the stool */

/** Where Louise's middle is when her front meets the stool's left leg (slanted out from under the seat). */
const TOUCH_X = (() => {
  const top = SEAT_TOP + STOOL.seat.t
  const inset = STOOL.seat.w / 2 - 0.02
  const at0 = ON[0] - inset - ((STOOL.splay - inset) * (0 - top)) / (FLOOR - top)
  const slant = Math.atan((STOOL.splay - inset) / (FLOOR - top))
  return at0 - (R + STOOL.leg / 2) / Math.cos(slant)
})()

/** A bump from her: a little rock about its right foot, damped. */
const bump = (u: number, a: number): number => (u <= 0 ? 0 : a * Math.exp(-u / 0.35) * Math.sin(u * 15))
/** Shoved off: it kicks back onto its left feet as she leaves it, and rocks down onto all four. */
const kick = (u: number): number => (u <= 0 ? 0 : -0.11 * (u / 0.12) * Math.exp(1 - u / 0.12) - 0.02 * Math.exp(-u / 0.4) * Math.sin(u * 17))
/** The stool's tilt (clockwise) and the foot it turns on, at T. */
function tilt(T: number): { a: number; pivot: number } {
  const k = kick(T - TN.off)
  if (Math.abs(k) > 1e-4 && T < TN.again) return { a: k, pivot: ON[0] - STOOL.splay }
  return { a: bump(T - TN.touch, 0.03) * (T < TN.off ? 1 : 0) + bump(T - TN.again, 0.018), pivot: ON[0] + STOOL.splay }
}

/** Its shadow on the floor (the room's floor light keeps the low sun off behind it). */
export const TEEN_STOOL_HULL: Pt[] = [
  [ON[0] - STOOL.splay, FLOOR],
  [ON[0] - STOOL.seat.w / 2, SEAT_TOP],
  [ON[0] + STOOL.seat.w / 2, SEAT_TOP],
  [ON[0] + STOOL.splay, FLOOR],
]

export function drawTeenStool(p: p5, k: number, T: number, L: Light): void {
  const { a, pivot } = tilt(T)
  stool(p, k, L, ON[0], SEAT_TOP, a, pivot)
}

/* ------------------------------------------------------------------ Louise */

/**
 * Louise on the floor at T: to the stool on the beat, against its leg; flinching back as Hannah goes; still while she
 * goes; to the empty stool on the chord; and back to her place beside it, at rest by the cut.
 */
export function teenX(T: number): number {
  const go = TN.touch - 0.85
  if (T <= go) return TEEN_X
  if (T < TN.touch) return hermite(T - go, TN.touch - go, TEEN_X, 0, TOUCH_X, 0.45)
  const flinch = TOUCH_X - 0.03
  if (T < TN.off) return TOUCH_X - 0.03 * ss(T, TN.touch, TN.touch + 0.3)
  const back = TOUCH_X - 0.3
  if (T < TN.off + 0.6) return hermite(T - TN.off, 0.6, flinch, -1.2, back, 0)
  const come = TN.again - 1.1
  if (T < come) return back
  if (T < TN.again) return hermite(T - come, TN.again - come, back, 0, TOUCH_X, 0.25)
  const leave = TN.again + 0.9
  if (T < leave) return TOUCH_X - 0.02 * ss(T, TN.again, TN.again + 0.3)
  if (T < leave + 1.8) return hermite(T - leave, 1.8, TOUCH_X - 0.02, 0, TEEN_X, 0)
  return TEEN_X
}

/* ------------------------------------------------------------------ Hannah */

/** Off the stool: a hop down to the floor on its right, on the chord, then away to the right, faster and faster. */
const HOP = 0.36
const LAND: Pt = [ON[0] + 0.75, FLOOR - R * SCALE]
const LEAVE = launch(ON, LAND, HOP)
/** Past the room's whole frame by then: her span ends there, long out of shot. */
const GONE_X = 14
const away = (s: number): number => LAND[0] + LEAVE.in[0] * s + 0.35 * s * s
export const TEEN_GONE = (() => {
  let s = 0
  while (away(s) < GONE_X) s += 0.02
  return TN.off + HOP + s
})()

/** Hannah at T (world cells), or null once she is out of the room. */
export function hannahTeenAt(T: number): Pt | null {
  if (T < TN.off) {
    // Rocking with the stool when her mother bumps it; drawn up at her as she rounds on her.
    const { a } = tilt(T)
    const jolt = ss(T, TN.rounds - 0.06, TN.rounds + 0.08) * (1 - ss(T, TN.rounds + 0.35, TN.off - 0.1))
    return [ON[0] + a * (FLOOR - SEAT_TOP) - 0.06 * jolt, ON[1] - 0.05 * jolt]
  }
  const s = T - TN.off
  if (s < HOP) return [ON[0] + LEAVE.out[0] * s, ON[1] + LEAVE.out[1] * s + 0.5 * G * s * s]
  if (T >= TEEN_GONE) return null
  return [away(s - HOP), LAND[1]]
}
/** Whether she is on the floor (for her reflection and her shadow). */
export const hannahTeenDown = (T: number): boolean => T >= TN.off + HOP && T < TEEN_GONE

/** Where she looks: out through the glass, her back to the room; round at her mother; then the way she goes. */
export function hannahTeenLook(T: number): number {
  const out = -Math.PI / 2 + 0.55
  const her = Math.PI - 0.3
  const go = 0.05
  const round = ss(T, TN.rounds - 0.05, TN.rounds + 0.12)
  const leave = ss(T, TN.off - 0.12, TN.off + 0.05)
  return out + (her - out) * round * (1 - leave) + (go - out) * leave
}

/** The camera, in the house's world cells: [t, cells, hold x, hold y, a cut on it]. */
export const TEEN_SHOTS: [number, number, number, number, boolean][] = [
  // From the swing's framing, slowly in on the two of them at the stool;
  [61.2, 3.5, TEEN_X + 0.62, -0.56, false],
  [TN.off - 0.05, 3.4, TEEN_X + 0.63, -0.56, false],
  // drawn back and after her as she goes, the room to the right open for her to cross and leave by, Louise kept in it;
  [TN.off + 1.4, 4.4, TEEN_X + 2.35, -0.95, false],
  [TN.off + 3.0, 4.4, TEEN_X + 2.3, -0.95, false],
  // and back in on Louise at the empty stool, to the framing the cut to the bed carries.
  [TN.again + 0.4, 4.2, TEEN_X + 0.75, -0.78, false],
  [TN.out, 4.6, TEEN_X + 1.05, -0.95, false],
]
