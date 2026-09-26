import { RIDE, SNARES, ONSETS } from '../music'
import type { KitStroke } from '../stub'

/**
 * The rubato's strokes (423.34 → 504.0), kept apart from the part so that `strokes.ts`, which gathers every
 * Carnegie part's `*_KIT` and which the rubato's own drawing reads, never meets them before they are set: `rubato.ts`
 * re-exports these first (see there).
 *
 * The wind-up: soft taps on the snare while the metronome rises behind the kit, a pulse already slowing (0.52 s
 * apart, then 0.62); then up the kit, onto the rack tom, a tap there, a leap onto the crash, and a leap onto the
 * metronome's weight. Then the ride's rubato, every stroke of `RIDE`, tick on the ride and tock on the crash. Then the
 * roll, struck by nothing (too fast to count), and the landing on the snare on the burst.
 */

/** The measured snare stroke nearest `t`: every tap is on one. */
const snare = (t: number): number => SNARES.reduce((a, b) => (Math.abs(b.t - t) < Math.abs(a.t - t) ? b : a)).t
/** The measured onset nearest `t`. */
const onset = (t: number): number => ONSETS.reduce((a, b) => (Math.abs(b.t - t) < Math.abs(a.t - t) ? b : a)).t

/** The soft taps on the snare while the metronome rises; he goes up onto the rack tom off the last. */
export const TAPS: readonly number[] = [424.461, 424.977, 425.494, 426.034, 426.591, 427.172, 427.775, 428.391, 428.913].map(snare)
/** Onto the rack tom, and a tap on it (the stretch's strongest stroke). */
export const RACK_AT = snare(429.65)
export const RACK_TAP = snare(430.318)
/** The leap's landing on the crash. */
export const CRASH_AT = onset(431.121)
/** The leap's landing on the metronome's weight: his weight pushes the rod off into its first swing. */
export const BOARD = onset(432.343)
/** He springs off the crash for the weight here (the leap's lift-off, on the onset at 431.70). */
export const PUSH_OFF = BOARD - 0.6
/** How long he crouches into the crash before he springs, and how far it gives under him (radians, his side down). */
const CROUCH = 0.14
const GIVE = 0.2

/**
 * The crash under him as he springs off it for the weight, added to its angle (+ dips the right, his side): it gives
 * under his crouch over the `CROUCH` before `PUSH_OFF`, comes to rest at the bottom as he leaves, and springs back
 * up after him, ringing long and damped (from rest: the swing's slope is nil where the crouch leaves it). The hall
 * draws the crash with it (`conductor.ts` `crashAskew`), and his seat on the crash rides it.
 */
export function pushOff(T: number): number {
  const s = T - PUSH_OFF
  if (s < -CROUCH || s > 5) return 0
  if (s <= 0) {
    const u = (s + CROUCH) / CROUCH
    return GIVE * 0.5 * (1 - Math.cos(Math.PI * u))
  }
  const w = 2 * Math.PI * 1.6
  const tau = 0.7
  return GIVE * Math.exp(-s / tau) * (Math.cos(w * s) + Math.sin(w * s) / (w * tau))
}

/** The landing on the snare: the burst (the kick's and the snare's measured stroke). */
export const LAND = snare(503.995)

export const RUBATO_KIT: KitStroke[] = [
  ...TAPS.map((t) => ({ t, piece: 'snare' as const })),
  { t: RACK_AT, piece: 'rack' },
  { t: RACK_TAP, piece: 'rack' },
  { t: CRASH_AT, piece: 'crash' },
  // Tick on the ride (the rod's left stop), tock on the crash (its right stop): every stroke of the rubato.
  ...RIDE.map((t, i) => ({ t, piece: i % 2 === 0 ? ('ride' as const) : ('crash' as const) })),
  { t: LAND, piece: 'snare' },
]

/** Every strike: the kit's strokes and the landing on the weight. */
export const RUBATO_HITS: number[] = [...RUBATO_KIT.map((s) => s.t), BOARD].sort((a, b) => a - b)
