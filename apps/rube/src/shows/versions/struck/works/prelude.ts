/**
 * The score: J. S. Bach, Prelude in C major, BWV 846 (The Well-Tempered Clavier, Book I), from the autograph's 35
 * bars. Public domain.
 *
 * Bars 1 to 32 are one figure: five notes, set out as eight sixteenths (1 2 3 4 5 3 4 5), played twice. So a bar is
 * its five notes. Bars 33 and 34 are written out, sixteen notes each, and bar 35 is the one true chord of the piece.
 * Nothing is added to these notes and none is left out.
 */

const NAMES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

/** A note's MIDI number from its name: `C4` is 60, `Bb3` 58, `F#2` 42. */
export function midi(name: string): number {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(name)
  if (!m) throw new Error(`not a note: ${name}`)
  return NAMES[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12 * (Number(m[3]) + 1)
}

export const hzOf = (n: number): number => 440 * Math.pow(2, (n - 69) / 12)

/** Bars 1 to 32, five notes each, low to high. */
export const FIGURES: string[] = [
  'C4 E4 G4 C5 E5',
  'C4 D4 A4 D5 F5',
  'B3 D4 G4 D5 F5',
  'C4 E4 G4 C5 E5',
  'C4 E4 A4 E5 A5',
  'C4 D4 F#4 A4 D5',
  'B3 D4 G4 D5 G5',
  'B3 C4 E4 G4 C5',
  'A3 C4 E4 G4 C5',
  'D3 A3 D4 F#4 C5',
  'G3 B3 D4 G4 B4',
  'G3 Bb3 E4 G4 C#5',
  'F3 A3 D4 A4 D5',
  'F3 Ab3 D4 F4 B4',
  'E3 G3 C4 G4 C5',
  'E3 F3 A3 C4 F4',
  'D3 F3 A3 C4 F4',
  'G2 D3 G3 B3 F4',
  'C3 E3 G3 C4 E4',
  'C3 G3 Bb3 C4 E4',
  'F2 F3 A3 C4 E4',
  'F#2 C3 A3 C4 Eb4',
  'Ab2 F3 B3 C4 D4',
  'G2 F3 G3 B3 D4',
  'G2 E3 G3 C4 E4',
  'G2 D3 G3 C4 F4',
  'G2 D3 G3 B3 F4',
  'G2 Eb3 A3 C4 F#4',
  'G2 E3 G3 C4 G4',
  'G2 D3 G3 C4 F4',
  'G2 D3 G3 B3 F4',
  'C2 C3 G3 Bb3 E4',
]

/** Bars 33 and 34, written out. */
export const CLOSE: string[] = [
  'C2 C3 F3 A3 C4 F4 C4 A3 C4 A3 F3 A3 F3 D3 F3 D3',
  'C2 B2 G4 B4 D5 F5 D5 B4 D5 B4 G4 B4 D4 F4 E4 D4',
]

/** Bar 35. */
export const CHORD: string[] = ['C2', 'C3', 'E4', 'G4', 'C5']

/** The order a bar's five notes are played in, over half a bar. */
export const ORDER = [0, 1, 2, 3, 4, 2, 3, 4]

/** Sixteenths before the last chord: 34 bars. */
export const SIXTEENTHS = 34 * 16

/** Every sixteenth of bars 1 to 34, in order: MIDI numbers. */
export const LINE: number[] = [
  ...FIGURES.flatMap((bar) => {
    const five = bar.split(' ').map(midi)
    const half = ORDER.map((k) => five[k])
    return [...half, ...half]
  }),
  ...CLOSE.flatMap((bar) => bar.split(' ').map(midi)),
]
