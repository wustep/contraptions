import measured from '../../../../../../../scripts/shows/plans/nature-of-daylight-onsets.json'

/**
 * The recording's clock: Max Richter's "On the Nature of Daylight" (The Blue Notebooks, 2004), the recording Arrival
 * opens and closes on, played from its first sample (`apps/rube/src/shows/versions/nature-of-daylight/
 * nature-of-daylight-demo.mp3`). Measured once by `scripts/shows/nature-of-daylight-onsets.py` into
 * `scripts/shows/plans/nature-of-daylight-onsets.json`; `check:shows` holds every strike of this take against that
 * file.
 *
 * A string elegy in B-flat minor over one slow ground (B-flat minor, A-flat or F minor, D-flat, G-flat), a chord a
 * bar, four beats a bar at about 62 a minute, played freely: a beat is 0.87 to 1.1 s, a chord 3.5 to 4.8 s. Strikes
 * land on a beat (`BEATS`, each on its own attack where it has one), a change of chord (`CHORDS`, each on a beat), or
 * a measured onset (`ONSETS`: the bow changes and the tune's notes).
 *
 *   0       silence; the first chord 1.625
 *   1.625   lament    the low strings alone: the viola's line over the ground
 *   38.609            a second, higher voice
 *   71.953            the cellos' low notes under it; a swell to 93.861; a half cadence 98.429
 *   102.110 arrival   the double bass comes in under everything (its swell 102.522); the violins take the tune up high
 *   200.626 knowing   the bass drops out for two bars: the second half, the counter-line higher
 *   288.554 call      the loudest eight bars; the loudest 303.827
 *   318.711 daylight  the high violins stop; the long descent onto B-flat (349.495), the last chord 367.996, its last
 *                     attack 371.931, silent by 372.75
 */

export interface Beat {
  /** Show time: its own attack where one is within 40 ms, else where the tracker put it. */
  t: number
  /** Whether it has its own attack. */
  onset: boolean
  /** How hard it is played against the beats of its section (1 is their 95th percentile, up to 2). */
  s: number
  /** The chord it falls in (an index into `CHORDS`). */
  chord: number
}
export interface Chord {
  n: number
  /** Show time of its arrival: a beat. */
  t: number
  /** How many beats it holds (4 is a bar). */
  beats: number
  chord: string
  /** How loud the chord is, dB. */
  db: number
  /** How much the harmony changes on its arrival, 0 to 1. */
  change: number
}
export interface Onset {
  t: number
  s: number
  /** The section it is in: lament, arrival, knowing, call, daylight. */
  in: string
}
interface Data {
  duration: number
  sections: { name: string; from: number; to: number }[]
  landmarks: Record<string, number>
  chords: Chord[]
  beats: Beat[]
  onsets: Onset[]
  rms_step: number
  rms: number[]
}
const data = measured as unknown as Data

/** The recording's length. */
export const RECORDING = data.duration
/** Every beat, first to last. */
export const BEATS: readonly Beat[] = data.beats
/** Every change of chord, first to last. */
export const CHORDS: readonly Chord[] = data.chords
/** Every measured onset, with its strength. */
export const ONSETS: readonly Onset[] = data.onsets
/** The sections, as measured. */
export const SECTIONS = data.sections

/** Chord `n`'s arrival, in show time. */
export const chord = (n: number): number => CHORDS[Math.max(0, Math.min(CHORDS.length - 1, n))].t
/** Beat `i`'s show time. */
export const beat = (i: number): number => BEATS[Math.max(0, Math.min(BEATS.length - 1, i))].t
/** The index of the beat nearest `t`. */
export function beatIndex(t: number): number {
  let best = 0
  for (let i = 1; i < BEATS.length; i++) if (Math.abs(BEATS[i].t - t) < Math.abs(BEATS[best].t - t)) best = i
  return best
}
/** The beat nearest `t`, in show time. */
export const nearestBeat = (t: number): number => BEATS[beatIndex(t)].t
/** The beats between two show times (inclusive), as show times; `min` keeps only those played at least that hard. */
export const beats = (a: number, b: number, min = 0): number[] => BEATS.filter((x) => x.t >= a - 1e-6 && x.t <= b + 1e-6 && x.s >= min).map((x) => x.t)
/** The chord arrivals between two show times (inclusive). */
export const chords = (a: number, b: number): number[] => CHORDS.filter((c) => c.t >= a - 1e-6 && c.t <= b + 1e-6).map((c) => c.t)

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
/** The onsets between two show times with strength at least `min`: the tune's notes and the bow changes. */
export const onsets = (a: number, b: number, min = 0.5): number[] => ONSETS.filter((o) => o.t >= a && o.t <= b && o.s >= min).map((o) => o.t)

/**
 * How loud the recording is at `t`, 0 (-45 dB and under) to 1 (-15 dB, near its loudest), smoothed over half a second
 * either side: for motion the music drives without striking (a swell of light, a sway, the fog's breath).
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
  return Math.max(0, Math.min(1, (v / w + 45) / 30))
}

/* ------------------------------------------------------------------ landmarks */

/** The first chord (the ground's first sound). */
export const FIRST_CHORD = chord(0)
/** The second voice comes in over the viola. */
export const SECOND = chord(9)
/** The cellos' low notes under the ground. */
export const CELLO = chord(17)
/** The lament's swell (its loudest), and its half cadence before the bass. */
export const SWELL = chord(22)
export const HALF = chord(23)
/** The double bass: the downbeat it comes in on, and its swell. */
export const ARRIVAL = chord(24)
export const BASS = 102.522
/** The bass drops out: the second half begins. */
export const TURN = chord(50)
/** The loud chord in the second half's first stretch (the bomb). */
export const BLAST = chord(57)
/** The loudest eight bars: their first chord, their loudest, where the high violins stop. */
export const CALL = chord(77)
export const PEAK = chord(82)
export const RELEASE = chord(86)
/** The fall onto B-flat, the plagal chord, the last B-flat, the last chord's attack, silence. */
export const HOME = chord(94)
export const PLAGAL = chord(95)
export const TONIC = chord(96)
export const LAST_CHORD = chord(98)
export const LAST = 371.931
export const SILENT = 372.75

/** When the credits come: in the quiet after the last chord has died. */
export const CREDITS_AT = 374.4
/** The show's length: the recording, then the credits in the quiet after it. */
export const DURATION = 408

/**
 * The seams between places: every show time the story cuts from one place to another. Each is a chord's arrival.
 * (Seams between two parts of one place are the builders' own.)
 */
export const SEAM = {
  /** Dawn at the cradle → the swing on the lawn, years on (c5, A-flat). */
  swing: chord(5),
  /** The swing → the bed by the window: the cellos come in (c17). */
  bed: chord(17),
  /** The bed → the living room at night, the television (the half cadence, c23). */
  news: chord(23),
  /** The television's shell → the real one over the valley, on the double bass (c24). A scale match cut. */
  arrival: ARRIVAL,
  /** The valley → inside the shell: the chamber (c32). */
  contact: chord(32),
  /** The chamber → the command tent: the bass drops out, the world breaks (c50). */
  dark: TURN,
  /** The tent → the chamber: the bomb (c55). */
  bomb: chord(55),
  /** The chamber's dust → the fog beyond the glass, in a white-out (c60). */
  fog: chord(60),
  /** The fog → the lawn, what she sees (c66). */
  sees: chord(66),
  /** The lawn → the fog (c68). */
  fog2: chord(68),
  /** The fog → the gala, years on (c71). */
  gala: chord(71),
  /** The gala → the tent: the call (c74). */
  call: chord(74),
  /** The tent → the meadow: the shells go (c84). */
  going: chord(84),
  /** The meadow → the lake house: home, and the first frame again (c90). */
  home: chord(90),
} as const
