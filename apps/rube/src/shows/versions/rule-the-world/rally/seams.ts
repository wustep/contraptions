import type { Pt } from '../../../../parts'
import { SEAM } from './music'

/**
 * What Marty is doing at every cut, so the places on either side agree without seeing each other.
 *
 * At a cut the camera carries the last framing across exactly (a match cut on Marty), so his place on the screen is
 * continuous by construction; the picture is continuous only if both sides keep to these:
 *
 * - `v`: his velocity at the cut, cells a second, y down, in each side's own world. The part before ends its lane
 *   moving at `v`; the part after starts moving at `v`. Every cut in Rally is at rest.
 * - `cells`: how close the camera is at the cut. The part before has a key at the cut (or just before it) at this
 *   distance, framed on him as `frame` says; the part after starts from it and makes its own moves (its first key at
 *   least 0.4 s after the cut).
 * - `frame`: where the camera's centre is from him, in cells ([0.6, -0.5] puts him left of centre and low).
 * - `rachel`: where she is from him at the cut, on the side she is on (`what` says which), at rest with him; null
 *   where she is not in the picture on either side. She may come or go at a cut: the whole place changes.
 * - `what`: what he is doing, in words, for whoever builds either side.
 */
export interface Seam {
  t: number
  v: Pt
  cells: number
  frame: Pt
  rachel: Pt | null
  what: string
}

/** The show's first frame: the shoe store in the dark before it opens, Marty on the counter. The store's part opens on it. */
export const FIRST = { cells: 3.2, frame: [0.9, -0.55] as Pt }

export const SEAMS: Record<keyof typeof SEAM, Seam> = {
  london: {
    t: SEAM.london,
    v: [0, 0],
    cells: 3.4,
    frame: [0.55, -0.5],
    rachel: null,
    what: 'at rest. Store side: sitting on the bundle of bills in the open safe in the back office, its door swung wide, the ticket to London tucked in the bundle. London side: sitting on the near corner of the match table at the British Open, under its lamp, in the same place on the screen.',
  },
  hotel: {
    t: SEAM.hotel,
    v: [0, 0],
    cells: 3.4,
    frame: [0.6, -0.55],
    rachel: null,
    what: 'at rest on the floor. London side: on the hall\'s floorboards past the end of the table, where he rolled after the last point of the final. Hotel side: on the floorboards of the hotel room just inside its door, the tub across the room.',
  },
  alley: {
    t: SEAM.alley,
    v: [0, 0],
    cells: 3.6,
    frame: [0.6, -0.55],
    rachel: null,
    what: 'at rest on the ground. Hotel side: on the pavement at the foot of the fire escape\'s last ladder, the street at night, after the drop. Alley side: on the carpet just inside the bowling alley\'s door, the lanes ahead to the right.',
  },
  jersey: {
    t: SEAM.jersey,
    v: [0, 0],
    cells: 3.4,
    frame: [0.55, -0.5],
    rachel: [0.6, 0],
    what: 'at rest on the back seat of Wally\'s cab (a 1950s checker-ish cab, yellow, drawn in section so the seat shows). Alley side: the cab parked at the curb outside the alley, he has just hopped in; Rachel is not there. Jersey side: the same cab on a night road in New Jersey, moving; Rachel beside him on the seat, on his right (she comes with the cut).',
  },
  tokyo: {
    t: SEAM.tokyo,
    v: [0, 0],
    cells: 3.4,
    frame: [0.55, -0.5],
    rachel: null,
    what: 'at rest. Jersey side: on the sill of the airliner\'s round window, inside the cabin, the airfield\'s lights going by outside; Rachel is gone (to the hospital, out of shot, before). Tokyo side: on the near corner of the one table in the arena, under the lamp, the crowd dark round it.',
  },
  hospital: {
    t: SEAM.hospital,
    v: [0, 0],
    cells: 3.6,
    frame: [0.6, -0.55],
    rachel: [1.3, -0.35],
    what: 'at rest. Tokyo side: on the end line of the table after the last point, the arena\'s light down to the one lamp. Hospital side: on the foot of Rachel\'s bed, on the blanket, in the grey light of dawn; Rachel at the head of the bed, up and to his right (she comes with the cut).',
  },
}
