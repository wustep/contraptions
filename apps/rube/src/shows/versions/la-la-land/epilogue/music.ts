/**
 * The recording's clock, as measured once by `scripts/shows/lalaland-epilogue-onsets.py`
 * into `scripts/shows/plans/lalaland-epilogue-onsets.json`; `check:shows` holds
 * every strike of this take against that file. Show time is recording time
 * (the soundtrack's offset is 0).
 *
 * Justin Hurwitz's Epilogue is a suite, and each stretch keeps time its own way:
 *
 * - 0 to 63.4 s, the piano alone, rubato: no grid, so the club strikes the piano's own notes.
 * - 63.4 to 65.8 s, silence.
 * - 65.32 s, the kiss: the orchestra's burst (its swell peaks at 65.8). The dream begins. To 75.7 s it swells, with no pulse.
 * - 75.72 s (beat 161), the swing: 128.04 bpm, beat k at 0.2755 + 0.4686 k s, bars on k ≡ 1 (mod 4).
 *   Loud to beat 282 (132.4 s), then soft on the same pulse to beat 305½ (143.4 s).
 * - 143.45 s (bar 153), the waltz: a musette at 64 bars a minute, bar k at 0.0915 + 0.937 k s,
 *   its beats the thirds. To bar 178 (166.9 s), and a cadence of five hits to 167.65 s.
 * - 167.65 to 185.6 s, the stars: soft and free. Then a crescendo of hits to 193 s.
 * - 193 to 217 s, a legato build, loud, few onsets.
 * - 217.05 s (beat 444), the number: 122.75 bpm, beat k at 0.0125 + 0.4888 k s, bars on k ≡ 0 (mod 4),
 *   to beat 487 (238.06 s).
 * - 238.1 to 272.4 s, home: soft and free, with three big accents (245.7, 264.5, 268.5 s).
 * - 272.4 to 336.2 s, the choral waltz: legato, no pulse to hold; it peaks at 335 s and drops out at 336.2 s.
 * - 336.2 to 343.5 s, the chord's decay, and a breath of silence; 343.96 to 344.9 s, four notes of the piano alone: the club.
 * - 344.9 to 398 s, the look: strings and piano, rubato.
 * - 398 s to the end, the last chords, each with its silence after it; the last at 453.5 s, and the show ends at 456 s.
 */

/** The show's length: the last chord's ring, and a breath. The recording runs silent to 458.9 s. */
export const DURATION = 456

/** The piano's first and last notes of the opening. */
export const PIANO_FIRST = 0.592
export const PIANO_END = 63.385
/** The kiss: the burst that ends the silence, and the first frame of the dream. */
export const KISS = 65.32
/** The burst's strongest onset, half a second into the swell. */
export const KISS_PEAK = 65.805

/* ------------------------------------------------------------------ the swing */
export const SWING_ORIGIN = 0.2755
export const SWING_PERIOD = 0.4686
/** Show time of beat `k` of the swing (fractions are eighths). Bars start on k ≡ 1 (mod 4). */
export const swing = (k: number): number => SWING_ORIGIN + SWING_PERIOD * k
/** The first bar of the swing: the street outside the club. */
export const SWING_FROM = 161
/** The loudest bar of the first half: the hand-off from the freeway to the studio. */
export const SWING_MID = 221
/** Where the swing goes soft. */
export const SWING_SOFT = 282
/** The swing's last eighth before the waltz. */
export const SWING_END = 305.5

/* ------------------------------------------------------------------ the waltz */
export const WALTZ_ORIGIN = 0.0915
export const WALTZ_PERIOD = 0.937
/** Show time of bar `k` of the waltz; `k + 1/3` and `k + 2/3` are its second and third beats. */
export const waltz = (k: number): number => WALTZ_ORIGIN + WALTZ_PERIOD * k
export const WALTZ_FROM = 153
export const WALTZ_END = 178
/** The cadence that ends the waltz: five hits, measured. */
export const CADENCE = [166.3, 166.65, 166.92, 167.26, 167.65]
/** The stars begin on the last of them. */
export const STARS = 167.65
/** The crescendo out of the stars, to the last of its hits. */
export const CRESCENDO = 185.6
export const BUILD = 192.96

/* ------------------------------------------------------------------ the number */
export const NUMBER_ORIGIN = 0.0125
export const NUMBER_PERIOD = 0.4888
/** Show time of beat `k` of the number (fractions are eighths). Bars start on k ≡ 0 (mod 4). */
export const number = (k: number): number => NUMBER_ORIGIN + NUMBER_PERIOD * k
export const NUMBER_FROM = 444
export const NUMBER_END = 487

/* ------------------------------------------------------------------ home, the chorus, the club */
/** Home begins as the number's last hit lands. */
export const HOME = number(NUMBER_END)
/** Home's three accents, measured. */
export const HOME_ACCENTS = [245.68, 264.53, 268.47]
/** The choral waltz comes in. */
export const CHORUS = 272.44
/** Its peak. */
export const PEAK = 335.0
/** The music drops out: the set is struck, and the club is what is left. */
export const STRUCK = 336.2
/** The piano's four notes, alone, on the real piano. */
export const PIANO2 = [343.96, 344.31, 344.51, 344.9]
/** The strings come in under the last of them: the look. */
export const LOOK = 344.9
/** The first of the last chords. */
export const LAST = 398.12
/** The last chords, each ringing into a silence. */
export const LAST_CHORDS = [398.12, 402.07, 408.58, 414.72, 420.87, 428.0, 436.09, 444.11, 449.92, 453.54]

/** Beats `a` to `b` inclusive of a grid, every `step`. */
export const beatsOf = (at: (k: number) => number, a: number, b: number, step = 1): number[] => {
  const out: number[] = []
  for (let x = a; x <= b + 1e-9; x += step) out.push(at(x))
  return out
}
