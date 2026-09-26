import type { Pt } from '../../../../parts'
import { CUT, SEAM } from './music'

/**
 * What Carl (and Ellie) are doing at each cut, so the parts on either side agree without seeing each other. At a cut
 * the camera carries the last framing across exactly (a match cut on Carl), so his place on the screen is
 * continuous by construction; the picture is continuous only if both sides keep to these:
 *
 * - `v`: Carl's velocity at the cut, cells a second, y down. The part before ends its lane moving at this; the part
 *   after starts moving at it (a flight carries on as the same parabola: `hop` in `physics.ts`).
 * - `cells`: how close the camera is at the cut. The part before has a key at the cut (or just before it) at this
 *   distance, framed with Carl where `frame` says; the part after starts from it and makes its own moves.
 * - `frame`: where Carl sits in the picture at the cut, as the offset of the camera's centre from him in cells
 *   (so [1, -0.8] puts him left of centre and low). Both sides frame him the same.
 * - `ellie`: where she is from Carl at the cut, the same on both sides, moving with him; null where she is not in
 *   the picture on the far side of it (she is in the yard; she is gone).
 * - `basket`, `balloon`: what he is carrying across.
 */
export interface Cut {
  t: number
  v: Pt
  cells: number
  frame: Pt
  ellie: Pt | null
  basket?: boolean
  balloon?: boolean
  /** What they are doing, in words, for whoever builds either side. */
  what: string
}

export const CUTS: Record<keyof typeof CUT, Cut> = {
  house: {
    t: CUT.house,
    v: [1.6, 0],
    cells: 5,
    frame: [0.9, -0.9],
    ellie: [0.36, 0],
    what: 'out of the church\'s doors at a run, level, heading right, Ellie a step ahead; on the far side the same run, up the path to the old house',
  },
  hill: {
    t: CUT.hill,
    v: [0, 0],
    cells: 3.6,
    frame: [0.46, -0.55],
    ellie: [0.92, 0],
    what: 'at rest side by side, looking out: in the two armchairs by the new window (`CHAIR.apart` between them); on the far side, on the blanket on the hill, looking up, as far apart',
  },
  nursery: {
    t: CUT.nursery,
    v: [0, 0],
    cells: 3.6,
    frame: [0.18, -0.9],
    ellie: [0.36, 0],
    what: 'at rest side by side, looking up: at the baby in the clouds; on the far side, at the mobile over the crib',
  },
  doctor: {
    t: CUT.doctor,
    v: [0, 0],
    cells: 4,
    frame: [0.31, -0.6],
    ellie: [0.62, 0],
    what: 'at rest side by side, a little apart: at the crib, the music box run down; on the far side, in two chairs in the doctor\'s office',
  },
  yard: {
    t: CUT.yard,
    v: [0, 0],
    cells: 4.5,
    frame: [-1.4, -0.7],
    ellie: null,
    what: 'Carl at rest: in the office chair; on the far side, alone inside the back door, looking out at her. Ellie is out in the yard, left of him',
  },
  climb: {
    t: CUT.climb,
    v: [0.6, 0],
    cells: 5,
    frame: [0.8, -0.9],
    ellie: [0.36, 0],
    basket: true,
    what: 'setting out for the picnic, walking right, level, the basket (the tickets in it) on his top, Ellie a step ahead; on the far side, the foot of the hill',
  },
  hospital: {
    t: CUT.hospital,
    v: [0, 0],
    cells: 3.6,
    frame: [0.22, -0.6],
    ellie: [0.45, 0],
    balloon: true,
    what: 'Carl at rest beside her, level with her: on the hill where she fell; on the far side, in a chair at her bedside, the bed as high as the chair, and the balloon is his',
  },
  funeral: {
    t: CUT.funeral,
    v: [0, 0],
    cells: 3.6,
    frame: [0.22, -0.6],
    ellie: null,
    balloon: true,
    what: 'Carl at rest in a chair, the balloon over him: at her bedside; on the far side, alone in the front pew of the church. She is gone',
  },
  home: {
    t: CUT.home,
    v: [0, 0],
    cells: 4.5,
    frame: [0.6, -1.1],
    ellie: null,
    balloon: true,
    what: 'Carl at rest at the foot of a flight of steps, the balloon over him: the church\'s, going out; on the far side, his own front steps, going in',
  },
}

/** Inside the house's one long take there is no cut: at each seam she is a step ahead of him, at rest with him. */
export const SEAM_ELLIE: Pt = [0.36, 0]
export { SEAM }
