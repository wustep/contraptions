import type { Pt } from '../../../../../parts'
import { DOORS, strongEighths } from '../music'
import { stub } from '../stub'

/**
 * BALLOONS's part (a stub until built): the balloon regatta at sunset, from the second door (`DOORS.regatta`, phrase
 * 9) to the third (`DOORS.railway`, statement 3's first note). The spark rises out of a burner's jet, lights the
 * regatta's burners one by one, rides the hot air up from balloon to balloon, and is sucked up into the top balloon's
 * burner flame at the third door. The leg is laid at [0, 0] in the regatta's cells, so the part's entry (-0.5, 0) is
 * the first burner.
 */

/** The strikes (show seconds). A stub's guess: the strongest notes of phrases 9 to 11. Replace with yours. */
export const BALLOON_HITS: number[] = strongEighths(DOORS.regatta + 0.1, DOORS.railway - 0.2, 1.8).map((e) => e.t)

/**
 * Where a lit burner is on the way home (`DOORS.back[0]` to `DOORS.back[1]`): the spark streaks through its flame up
 * and to the left. In the regatta's world cells. Keep the name; set the value, and draw a lit burner there then.
 */
export const BURNER_AT: Pt = [-0.5, 0]

export const balloons = stub('balloons', { exit: [14, -9], hits: BALLOON_HITS, cells: 6, lift: 0.5 })
