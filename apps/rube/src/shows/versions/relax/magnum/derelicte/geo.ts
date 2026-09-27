import type { Pt } from '../../../../../parts'
import { BACK, BREAK, SPLASH, STOP, beat } from '../music'

/**
 * Derelicte's fixed geometry and its fixed moments (the director's): what the runway builder and the tower builder
 * both build to, so their halves of one scene meet without seeing each other. **Do not move these**; ask the director.
 *
 * Cells, y down, in the runway part's frame: Derek comes in at (-0.5, 0) at `SEAM.derelicte`, in the dark of the
 * wings at the runway's head, on the runway's level. The Derelicte world's origin is that frame's origin
 * (`DERELICTE_AT`), and the tower's standing drawing is placed there too, so every point here is the same point for
 * both builders. Seen side on: the runway runs left to right across the warehouse; downstage (toward us) is the
 * front row and the press; upstage is the brick.
 */
export const DERELICTE_AT: Pt = [0, 0]

/** The runway: its top surface (a ball on it has its centre at y 0), from the curtain at its head to its far end. */
export const RUNWAY = { top: 0.13, head: 0.8, end: 20 }
/** The warehouse floor's surface: a ball on it has its centre at y 2 (the runway stands 2 cells, about four feet, high). */
export const FLOOR_Y = 2.13
/** The wings: the runway's level carries on back into the dark behind the curtain, to x -4. */
export const WINGS = { x0: -4, curtain: 0.8 }
/** Steps down from the runway's far end to the floor: four of them, 0.4 wide and 0.5 high each. */
export const STEPS = { x0: 20, x1: 21.6, n: 4 }

/** The Prime Minister of Malaysia, seated in the front row past the runway's end: his centre (his chair's seat at y 1.58). */
export const PM_SEAT: Pt = [24.0, 1.45]

/** Mugatu's perch: a gantry over the wings, where he watches his show. His centre when on it (its deck at y -2.87). */
export const MUGATU_PERCH: Pt = [-1.8, -3.0]

/**
 * The DJ's tower: a scaffold standing in the front row's back corner past the Prime Minister, x 26 to 29, its booth's
 * deck 8 cells over the floor (surface y -6; a ball on it has its centre at y -6.13). On the booth: the turntable
 * (its platter's middle at `TURNTABLE`), and the booth's power, plugged into a socket at `PLUG` (the lead from it up
 * to the rig). The tower builder draws all of it and Hansel's way up.
 */
export const TOWER = { x0: 26, x1: 29, deck: -6 }
export const TURNTABLE: Pt = [27.1, -6.25]
export const PLUG: Pt = [28.55, -6.35]

/**
 * Where Derek and Hansel end, side by side on the floor below the runway's end, posing for the press, from `MEET` to
 * the flash cut into the Center (Hansel on his right at [0.42, 0], as `SEAMS.center` says).
 */
export const DEREK_MEET: Pt = [22.3, 2.0]
export const HANSEL_MEET: Pt = [22.72, 2.0]

/* ------------------------------------------------------------------ the moments */

/** The needle drops on the record in the booth on the count-in's downbeat, and the song is his trigger. */
export const NEEDLE = BREAK
/** Hansel pulls the plug: the last hit before the band stops dead. Derek stops dead with it. */
export const PULLED = STOP
/** Magnum: the splash out of the silence. The star stops in the air. */
export const MAGNUM = SPLASH
/** The band back in. */
export const BAND = BACK
/** Derek and Hansel side by side (bar 95's downbeat), for the press, to the cut. */
export const MEET = beat(380)

/**
 * Hansel's way through Derelicte, as the two builders agree it (the tower builder draws it and may refine the places
 * between these, never the times): he comes in out of shot and is at the tower's foot by `arrives`, sees Derek's march
 * and starts up on `climbs`, is on the booth's deck by `booth`, pulls the plug on `PULLED`, is back down on the floor
 * by `down` and beside Derek at `HANSEL_MEET` from `MEET`.
 */
export const HANSEL_PLAN = {
  arrives: { t: beat(264), at: [30.2, 2.0] as Pt },
  climbs: { t: beat(300), at: [29.4, 2.0] as Pt },
  booth: { t: beat(344), at: [28.9, -6.13] as Pt },
  down: { t: beat(372), at: [25.0, 2.0] as Pt },
}

/**
 * Derek's way through Derelicte, as the two builders agree it (the runway builder builds it and may refine it between
 * these, never the times): in the wings until the title is said (triggered on beat 233), out through the curtain,
 * down the runway to its end by `end`, down the steps from `steps`, at the Prime Minister by `ROCK`, stock still from
 * `PULLED` to `MAGNUM`.
 */
export const DEREK_PLAN = {
  triggered: beat(233),
  end: beat(296),
  steps: beat(300),
  atPM: { t: beat(328), at: [22.6, 2.0] as Pt },
}
