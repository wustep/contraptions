import plan from '../../../../../../../scripts/shows/plans/soft-lamp-onsets.json'

/**
 * The radio, as it was measured (`scripts/shows/soft-lamp-onsets.py`). Soft Lamp plays Lofi Girl's "Best of lofi hip
 * hop 2021" from the video's first second, so show time is the video's time, and the first twelve tracks are the
 * show: half an hour.
 *
 * Every track is made on a grid that never moves (a whole number of beats a minute, 65 to 94) and has the same shape:
 * an intro with no drums; the drums in on a downbeat; the groove in phrases of four and eight bars, most with a break
 * of a few bars and the drums back on a downbeat; the drums out for good on a downbeat and a short outro into a breath
 * of near-silence. The show is built on that shape and nothing finer is needed: a bar, whether the kit is playing in
 * it, and how hard each beat's kick and crack are struck.
 */

export interface Section {
  /** Bars, as indices into `bars`: [from, to). */
  from: number
  to: number
  drums: boolean
}

export interface Track {
  /** 0 to 11, in the order the mix plays them. */
  n: number
  title: string
  artists: string
  /** Show seconds: its first and last audible moments. */
  from: number
  to: number
  bpm: number
  /** Seconds a beat. */
  period: number
  /** Every downbeat, from the first bar that starts in the track (or a beat before it) to the last. */
  bars: number[]
  /** Per bar: the kit is playing. */
  drums: boolean[]
  /** Per bar: how full its low end is, 0 to 1. */
  level: number[]
  /** Per beat from `beat0`: how hard the kick and the crack are struck, 0 to 1 against the track. */
  beat0: number
  kick: number[]
  snare: number[]
  sections: Section[]
  /** The runs of two bars or more with the kit playing, [from, to) in bars: a one-bar hit is not a groove. */
  runs: { from: number; to: number }[]
  /** The bar the drums first come in on, and the bar they have left for good on. */
  entry: number
  exit: number
}

interface Planned {
  title: string
  artists: string
  from: number
  to: number
  bpm: number
  period: number
  bars: number[]
  drums: boolean[]
  level: number[]
  beat0: number
  kick: number[]
  snare: number[]
  sections: Section[]
}

export const YOUTUBE: string = plan.youtube
export const TRACKS: Track[] = (plan.tracks as Planned[]).map((t, n) => {
  const runs = t.sections.filter((s) => s.drums && s.to - s.from >= 2).map((s) => ({ from: s.from, to: s.to }))
  return {
    n,
    title: t.title,
    artists: t.artists,
    from: t.from,
    to: t.to,
    bpm: t.bpm,
    period: t.period,
    bars: t.bars,
    drums: t.drums,
    level: t.level,
    beat0: t.beat0,
    kick: t.kick,
    snare: t.snare,
    sections: t.sections,
    runs,
    entry: runs[0].from,
    exit: runs[runs.length - 1].to,
  }
})

/** The last track's last audible moment: where the music ends. */
export const MUSIC_END = TRACKS[TRACKS.length - 1].to

/** The track playing at `t`: each holds from its own start to the next one's (the first from the very start). */
export function trackAt(t: number): Track {
  let i = 0
  while (i + 1 < TRACKS.length && t >= TRACKS[i + 1].from) i++
  return TRACKS[i]
}

/** A track's time of beat `b` counted from its first bar's downbeat (fractional beats are fine). */
export const beatTime = (tr: Track, b: number): number => tr.bars[0] + b * tr.period

/** Where `t` is in a track's grid: beats since its first bar's downbeat. */
export const beatOf = (tr: Track, t: number): number => (t - tr.bars[0]) / tr.period

/** The time of bar `i`'s beat `q` (0 to 3): past the last bar the grid goes on. */
export const barTime = (tr: Track, i: number, q = 0): number => tr.bars[0] + (i * 4 + q) * tr.period

/** How hard the kick is struck on the beat at time `g` (the nearest measured beat), 0 to 1. */
export function kickAt(tr: Track, g: number): number {
  const k = Math.round((g - tr.beat0) / tr.period)
  return tr.kick[k] ?? 0
}

export function snareAt(tr: Track, g: number): number {
  const k = Math.round((g - tr.beat0) / tr.period)
  return tr.snare[k] ?? 0
}

/** Whether the kit is playing in bar `i` as a groove (one of the runs). */
export const grooving = (tr: Track, i: number): boolean => tr.runs.some((r) => i >= r.from && i < r.to)

/** 0 until `a`, 1 from `b`, smooth between. */
export const smooth = (t: number, a: number, b: number): number => {
  const u = Math.max(0, Math.min(1, (t - a) / (b - a)))
  return u * u * (3 - 2 * u)
}

/**
 * How much the kit is playing at `t`, 0 to 1: the groove's bars, each come in over a beat before its downbeat and gone
 * over a beat after its end, and as full as the bar's low end.
 */
export function drumsAt(t: number): number {
  const tr = trackAt(t)
  let v = 0
  for (const r of tr.runs) {
    const a = barTime(tr, r.from)
    const b = barTime(tr, r.to)
    v = Math.max(v, smooth(t, a - tr.period, a) * (1 - smooth(t, b, b + tr.period)))
  }
  return v
}

const STEP: number = plan.step
const RMS: number[] = plan.rms
const HELD: number[] = plan.held

function sample(a: number[], t: number): number {
  const x = Math.max(0, t / STEP - 0.5)
  const i = Math.floor(x)
  const f = x - i
  if (i >= a.length - 1) return a[a.length - 1]
  return a[i] * (1 - f) + a[i + 1] * f
}

/** How loud the mix is at `t`, 0 to 1 (a fifth of a second at a time). */
export const rmsAt = (t: number): number => sample(RMS, t)

/**
 * How full the held sound is at `t`, 0 to 1: the pad and the keys, a median over each band so an attack counts for
 * little. Smoothed again over about two seconds, so what answers it swells rather than flickers.
 */
export function heldAt(t: number): number {
  let s = 0
  let w = 0
  for (let i = -5; i <= 5; i++) {
    const k = Math.exp(-0.5 * (i / 2.5) ** 2)
    s += sample(HELD, t + i * 0.2) * k
    w += k
  }
  return s / w
}
