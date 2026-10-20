import measured from '../../../../../../../scripts/shows/plans/odysseus-onsets.json'

/**
 * The recording's clock: Ludwig Göransson's "Odysseus", from The Odyssey (Original Motion Picture Soundtrack, Back Lot
 * Music, 2026), played by YouTube from the label's own upload (WCxx_OVOVUw) from its first second, so show time is the
 * video's time. Measured once by `scripts/shows/odysseus-onsets.py` into `scripts/shows/plans/odysseus-onsets.json`;
 * `check:shows` holds every strike of this take against that file.
 *
 * One theme in C minor, a lament over a drone, grown from a single voice to everything and back:
 *
 *     0      theme    the theme alone over the drone; again from 36
 *    71.4    answer   answered, fuller and higher; held breaths at 99.5 and 119.3
 *   151.2    ground   the low voices come in under it; a swell at 169
 *   187.2    pulse    a beat arrives, 80 a minute (0.7501 s), and everything climbs on it
 *   222.4    tutti    everything, on the beat, loudest; cut off at 304.6
 *   304.6    after    what is left; the low voices back at 323.3 and gone at 342
 *   351      hush     very nearly silence (352.6)
 *   353.5    rise     the theme again from almost nothing
 *   395.5    return   everything again, without the beat
 *   431.6    quiet    the low voices gone, the high ones slowly climbing; a breath at 494.45
 *   494.7    last     the last swell
 *   512.8    fade     to the end, 521.46
 */

export interface Beat {
  /** Show time: its own attack where one is within 40 ms of the comb, else the comb. */
  t: number
  onset: boolean
  /** How hard, against the beats round it (1 is their 90th percentile). */
  s: number
  /** Its number from the first beat of the comb. */
  n: number
  /** Its twelve-beat phrase, and its place in it (0 to 11). */
  phrase: number
  pos: number
}
export interface Onset {
  t: number
  /** Against the 90th percentile of the onsets within ten seconds of it. */
  s: number
  in: string
}
interface Data {
  youtube: string
  duration: number
  period: number
  comb: { at: number; from: number; to: number }
  stretches: { name: string; from: number; to: number }[]
  landmarks: Record<string, number>
  beats: Beat[]
  onsets: Onset[]
  rms_step: number
  rms: number[]
}
const data = measured as unknown as Data

/** The video's length: the show's music. */
export const RECORDING = data.duration
export const YOUTUBE = data.youtube
/** The comb's period: a beat, 80 a minute. */
export const BEAT = data.period
export const BEATS = data.beats
export const ONSETS = data.onsets
export const STRETCHES = data.stretches
export const LANDMARKS = data.landmarks

/** The moments the story is cut to, by name (`odysseus-onsets.py`). */
export const M = {
  second: data.landmarks.second_statement,
  answer: data.landmarks.answer,
  breath1: data.landmarks.breath1,
  breath2: data.landmarks.breath2,
  ground: data.landmarks.ground,
  swell: data.landmarks.swell,
  pulse: data.landmarks.pulse,
  tutti: data.landmarks.tutti,
  cut: data.landmarks.cut,
  lowBack: data.landmarks.low_back,
  lowGone: data.landmarks.low_gone,
  lastAttack: data.landmarks.last_attack,
  hush: data.landmarks.hush,
  return: data.landmarks.return,
  quiet: data.landmarks.quiet,
  breath3: data.landmarks.breath3,
  last: data.landmarks.last,
  fade: data.landmarks.fade,
} as const

/** Beat `n` of the comb (0 is the first, at the pulse's entry), on its own attack where it has one. */
export function beat(n: number): number {
  const b = BEATS[Math.max(0, Math.min(BEATS.length - 1, n))]
  return b.t
}

/** The comb's beat nearest show time `t`. */
export function beatNear(t: number): Beat {
  let best = BEATS[0]
  for (const b of BEATS) if (Math.abs(b.t - t) < Math.abs(best.t - t)) best = b
  return best
}

/** The onset nearest `t` with strength at least `s`, within `tol` seconds; `t` itself if there is none. */
export function onsetNear(t: number, s = 0.5, tol = 0.6): number {
  let best: Onset | null = null
  for (const o of ONSETS) {
    if (o.s < s || Math.abs(o.t - t) > tol) continue
    if (!best || Math.abs(o.t - t) < Math.abs(best.t - t)) best = o
  }
  return best ? best.t : t
}

/** The strongest onset between `a` and `b`. */
export function strongest(a: number, b: number): number {
  let best: Onset | null = null
  for (const o of ONSETS) if (o.t >= a && o.t <= b && (!best || o.s > best.s)) best = o
  return best ? best.t : (a + b) / 2
}

/** Onsets between `a` and `b` at least `s` strong and at least `gap` seconds apart (the stronger kept). */
export function onsetsIn(a: number, b: number, s = 0.6, gap = 0.3): number[] {
  const cand = ONSETS.filter((o) => o.t >= a && o.t <= b && o.s >= s).sort((x, y) => y.s - x.s)
  const out: number[] = []
  for (const o of cand) if (out.every((t) => Math.abs(t - o.t) >= gap)) out.push(o.t)
  return out.sort((x, y) => x - y)
}

/** Loudness at `t`, 0 to 1 against the cue's loudest, eased between quarter seconds. */
export function loudness(t: number): number {
  const f = t / data.rms_step
  const i = Math.floor(f)
  const a = data.rms[Math.max(0, Math.min(data.rms.length - 1, i))] ?? 0
  const b = data.rms[Math.max(0, Math.min(data.rms.length - 1, i + 1))] ?? 0
  return a + (b - a) * (f - i)
}
