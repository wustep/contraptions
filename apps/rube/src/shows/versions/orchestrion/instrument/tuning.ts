/**
 * The tuning: what every part of the instrument sounds, and how big it is because of it.
 *
 * Nothing in the machine is a sample or a note laid on top. A part sounds because a ball hit it, and it sounds the
 * pitch its size gives it, so the sizes are where the music is written down:
 *
 * - a **bar** rings as a free–free beam: same stock, same thickness, its pitch goes as 1 / length², so a bar is
 *   `BAR_REF · √(f_ref / f)` long; the long bars are the low ones, as on a vibraphone;
 * - a **string** is a harp string at one tension: pitch goes as 1 / length;
 * - a **pipe** is a column of air open at both ends: pitch goes as 1 / length too, `c / 2L`;
 * - a **chime** is a hanging tube, a beam again: 1 / length².
 *
 * The lengths are in proportion, not to scale (a pipe true to its G2 would be ten times the frame), so the
 * instrument's air is slower than ours, and its metal softer. The ratios are the physics.
 *
 * Four bays, one chord each: D, B minor, G, A — Dmaj9, Bm9, Gmaj7♯11 and A with its 6th and 9th, all inside D major
 * so that any ball overlapping any other still agrees with it.
 */

export const midiHz = (m: number): number => 440 * Math.pow(2, (m - 69) / 12)

/** The pulse the escapement keeps: 72 to the minute. */
export const BPM = 72
export const BEAT = 60 / BPM
/** The grid the bounces fall on. */
export const SIXTEENTH = BEAT / 4
/** Every flight between two parts of a bay: an eighth. A ball bounces in even eighths, as a ball bouncing does. */
export const FLIGHT = 2 * SIXTEENTH
/**
 * The escapement's tick: a dotted eighth. A ball let go on one tick bounces in eighths; the next one, a dotted eighth
 * behind it, lands on the sixteenths between, so two balls interlock and three agree with the first: three against two.
 */
export const TICK = 3 * SIXTEENTH
/** Ticks a chord lasts: sixteen dotted eighths, twelve beats. */
export const TICKS_PER_BAY = 16

/** One bay: a chord, and the notes its parts are cut to. */
export interface Bay {
  name: string
  /** The bay's light: a warm or cool tint on what glows there, never on the parts themselves. */
  hue: string
  /** The string the ball lands on first, out of the gate. */
  s1: number
  /** The first row of bars, highest first: the ball bounces down them to the right. */
  row1: number[]
  /** The string at the right end that turns it back. */
  s2: number
  /** The second row, to the left. */
  row2: number[]
  /** The string at the left end that turns it again. */
  s3: number
  /** The last row, to the right, and into the pipe. */
  row3: number[]
  /** The pipe at the foot of the bay: the chord's root, low. */
  pipe: number
  /** The chime over the bay, struck as its gate opens: the root again, an octave or so up. */
  chime: number
}

// MIDI numbers. D3 = 50, D4 = 62, D5 = 74, D6 = 86.
export const BAYS: Bay[] = [
  {
    name: 'D',
    hue: '#E9B872',
    s1: 57, // A3
    row1: [86, 81, 78, 76], // D6 A5 F♯5 E5
    s2: 62, // D4
    row2: [74, 73, 69, 66], // D5 C♯5 A4 F♯4
    s3: 57, // A3
    row3: [64, 62, 57], // E4 D4 A3
    pipe: 50, // D3
    chime: 62, // D4
  },
  {
    name: 'Bm',
    hue: '#93B4DA',
    s1: 54, // F♯3
    row1: [85, 83, 78, 74], // C♯6 B5 F♯5 D5
    s2: 59, // B3
    row2: [73, 71, 69, 66], // C♯5 B4 A4 F♯4
    s3: 54, // F♯3
    row3: [62, 61, 59], // D4 C♯4 B3
    pipe: 47, // B2
    chime: 59, // B3
  },
  {
    name: 'G',
    hue: '#D9A0A6',
    s1: 50, // D3
    row1: [86, 83, 78, 74], // D6 B5 F♯5 D5
    s2: 55, // G3
    row2: [73, 71, 67, 66], // C♯5 B4 G4 F♯4
    s3: 50, // D3
    row3: [62, 59, 55], // D4 B3 G3
    pipe: 43, // G2
    chime: 55, // G3
  },
  {
    name: 'A',
    hue: '#A9C79F',
    s1: 52, // E3
    row1: [86, 83, 81, 76], // D6 B5 A5 E5
    s2: 57, // A3
    row2: [74, 71, 69, 64], // D5 B4 A4 E4
    s3: 52, // E3
    row3: [62, 59, 57], // D4 B3 A3
    pipe: 45, // A2
    chime: 57, // A3
  },
]

/* ------------------------------------------------------------------ sizes from pitches */

/** A bar cut to `BAR_REF_HZ` is this many cells long; every other bar is in proportion (1 / length²). */
const BAR_REF_LEN = 0.46
const BAR_REF_HZ = midiHz(86)
export const barLength = (hz: number): number => BAR_REF_LEN * Math.sqrt(BAR_REF_HZ / hz)

/** A string at the harp's one tension: length goes as 1 / pitch. */
const STRING_REF_LEN = 1.5
const STRING_REF_HZ = midiHz(57)
export const stringLength = (hz: number): number => STRING_REF_LEN * (STRING_REF_HZ / hz)

/** An open pipe: c / 2L, with the instrument's own slow air. */
const PIPE_REF_LEN = 3.1
const PIPE_REF_HZ = midiHz(50)
export const pipeLength = (hz: number): number => PIPE_REF_LEN * (PIPE_REF_HZ / hz)

/** A hanging tube chime: a beam again, 1 / length². */
const CHIME_REF_LEN = 2.2
const CHIME_REF_HZ = midiHz(62)
export const chimeLength = (hz: number): number => CHIME_REF_LEN * Math.sqrt(CHIME_REF_HZ / hz)
