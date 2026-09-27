import type { Pt } from '../../../../parts'
import { SEAM } from './music'

/**
 * What Louise is doing at every seam, so the parts on either side agree without seeing each other.
 *
 * At a cut (a change of place) the camera carries the last framing across exactly (a match cut on Louise), so her
 * place on the screen is continuous by construction; the picture is continuous only if both sides keep to these:
 *
 * - `v`: her velocity at the seam, cells a second, y down, in each side's own world. The part before ends its lane
 *   moving at `v`; the part after starts moving at `vAfter` (the same as `v` unless the camera turns at the cut).
 * - `cells`: how close the camera is at the seam. The part before has a key at the seam (or just before it) at this
 *   distance, framed on her as `frame` says; the part after starts from it and makes its own moves (its first key at
 *   least 0.4 s after the seam).
 * - `frame`: where the camera's centre is from her, in cells ([0.9, -0.8] puts her left of centre and low).
 * - `ian`, `hannah`: where they are from her at the seam, on the side they are on (`what` says which), moving with
 *   her; null where they are not in the picture on either side. They may come or go at a cut: the whole place changes.
 * - `open`: a scale match cut. The incoming leg opens this many cells tall, the carried framing scaled about her, so
 *   her place on the screen holds exactly while the picture changes size on the cut.
 * - `veil`: the cut happens inside a white-out the director draws over both places (the light swelling to white and
 *   back): the frame is white for a moment, and her place in it still holds.
 */
export interface Seam {
  t: number
  cut: boolean
  v: Pt
  vAfter?: Pt
  cells: number
  frame: Pt
  ian: Pt | null
  hannah: Pt | null
  open?: number
  veil?: boolean
  /** What she is doing, in words, for whoever builds either side. */
  what: string
}

/**
 * The show's first frame, which the last scene opens on again: the lake house, Louise by the long window. The
 * prologue's first camera key is a hold at this framing, and the cut into the last scene (`end`) opens on it.
 */
export const FIRST = { cells: 4.8, frame: [1.3, -1.0] as Pt }

export const SEAMS: Record<keyof typeof SEAM, Seam> = {
  flight: {
    t: SEAM.flight,
    cut: true,
    veil: true,
    v: [0, 0],
    cells: 3.2,
    frame: [0.25, -0.25],
    ian: [0.36, 0],
    hannah: [-0.34, 0],
    what: 'at rest. Lake side: on the bench under the window, facing the glass, Hannah beside her on her left, the glare of the fog on the water filling the frame (the director\'s veil is white from 8.4 to 9.5 s). Valley side: at rest on the helicopter\'s bench, seen through its side window, Ian beside her on her right (valley side only), the helicopter hanging in the cloud, still; it moves off after.',
  },
  base: {
    t: SEAM.base,
    cut: false,
    v: [0, 0],
    cells: 6,
    frame: [0.8, -1.2],
    ian: [0.36, 0],
    hannah: null,
    what: 'the valley builder\'s own seam (both sides are theirs): at rest in the cabin as the skids touch the pad.',
  },
  lift: {
    t: SEAM.lift,
    cut: false,
    v: [0, 0],
    cells: 5,
    frame: [0.4, -1.4],
    ian: [-0.42, 0],
    hannah: null,
    what: 'at rest on the lift\'s deck at its lowest (the deck surface is at y = R in the lift part\'s frame, 1 cell above the meadow), Ian on the deck on her left, the lift about to rise. The valley builder brings them up onto the deck; the lift builder draws the lift.',
  },
  shaft: {
    t: SEAM.shaft,
    cut: true,
    v: [0, -0.55],
    vAfter: [0.55, 0],
    cells: 4.5,
    frame: [0, -0.7],
    ian: [-0.42, 0],
    hannah: null,
    what: 'rising on the deck into the slot in the shell\'s belly, 0.55 cells a second, Ian on the deck on her left. Valley side: the deck going up into the dark slot, framed so she is centred and a little low. Shell side: the shaft\'s mouth from inside, the camera rolled a quarter turn (angle -π/2: the shell\'s +x is up the screen), so there the deck moves +x at 0.55 (`vAfter`), the camera centre is +0.7 cells in x from her, and Ian is at [0, -0.42] (shell cells).',
  },
  chamber: {
    t: SEAM.chamber,
    cut: false,
    v: [0.9, 0],
    cells: 5,
    frame: [1.0, -0.9],
    ian: [-0.48, 0],
    hannah: null,
    what: 'rolling right along the shaft\'s floor at 0.9 cells a second, gravity the shell\'s own (down), the camera square again, Ian half a cell behind her; the shaft opening into the dark of the chamber.',
  },
  fog1: {
    t: SEAM.fog1,
    cut: true,
    veil: true,
    v: [0, 0],
    cells: 5.2,
    frame: [0.1, -0.6],
    ian: null,
    hannah: null,
    what: 'at rest against the glass, where the heptapod\'s palm is pressed on the other side, on the cue\'s loudest swell; the glass\'s light swells to white (the director\'s veil, CREST - 0.7 to CREST + 0.9). Shell side: Ian stays back on the floor out of this framing (he does not come through). Fog side: at rest in the white, the palm in front of her now, near, and the heptapod over her.',
  },
  v1: {
    t: SEAM.v1,
    cut: true,
    v: [0.9, 0],
    cells: 4.5,
    frame: [0.7, -0.5],
    ian: null,
    hannah: [0.85, 0],
    what: 'moving right at 0.9 cells a second. Fog side: gliding along the bottom of an ink ring. Lake side: rolling across the grass outside the lake house after Hannah, who is a little way ahead of her (lake side only), summer, bright.',
  },
  fog2: {
    t: SEAM.fog2,
    cut: true,
    v: [0.9, 0],
    cells: 4.5,
    frame: [0.7, -0.5],
    ian: null,
    hannah: null,
    what: 'moving right at 0.9 cells a second: back from the grass (Hannah out of this framing) into the fog, gliding on.',
  },
  v2: {
    t: SEAM.v2,
    cut: true,
    v: [0, 0],
    cells: 4,
    frame: [0.5, -0.6],
    ian: null,
    hannah: [0.4, 0],
    what: 'at rest. Fog side: at the top of a ring, still for a moment. Lake side: indoors by the long window in the day, Hannah older (HANNAH_OLDER) beside her on her right, leaning to her.',
  },
  fog3: {
    t: SEAM.fog3,
    cut: true,
    v: [0, 0],
    cells: 4,
    frame: [0.5, -0.6],
    ian: null,
    hannah: null,
    what: 'at rest: Hannah has just rolled out of this framing on the lake side; the fog, still.',
  },
  v3: {
    t: SEAM.v3,
    cut: true,
    v: [0, 0],
    cells: 4,
    frame: [0.5, -0.6],
    ian: null,
    hannah: null,
    what: 'at rest. Lake side: by the long window at dusk, alone: the bench, the room, no Hannah anywhere. On the held stretch\'s hardest pulse.',
  },
  fog4: {
    t: SEAM.fog4,
    cut: true,
    v: [0, 0],
    cells: 4,
    frame: [0.5, -0.6],
    ian: null,
    hannah: null,
    what: 'at rest: back into the fog for the push.',
  },
  after: {
    t: SEAM.after,
    cut: true,
    v: [0, 0],
    cells: 5,
    frame: [0.6, -1.2],
    ian: null,
    hannah: null,
    what: 'at rest. Fog side: the logogram she has written finished round her. Valley side: on the meadow in the open, looking up at the shell (Ian not yet in shot: he comes to her).',
  },
  end: {
    t: SEAM.end,
    cut: true,
    v: [0, 0],
    cells: 3.4,
    // Her place on the screen is FIRST's: the same share of the frame, at 3.4 cells here and 4.8 on the far side.
    frame: [(FIRST.frame[0] * 3.4) / FIRST.cells, (FIRST.frame[1] * 3.4) / FIRST.cells],
    ian: [0.36, 0],
    hannah: null,
    open: FIRST.cells,
    what: 'at rest. Valley side: on the meadow with Ian beside her on her right, touching, the sky where the shell was, framed at 3.4 cells with the camera\'s centre at FIRST.frame × 3.4 / 4.8 = [0.92, -0.71] from her (her place on the screen is then FIRST\'s). Lake side: the show\'s first frame exactly (FIRST: the same place, the same framing), which the scale match cut opens on: Louise on the bench by the window, Hannah across the room.',
  },
}
