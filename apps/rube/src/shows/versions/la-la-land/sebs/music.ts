import measured from '../../../../../../../scripts/shows/plans/sebs-onsets.json'

/**
 * The recording's clock, as measured once by `scripts/shows/sebs-onsets.py`
 * from the mix the show plays (`scripts/shows/sebs-mix.sh`): Justin Hurwitz's
 * Epilogue whole from zero, then The End from 464 s. `check:shows` holds
 * every strike of this take against the same file.
 *
 * - 0 to 61.8 s, the piano, rubato: Seb's, then (from 39.6 s) Lipton's.
 * - 61.8 s the hush, and the kiss at 65.5 s.
 * - From the kiss to the end of the Hollywood number the dream runs on a
 *   128 bpm comb (`dream(k)`); the white studio in the middle of it breathes
 *   in threes against it.
 * - 167.8 s the last hit; the audition in shadow; the globe; Paris.
 * - 214.9 s the Paris club, on its own 122.8 bpm comb (`paris(k)`).
 * - 239.4 s the trumpet; two knocks out of silence at 264.7 and 268.7 s; the
 *   waltz behind the iris, rubato, to its swell at 336.6 s.
 * - 345.1 s the home movie; 396.1 s the drive; 453.73 s the last chord.
 * - 464 s The End, and its band at 478.05 s.
 *
 * Away from the combs the music is rubato, and a strike lands on a measured
 * onset: pick them with `onsets(a, b, s)` or `notes(a, b, s)`.
 */

interface Measured {
  duration: number
  end_at: number
  landmarks: Record<string, number>
  combs: { name: string; from: number; to: number; period: number; origin: number; beats: { beat: number; t: number; onset: number | null; s: number }[] }[]
  notes: [number, number, number | null][]
  loud: number[]
}
const M = measured as unknown as Measured

/** The mix: where the music ends. */
export const MIX_END = M.duration
/** Where The End comes in. */
export const END_AT = M.end_at
/**
 * The whole show: the mix, which already carries The End and its band under the end card. The credits run inside
 * it; the last frame holds to here.
 */
export const DURATION = 510

/** The film's landmarks, each on the onset that makes it (show seconds). */
export const AT = M.landmarks as {
  first: number
  liptons: number
  hush: number
  kiss: number
  studio: number
  hollywood: number
  hollywood_out: number
  audition: number
  jazz: number
  trumpet: number
  knock1: number
  knock2: number
  waltz_peak: number
  waltz_out: number
  movie: number
  drive: number
  last: number
  band: number
}

const comb = (name: string) => M.combs.find((c) => c.name === name)!
const DREAM = comb('dream')
const PARIS = comb('paris')

/** The dream's 128 bpm comb: beat `k` (fractions are eighths). Beat 0 is 66.31 s, just after the kiss. */
export const dream = (k: number): number => DREAM.origin + DREAM.period * k
export const DREAM_PERIOD = DREAM.period
/** The Paris club's 122.8 bpm comb: beat `k`. Beat 0 is 213.83 s. */
export const paris = (k: number): number => PARIS.origin + PARIS.period * k
export const PARIS_PERIOD = PARIS.period

/** The comb beat nearest `t`, as a beat number of that comb. */
export const dreamBeat = (t: number): number => Math.round(((t - DREAM.origin) / DREAM.period) * 2) / 2
export const parisBeat = (t: number): number => Math.round(((t - PARIS.origin) / PARIS.period) * 2) / 2

/** How strong the measured onset on a comb beat is (0 when the beat has none within 30 ms). */
export function combStrength(name: 'dream' | 'paris', k: number): number {
  const c = name === 'dream' ? DREAM : PARIS
  return c.beats.find((b) => Math.abs(b.beat - k) < 1e-6)?.s ?? 0
}

/** A measured onset: its time, how strong (against the loudest of the whole cue, about 1 for a big hit), its top voice's MIDI pitch if it has one. */
export interface Note {
  t: number
  s: number
  midi: number | null
}

export const NOTES: Note[] = M.notes.map(([t, s, midi]) => ({ t, s, midi }))

/** The measured onsets in [a, b) at least `s` strong. */
export function notes(a: number, b: number, s = 0.15): Note[] {
  return NOTES.filter((n) => n.t >= a && n.t < b && n.s >= s)
}

/** Just their times. */
export const onsets = (a: number, b: number, s = 0.15): number[] => notes(a, b, s).map((n) => n.t)

/** The strongest measured onset within `tol` of `t`, or null. What a strike near a moment should land on. */
export function snap(t: number, tol = 0.08): Note | null {
  let best: Note | null = null
  for (const n of NOTES) if (Math.abs(n.t - t) <= tol && (!best || n.s > best.s)) best = n
  return best
}

/** The loudest `n` onsets in [a, b), in time order: the accents of a stretch. */
export function accents(a: number, b: number, n: number): Note[] {
  return [...notes(a, b, 0)].sort((x, y) => y.s - x.s).slice(0, n).sort((x, y) => x.t - y.t)
}

/** Loudness at `t`, dB (RMS over half a second): for pacing, and for lights that breathe with the music. */
export function loud(t: number): number {
  const i = Math.floor(t * 2)
  return M.loud[Math.max(0, Math.min(M.loud.length - 1, i))] ?? -90
}

/** Loudness at `t` as 0..1 (−45 dB and under is 0, −6 dB is 1), eased between the half-second measures. */
export function level(t: number): number {
  const u = t * 2 - 0.5
  const i = Math.floor(u)
  const f = u - i
  const at = (j: number) => Math.max(0, Math.min(1, ((M.loud[Math.max(0, Math.min(M.loud.length - 1, j))] ?? -90) + 45) / 39))
  return at(i) * (1 - f) + at(i + 1) * f
}
