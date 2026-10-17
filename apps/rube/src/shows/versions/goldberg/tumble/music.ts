import measured from '../../../../../../../scripts/shows/plans/goldberg-onsets.json'

/**
 * The recording's clock: Bach's first Goldberg variation, Variatio 1. a 1 Clav., as Kimiko Ishizaka plays it on the
 * Open Goldberg Variations (2012, CC0), from its first sample, so show time is the recording's time. Measured once by
 * `scripts/shows/goldberg-onsets.py` into `scripts/shows/plans/goldberg-onsets.json`; `check:shows` holds the show to
 * that file.
 *
 * Thirty-two bars of 3/4 in two halves, each played twice: 64 bars, 192 quarters. She keeps a steady tempo (a quarter
 * is about 0.58 s), holds back a little at the end of each half and breathes before the next.
 *
 *   bars  1–16   the first half                       the clock sets out; the board wakes
 *   bars 17–32   the first half again                  answered from the other side
 *   bars 33–48   the second half                       the board turns over
 *   bars 49–64   the second half again                 everything comes home
 */

interface Measured {
  duration: number
  beats: number[]
  bars: number[]
  form: Record<string, number>
  notes: { t: number; bar: number; beat: number; rh: number | null; lh: number | null; heard: boolean }[]
  rms: number[]
}
const m = measured as unknown as Measured

/** The recording's length, seconds. */
export const RECORDING = m.duration
/** Every quarter, in the order played: `BEATS[0]` is the first downbeat. */
export const BEATS: readonly number[] = m.beats
/** The halves as played, seconds: `a1`, `a2`, `b1`, `b2`, the last bar, the last sound and the file's end. */
export const FORM = m.form as Readonly<Record<'a1' | 'a2' | 'b1' | 'b2' | 'last' | 'quiet' | 'end', number>>
/** Every onset of the unrolled score, with its right hand's top pitch and its left hand's lowest (MIDI numbers). */
export const NOTES: readonly { t: number; bar: number; beat: number; rh: number | null; lh: number | null; heard: boolean }[] = m.notes
/** Loudness every quarter second, 0 to 1. */
export const RMS: readonly number[] = m.rms

/** Quarters in a bar. */
export const METER = 3
/** Quarters in all. */
export const QUARTERS = BEATS.length

/**
 * Show time of beat `n`, counting from 1 (the first downbeat) to 192, fractions between: the note struck there if
 * there is one (every sixteenth has one but a few), else between the onsets either side by its place in the score.
 */
export function beat(n: number): number {
  const q = n - 1
  if (q <= 0) return BEATS[0]
  let lo = 0
  let hi = NOTES.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if ((NOTES[mid].bar - 1) * METER + NOTES[mid].beat <= q + 1e-6) lo = mid
    else hi = mid - 1
  }
  const a = NOTES[lo]
  const qa = (a.bar - 1) * METER + a.beat
  if (Math.abs(qa - q) < 1e-6 || lo === NOTES.length - 1) return a.t
  const b = NOTES[lo + 1]
  const qb = (b.bar - 1) * METER + b.beat
  return a.t + ((b.t - a.t) * (q - qa)) / (qb - qa)
}

/** Show time of beat `k` (1 to 3) of bar `n` (1 to 64). */
export const bar = (n: number, k = 1): number => beat((n - 1) * METER + k)

/** The length of the quarter round beat `n`, seconds. */
export function quarter(n: number): number {
  const i = Math.max(1, Math.min(QUARTERS - 1, Math.floor(n)))
  return BEATS[i] - BEATS[i - 1]
}

/** Loudness at `t`, 0 to 1, between the quarter seconds measured. */
export function loud(t: number): number {
  const f = Math.max(0, t) / 0.25
  const i = Math.floor(f)
  if (i >= RMS.length - 1) return RMS[RMS.length - 1] ?? 0
  return RMS[i] + (RMS[i + 1] - RMS[i]) * (f - i)
}
