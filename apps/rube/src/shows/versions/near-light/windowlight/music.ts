import measured from '../../../../../../../scripts/shows/plans/near-light-onsets.json'

/**
 * The music's clock: Ólafur Arnalds' "Near Light" (Living Room Songs, Erased Tapes, 2011), played round and round
 * (`apps/rube/src/shows/versions/near-light/near-light-demo.mp3`, made by `scripts/shows/near-light-loop.py`).
 * Measured once by `scripts/shows/near-light-onsets.py` into `scripts/shows/plans/near-light-onsets.json`;
 * `check:shows` holds the show against that file.
 *
 * It is played to one click, 118.008 beats a minute, and the loop is 101 of its bars: bar 0's downbeat is the first
 * chord, and bar 101's is the first chord again. Four beats a bar, every section on a downbeat:
 *
 *   bar  0   0.0    intro      the felt piano alone, free against the click; two long breaths (20.5, 31.6 s)
 *   bar 20  40.84   strings    the quartet and the Juno in, a chord every two bars
 *   bar 36  73.38   build      the bass and the pad swelling
 *   bar 48  97.79   beat       the drum loop: flat loud, twenty-four bars
 *   bar 72 146.60   after      the drums gone; piano and strings, accents on the downbeats
 *   bar 84 171.00   arpeggios  the piano's arpeggios high up, bars 87 and 93 resting
 *   bar 96 195.41   coda       a last chord, and one string's held note dying on the half-bar of bar 100
 *
 * Show time runs from 0 to PERIOD and is then 0 again: everything in the show is a function of show time taken round
 * that circle.
 */

export interface Onset {
  /** Show time: where the attack starts. */
  t: number
  /** How strong, against the 95th percentile of its own section's onsets. */
  s: number
  /** The share of its flux under 180 Hz: the drum loop's kick and the bass. */
  low: number
  in: string
}

export interface Section {
  name: string
  /** Its first bar and the bar after its last. */
  from: number
  to: number
  t0: number
  t1: number
}

/** Seconds of one time round: 101 bars. */
export const PERIOD: number = measured.period
/** Where the show's zero is in the recording: the file carries this much of its own end before it, and of its start after it. */
export const MARGIN: number = measured.margin
/** Seconds a beat, and show time of bar 0's downbeat. */
export const BEAT: number = measured.comb.period
export const PHASE: number = measured.comb.phase
export const BARS: number = measured.comb.bars
export const BAR = 4 * BEAT

export const SECTIONS: Section[] = measured.sections
export const ONSETS: Onset[] = measured.onsets

/** Show time of beat `k`: on its own attack where it has one within 30 ms of the comb. */
export const beatAt = (k: number): number => measured.beats[((k % measured.beats.length) + measured.beats.length) % measured.beats.length].t

/** Show time of bar `b`'s downbeat (any real `b`: 20.5 is the half-bar). Bar 0 is the first chord. */
export const bar = (b: number): number => PHASE + b * BAR
/** Which bar show time `t` is in, as a real number (48.25 is bar 48's second beat). */
export const barAt = (t: number): number => (t - PHASE) / BAR

export function section(name: string): Section {
  const s = SECTIONS.find((x) => x.name === name)
  if (!s) throw new Error(`no section ${name}`)
  return s
}

/** Show time round the circle: any time at all, taken into [0, PERIOD). */
export const wrap = (t: number): number => {
  const u = t % PERIOD
  return u < 0 ? u + PERIOD : u
}

/** Seconds since `at`, round the circle: negative while it is still to come (within half a period). */
export function since(t: number, at: number): number {
  const d = wrap(t - at)
  return d > PERIOD / 2 ? d - PERIOD : d
}

/**
 * A slow oscillation that comes round with the period: the nearest whole number of cycles a period to `hz`. What
 * anything that shimmers or sways runs on, so that nothing jumps where the period closes.
 */
export const osc = (t: number, hz: number, phase = 0): number => {
  const n = Math.max(1, Math.round(hz * PERIOD))
  return Math.sin((2 * Math.PI * n * wrap(t)) / PERIOD + phase)
}

/** The measured onset nearest `t` in section `name`, at least `s` strong. */
export function onset(t: number, name?: string, s = 0): Onset {
  let best: Onset | null = null
  for (const o of ONSETS) {
    if ((name && o.in !== name) || o.s < s) continue
    if (!best || Math.abs(o.t - t) < Math.abs(best.t - t)) best = o
  }
  if (!best) throw new Error(`no onset near ${t}`)
  return best
}

/** A curve every quarter second round the circle, read smoothly at any time. */
function sampled(values: number[], step: number): (t: number) => number {
  const n = values.length
  return (t: number) => {
    const x = wrap(t) / step
    const i = Math.floor(x)
    const f = x - i
    const a = values[i % n]
    const b = values[(i + 1) % n]
    return a + (b - a) * f
  }
}

/** Smoothed round the circle with a gaussian of `sd` seconds. */
function soften(values: number[], step: number, sd: number): number[] {
  const n = values.length
  const half = Math.ceil((3 * sd) / step)
  const kernel = Array.from({ length: 2 * half + 1 }, (_, j) => Math.exp(-0.5 * (((j - half) * step) / sd) ** 2))
  const total = kernel.reduce((a, b) => a + b, 0)
  return values.map((_, i) => {
    let acc = 0
    for (let j = -half; j <= half; j++) acc += values[(i + j + n) % n] * kernel[j + half]
    return acc / total
  })
}

/**
 * How full the held sound is at `t`, 0 to 1: the strings, the Juno's pad, a pedalled chord; not an attack. Smoothed
 * over a second and a half, round the circle. The aurora answers it.
 */
export const held = sampled(soften(measured.held, measured.step, 1.5), measured.step)

/** How loud the recording is at `t`, 0 (its quiet twentieth) to 1 (its loud twentieth), smoothed over a second. */
export const loudness = (() => {
  const db = measured.rms
  const sorted = [...db].sort((a, b) => a - b)
  const lo = sorted[Math.floor(db.length * 0.05)]
  const hi = sorted[Math.floor(db.length * 0.95)]
  return sampled(soften(db.map((v) => Math.max(0, Math.min(1, (v - lo) / (hi - lo)))), measured.step, 1), measured.step)
})()
