import measured from '../../../../../../../scripts/shows/plans/caravan-onsets.json'

/**
 * The recording's clock: "Caravan" (Juan Tizol and Duke Ellington, arranged by John Wasson), the finale of
 * Whiplash, played whole from its first sample (`../whiplash-caravan-demo.mp3`, `scripts/shows/caravan-cue.sh`).
 * Measured once by `scripts/shows/caravan-onsets.py` into `scripts/shows/plans/caravan-onsets.json`; `check:shows`
 * holds every strike of this take against that file. Show time is recording time (the soundtrack's offset is 0).
 *
 * The track keeps time two ways:
 *
 * - **0 to 262 s, the tune, on a click.** A quarter note is 0.2143 s (280 bpm) to within ±17 ms from the first
 *   stroke to the last chorus. The beat here is the half note, `tune(k)` = 0.2153 + 0.42856·k (140 a minute, the
 *   pulse you nod to; the chart is in cut time). Beat 0 is the drum intro's first stroke. `tune(k + 0.5)` is the
 *   quarter note between two beats and `tune(k + 0.25)`, `tune(k + 0.75)` the eighths (the Latin sections are
 *   straight eighths, and the drums play them a hair early). The last chorus (242 to 262) drifts off the click by
 *   up to a tenth of a second, so it has its own comb, `shout(k)`.
 *     - 0.21 the drum intro, alone: the Caravan groove on the toms.
 *     - 21.11 the bass comes in under it.
 *     - 30.65 the band: the tune.
 *     - 130.5 the band drops out to a quiet stretch (a solo over the rhythm section).
 *     - 172.07 loud again: the band's second chorus.
 *     - 227 to 234 the stop-time breaks: the band's hits with silence between them.
 *     - 242 the last chorus (`shout`), to its last hit (261.13).
 *     - 262.03 to 269.8 the band holds its last chord, crescendo, and the conductor cuts it off.
 * - **270.5 s to the end, the drum solo, free.** No click: the solo speeds up, slows down and stops as the
 *   drummer wants. Strikes here land on the recording's own measured onsets (`ONSETS`, `onsetsIn`).
 *     - 270.52 the solo's first stroke. Loud and dense.
 *     - 323.27 it drops to a hush: soft cymbals and hi-hat, with bursts.
 *     - 369.98 the build, to the loudest and fastest (383 to 423).
 *     - 423.34 the ride cymbal, soft and dense; from 432.72 the rubato (`RIDE`): the ride slows from a stroke every
 *       0.17 s to one every 0.9 s (458.58, nearly stopped, and nearly silent), then speeds up again to 0.13 s.
 *     - 484 a roll too fast to count, swelling to 504.
 *     - 504.0 the burst: the kick drum, loud. 519 a long loud roll. 540 the last fill.
 *     - 541.49 the last stroke before the silence; 541.8 to 543.2 silence.
 *     - 543.25 the band's last chord, held; 548.56 the final cut-off. The room is quiet by 549.3.
 */

interface Onset {
  t: number
  /** How strong: 1 is the track's 99th percentile of flux. */
  s: number
  /** How much of it is low (kick, toms, bass), middle (snare, horns) and high (cymbals, hi-hat), each 0..~3. */
  lo: number
  mid: number
  hi: number
}
interface Beat {
  k: number
  t: number
  onset?: number
  s: number
  lo?: number
  mid?: number
  hi?: number
}
interface Comb {
  period: number
  origin: number
  from: number
  to: number
  beats: Beat[]
}
const data = measured as unknown as {
  duration: number
  onsets: Onset[]
  tune: Comb
  shout: Comb
  ride: { t: number; s: number }[]
  kit: { kick: { t: number; s: number }[]; snare: { t: number; s: number }[]; cymbal: { t: number; s: number }[] }
  landmarks: Record<string, number | number[]>
  loudness: { step: number; db: number[] }
}
const mark = (name: string): number => data.landmarks[name] as number

/** The recording's length. The show runs on past it, in silence, for the credits (`DURATION`). */
export const RECORDING = data.duration
/** The show's length: the recording, the final cut-off's ring, and the credits over the dark hall after it. */
export const DURATION = 576

/* ------------------------------------------------------------------ onsets */

/** Every measured onset of the whole recording, with its strength and its band. */
export const ONSETS: readonly Onset[] = data.onsets

/** The onsets between `a` and `b` (show seconds) at least `min` strong. */
export const onsetsIn = (a: number, b: number, min = 0.3): Onset[] => ONSETS.filter((o) => o.t >= a && o.t <= b && o.s >= min)

/** The measured onset nearest `t` at least `min` strong: what a strike in the free solo is timed to. */
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

/* ------------------------------------------------------------------ the tune's click */

export const TUNE_ORIGIN = data.tune.origin
export const TUNE_PERIOD = data.tune.period
/** Show time of beat `k` of the tune (a half note; `.5` is the quarter between, `.25` and `.75` the eighths). */
export const tune = (k: number): number => TUNE_ORIGIN + TUNE_PERIOD * k
/** The beat of the tune nearest show time `t`, to the eighth. */
export const tuneBeat = (t: number): number => Math.round(((t - TUNE_ORIGIN) / TUNE_PERIOD) * 4) / 4

export const SHOUT_ORIGIN = data.shout.origin
export const SHOUT_PERIOD = data.shout.period
/** Show time of beat `k` of the last chorus (242 to 262.2), off the click, on its own comb. */
export const shout = (k: number): number => SHOUT_ORIGIN + SHOUT_PERIOD * k

/** How strong the recording is on beat `k` (to the eighth) of the tune or the last chorus: 0 when nothing is there. */
export function strength(which: 'tune' | 'shout', k: number): number {
  const c = which === 'tune' ? data.tune : data.shout
  return c.beats.find((b) => Math.abs(b.k - k) < 1e-6)?.s ?? 0
}

/** The combs, for the check: every beat and eighth of each, in show seconds, and the span it holds over. */
export const COMBS = [
  { name: 'tune', from: 0, to: 262.2, times: data.tune.beats.map((b) => b.t) },
  { name: 'shout', from: data.shout.from, to: data.shout.to, times: data.shout.beats.map((b) => b.t) },
]

/* ------------------------------------------------------------------ the solo, drum by drum */

/**
 * The solo's strokes, band by band (270.3 s to the end), each measured on its own: `kick` is the low band (the kick
 * and the toms), `snare` the middle, `cymbal` the high (cymbals, hi-hat). The whole-band `ONSETS` run the fastest
 * stretches together (from 383 s the snare is a stroke every 70 ms and the kick one every 155 ms); these do not.
 * A stroke's `s` is against its own band's 99th percentile.
 */
export const KICKS: readonly { t: number; s: number }[] = data.kit.kick
export const SNARES: readonly { t: number; s: number }[] = data.kit.snare
export const CYMBALS: readonly { t: number; s: number }[] = data.kit.cymbal
/** One band's solo strokes between `a` and `b`, at least `min` strong. */
export const strokesIn = (band: 'kick' | 'snare' | 'cymbal', a: number, b: number, min = 0.5): { t: number; s: number }[] =>
  data.kit[band].filter((o) => o.t >= a && o.t <= b && o.s >= min)

/* ------------------------------------------------------------------ the rubato */

/** The ride cymbal's strokes through the rubato, one by one (432.72 to 483.92): slowing to nearly nothing, then back. */
export const RIDE: readonly number[] = data.ride.map((r) => r.t)

/* ------------------------------------------------------------------ loudness */

/**
 * How loud the recording is at `t`, 0 (silence, -45 dB and under) to 1 (its loudest, -9 dB), smoothed over a
 * fifth of a second: for motion the music drives without striking (a roll's blur, a room's light).
 */
export function level(t: number): number {
  const { step, db } = data.loudness
  const at = (i: number) => db[Math.max(0, Math.min(db.length - 1, i))]
  const i = t / step
  const j = Math.floor(i)
  const f = i - j
  const v = (at(j - 1) + 2 * at(j) + 2 * at(j + 1) + at(j + 2)) / 6 + (at(j + 1) - at(j)) * (f - 0.5) * 0.5
  return Math.max(0, Math.min(1, (v + 45) / 36))
}

/* ------------------------------------------------------------------ landmarks */

/** The drum intro's first stroke (beat 0), and the bass coming in under it. */
export const FIRST = mark('first')
export const BASS = mark('bass')
/** The band comes in with the tune: beat 71. */
export const BAND = mark('band')
/** The band room's second half: the tempo test starts on beat 188. */
export const TEMPO = tune(188)
/** The band drops out to the quiet stretch: beat 304. */
export const QUIET = tune(304)
/** Loud again, on beat 401: the stage changes to the road. */
export const LOUD = tune(401)
/** The road's two halves: the folder at the competition, then the drive (beat 480). */
export const DRIVE = tune(480)
/** The stop-time breaks: the band's hits, with silence between. */
export const BREAKS: readonly number[] = data.landmarks.breaks as number[]
/** The last chorus: the stage changes to Carnegie Hall, on a hit. */
export const CARNEGIE = 242.344
/** The last chorus's last hit, the band's held chord, and the conductor's cut-off (the chord drops into silence). */
export const BUTTON = mark('button')
export const CHORD = mark('chord')
export const CUTOFF = mark('cutoff')
/** The solo's first stroke. */
export const SOLO = mark('solo')
/** The solo drops to a hush. */
export const HUSH = mark('hush')
/** The build to the loudest and fastest. */
export const BUILD = mark('build')
/** The ride cymbal: soft and dense, then the rubato from `RIDE[0]`. */
export const RUBATO = mark('rubato')
/** The rubato's slowest stroke: the solo nearly stops. */
export const SLOWEST = mark('slowest')
/** A roll too fast to count, swelling. */
export const SWELL = mark('swell')
/** The burst: the kick drum, loud. */
export const BURST = mark('burst')
/** The long loud roll. */
export const ROLL = mark('roll')
/** The last fill's loudest stroke, and the last stroke before the silence. */
export const LAST_FILL = mark('last_fill')
export const BREAK = mark('break')
/** The band's last chord, after 1.4 s of silence. */
export const LAST_CHORD = mark('last_chord')
/** The final cut-off: the conductor's closed fist. */
export const FINAL = mark('final')
/** The room is quiet. */
export const END = mark('end')
