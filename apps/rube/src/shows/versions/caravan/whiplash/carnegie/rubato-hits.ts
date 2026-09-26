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
