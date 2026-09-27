import measured from '../../../../../../../scripts/shows/plans/relax-onsets.json'

/**
 * The recording's clock: Frankie Goes to Hollywood's "Relax", the original 7" (ZTT, 1983), played from its first
 * sample (`apps/rube/src/shows/versions/relax/relax-demo.mp3`). Measured once by `scripts/shows/relax-onsets.py` into
 * `scripts/shows/plans/relax-onsets.json`; `check:shows` holds every strike of this take against that file.
 *
 * It is a drum machine's clock: one tempo, 115.405 beats a minute (a beat every 0.519908 s; beat k at
 * 0.3603 + 0.519908 k), from the pickup into the drums (beat 19) to the last hit (beat 440), every strong beat within a
 * few milliseconds of the comb. Four beats a bar; beat k is a downbeat when k is a multiple of 4, and every section
 * starts on one. Strikes land on a beat or an off-beat (`beat(k)`, `half(k)`) or on a measured onset (`onset(t)`).
 *
 *   0       intro   two sung calls over a pad, no drums (5.126, 8.679)
 *   10.746  groove  the drums in on a downbeat (a one-beat pickup, 10.246), the bass in eighths
 *   27.394  hook1   the hook, round one: its lines about every two bars
 *   52.356  hook2   the hook, louder, round two
 *   68.999  call    breaks; a sung call on the downbeat 71.071 (beat 136)
 *   83.552  verse   the verse, and a call and answer (about 97.4 and 99.3)
 *   102.267 bridge  instrumental
 *   116.820 break   a spoken count-in and the title over a bare groove
 *   131.373 lift    two bars up to the surge; its wash from 132.941 (beat 255)
 *   133.463 surge   the biggest lift of the song: the wash, the doubled bass
 *   137.625 ride    riding it
 *   156.341 hook3   the hook, a last round
 *   170.899 rock    a breakdown rocking between two bars: every beat hard
 *   182.817 drop    a last hit and the band stops dead; a crash rings down to near silence; a splash out of the
 *                   silence (186.474); the band back in (186.997); the groove from the downbeat 187.525
 *   187.525 outro   the groove again
 *   202.095 finale  the hook again, the loudest bars of the song
 *   229.118 end     dead on the downbeat; one last call in the tail, and the fade to 233.6
 */

export interface Beat {
  /** Its index on the comb. */
  k: number
  /** Show time: its own attack where one is within 30 ms of the comb, else the comb. */
  t: number
  /** Whether it has its own attack. */
  onset: boolean
  /** How hard it is struck against the 32 beats either side (1 is their 90th percentile), and against the whole song. */
  s: number
  g: number
}
export interface Onset {
  t: number
  s: number
  /** The stretch it is in: intro, groove, drop, outro, tail. */
  in: string
}
interface Data {
  duration: number
  comb: { period: number; phase: number; first: number; last: number }
  sections: { name: string; from: number; to: number }[]
  landmarks: Record<string, number>
  beats: Beat[]
  halves: Beat[]
  onsets: Onset[]
  rms_step: number
  rms: number[]
}
const data = measured as unknown as Data

/** The recording's length. */
export const RECORDING = data.duration
/** The beat: its period and the time of beat 0 (before the music; the first beat is 19, the pickup into the drums). */
export const PERIOD = data.comb.period
export const PHASE = data.comb.phase
export const FIRST_BEAT = data.comb.first
export const LAST_BEAT = data.comb.last

/** Every beat, first to last, and every off-beat (beat k's is half-way to k + 1). */
export const BEATS: readonly Beat[] = data.beats
export const HALVES: readonly Beat[] = data.halves
/** Every measured onset, with its strength. */
export const ONSETS: readonly Onset[] = data.onsets
/** The sections, as measured. */
export const SECTIONS = data.sections

/** Beat `k`'s show time (its own attack where it has one), or where the comb puts it outside the drums. */
export function beat(k: number): number {
  const i = k - FIRST_BEAT
  if (i >= 0 && i < BEATS.length) return BEATS[i].t
  return PHASE + k * PERIOD
}
/** The off-beat after beat `k` (its own attack where it has one). */
export function half(k: number): number {
  const i = k - FIRST_BEAT
  if (i >= 0 && i < HALVES.length) return HALVES[i].t
  return PHASE + (k + 0.5) * PERIOD
}
/** The downbeat of bar `n` (beat 4n). */
export const bar = (n: number): number => beat(4 * n)
/** The beat `k` itself, or null outside the drums. */
export const beatAt = (k: number): Beat | null => BEATS[k - FIRST_BEAT] ?? null
/** The index of the beat nearest `t`. */
export const nearestK = (t: number): number => Math.round((t - PHASE) / PERIOD)
/** Every beat from index `a` to `b`, inclusive, as show times. */
export const beats = (a: number, b: number): number[] => {
  const out: number[] = []
  for (let k = a; k <= b; k++) out.push(beat(k))
  return out
}
/** The beats between two show times struck at least `min` hard against the beats round them (`Beat.s`). */
export const hardBeats = (a: number, b: number, min = 0.8): number[] => BEATS.filter((p) => p.t >= a && p.t <= b && p.s >= min).map((p) => p.t)

/** The measured onset nearest `t` with strength at least `min`. */
export function onset(t: number, min = 0.3): number {
  let best = t
  let d = Infinity
  for (const o of ONSETS) {
    if (o.s < min) continue
    const e = Math.abs(o.t - t)
    if (e < d) {
      d = e
      best = o.t
    }
  }
  return best
}

/**
 * How loud the recording is at `t`, 0 (-40 dB and under) to 1 (its loudest), smoothed over half a second either side:
 * for motion the music drives without striking (a glow, a sway, a crowd's heave).
 */
export function level(t: number): number {
  const { rms_step: step, rms } = data
  const at = (i: number) => rms[Math.max(0, Math.min(rms.length - 1, i))]
  const i = t / step
  const j = Math.floor(i)
  const f = i - j
  let v = 0
  let w = 0
  for (let d = -2; d <= 3; d++) {
    const q = 1 - Math.abs(d - f) / 3.5
    v += at(j + d) * q
    w += q
  }
  return Math.max(0, Math.min(1, (v / w + 40) / 32))
}

/* ------------------------------------------------------------------ landmarks */

const L = data.landmarks
const section = (name: string): number => SECTIONS.find((s) => s.name === name)!.from

/** The intro's two sung calls, over the pad (free: no drums yet). */
export const CALL1 = L.call1
export const CALL2 = L.call2
/** The pickup into the drums (beat 19), and the drums' first downbeat (beat 20). */
export const PICKUP = L.pickup
export const DRUMS = L.drums
/** Each section's first downbeat. */
export const HOOK1 = section('hook1')
export const HOOK2 = section('hook2')
export const BREAKS = section('call')
/** The sung call on the downbeat after the second round of the hook (beat 136). */
export const CALL = L.call
export const VERSE = section('verse')
export const BRIDGE = section('bridge')
export const BREAK = section('break')
export const LIFT = section('lift')
/** The surge's wash of noise, on the beat before its downbeat (beat 255), and the surge's downbeat. */
export const WASH = L.wash
export const SURGE = section('surge')
export const RIDE = section('ride')
export const HOOK3 = section('hook3')
export const ROCK = section('rock')
/** The drop out: the last hit before the band stops dead, the splash out of the silence, the band back in, the groove. */
export const STOP = L.stop
export const SPLASH = L.splash
export const BACK = L.back
export const GROOVE = L.groove
export const OUTRO = GROOVE
export const FINALE = section('finale')
/** The last hit, dead on the downbeat (beat 440). */
export const END = L.end

/** When the credits come, once the last call has rung away. */
export const CREDITS_AT = 231.0
/** The show's length: the recording, then the credits in the quiet after it. */
export const DURATION = 263

/**
 * The seams: every show time the ball passes from one part to the next. A seam inside a place is a hand-off; one
 * between places is a cut (`seams.ts`). Each is on a downbeat.
 */
export const SEAM = {
  /** Cut: the awards' wings into the spa, in a flash, on the hook's first downbeat. */
  spa: HOOK1,
  /** Cut: out of the spa's door into the club, in a flash, on the verse's first downbeat. */
  club: VERSE,
  /** Cut: the club into Derelicte's wings, on the break's first downbeat (the count-in). */
  derelicte: BREAK,
  /** Cut: the runway into the Center, in a flash, on the finale's first downbeat. */
  center: FINALE,
} as const
