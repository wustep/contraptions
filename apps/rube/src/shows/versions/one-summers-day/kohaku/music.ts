import measured from '../../../../../../../scripts/shows/plans/kohaku-onsets.json'

/**
 * The recording's clock: Joe Hisaishi's "One Summer's Day", from Spirited Away, as he recorded it with the London
 * Symphony Orchestra for Melodyphony (2010), played by YouTube from the official upload on his own channel
 * (TK1Ij_-mank) from its first second, so show time is the video's time. Measured once by
 * `scripts/shows/kohaku-onsets.py` into `scripts/shows/plans/kohaku-onsets.json`; `check:shows` holds the strikes of
 * this take against that file.
 *
 * One theme in C major, played freely, three times rising to the same cadence through A-flat and B-flat:
 *
 *     0      intro    four soft chords on the piano, then the strings breathe in
 *    20.6    theme    the theme, quiet, over the piano's running eighths
 *    44.3    swell    the orchestra takes it up
 *    64.1    crest    the first climax
 *    80      settle   it comes down; the first quiet at 94
 *   102.0    rise     the theme again, building
 *   115.8    height   the second climax, loudest so far at 123.4
 *   137.4    high     high and light, nothing under it
 *   147.5    low      quiet, with a swell at 157.1; the deepest quiet at 161.5
 *   168.5    return   the theme once more, gathering
 *   193.5    summit   the last climax; the cadence at its fullest at 201.5
 *   205.5    home     it winds down; fades from 231.5 to the end, about 241
 */

export interface Onset {
  t: number
  /** Against the 90th percentile of the onsets within eight seconds of it. */
  s: number
  in: string
}
export interface Eighth {
  /** Show time: its own attack where one is within 40 ms, else where the tracker put it. */
  t: number
  onset: boolean
  /** How hard, against the eighths round it. */
  s: number
  n: number
}
interface Data {
  youtube: string
  duration: number
  stretches: { name: string; from: number; to: number }[]
  landmarks: Record<string, number>
  beats: Eighth[]
  onsets: Onset[]
  rms_step: number
  rms: number[]
  low: number[]
  mid: number[]
  high: number[]
}
const data = measured as unknown as Data

/** The video's length: the show's music. */
export const RECORDING = data.duration
export const YOUTUBE = data.youtube
export const ONSETS = data.onsets
export const EIGHTHS = data.beats
export const STRETCHES = data.stretches

/** The moments the story is cut to, by name (`kohaku-onsets.py`). */
export const M = {
  chord1: data.landmarks.chord1,
  chord2: data.landmarks.chord2,
  chord3: data.landmarks.chord3,
  chord4: data.landmarks.chord4,
  theme: data.landmarks.theme,
  swell: data.landmarks.swell,
  crest: data.landmarks.crest,
  settle: data.landmarks.settle,
  breath: data.landmarks.breath,
  rise: data.landmarks.rise,
  height: data.landmarks.height,
  peak: data.landmarks.peak,
  high: data.landmarks.high,
  low: data.landmarks.low,
  swell2: data.landmarks.swell2,
  hush: data.landmarks.hush,
  return: data.landmarks.return,
  summit: data.landmarks.summit,
  cadence: data.landmarks.cadence,
  home: data.landmarks.home,
  fade: data.landmarks.fade,
} as const

/** The onset nearest `t` at least `s` strong, within `tol` seconds; `t` itself if there is none. */
export function onsetNear(t: number, s = 0.5, tol = 0.5): number {
  let best: Onset | null = null
  for (const o of ONSETS) {
    if (o.s < s || Math.abs(o.t - t) > tol) continue
    if (!best || Math.abs(o.t - t) < Math.abs(best.t - t)) best = o
  }
  return best ? best.t : t
}

/** The strongest onset between `a` and `b`; their middle if there is none. */
export function strongest(a: number, b: number): number {
  let best: Onset | null = null
  for (const o of ONSETS) if (o.t >= a && o.t <= b && (!best || o.s > best.s)) best = o
  return best ? best.t : (a + b) / 2
}

/** Onsets between `a` and `b` at least `s` strong and at least `gap` seconds apart (the stronger kept), in order. */
export function onsetsIn(a: number, b: number, s = 0.6, gap = 0.3): number[] {
  const cand = ONSETS.filter((o) => o.t >= a && o.t <= b && o.s >= s).sort((x, y) => y.s - x.s)
  const out: number[] = []
  for (const o of cand) if (out.every((t) => Math.abs(t - o.t) >= gap)) out.push(o.t)
  return out.sort((x, y) => x - y)
}

/**
 * `n` onsets between `a` and `b`, spread through it: the strongest onset in each of `n` equal parts of the stretch. For
 * a run of strikes that should keep going through a phrase (stones crossed, steps climbed, lamps lit), each on a note.
 */
export function spread(a: number, b: number, n: number): number[] {
  const out: number[] = []
  for (let i = 0; i < n; i++) {
    const lo = a + ((b - a) * i) / n
    const hi = a + ((b - a) * (i + 1)) / n
    out.push(strongest(lo, hi))
  }
  return out
}

/** The eighths between `a` and `b`, in order. */
export function eighthsIn(a: number, b: number): Eighth[] {
  return EIGHTHS.filter((e) => e.t >= a && e.t <= b)
}

/** The eighth nearest `t`. */
export function eighthNear(t: number): Eighth {
  let best = EIGHTHS[0]
  for (const e of EIGHTHS) if (Math.abs(e.t - t) < Math.abs(best.t - t)) best = e
  return best
}

const sample = (arr: number[], t: number): number => {
  const f = t / data.rms_step
  const i = Math.floor(f)
  const a = arr[Math.max(0, Math.min(arr.length - 1, i))] ?? 0
  const b = arr[Math.max(0, Math.min(arr.length - 1, i + 1))] ?? 0
  return a + (b - a) * (f - i)
}

/** Loudness at `t`, 0 to 1 against the cue's loudest, eased between quarter seconds. */
export const loudness = (t: number): number => sample(data.rms, t)

/** Loudness at `t` smoothed over about a second either side: for motion the music drives without striking. */
export function swell(t: number): number {
  let sum = 0
  let w = 0
  for (let j = -4; j <= 4; j++) {
    const k = 1 - Math.abs(j) / 5
    sum += sample(data.rms, t + j * 0.25) * k
    w += k
  }
  return sum / w
}
