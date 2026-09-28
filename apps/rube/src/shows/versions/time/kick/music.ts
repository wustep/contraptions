import measured from '../../../../../../../scripts/shows/plans/time-onsets.json'

/**
 * The recording's clock: Hans Zimmer's "Time", the last cue of Inception (WaterTower Music, 2010), played from its
 * first sample (formerly `time-demo.mp3`; live playback is YouTube only). Measured once by `scripts/shows/time-onsets.py`
 * into `scripts/shows/plans/time-onsets.json`; `check:shows` holds every strike of this take against that file.
 *
 * It is a click: one tempo, 63.01 beats a minute (a beat every 0.95226 s; beat k at 0.4145 + 0.95226 k), from the first
 * chord (beat 0) to the last (beat 288), every strong beat within a few milliseconds of the comb. Four beats a bar, one
 * chord a bar: A minor, E minor, G, D, and round again. Four bars are a **turn** of the loop, and the cue is eighteen
 * turns and a last chord. Beat k is a downbeat when k is a multiple of 4, and a turn's first when k is a multiple of
 * 16. Nothing else changes but how much is stacked on the loop, a layer every two turns, and every layer comes in on a
 * turn's first downbeat. Strikes land on a beat or an off-beat (`beat(k)`, `half(k)`), or on a measured onset
 * (`onset(t)`).
 *
 *   0.414   pad      turns 1-2: a pad and the piano's chords, low and soft; every bar's chord a clear attack
 *   30.860  strings  turns 3-4: the strings come in on the downbeat, the cue's first big attack
 *   61.342  pulse    turns 5-6: horns, and a low pulse of eighths under them
 *   91.824  brass    turns 7-8: the brass take the tune
 *   122.294 swell    turns 9-10: the whole orchestra, rising
 *   152.770 peak     turns 11-12: the drums and the full brass
 *   183.247 summit   turns 13-14: the loudest; the guitar over it; each A minor and G downbeat the hardest of the cue
 *   213.717 after    turns 15-16: the peak rings away over this downbeat; strings and the piano, falling away
 *   244.187 piano    turns 17-18: the piano alone, very soft, a chord a bar, each struck clear
 *   274.617 last     the last chord, a little ahead of the comb, and its ring to the end of the file (275.563)
 */

export interface Beat {
  /** Its index on the comb. */
  k: number
  /** Show time: its own attack where one is within 30 ms of the comb, else the comb. */
  t: number
  /** Whether it has its own attack. */
  onset: boolean
  /** How hard it is struck against the 32 beats either side (1 is their 90th percentile), and against the whole cue. */
  s: number
  g: number
}
export interface Onset {
  t: number
  s: number
  /** The stretch it is in: soft, build, peak, after, piano. */
  in: string
}
interface Data {
  duration: number
  youtube: string
  comb: { period: number; phase: number; first: number; last: number; bar: number; turn: number }
  turns: { n: number; from: number; to: number }[]
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
/** The beat: its period and the time of beat 0 (the first chord). */
export const PERIOD = data.comb.period
export const PHASE = data.comb.phase
export const LAST_BEAT = data.comb.last

/** Every beat, first to last, and every off-beat (beat k's is half-way to k + 1). */
export const BEATS: readonly Beat[] = data.beats
export const HALVES: readonly Beat[] = data.halves
/** Every measured onset, with its strength. */
export const ONSETS: readonly Onset[] = data.onsets
/** The sections (a pair of turns each), as measured, and the eighteen turns. */
export const SECTIONS = data.sections
export const TURNS = data.turns

/** Beat `k`'s show time (its own attack where it has one), or where the comb puts it. */
export function beat(k: number): number {
  if (k >= 0 && k < BEATS.length) return BEATS[k].t
  return PHASE + k * PERIOD
}
/** The off-beat after beat `k` (its own attack where it has one). */
export function half(k: number): number {
  if (k >= 0 && k < HALVES.length) return HALVES[k].t
  return PHASE + (k + 0.5) * PERIOD
}
/** The downbeat of bar `n` (beat 4n), counting from 0: bar n's chord is A minor, E minor, G, D as n % 4 is 0, 1, 2, 3. */
export const bar = (n: number): number => beat(4 * n)
/** The first downbeat of turn `n` of the loop, counting from 1 (turn 1 is the first chord; turn 19 is the last chord). */
export const turn = (n: number): number => beat(16 * (n - 1))
/** The beat `k` itself. */
export const beatAt = (k: number): Beat | null => BEATS[k] ?? null
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
 * for motion the music drives without striking (a glow, a sway, the sea's swell).
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
  return Math.max(0, Math.min(1, (v / w + 40) / 34))
}

/* ------------------------------------------------------------------ landmarks */

const L = data.landmarks
const section = (name: string): number => SECTIONS.find((s) => s.name === name)!.from

/** Each pair of turns' first downbeat: a layer comes in on each (the pad is the first chord). */
export const PAD = beat(0)
export const STRINGS = section('strings')
export const PULSE = section('pulse')
export const BRASS = section('brass')
export const SWELL = section('swell')
export const PEAK = section('peak')
export const SUMMIT = section('summit')
/** The peak's last downbeat (turn 14's last bar), and the release: the peak rings away over turn 15's downbeat. */
export const CREST = L.crest
export const RELEASE = section('after')
/** The piano alone (turn 17), its loudest chord (turn 17's second bar: the loudest attack of the cue's last minute). */
export const PIANO = section('piano')
export const PIANO_SPIN = bar(65)
/** The last chord, a little ahead of the comb. */
export const LAST = L.last

/* ------------------------------------------------------------------ the kicks */

/**
 * The kicks, from the bottom up, each on one of the summit's four hardest downbeats: limbo's (the jump off the
 * tower), the snow's (the fortress comes down), the hotel's (the lift falls), and the rain's (the van into the river).
 * On a kick the ball is thrown up out of its level; it crosses the dark of sleep into the level over it `UP_LAG` later
 * (under gravity from limbo's fall and the fortress's footing; at one speed up the weightless hotel's shaft).
 */
export const KICK = {
  limbo: SUMMIT,
  snow: bar(50),
  hotel: bar(52),
  rain: bar(54),
} as const
export const UP_LAG = { limbo: 0.6, snow: 0.8, hotel: 1.1 } as const

/** When the credits come, once the last chord has rung away in the dark. */
export const CREDITS_AT = 277.0
/** The show's length: the recording, then the credits in the silence after it. */
export const DURATION = 309

/**
 * The seams: every show time the ball passes from one part to the next. A seam between worlds is a cut (a match cut,
 * `seams.ts`); a seam inside the dream is a crossing of the dark of sleep between two levels, going down on a layer's
 * downbeat, or coming up just after a kick.
 */
export const SEAM = {
  /** Cut: limbo's shore into Paris, on the strings' downbeat. */
  paris: STRINGS,
  /** Cut: Paris into the plane, on the pulse's downbeat (a jolt awake). */
  plane: PULSE,
  /** Cut: the plane into the rain (going under), on turn 5's third downbeat. */
  rain: bar(18),
  /** Down: out of the rain into the hotel, on the brass's downbeat. */
  hotel: BRASS,
  /** Down: out of the hotel into the snow, on the swell's downbeat. */
  snow: SWELL,
  /** Down: out of the snow into limbo, on the peak's downbeat. */
  limbo: PEAK,
  /** Up: out of limbo into the snow, just after limbo's kick. */
  vault: KICK.limbo + UP_LAG.limbo,
  /** Up: out of the snow into the hotel, just after the snow's kick. */
  lift: KICK.snow + UP_LAG.snow,
  /** Up: out of the hotel into the rain, just after the hotel's kick. */
  river: KICK.hotel + UP_LAG.hotel,
  /** Cut: the river's surface into the plane (awake), on the release. */
  wake: RELEASE,
  /** Cut: the plane into home, on the piano's first downbeat. */
  home: PIANO,
} as const
