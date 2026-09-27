import type { Pt } from '../../../../parts'
import { SEAM } from './music'

/**
 * What Derek is doing at every seam, so the parts on either side agree without seeing each other.
 *
 * At a cut (a change of place) the camera carries the last framing across exactly (a match cut on Derek), so his
 * place on the screen is continuous by construction; the picture is continuous only if both sides keep to these:
 *
 * - `v`: his velocity at the seam, cells a second, y down, in each side's own world. The part before ends its lane
 *   moving at `v`; the part after starts moving at `v`.
 * - `cells`: how close the camera is at the seam. The part before has a key at the seam (or just before it) at this
 *   distance, framed on him as `frame` says; the part after starts from it and makes its own moves (its first key at
 *   least 0.4 s after the seam).
 * - `frame`: where the camera's centre is from him, in cells ([0.9, -0.8] puts him left of centre and low).
 * - `hansel`, `mugatu`: where they are from him at the seam, on the side they are on (`what` says which), at rest
 *   with him; null where they are not in the picture on either side. They may come or go at a cut: the whole place
 *   changes.
 * - `flash`: the cut happens inside a press camera's flash the director draws over both places (white up in a tenth
 *   of a second, down over the next two thirds): the frame is white for a moment, and his place in it still holds.
 *   The part before may show the camera that fires it.
 */
export interface Seam {
  t: number
  cut: boolean
  v: Pt
  cells: number
  frame: Pt
  hansel: Pt | null
  mugatu: Pt | null
  flash?: boolean
  /** What he is doing, in words, for whoever builds either side. */
  what: string
}

/** The show's first frame: the awards, the dark theatre, the runway's end in its one spot. The awards part opens on it. */
export const FIRST = { cells: 5.2, frame: [1.6, -1.2] as Pt }

export const SEAMS: Record<keyof typeof SEAM, Seam> = {
  spa: {
    t: SEAM.spa,
    cut: true,
    flash: true,
    v: [0, 0],
    cells: 3.6,
    frame: [0.3, -0.55],
    hansel: null,
    mugatu: [0.42, 0],
    what: 'at rest, Mugatu beside him on his right. Awards side: in the dark of the wings after losing, Mugatu come to him out of the shadow (a press camera in the wings fires the flash). Spa side: at the spa\'s door, at the head of its line of treatments, Mugatu showing him in.',
  },
  club: {
    t: SEAM.club,
    cut: true,
    flash: true,
    v: [1.2, 0],
    cells: 4.2,
    frame: [0.9, -0.6],
    hansel: null,
    mugatu: null,
    what: 'rolling right at 1.2 cells a second on a level floor. Spa side: blown out of the machine and on out through the spa\'s door, Mugatu left behind at his controls (out of this framing). Club side: rolling in onto the walk-off\'s floor under the lasers, Hansel not yet in the picture (he is waiting ahead).',
  },
  derelicte: {
    t: SEAM.derelicte,
    cut: true,
    v: [0, 0],
    cells: 3.6,
    frame: [0.4, -0.6],
    hansel: null,
    mugatu: null,
    what: 'at rest, on the count-in. Club side: after the walk-off, beside Hansel (Hansel on his right at [0.42, 0], out of this framing\'s right edge or just inside it: the club builder chooses, and says so), friends now. Derelicte side: alone, in the dark of the wings at the head of the runway, facing out, the curtain of bin bags before him; the needle drops on the record in the booth (the tower builder\'s) on this downbeat.',
  },
  center: {
    t: SEAM.center,
    cut: true,
    flash: true,
    v: [0, 0],
    cells: 4,
    frame: [0.4, -0.7],
    hansel: [0.42, 0],
    mugatu: null,
    what: 'at rest, Hansel beside him on his right. Derelicte side: side by side on the floor below the runway\'s end, posing for the press, the flashes going (one fires the cut). Center side: side by side on the path before the Center\'s plinth, the model under its white sheet.',
  },
}
