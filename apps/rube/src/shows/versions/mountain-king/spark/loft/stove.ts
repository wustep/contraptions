import type { Pt } from '../../../../../parts'
import { DOORS, LOFT_SEAM, strongEighths } from '../music'
import { stub } from '../stub'
import { FIRE_MOUTH, HANDOFF } from './layout'

/**
 * LOFT-B's part (a stub until built): from phrase 3 (`LOFT_SEAM`) to the first door (`DOORS.glass`, statement 2's
 * first note). The dipping wheel, down to the floor, east past the sleeping cat, up to the stove, the firebox door,
 * and the leap into the fire. It is laid at LOFT-A's exit, so its entry (-0.5, 0) is `HANDOFF`; its lane ends in the
 * fire's mouth, `FIRE_MOUTH`.
 */

/** The strikes (show seconds). A stub's guess: the strongest notes of phrases 3 to 5. Replace with yours. */
export const STOVE_HITS: number[] = strongEighths(LOFT_SEAM + 0.1, DOORS.glass - 0.2, 2.2).map((e) => e.t)

/** Where the lane ends, from the part's own frame: the fire's mouth. */
const EXIT: Pt = [FIRE_MOUTH[0] - HANDOFF[0], FIRE_MOUTH[1] - HANDOFF[1]]

export const stove = stub('loft-stove', { exit: EXIT, hits: STOVE_HITS, cells: 5 })
