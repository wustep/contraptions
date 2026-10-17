import measured from '../../../../../../../scripts/shows/plans/surprise-onsets.json'

/**
 * The recording's clock: the Andante of Haydn's Symphony No. 94, the "Surprise", as Karajan and the Berlin
 * Philharmonic play it (Deutsche Grammophon, 1982), from Universal Music Group's upload to YouTube, from the video's
 * first second, so show time is the video's time. Measured once by `scripts/shows/surprise-onsets.py` into
 * `scripts/shows/plans/surprise-onsets.json`; `check:shows` holds the show to that file.
 *
 * The orchestra is played, not clocked, so every strain has its own comb and every beat is on its own attack where
 * there is one. Bars are numbered as they are played, repeats and all:
 *
 *   bars   1– 16  the theme, p, and again pp; the surprise on beat 2 of bar 16
 *   bars  17– 32  its second strain, twice
 *   bars  33– 64  variation 1: a forte chord at the head of each first strain
 *   bars  65– 98  variation 2, C minor, fortissimo; down to the violins alone and a fermata
 *   bars  99–130  variation 3: the oboe, piano
 *   bars 131–168  variation 4: fortissimo; dolce; a general pause; fortissimo
 *   bars 169–181  the coda, and the last chord
 */

interface Measured {
  duration: number
  surprise: number
  last: number
  phrases: { key: string; what: string; bar: number; bars: number; t: number; quarter: number }[]
  beats: { t: number; bar: number; beat: number; heard: boolean; s: number; db: number }[]
  onsets: { t: number; s: number; jump: number; db: number }[]
  rms: number[]
}
const m = measured as unknown as Measured

/** The video's length, seconds. */
export const RECORDING = m.duration
/** The surprise: the fortissimo chord and the timpani on beat 2 of bar 16. */
export const SURPRISE = m.surprise
/** The last chord, held to the end. */
export const LAST = m.last
/** The strains, in order. */
export const PHRASES = m.phrases
/** Every beat, in order. */
export const BEATS = m.beats
/** Every onset the recording has. */
export const ONSETS = m.onsets
/** Loudness every quarter second, 0 to 1. */
export const RMS: readonly number[] = m.rms

const byBar = new Map<number, number>()
for (const b of BEATS) byBar.set(b.bar * 2 + b.beat - 1, b.t)

/** Show time of beat `beat` (1 or 2) of played bar `bar` (1 to 181). */
export function beat(bar: number, n = 1): number {
  const t = byBar.get(bar * 2 + n - 1)
  if (t === undefined) throw new Error(`no beat ${n} in bar ${bar}`)
  return t
}

/** The first played bar of a strain, by its key (`var2-a`). */
export function strain(key: string): number {
  const p = PHRASES.find((s) => s.key === key)
  if (!p) throw new Error(`no strain ${key}`)
  return p.bar
}

/** The beat before `t`: the last beat at least 0.6 s before it (the shot's launch, a beat ahead of where it lands). */
export function beatBefore(t: number): number {
  let best = -Infinity
  for (const b of BEATS) if (b.t <= t - 0.6 && b.t > best) best = b.t
  return best
}

/** Loudness at `t`, 0 to 1, between the quarter seconds measured. */
export function loud(t: number): number {
  const f = Math.max(0, t) / 0.25
  const i = Math.floor(f)
  if (i >= RMS.length - 1) return RMS[RMS.length - 1] ?? 0
  return RMS[i] + (RMS[i + 1] - RMS[i]) * (f - i)
}
