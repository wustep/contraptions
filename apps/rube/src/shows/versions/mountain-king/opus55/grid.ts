import measured from '../../../../../../../scripts/show-plans/mountain-king-beats.json'

/**
 * The music's clock, as measured (`scripts/mountain-king-beats.py`): the
 * orchestra's beat through the accelerando, and the coda's attacks. Show
 * time is the recording's time; the show's zero is the file's.
 *
 * A beat is numbered from the first pizzicato of the theme, beat 0 at
 * 4.37 s. Beats run to 289; nine phrases of 32 (eight bars of the theme
 * each) and two beats into the coda. Fractional beats fall between their
 * neighbours; beats before 0 and after the last run on at the pace of the
 * nearest measured beat, so the intro and the coda can be counted too.
 */

interface Measured {
  beats: number[]
  coda: {
    chords: number[]
    run: number[]
    rolls: [number, number][]
    silence: [number, number]
    roll: [number, number]
    crash: number
    quiet: number
  }
}

const data = measured as unknown as Measured

export const BEATS: readonly number[] = data.beats
export const CODA = data.coda
/** Beats in a phrase of the theme: eight bars of four. */
export const PHRASE = 32
/** Beats in a bar. */
export const BAR = 4
/** The last beat of the theme, before the coda's chords. */
export const LAST = PHRASE * 9 - 1

const n = BEATS.length
const first = BEATS[1] - BEATS[0]
const final = BEATS[n - 1] - BEATS[n - 2]

/** Show time of beat `b`, which may be fractional or out of range. */
export function beatTime(b: number): number {
  if (b <= 0) return BEATS[0] + b * first
  if (b >= n - 1) return BEATS[n - 1] + (b - (n - 1)) * final
  const i = Math.floor(b)
  return BEATS[i] + (BEATS[i + 1] - BEATS[i]) * (b - i)
}

/** Which beat show time `t` falls on, fractionally. The inverse of `beatTime`. */
export function beatAt(t: number): number {
  if (t <= BEATS[0]) return (t - BEATS[0]) / first
  if (t >= BEATS[n - 1]) return n - 1 + (t - BEATS[n - 1]) / final
  let lo = 0
  let hi = n - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (BEATS[mid] <= t) lo = mid
    else hi = mid
  }
  return lo + (t - BEATS[lo]) / (BEATS[hi] - BEATS[lo])
}

/** Seconds a beat lasts over beats [b, b + span): the tempo a piece placed there plays at. */
export const beatLength = (b: number, span: number): number => (beatTime(b + span) - beatTime(b)) / span

/** The theme's rhythm within a phrase: the beats a note starts on. Eight bars; the held notes leave gaps. */
export const THEME_RHYTHM: readonly number[] = [0, 1, 2, 3, 4, 5, 6, 8, 9, 10, 12, 13, 14, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28]

/**
 * The theme's contour, in semitones above its first note, note for note with
 * `THEME_RHYTHM`: B C♯ D E | F♯ D F♯ | E♯ C♯ E♯ | E C E | B C♯ D E | F♯ D F♯ B | A F♯ D F♯ | A.
 * The theme as written, not read off the recording; every statement of it
 * has the same shape, whatever key it is in.
 */
export const THEME_CONTOUR: readonly number[] = [0, 2, 3, 5, 7, 3, 7, 6, 2, 6, 5, 1, 5, 0, 2, 3, 5, 7, 3, 7, 12, 10, 7, 3, 7, 10]
