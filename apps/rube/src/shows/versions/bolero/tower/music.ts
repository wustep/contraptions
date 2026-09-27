import measured from '../../../../../../../scripts/shows/plans/bolero-onsets.json'

/**
 * The recording's clock: Maurice Ravel, Boléro (1928), played from the score by Omega13a in MuseScore 4 with Muse
 * Sounds, CC BY 4.0, whole from its first sample (`../bolero-omega13a.mp3`, `scripts/shows/bolero-cue.sh`). Measured
 * once by `scripts/shows/bolero-onsets.py` into `scripts/shows/plans/bolero-onsets.json`; `check:shows` holds every
 * strike of this take against that file. Show time is recording time (the soundtrack's offset is 0).
 *
 * The recording keeps the score's tempo (a quarter = 72) from the first bar to the last, as Ravel asked, so the
 * whole piece is one comb: 340 bars of 3/4 at 2.5 s, the first downbeat at `T0`. Over it:
 *
 * - **The side drum**, two bars of it, 169 times (`SNARE`): an eighth and a triplet of sixteenths on each of the
 *   first two beats and two eighths on the third, then the same with two triplets on the third. It never stops.
 * - **The plucked strings** (`PIZZ`): the low C on every downbeat, the violas on 2, the cellos on 3.
 * - **The tune, eighteen times** (`STATEMENTS`): 18 bars each from bar 5, sixteen of tune and its last note on the
 *   17th downbeat, then two bars of drum alone. A A B B, four times over, then A and B once each, each time in new
 *   voices and louder (from the flute at -44 dB to the whole orchestra at -10).
 * - **E major**, the only modulation, bars 327 to 334; **C** again from 335; the tutti's last two bars of drum
 *   (337, 338); **the collapse** on 339 (the trombones' glissandi, the tam-tam) and **the last chord** on 340.
 */

interface Statement {
  n: number
  bar: number
  t: number
  theme: 'A' | 'B'
  voice: string
  db: number
}
const data = measured as unknown as {
  duration: number
  comb: { t0: number; beat: number; bar: number; bars: number }
  snare: number[]
  pizz: [number, 'low' | 'mid' | 'high'][]
  statements: Statement[]
  themes: { A: [number, number][]; B: [number, number][] }
  form: { emajor: [number, number]; return: number; tutti: [number, number]; collapse: number; final: number; collapse_t: number; last: number; ring: number }
  loudness: (number | null)[]
}

/** The recording's length, seconds. */
export const RECORDING = data.duration
/** The downbeat of bar 1, and the quarter and the bar, seconds. */
export const T0 = data.comb.t0
export const BEAT = data.comb.beat
export const BAR = data.comb.bar

/** Bar `n`'s downbeat (bars count from 1), plus `q` quarters. */
export const bar = (n: number, q = 0): number => T0 + (n - 1) * BAR + q * BEAT

/** The side drum's two bars, in quarters from an odd bar's downbeat. */
export const SNARE: readonly number[] = data.snare
/** The strings' figure under it, two bars: [quarter, which]. */
export const PIZZ: readonly [number, 'low' | 'mid' | 'high'][] = data.pizz

/** The eighteen statements of the tune. */
export const STATEMENTS: readonly Statement[] = data.statements
/** A note of the tune: quarters from its statement's downbeat, and its pitch (MIDI). */
export type Note = [number, number]
export const THEMES: { A: readonly Note[]; B: readonly Note[] } = data.themes
export const FORM = data.form
/** The tune's first note in each statement. */
export const statementAt = (k: number): number => STATEMENTS[k].t

/** Every side-drum stroke from bar 1 to the last chord (the tutti's last bar included), seconds. */
export const STROKES: readonly number[] = (() => {
  const out: number[] = []
  for (let b = 1; b < FORM.collapse; b += 2) for (const q of SNARE) out.push(bar(b, q))
  return out
})()

/** Every pluck of the strings' figure, seconds, with which of them it is. */
export const PLUCKS: readonly { t: number; who: 'low' | 'mid' | 'high' }[] = (() => {
  const out: { t: number; who: 'low' | 'mid' | 'high' }[] = []
  for (let b = 1; b < FORM.collapse; b += 2) for (const [q, who] of PIZZ) out.push({ t: bar(b, q), who })
  return out
})()

/** Index of the last of `times` (sorted) at or before `t`, or -1. */
export function lastIndex(times: readonly number[], t: number): number {
  let lo = 0
  let hi = times.length - 1
  if (hi < 0 || times[0] > t) return -1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (times[mid] <= t) lo = mid
    else hi = mid - 1
  }
  return lo
}

/** How long since the last side-drum stroke, and which stroke it was (0..23 in its two bars), or Infinity before the first. */
export function stroke(t: number): { ago: number; i: number; n: number } {
  const n = lastIndex(STROKES, t)
  return n < 0 ? { ago: Infinity, i: -1, n } : { ago: t - STROKES[n], i: n % SNARE.length, n }
}

/** How long since the last pluck of `who` (any, when left out). */
export function pluck(t: number, who?: 'low' | 'mid' | 'high'): number {
  for (let i = lastIndex(PLUCKS.map((p) => p.t), t); i >= 0; i--) if (!who || PLUCKS[i].who === who) return t - PLUCKS[i].t
  return Infinity
}

/** A knock: 1 as `since` crosses zero, then decaying. */
export const knock = (since: number, decay = 0.12): number => (since < 0 || !Number.isFinite(since) ? 0 : Math.exp(-since / decay))

/**
 * How loud the orchestra is at `t`, 0 (the first bars, about -46 dB) to 1 (the last tutti, about -9 dB): the bar's
 * measured loudness, eased between bars. What every amplitude in the picture grows with.
 */
export function loud(t: number): number {
  const f = (t - T0) / BAR
  const i = Math.max(0, Math.min(data.loudness.length - 2, Math.floor(f)))
  const u = Math.max(0, Math.min(1, f - i))
  const a = data.loudness[i] ?? -60
  const b = data.loudness[i + 1] ?? a
  const db = a + (b - a) * u
  return Math.max(0, Math.min(1, (db + 46) / 37))
}

/** The same, smoothed over the last two bars: how big the machine is playing, rather than this bar's accents. */
export function swell(t: number): number {
  let s = 0
  for (let i = 0; i < 8; i++) s += loud(t - i * 0.6)
  return s / 8
}

/** The last chord's attack, and where it has rung out. */
export const LAST = FORM.last
export const RING = FORM.ring
/** The collapse bar's downbeat (the tam-tam, the glissandi) as measured. */
export const COLLAPSE = FORM.collapse_t
/** E major, from its first downbeat to C's. */
export const EMAJOR = bar(FORM.emajor[0])
export const RETURN = bar(FORM.return)
