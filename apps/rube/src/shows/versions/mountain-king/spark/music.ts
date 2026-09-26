import data from '../../../../../../../scripts/shows/plans/mountain-king-onsets.json'

/**
 * The recording's clock: Grieg's "In the Hall of the Mountain King", the Czech National Symphony Orchestra for
 * Musopen (public domain), played whole from its first sample (`../grieg-mountain-king-musopen.mp3`). Measured once by
 * `scripts/shows/mountain-king-onsets.py` into `scripts/shows/plans/mountain-king-onsets.json` (shared with the other
 * take; never edited here). `check:shows` holds every strike of this take against that file.
 *
 * - 0 to 4.36: the horns' opening. The loft at night, the candle, the cat asleep.
 * - 4.36 to 133.97: the theme, 18 phrases of 16 quarters, A A B B A A three times, an accelerando from 104 to 198
 *   bpm. There is no comb: every quarter was tracked (`beat(k)`, k = 0 .. 288), and fractions are eighths.
 *   - Statement 1 (phrases 0-5), 4.36 to 58.02: pianissimo, pizzicato. The sneak through the loft.
 *   - Statement 2 (phrases 6-11), 58.02 to 101.95: louder, faster. The glassworks, then the balloons.
 *   - Statement 3 (phrases 12-17), 101.95 to 133.97: fortissimo from 100.8. The night express and the festival.
 * - 134.25 to 146.60: the coda, 23 hammered chords (`CODA`). The fireworks' finale.
 * - 147.0: silence. 148.243: the roll. 149.515 and 149.815: the two last chords, the loudest of the piece.
 * - Quiet by 151.3; the recording ends at 154.091. The credits run on in silence to `DURATION`.
 */

interface Beat {
  k: number
  t: number
  onset?: number
  s?: number
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
interface Onset {
  t: number
  s: number
  g?: number
  lo?: number
  mid?: number
  hi?: number
}
const file = data as unknown as {
  duration: number
  onsets: Onset[]
  beats: Beat[]
  eighths: Eighth[]
  form: { phrases: { n: number; t: number; part: 'A' | 'B'; statement: number; key: string }[] }
  coda: { chords: { t: number; s: number; g: number }[] }
  landmarks: Record<string, number>
  loudness: { step: number; db: number[] }
}

/** The recording's length. */
export const MUSIC_END = file.duration
/** The show's length: the music, then the credits in silence over the loft. */
export const DURATION = 179

/** Every measured onset, with its strength (1 is loud for its moment; the last chords are 10). */
export const ONSETS: readonly Onset[] = file.onsets

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

/** The onsets between `a` and `b` (show seconds) at least `min` strong. */
export const onsetsIn = (a: number, b: number, min = 0.3): number[] => ONSETS.filter((o) => o.t >= a && o.t <= b && o.s >= min).map((o) => o.t)

/* ------------------------------------------------------------------ the beat */

const Q = file.beats.map((b) => b.t)
/** How many quarters the theme has: beat(0) is its first note, beat(288) the bar line after the last phrase. */
export const BEATS = Q.length - 1

/**
 * Show time of quarter `k` of the theme (k = 0 is 4.361, k = 288 is 133.969). Fractions are between quarters, so
 * `beat(k + 0.5)` is the eighth after `k`. It is the smooth tracked grid, not a comb: the tempo runs from 104 to 198
 * bpm and this follows it. Outside 0..288 it goes on at the nearest quarter's pace.
 */
export function beat(k: number): number {
  if (k <= 0) return Q[0] + k * (Q[1] - Q[0])
  if (k >= BEATS) return Q[BEATS] + (k - BEATS) * (Q[BEATS] - Q[BEATS - 1])
  const i = Math.floor(k)
  return Q[i] + (k - i) * (Q[i + 1] - Q[i])
}

/** The (fractional) quarter at show time `t`: the inverse of `beat`. */
export function beatAt(t: number): number {
  if (t <= Q[0]) return (t - Q[0]) / (Q[1] - Q[0])
  if (t >= Q[BEATS]) return BEATS + (t - Q[BEATS]) / (Q[BEATS] - Q[BEATS - 1])
  let lo = 0
  let hi = BEATS
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (Q[mid] <= t) lo = mid
    else hi = mid
  }
  return lo + (t - Q[lo]) / (Q[lo + 1] - Q[lo])
}

/** Seconds a quarter lasts at `t`: 0.576 at the start, 0.294 at the end. */
export const quarter = (t: number): number => {
  const k = Math.max(0, Math.min(BEATS - 1, Math.floor(beatAt(t))))
  return Q[k + 1] - Q[k]
}

/** Show time of phrase `n`'s first note (n = 0 .. 17), and `phrase(18)` the bar line after the last. */
export const phrase = (n: number): number => beat(16 * n)
/** Show time of eighth `j` (0 .. 31) of phrase `n`. */
export const inPhrase = (n: number, j: number): number => beat(16 * n + j / 2)

/** The eighteen phrases: A A B B A A, three times. */
export const PHRASES = file.form.phrases.map((p) => ({ n: p.n, t: p.t, part: p.part, statement: p.statement }))

/** How strong the recording is on the eighth `beat(k)` (k in quarters, a whole or a half): 0 where it has nothing. */
export function strength(k: number): number {
  const e = file.eighths[Math.round(k * 2)]
  return e && Math.abs(e.t - beat(k)) < 1e-3 ? e.s : 0
}

/** Every eighth of the grid with a measured onset on it at least `min` strong, between show times `a` and `b`. */
export function strongEighths(a: number, b: number, min = 1): { k: number; t: number; s: number }[] {
  return file.eighths.filter((e) => e.t >= a && e.t <= b && e.s >= min).map((e) => ({ k: e.k / 2, t: e.t, s: e.s }))
}

/** For the check: every quarter and eighth of the theme. */
export const GRID: readonly number[] = file.eighths.map((e) => e.t)

/* ------------------------------------------------------------------ loudness */

/**
 * How loud the recording is at `t`, 0 (-55 dB and under) to 1 (-11 dB, the last chords), smoothed a little: for
 * motion the music drives without striking, a flame that grows as the orchestra does.
 */
export function level(t: number): number {
  const { step, db } = file.loudness
  const at = (i: number) => db[Math.max(0, Math.min(db.length - 1, i))]
  const i = t / step
  const j = Math.floor(i)
  const f = i - j
  const v = (at(j - 1) + 2 * at(j) + 2 * at(j + 1) + at(j + 2)) / 6 + (at(j + 1) - at(j)) * (f - 0.5) * 0.5
  return Math.max(0, Math.min(1, (v + 55) / 44))
}

/* ------------------------------------------------------------------ landmarks */

/** The theme's first note. */
export const THEME = beat(0)
/** The first note of each statement. */
export const STATEMENT = [phrase(0), phrase(6), phrase(12)] as const
/** The bar line after the last phrase. */
export const THEME_END = phrase(18)
/** The fortissimo breaks a phrase before statement 3. */
export const FF = file.landmarks.ff

/** The coda's 23 hammered chords, with their strengths: pairs, singles and a last run of six. */
export const CODA: readonly { t: number; s: number }[] = file.coda.chords.map((c) => ({ t: c.t, s: c.s }))
export const CODA_AT = CODA[0].t
/** The run of six hammer blows at the coda's end. */
export const HAMMERS = CODA.slice(-6).map((c) => c.t)
/** The silence after the coda. */
export const SILENCE = file.landmarks.silence
/** The roll out of the silence. */
export const ROLL = file.landmarks.roll
/** The two last chords, the loudest onsets of the piece. */
export const LAST = [file.landmarks.last1, file.landmarks.last2] as const
/** Quiet by here. */
export const QUIET = file.landmarks.end

/**
 * The fire-doors: every change of world, in show seconds. Each is on a phrase's first note (the return's on the
 * roll's own strokes), and at each the ball holds its place on the screen while the fire round it becomes another
 * fire in another world.
 */
export const DOORS = {
  /** Into the loft stove's fire; out of the glassworks' glory hole. Statement 2's first note. */
  glass: phrase(6),
  /** Up into the glassworks furnace's heat; out of a balloon burner's jet. Phrase 9, the second B. */
  regatta: phrase(9),
  /** Up into the last balloon's burner flame; out of the locomotive's smokestack. Statement 3's first note. */
  railway: phrase(12),
  /** The dash home, back through the fires it came by: a balloon burner, the glory hole, the loft stove. */
  back: [148.33, 148.404, 148.491] as const,
} as const

/** Where the train brakes at the festival and throws the spark into the fireworks: phrase 16, the last A A. */
export const FESTIVAL = phrase(16)
/** Where the loft's two builders hand the spark on: phrase 3, the second B. */
export const LOFT_SEAM = phrase(3)

/** When the credits start: after the last chord has died away, and the cat has looked at the candle and gone back to sleep. */
export const CREDITS_AT = 154.2
