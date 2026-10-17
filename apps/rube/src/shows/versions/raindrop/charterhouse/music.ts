import measured from '../../../../../../../scripts/shows/plans/raindrop-onsets.json'

/**
 * The recording's clock: Chopin's Prelude in D-flat major, Op. 28 No. 15, the "Raindrop", as Ivan Ilić plays it
 * (Paris, 2005; CC BY 3.0), from its first sample, so show time is the recording's time. Measured once by
 * `scripts/shows/raindrop-onsets.py` into `scripts/shows/plans/raindrop-onsets.json`; `check:shows` holds the show
 * to that file.
 *
 * It is played freely, so there is no comb: every bar's downbeat and every note is where its own attack is. An
 * A-flat (G-sharp in the minor) is struck on every eighth from the first bar to the last but for a bar and a half
 * near the end: the drip (`PULSE`), which this show makes a drip of rain.
 *
 *   bar  1   the theme, D-flat                       dusk; the jar under the eave fills
 *   bar  9   B-flat minor, the first turn away       the jar tips: the ball is let go
 *   bar 20   the theme again                         the road: two people walking up it
 *   bar 27   the pulse alone                         down the well
 *   bar 28   C-sharp minor, sotto voce               the cistern
 *   bar 35   the pulse up an octave, louder          out into the storm
 *   bar 40   fortissimo                              the road: their lantern blown out
 *   bar 44   sotto voce again                        the terraces
 *   bar 51   louder again                            the wheel
 *   bar 56   fortissimo                              across the gully
 *   bar 60   the melody over the pulse, in E         the lamp lit
 *   bar 64   the pulse in octaves                    the bell
 *   bar 68   the melody again                        they see it
 *   bar 72   the storm going over                    the climb
 *   bar 76   D-flat, the theme                       the gate
 *   bar 81   the pulse stops (the high B-flat)       the rain stops
 *   bar 84   the pulse again, softly                 the last drops
 *   bar 89   the last chord
 */

interface Measured {
  duration: number
  bars: number[]
  form: Record<string, number>
  pulse: { t: number; bar: number; eighth: number; s: number }[]
  notes: { t: number; bar: number; beat: number; rh: number | null; lh: number | null; heard: boolean }[]
  rms: number[]
}
const m = measured as unknown as Measured

/** The recording's length, seconds. */
export const RECORDING = m.duration
/** Every bar's downbeat, seconds: `BARS[0]` is bar 1. */
export const BARS: readonly number[] = m.bars
/** The sections, seconds (`raindrop-onsets.py`). */
export const FORM = m.form as Readonly<Record<
  'theme' | 'minor' | 'return' | 'codetta' | 'chorale' | 'rise1' | 'peak1' | 'chorale2' | 'rise2' | 'peak2' | 'major' | 'toll' |
  'major2' | 'fade' | 'home' | 'run' | 'again' | 'still' | 'drips' | 'last' | 'end', number>>
/** The drip: every eighth the repeated note sounds on, in order. */
export const PULSE: readonly { t: number; bar: number; eighth: number; s: number }[] = m.pulse
/** Every onset in the score, with its right hand's top pitch and its left hand's lowest (MIDI numbers). */
export const NOTES: readonly { t: number; bar: number; beat: number; rh: number | null; lh: number | null; heard: boolean }[] = m.notes
/** Loudness every quarter second, 0 to 1. */
export const RMS: readonly number[] = m.rms
/** The drip times alone, for searching. */
export const DRIPS: Float64Array = Float64Array.from(PULSE.map((p) => p.t))

/** The downbeat of `bar` (1 to 89); past the last, the end of the recording. */
export function bar(n: number): number {
  if (n <= 1) return BARS[0]
  if (n > BARS.length) return RECORDING
  return BARS[n - 1]
}

/**
 * Show time of `beat` quarters into `bar` (0 is the downbeat): the note struck there if there is one, else between
 * the onsets either side by its place in the score.
 */
export function at(n: number, beat = 0): number {
  const q = (n - 1) * 4 + beat
  let lo = 0
  let hi = NOTES.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if ((NOTES[mid].bar - 1) * 4 + NOTES[mid].beat <= q + 1e-6) lo = mid
    else hi = mid - 1
  }
  const a = NOTES[lo]
  const qa = (a.bar - 1) * 4 + a.beat
  if (Math.abs(qa - q) < 1e-6 || lo === NOTES.length - 1) return a.t
  const b = NOTES[lo + 1]
  const qb = (b.bar - 1) * 4 + b.beat
  return a.t + ((b.t - a.t) * (q - qa)) / (qb - qa)
}

/** The index of the last drip at or before `t` (-1 before the first). */
export function dripIndex(t: number): number {
  let lo = -1
  let hi = DRIPS.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (DRIPS[mid] <= t) lo = mid
    else hi = mid - 1
  }
  return lo
}

/** Loudness at `t`, 0 to 1, between the quarter seconds measured. */
export function loud(t: number): number {
  const f = Math.max(0, t) / 0.25
  const i = Math.floor(f)
  if (i >= RMS.length - 1) return RMS[RMS.length - 1] ?? 0
  return RMS[i] + (RMS[i + 1] - RMS[i]) * (f - i)
}

/** The notes from `t0` to `t1` (seconds) whose right hand sounds, in order: a melody to strike. */
export function melody(t0: number, t1: number): { t: number; pitch: number }[] {
  return NOTES.filter((n) => n.t >= t0 - 1e-6 && n.t < t1 - 1e-6 && n.rh !== null).map((n) => ({ t: n.t, pitch: n.rh as number }))
}
