import measured from '../../../../../../../scripts/shows/plans/pauls-dream-onsets.json'

/**
 * The clock: Hans Zimmer's "Paul's Dream" (Dune, Original Motion Picture Soundtrack, WaterTower Music, 2021), played by
 * YouTube from the label's own upload (BdtiYwSP9ko) from its first second, so show time is the video's time. Measured
 * once by `scripts/shows/pauls-dream-onsets.py` into `scripts/shows/plans/pauls-dream-onsets.json`; `check:shows` holds
 * every strike of this take against that file.
 *
 * One long crescendo that falls and climbs again, over a click of 0.3125 s (a slow beat of four ticks, 1.25 s):
 *
 *      0      sea      a high D almost alone; a figure every five seconds; a first low swell (12.6)
 *     27.25   lament   low voices rocking A and A-flat; quiet swells under them (46.7, 62.3, 87.1)
 *     99.5    build    the lows climb (103.1) and hold their breath (105 to 109)
 *    110.06   drop     the drums, in D, each blow a swell
 *    148      full     the high voices and the brass over the drums, the loudest stretch
 *    270.06   great    the cue's greatest blow; only the lows after it, dying to a hush (286)
 *    288.08   voice    a high voice alone over the lows
 *    312      rise     everything again under the voice, with breaths at 336 and 366 and a climb from 384
 *    397.72   last     the last blow, and its long decay
 *    411      fade     to silence at 423.4
 */

export interface Onset {
  t: number
  /** How hard, against the 90th percentile of the onsets within ten seconds of it. */
  s: number
  /** How much of it is low (under 200 Hz), 0 to 1 against the cue's hardest. */
  lo: number
  in: string
}
export interface Tick {
  /** Its own attack where one is within 30 ms of the click, else the click. */
  t: number
  /** Its number from the cue's first tick; a slow beat is every fourth, a figure every sixteenth. */
  n: number
  onset: boolean
  s: number
}
export interface Boom {
  /** Its attack: the strongest low onset on its rise. */
  t: number
  peak: number
  /** Its height, 0 to 1 against the greatest. */
  v: number
  in: string
}
interface Data {
  youtube: string
  duration: number
  grid: { period: number; phase: number; spans: [number, number][] }
  stretches: { name: string; from: number; to: number }[]
  landmarks: Record<string, number>
  ticks: Tick[]
  booms: Boom[]
  swells: Boom[]
  onsets: Onset[]
  step: number
  rms: number[]
  voice: number[]
}
const data = measured as unknown as Data

export const YOUTUBE = data.youtube
/** The video's length. */
export const RECORDING = data.duration
export const TICK = data.grid.period
export const BEAT = TICK * 4
export const ONSETS = data.onsets
export const TICKS = data.ticks
export const BOOMS = data.booms
export const SWELLS = data.swells
export const STRETCHES = data.stretches

/** The moments the story is cut to (`pauls-dream-onsets.py`). */
export const M = {
  first: data.landmarks.first,
  swell: data.landmarks.swell,
  lament: data.landmarks.lament,
  call: data.landmarks.call,
  wake: data.landmarks.wake,
  breath1: data.landmarks.breath1,
  figure: data.landmarks.figure,
  build: data.landmarks.build,
  held: data.landmarks.held,
  drop: data.landmarks.drop,
  choir: data.landmarks.choir,
  great: data.landmarks.great,
  hush: data.landmarks.hush,
  voice: data.landmarks.voice,
  rise: data.landmarks.rise,
  breath2: data.landmarks.breath2,
  breath3: data.landmarks.breath3,
  climb: data.landmarks.climb,
  last: data.landmarks.last,
  fade: data.landmarks.fade,
} as const

/** Tick `n` of the click, on its own attack where it has one (the click itself outside the stretches it is held in). */
export function tick(n: number): number {
  const found = TICKS.find((k) => k.n === n)
  return found ? found.t : data.grid.phase + n * TICK
}

/** The tick nearest `t` (within the stretches the click is held in). */
export function tickNear(t: number): Tick {
  let best = TICKS[0]
  for (const k of TICKS) if (Math.abs(k.t - t) < Math.abs(best.t - t)) best = k
  return best
}

/** The number of the click's tick nearest `t`, anywhere in the cue. */
export const tickAt = (t: number): number => Math.round((t - data.grid.phase) / TICK)

/** The onset nearest `t` at least `s` strong, within `tol` seconds; `t` itself if there is none. */
export function onsetNear(t: number, s = 0.5, tol = 0.5): number {
  let best: Onset | null = null
  for (const o of ONSETS) {
    if (o.s < s || Math.abs(o.t - t) > tol) continue
    if (!best || Math.abs(o.t - t) < Math.abs(best.t - t)) best = o
  }
  return best ? best.t : t
}

/** The strongest onset between `a` and `b` (weighting its low share by `low`); the middle if there is none. */
export function strongest(a: number, b: number, low = 0): number {
  let best: Onset | null = null
  let score = -Infinity
  for (const o of ONSETS) {
    if (o.t < a || o.t > b) continue
    const v = o.s + low * o.lo
    if (v > score) {
      score = v
      best = o
    }
  }
  return best ? best.t : (a + b) / 2
}

/** Onsets between `a` and `b` at least `s` strong and at least `gap` seconds apart (the stronger kept), in order. */
export function onsetsIn(a: number, b: number, s = 0.6, gap = 0.3): number[] {
  const cand = ONSETS.filter((o) => o.t >= a && o.t <= b && o.s >= s).sort((x, y) => y.s - x.s)
  const out: number[] = []
  for (const o of cand) if (out.every((t) => Math.abs(t - o.t) >= gap)) out.push(o.t)
  return out.sort((x, y) => x - y)
}

/** The booms (and the quiet swells before the drums) between `a` and `b`, at least `v` high. */
export function boomsIn(a: number, b: number, v = 0): number[] {
  return [...SWELLS, ...BOOMS].filter((o) => o.t >= a && o.t <= b && o.v >= v).map((o) => o.t).sort((x, y) => x - y)
}

/** The boom nearest `t` (a swell before the drums counts), or `t` itself if none is within `tol`. */
export function boomNear(t: number, tol = 0.6): number {
  let best: Boom | null = null
  for (const o of [...SWELLS, ...BOOMS]) if (Math.abs(o.t - t) <= tol && (!best || Math.abs(o.t - t) < Math.abs(best.t - t))) best = o
  return best ? best.t : t
}

/** Whether something measured is at `t`: an onset, a tick on its own attack, or a boom, within `tol`. */
export function measuredAt(t: number, tol = 0.03): boolean {
  return (
    ONSETS.some((o) => Math.abs(o.t - t) <= tol) ||
    TICKS.some((k) => k.onset && Math.abs(k.t - t) <= tol) ||
    BOOMS.some((o) => Math.abs(o.t - t) <= tol) ||
    SWELLS.some((o) => Math.abs(o.t - t) <= tol)
  )
}

function sample(series: number[], t: number): number {
  const f = t / data.step
  const i = Math.floor(f)
  const a = series[Math.max(0, Math.min(series.length - 1, i))] ?? 0
  const b = series[Math.max(0, Math.min(series.length - 1, i + 1))] ?? 0
  return a + (b - a) * (f - i)
}

/** Loudness at `t`, 0 to 1 against the cue's loudest, eased between quarter seconds. */
export const loudness = (t: number): number => sample(data.rms, t)
/** The high voices at `t`, 0 to 1 against their loudest. */
export const voice = (t: number): number => sample(data.voice, t)
