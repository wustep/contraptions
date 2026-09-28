import type { Pt } from '../../../../parts'
import { SEAM } from './music'

/**
 * What Cobb is doing at every cut between worlds, so the parts on either side agree without seeing each other. (The
 * seams inside the dream, where he crosses the dark of sleep between two levels, are in `stack.ts`: `DOWN` and `UP`.)
 *
 * At a cut the camera carries the last framing across exactly (a match cut on Cobb), so his place on the screen is
 * continuous by construction; the picture is continuous only if both sides keep to these:
 *
 * - `v`: his velocity at the seam, cells a second, y down, in each side's own world. The part before ends its lane
 *   moving at `v`; the part after starts moving at `v`.
 * - `cells`: how close the camera is at the seam. The part before has a key at the seam (or just before it) at this
 *   distance, framed on him as `frame` says; the part after starts from it and makes its own moves (its first key at
 *   least 0.4 s after the seam).
 * - `frame`: where the camera's centre is from him, in cells ([0.9, -0.8] puts him left of centre and low).
 * - `ariadne`, `fischer`, `mal`: where they are from him at the seam on each side (`before`, `after`), null where not in
 *   the picture on that side. They may come or go at a cut: the whole place changes.
 * - `blink`: the cut happens inside a blink the director draws over both sides (`score.ts`): the frame darkens to
 *   black as eyes close and opens again on the other side. Only going under.
 */
export interface Seam {
  t: number
  v: Pt
  cells: number
  frame: Pt
  before: { ariadne: Pt | null; fischer: Pt | null; mal: Pt | null }
  after: { ariadne: Pt | null; fischer: Pt | null; mal: Pt | null }
  blink?: boolean
  /** What he is doing, in words, for whoever builds either side. */
  what: string
}

/**
 * The show's first frame: limbo's shore at dusk, the grey sea, the surf, and Cobb in it, face down in the wash. The
 * limbo builder's prologue opens on it, and the return to limbo (the peak) comes round to it again: the circle.
 */
export const FIRST = { cells: 5.2, frame: [1.5, -1.3] as Pt }

const none = { ariadne: null, fischer: null, mal: null }

export const SEAMS = {
  paris: {
    t: SEAM.paris,
    v: [0, 0],
    cells: 4.2,
    frame: [0.7, -0.75],
    before: none,
    after: { ariadne: [1.5, 0], fischer: null, mal: null },
    what: 'at rest at a table. Limbo side (the prologue): at the table in their house among the towers, where the top spins and does not stop, and does not stop (a dark doorway behind him). Paris side: at a café table on a Paris street in the sun, Ariadne across the table from him at [1.5, 0]; the strings come in on this downbeat.',
  },
  plane: {
    t: SEAM.plane,
    v: [0, 0],
    cells: 4.0,
    frame: [0.6, -0.7],
    before: { ariadne: null, fischer: null, mal: null },
    after: { ariadne: [-0.62, 0], fischer: [2.6, 0], mal: null },
    what: 'at rest. Paris side: Mal has come out of the crowd of projections at them, and on this downbeat the dream breaks (a jolt): Ariadne is gone out of it (she woke) and Cobb is jolted still. Plane side: in his seat in first class at night, awake, the silver case open between his seat and Ariadne\'s (on his left at [-0.62, 0]), Fischer asleep across the aisle at [2.6, 0].',
  },
  rain: {
    t: SEAM.rain,
    v: [0, 0],
    cells: 4.4,
    frame: [0.6, -0.8],
    blink: true,
    before: { ariadne: [-0.62, 0], fischer: [2.6, 0], mal: null },
    after: { ariadne: [-0.62, 0], fischer: null, mal: null },
    what: 'at rest: going under. Plane side: in his seat, the drip in, eyes closing (the blink comes down over the cut). Rain side: under a shop\'s awning on a city street in heavy rain, Ariadne beside him on his left; Fischer\'s taxi is coming up the street.',
  },
  wake: {
    t: SEAM.wake,
    v: [0, -2.4],
    cells: 4.0,
    frame: [0.5, -0.6],
    before: { ariadne: [-0.6, 0.25], fischer: [0.6, 0.3], mal: null },
    after: { ariadne: [-0.62, 0], fischer: [2.6, 0], mal: null },
    what: 'rising at 2.4 cells a second. Rain side: he breaks the river\'s surface from under it on the release, the others with him. Plane side: he wakes in his seat with a start, rising off its cushion by the same speed and settling back, Ariadne waking in hers beside him, Fischer across the aisle.',
  },
  home: {
    t: SEAM.home,
    v: [1.0, 0],
    cells: 4.2,
    frame: [0.8, -0.8],
    before: none,
    after: none,
    what: 'rolling right at 1.0 cells a second on a level floor. Plane side: out through the arrivals hall\'s doors into the morning. Home side: in at his own front door, into the hall, toward the kitchen and the garden beyond.',
  },
} satisfies Record<string, Seam>
