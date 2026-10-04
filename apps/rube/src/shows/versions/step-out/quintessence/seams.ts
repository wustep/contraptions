import type { Pt } from '../../../../parts'
import { SEAM } from './music'

/**
 * What Walter is doing at every cut, so the places on either side agree without seeing each other.
 *
 * At a cut the camera carries the last framing across exactly (a match cut on Walter), so his place on the screen is
 * continuous by construction; the picture is continuous only if both sides keep to these:
 *
 * - `v`: his velocity at the cut, cells a second, y down, in each side's own world. The part before ends its lane
 *   moving at `v`; the part after starts moving at `v`.
 * - `cells`: how close the camera is at the cut. The part before has a key at the cut (or just before it) at this
 *   distance, framed on him as `frame` says; the part after starts from it and makes its own moves (its first key at
 *   least 0.4 s after the cut).
 * - `frame`: where the camera's centre is from him, in cells ([0.9, -0.8] puts him left of centre and low).
 * - `cheryl`, `sean`: where they are from him at the cut, on the side they are on (`what` says which), at rest with
 *   him; null where they are not in the picture on either side. They may come or go at a cut: the whole place
 *   changes.
 * - `cover`: the cut happens under something the director draws over both places: `ash`, the volcano's ash coming
 *   down over the whole frame, grey-white, and lifting off his mother's room.
 */
export interface Seam {
  t: number
  v: Pt
  cells: number
  frame: Pt
  cheryl: Pt | null
  sean: Pt | null
  cover?: 'ash'
  /** What he is doing, in words, for whoever builds either side. */
  what: string
}

/** The show's first frame: the light table in the dark, Walter at its near end. The negatives' opening part opens on it. */
export const FIRST = { cells: 3.2, frame: [1.1, -0.35] as Pt }

export const SEAMS: Record<keyof typeof SEAM, Seam> = {
  dream: {
    t: SEAM.dream,
    v: [0, 0],
    cells: 3.0,
    frame: [0.15, -0.35],
    cheryl: null,
    sean: null,
    what: 'at rest, lit from below. Negatives side: sitting in the empty frame of the strip on the light table, frame 25\'s blank, which glows as he stares into it (he is zoning out). Dream side: sitting on the lip of a subway platform at night, in the same place on the screen, the street and the burning building across the tracks.',
  },
  office: {
    t: SEAM.office,
    v: [0, 0],
    cells: 3.0,
    frame: [0.15, -0.35],
    cheryl: null,
    sean: null,
    what: 'at rest, exactly as he was when the daydream began (the same framing as the cut into it). Dream side: back on the platform\'s lip, the rescue done, the colour going out of the street in the bar before the cut. Negatives side: in the blank frame on the light table, as if he never moved; Cheryl comes in from the right after the cut.',
  },
  nuuk: {
    t: SEAM.nuuk,
    v: [1.0, 0],
    cells: 4.0,
    frame: [0.9, -0.5],
    cheryl: null,
    sean: null,
    what: 'rolling right at 1 cell a second on a level. Negatives side: rolling into the picture the enlarger throws on the wall, the ship on its water (the clue frame blown up), its light filling the frame. Nuuk side: rolling in over the bar\'s threshold from the harbour, out of the grey daylight into the dark wood.',
  },
  sky: {
    t: SEAM.sky,
    v: [2.2, 0],
    cells: 4.4,
    frame: [1.1, -0.6],
    cheryl: null,
    sean: null,
    what: 'running right at 2.2 cells a second on a level, his colour gone warm. Nuuk side: out of the bar\'s door after the Cheryl he has imagined (she has gone on ahead, out of shot). Helipad side: across the pad toward the helicopter, its rotor already turning.',
  },
  sea: {
    t: SEAM.sea,
    v: [0.3, 7.0],
    cells: 5.0,
    frame: [0.2, 0.4],
    cheryl: null,
    sean: null,
    what: 'falling, nearly straight down, at the water\'s skin. Sky side: dropped from the helicopter\'s open door with the parcel, hitting the grey sea at the cut. Sea side: going in, the surface just above him, the parcel beside him going its own way.',
  },
  iceland: {
    t: SEAM.iceland,
    v: [0, 0],
    cells: 3.6,
    frame: [0.5, -0.4],
    cheryl: null,
    sean: null,
    what: 'at rest. Sea side: on the fishing boat\'s deck beside the clementine cake on its wrapper, looking at Sean\'s notes on the paper. Iceland side: at rest by a bicycle propped at the top of a road, a harbour behind him.',
  },
  home: {
    t: SEAM.home,
    v: [0, 0],
    cells: 3.6,
    frame: [0.4, -0.4],
    cheryl: null,
    sean: null,
    cover: 'ash',
    what: 'at rest, under the ash. Iceland side: stopped on the road as the ash comes down over everything. Home side: at rest on the floor of his mother\'s room as the ash lifts off it (the director draws the cover over both).',
  },
  himalaya: {
    t: SEAM.himalaya,
    v: [0, 0],
    cells: 3.8,
    frame: [0.6, -0.5],
    cheryl: null,
    sean: null,
    what: 'at rest. Home side: at the curve of the piano, having seen that it is the curve in the last negative. Himalaya side: at the foot of the climb, in the snow, the mountain above.',
  },
  press: {
    t: SEAM.press,
    v: [0, 0],
    cells: 3.4,
    frame: [0.4, -0.45],
    cheryl: null,
    sean: [0.55, 0],
    what: 'at rest. Himalaya side: on the ledge beside Sean (on his right), after the snow leopard has gone. Life side: on the long conference table, beside negative 25, which he has just laid down; Ted at the table\'s far end.',
  },
  street: {
    t: SEAM.street,
    v: [1.2, 0],
    cells: 4.2,
    frame: [0.9, -0.5],
    cheryl: null,
    sean: null,
    what: 'rolling right at 1.2 cells a second on a level. Life side: out of the building\'s doors onto the pavement, the presses done. Street side: along the pavement in the morning; Cheryl comes to him after the cut.',
  },
}
