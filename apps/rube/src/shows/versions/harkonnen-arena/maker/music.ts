import measured from '../../../../../../../scripts/shows/plans/harkonnen-arena-onsets.json'

/**
 * The recording's clock: Hans Zimmer's "Harkonnen Arena", from Dune: Part Two (Original Motion Picture Soundtrack,
 * WaterTower Music, 2024), played by YouTube from the label's own upload (UdlvgIFdNZU) from its first second, so show
 * time is the video's time. Measured once by `scripts/shows/harkonnen-arena-onsets.py` into
 * `scripts/shows/plans/harkonnen-arena-onsets.json`; `check:shows` holds every strike of this take against that file.
 *
 * Drums and chant, loud nearly throughout, with one dead silence in the middle:
 *
 *     0      chant     the voices and the drone alone
 *    27.9    booms     a blow every 3.33 s on a slow pulse
 *    44.5    phrases   a great blow every 13.6 s over a slower drum
 *   104.1    drive     a beat arrives, 95 a minute
 *   128.2    run       harder, 100 a minute: the steadiest stretch
 *   164.6    fall      down to nothing; silence from 178
 *   186.0    return    back, low
 *   198.0    blows     the two hardest blows (198.0, 202.2), then free
 *   262.8    charge    the beat again, quickening from 102 to 108 a minute
 *   314      end       the last chord dying, to 322.2
 */

export interface Beat {
  /** Show time: its own attack where one is within 40 ms of the comb, else the comb. */
  t: number
  onset: boolean
  /** How hard, against the beats round it (1 is their 90th percentile). */
  s: number
  /** Its number from the comb's first beat. */
  n: number
}
export interface Onset {
  t: number
  /** Against the 90th percentile of the onsets within ten seconds of it. */
  s: number
  /** Against the 90th percentile of the whole cue. */
  g: number
  in: string
}
interface Comb {
  from: number
  to: number
  start_period: number
  end_period: number
  beats: Beat[]
}
interface Data {
  youtube: string
  duration: number
  stretches: { name: string; from: number; to: number }[]
  landmarks: Record<string, number>
  combs: Record<'booms' | 'phrases' | 'drive' | 'run' | 'charge', Comb>
  onsets: Onset[]
  rms_step: number
  rms: number[]
}
const data = measured as unknown as Data

/** The video's length: the show's music. */
export const RECORDING = data.duration
export const YOUTUBE = data.youtube
export const ONSETS = data.onsets
export const STRETCHES = data.stretches
export const COMBS = data.combs

/** The moments the story is cut to, by name (`harkonnen-arena-onsets.py`). */
export const M = {
  firstBoom: data.landmarks.first_boom,
  phrase1: data.landmarks.phrase1,
  phrase2: data.landmarks.phrase2,
  phrase3: data.landmarks.phrase3,
  phrase4: data.landmarks.phrase4,
  phrase5: data.landmarks.phrase5,
  drive: data.landmarks.drive,
  run: data.landmarks.run,
  fall: data.landmarks.fall,
  silence: data.landmarks.silence,
  return: data.landmarks.return,
  blow1: data.landmarks.blow1,
  blow2: data.landmarks.blow2,
  charge: data.landmarks.charge,
  peak: data.landmarks.peak,
  end: data.landmarks.end,
} as const

export type CombName = keyof Data['combs']

/** Beat `n` of a comb (0 is its first), on its own attack where it has one. Past either end, the nearest. */
export function beat(comb: CombName, n: number): number {
  const bs = data.combs[comb].beats
  return bs[Math.max(0, Math.min(bs.length - 1, Math.round(n)))].t
}

/** The beats of a comb between `a` and `b`. */
export function beatsIn(comb: CombName, a: number, b: number): Beat[] {
  return data.combs[comb].beats.filter((x) => x.t >= a && x.t <= b)
}

/** The number of a comb's beat nearest `t`. */
export function beatAt(comb: CombName, t: number): number {
  const bs = data.combs[comb].beats
  let best = 0
  for (let i = 1; i < bs.length; i++) if (Math.abs(bs[i].t - t) < Math.abs(bs[best].t - t)) best = i
  return best
}

/** The onset nearest `t` at least `g` strong against the whole cue, within `tol` seconds; `t` itself if there is none. */
export function onsetNear(t: number, g = 0.5, tol = 0.6): number {
  let best: Onset | null = null
  for (const o of ONSETS) {
    if (o.g < g || Math.abs(o.t - t) > tol) continue
    if (!best || Math.abs(o.t - t) < Math.abs(best.t - t)) best = o
  }
  return best ? best.t : t
}

/** The strongest onset between `a` and `b`, by the whole cue. */
export function strongest(a: number, b: number): number {
  let best: Onset | null = null
  for (const o of ONSETS) if (o.t >= a && o.t <= b && (!best || o.g > best.g)) best = o
  return best ? best.t : (a + b) / 2
}

/** Onsets between `a` and `b` at least `g` strong against the whole cue and at least `gap` seconds apart (the stronger kept). */
export function onsetsIn(a: number, b: number, g = 0.8, gap = 0.3): number[] {
  const cand = ONSETS.filter((o) => o.t >= a && o.t <= b && o.g >= g).sort((x, y) => y.g - x.g)
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
