import measured from '../../../../../../../scripts/shows/plans/mountain-king-onsets.json'

/**
 * The recording's clock: Edvard Grieg, "In the Hall of the Mountain King" (Peer Gynt Suite No. 1, Op. 46, IV),
 * played by the Czech National Symphony Orchestra for Musopen, public domain, whole from its first sample
 * (`../grieg-mountain-king-musopen.mp3`, `scripts/shows/mountain-king-cue.sh`). Measured once by
 * `scripts/shows/mountain-king-onsets.py` into `scripts/shows/plans/mountain-king-onsets.json`; `check:shows` holds
 * every strike of this take against that file. Show time is recording time (the soundtrack's offset is 0).
 *
 * The piece is one four-bar theme played eighteen times without a break, each time a little faster and louder,
 * and then a coda that stops the tune and hammers chords:
 *
 * - **0 to 4.36: the horns' low note**, alone, nearly silent. No pulse.
 * - **4.36 to 58.02: the first statement.** Bassoons and plucked low strings, pianissimo, a steady march: a quarter
 *   note is 0.55–0.58 s (about 107 a minute). Six phrases, A A B B A A (B is the theme a fifth up).
 * - **58.02 to 101.95: the second statement.** The accelerando starts: the quarter goes from 0.55 to 0.37 s, and
 *   the orchestra grows under it (violins, woodwinds). Six phrases, A A B B A A. The fortissimo breaks at ~100.8.
 * - **101.95 to 133.97: the third statement.** Fortissimo, everything: the quarter from 0.37 to 0.30 s (about 200 a
 *   minute). The bass drum and the low strings on beats 1 and 3, the cymbals and the chords on 2 and 4.
 * - **134.25 to 146.6: the coda.** The tune stops; the orchestra hammers chords (`CODA_CHORDS`): one, then pairs
 *   (a short pickup and a crash), a held roar, pairs again, and a run of six hammer blows a quarter second apart.
 * - **147.0 to 148.2: silence.** Then **a roll** (148.24) swelling to **the two last chords**, 149.52 and 149.82.
 *   The hall rings until 151.3. The recording ends at 154.09; the show runs on for the credits.
 *
 * The tempo never holds still, so there is no comb. `beat(k)` is quarter note `k` from the theme's first note,
 * followed one by one through the recording and smoothed (`BEATS`); fractions interpolate, so `beat(k + 0.5)` is
 * the eighth between two quarters. `bar(n)` and `phrase(n)` count from the same first note: bar n is `beat(4n)`,
 * phrase n (the theme's nth playing) is `beat(16n)`.
 */

interface Onset {
  t: number
  /** How much it stands out of the surrounding eight seconds (1 is their 95th percentile). */
  s: number
  /** How strong against the whole track (1 is its 99th percentile): the hush's onsets are small here. */
  g: number
  /** How much of it is low (basses, timpani, bass drum), middle (the tune, horns) and high (cymbals), each against its band locally. */
  lo: number
  mid: number
  hi: number
}
interface Eighth {
  k: number
  t: number
  onset?: number
  s: number
  lo?: number
  mid?: number
  hi?: number
}
interface Phrase {
  n: number
  t: number
  part: 'A' | 'B'
  statement: number
  key: string
  fit: number
}
const data = measured as unknown as {
  duration: number
  onsets: Onset[]
  beats: { k: number; t: number; raw: number; onset?: number; s?: number }[]
  eighths: Eighth[]
  form: { theme: number[]; sounded: number[]; phrases: Phrase[] }
  coda: { chords: { t: number; s: number; g: number }[] }
  landmarks: Record<string, number>
  loudness: { step: number; db: number[] }
}
const mark = (name: string): number => data.landmarks[name]

/** The recording's length (154.09). The show runs on past it, in silence, for the credits (`DURATION` is `credits.ts`'s). */
export const RECORDING = data.duration

/* ------------------------------------------------------------------ onsets */

/** Every measured onset of the whole recording, with its strength and its band. */
export const ONSETS: readonly Onset[] = data.onsets

/** The onsets between `a` and `b` (show seconds) at least `min` strong (against their surroundings). */
export const onsetsIn = (a: number, b: number, min = 0.8): Onset[] => ONSETS.filter((o) => o.t >= a && o.t <= b && o.s >= min)

/** The measured onset nearest `t` at least `min` strong: what a strike off the grid is timed to. */
export function onset(t: number, min = 0.8): number {
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

/* ------------------------------------------------------------------ the beat */

/** Every quarter note from the theme's first note (beat 0, 4.36) to the downbeat after the last phrase (beat 288, 133.97). */
export const BEATS: readonly number[] = data.beats.map((b) => b.t)
/** The last beat on the grid (288): the bar line after the eighteenth phrase. The coda's first chord is a beat later. */
export const LAST_BEAT = BEATS.length - 1

/**
 * Show time of quarter note `k` (a fraction interpolates: `k + 0.5` is the eighth after it). Before beat 0 and past
 * the last, the grid runs on at its first and last tempo, so a part may reckon a little either side.
 */
export function beat(k: number): number {
  const n = BEATS.length
  if (k <= 0) return BEATS[0] + k * (BEATS[1] - BEATS[0])
  if (k >= n - 1) return BEATS[n - 1] + (k - (n - 1)) * (BEATS[n - 1] - BEATS[n - 2])
  const i = Math.floor(k)
  return BEATS[i] + (k - i) * (BEATS[i + 1] - BEATS[i])
}

/** Show time of eighth note `j` (= `beat(j / 2)`). */
export const eighth = (j: number): number => beat(j / 2)
/** Show time of bar `n`'s downbeat (bar 0 is the theme's first bar). */
export const bar = (n: number): number => beat(4 * n)
/** Show time of phrase `n`'s first note: the nth time the theme starts (0 to 17). */
export const phrase = (n: number): number => beat(16 * n)

/** The beat at show time `t`, as a fraction (the inverse of `beat`): for a machine that turns with the music. */
export function beatAt(t: number): number {
  const n = BEATS.length
  if (t <= BEATS[0]) return (t - BEATS[0]) / (BEATS[1] - BEATS[0])
  if (t >= BEATS[n - 1]) return n - 1 + (t - BEATS[n - 1]) / (BEATS[n - 1] - BEATS[n - 2])
  let lo = 0
  let hi = n - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (BEATS[mid] <= t) lo = mid
    else hi = mid
  }
  return lo + (t - BEATS[lo]) / (BEATS[lo + 1] - BEATS[lo])
}

/** How long a quarter note is at show time `t`, seconds: the tempo, 0.58 at the start down to 0.30 at the end. */
export function quarterAt(t: number): number {
  const k = Math.max(0, Math.min(BEATS.length - 2, Math.floor(beatAt(t))))
  return BEATS[k + 1] - BEATS[k]
}

/** The grid's eighth nearest show time `t`, as an eighth index. */
export const eighthAt = (t: number): number => Math.round(beatAt(t) * 2)

/** Every eighth of the grid with the strongest onset measured within 30 ms of it (s 0: none). */
export const EIGHTHS: readonly Eighth[] = data.eighths

/** How strong the recording is on eighth `j` (0 = nothing measured there), and in which band. */
export function strength(j: number): { s: number; lo: number; mid: number; hi: number } {
  const e = data.eighths[Math.round(j)]
  return { s: e?.s ?? 0, lo: e?.lo ?? 0, mid: e?.mid ?? 0, hi: e?.hi ?? 0 }
}

/* ------------------------------------------------------------------ the form */

/**
 * The theme, as scored: each eighth of a phrase (0 to 31), in semitones over the phrase's tonic. B C# D E F# D F#,
 * F C# F, E C E, B C# D E F# D F# B, A F# D F# A. A B phrase is the same shape a fifth higher.
 */
export const THEME: readonly number[] = data.form.theme
/** Whether a note of the theme starts on each eighth of a phrase (0: the note before is held). 26 notes a phrase. */
export const SOUNDED: readonly boolean[] = data.form.sounded.map((s) => s === 1)

/** The eighteen phrases: when each starts, A or B, and which statement (1 soft, 2 accelerating, 3 fortissimo). */
export const PHRASES: readonly Phrase[] = data.form.phrases

/** Where in the theme eighth `j` is: its phrase, its place in the phrase (0 to 31), its pitch over the phrase's tonic, and whether a note starts there. */
export function note(j: number): { phrase: number; at: number; pitch: number; sounded: boolean } {
  const i = Math.round(j)
  const n = Math.max(0, Math.min(17, Math.floor(i / 32)))
  const at = ((i % 32) + 32) % 32
  return { phrase: n, at, pitch: THEME[at] + (PHRASES[n].part === 'B' ? 7 : 0), sounded: SOUNDED[at] }
}

/** The show times of the theme's notes (every sounded eighth) between `a` and `b`. */
export function notesIn(a: number, b: number): number[] {
  const out: number[] = []
  const j0 = Math.max(0, Math.ceil(beatAt(a) * 2 - 1e-9))
  const j1 = Math.min(2 * LAST_BEAT - 1, Math.floor(beatAt(b) * 2 + 1e-9))
  for (let j = j0; j <= j1; j++) if (note(j).sounded) out.push(eighth(j))
  return out.filter((t) => t >= a - 1e-9 && t <= b + 1e-9)
}

/* ------------------------------------------------------------------ the coda */

/**
 * The coda's chords, every one that stands out (134.25 to 146.6): the first crash; pairs (a pickup, then the crash a
 * quarter second later) at 135.15/135.41, 136.11/136.36, 139.07/139.33, 140.04/140.27, 143.93/144.12, 144.84/145.08;
 * a few single blows; and the run of six hammer blows 145.34 … 146.60.
 */
export const CODA_CHORDS: readonly { t: number; s: number; g: number }[] = data.coda.chords

/* ------------------------------------------------------------------ loudness */

/**
 * How loud the recording is at `t`, 0 (-50 dB and under: the hush) to 1 (its loudest, -10 dB), smoothed over a
 * fifth of a second: for motion the music drives without striking (a rumble, a room's light, a shake).
 */
export function level(t: number): number {
  const { step, db } = data.loudness
  const at = (i: number) => db[Math.max(0, Math.min(db.length - 1, i))]
  const i = t / step
  const j = Math.floor(i)
  const f = i - j
  const v = (at(j - 1) + 2 * at(j) + 2 * at(j + 1) + at(j + 2)) / 6 + (at(j + 1) - at(j)) * (f - 0.5) * 0.5
  return Math.max(0, Math.min(1, (v + 50) / 40))
}

/* ------------------------------------------------------------------ landmarks */

/** The horns' first sound (the nearly silent low note before the theme). */
export const FIRST_SOUND = mark('first_sound')
/** The theme's first note: beat 0. */
export const THEME_START = mark('theme')
/** The seams of the show, each the start of a phrase (see `score.ts`). */
export const P = PHRASES.map((p) => p.t)
/** The second statement (the accelerando begins) and the third (fortissimo). */
export const STATEMENT2 = P[6]
export const STATEMENT3 = P[12]
/** Where the fortissimo breaks (the loudness jumps past -20 dB), just before the third statement. */
export const FF = mark('ff')
/** The bar line after the last phrase (beat 288), and the coda's first chord a beat after it. */
export const TUNE_END = BEATS[BEATS.length - 1]
export const CODA = mark('coda')
/** The general pause after the coda's hammer blows, the roll out of it, and the two last chords. */
export const SILENCE = mark('silence')
export const ROLL = mark('roll')
export const LAST1 = mark('last1')
export const LAST2 = mark('last2')
/** The last chord has rung out. */
export const END = mark('end')
