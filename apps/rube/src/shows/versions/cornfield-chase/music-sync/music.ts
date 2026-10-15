import measured from '../../../../../../../scripts/shows/plans/cornfield-opus55-onsets.json'

/**
 * The recording as the scenery hears it: the same measurements the arrangement was searched against
 * (`scripts/shows/cornfield-opus55-onsets.py`), so a gust in the corn or a shell over the fair falls on a note the
 * machine could have struck.
 */

export interface Note {
  t: number
  /** How strong the onset is, about 0.1 to 1.3. */
  s: number
}

/** The piano alone over the field, 0 to 33 s: rubato, so every note is its own onset. */
export const PIANO: Note[] = measured.piano
/** The organ's entry and its fill into the drop. */
export const GATHER: Note[] = measured.gather
/** The organ comes in. */
export const ORGAN = measured.organ
/** The drop, on beat 68. */
export const DROP = measured.drop.t
/** The last hit, beat 191, the ticket's payout. */
export const LAST = measured.last.t

/** The chase's pulse: beat `b` at `ORIGIN + PERIOD * b`. */
export const PERIOD = measured.period
export const ORIGIN = measured.origin
export const beatAt = (b: number): number => ORIGIN + PERIOD * b

/** The strongest of the notes within `span` seconds before `t`, faded by how long ago: what the field still feels. */
export function felt(notes: Note[], t: number, span: number): number {
  let out = 0
  for (const n of notes) {
    if (n.t > t) break
    const ago = t - n.t
    if (ago < span) out = Math.max(out, n.s * (1 - ago / span))
  }
  return out
}
