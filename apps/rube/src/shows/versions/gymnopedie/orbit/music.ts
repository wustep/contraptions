import played from '../../../../../../../scripts/shows/plans/satie-performance.json'

/**
 * The music, as it was played. `scripts/shows/satie-render.py` plays Gymnopédie
 * No. 1, Gnossienne No. 1 and Gnossienne No. 3 on the Salamander Grand's
 * samples, from the Mutopia engravings, and writes down every note as it lands
 * in the file (`scripts/shows/plans/satie-performance.json`). Nothing here is
 * measured off the audio and nothing needs to be: these are the notes the file
 * was made from, to the sample.
 *
 * The file is one period of a circle: the last piece's resonance runs on into
 * the first bar of the first. So the show is too. Show time runs from 0 to
 * PERIOD and is then 0 again, and everything in it is a function of show time
 * taken round that circle.
 */

export type Role = 'melody' | 'bass' | 'chord' | 'grace' | 'inner'

export interface Note {
  /** Show seconds: where the hammer lands in the file. */
  t: number
  /** MIDI pitch. */
  p: number
  /** Velocity it was played at. */
  v: number
  r: Role
  /** Which piece: 0 Gymnopédie No. 1, 1 Gnossienne No. 1, 2 Gnossienne No. 3. */
  piece: number
}

export interface Piece {
  key: string
  title: string
  marking: string
  /** Show time of its first bar, of its last note's onset, and of its last note's end. */
  from: number
  last: number
  end: number
  bars: number[]
}

/** Seconds of one time round. */
export const PERIOD: number = played.period
/** Where the show's zero is in the recording: the file carries this much of its own end before it, and of its start after it. */
export const MARGIN: number = played.margin
export const PIECES: Piece[] = played.pieces
export const NOTES: Note[] = played.notes.map((n) => ({ t: n.t, p: n.p, v: n.v, r: n.r as Role, piece: n.piece }))

export const MELODY = NOTES.filter((n) => n.r === 'melody')
export const BASS = NOTES.filter((n) => n.r === 'bass')
export const GRACES = NOTES.filter((n) => n.r === 'grace')

/** Show time round the circle: any time at all, taken into [0, PERIOD). */
export const wrap = (t: number): number => {
  const u = t % PERIOD
  return u < 0 ? u + PERIOD : u
}

/** Which piece is playing (or last played) at show time `t`. */
export function pieceAt(t: number): number {
  const u = wrap(t)
  let i = PIECES.length - 1
  for (let j = 0; j < PIECES.length; j++) if (u >= PIECES[j].from) i = j
  // Before the first piece's first bar it is still the last piece's resonance.
  return u < PIECES[0].from ? PIECES.length - 1 : i
}
