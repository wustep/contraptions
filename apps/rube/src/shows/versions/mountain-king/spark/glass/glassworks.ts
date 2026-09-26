import type { Pt } from '../../../../../parts'
import { DOORS, strongEighths } from '../music'
import { stub } from '../stub'

/**
 * GLASS's part (a stub until built): the glassworks, from the first door (`DOORS.glass`, statement 2's first note)
 * to the second (`DOORS.regatta`, phrase 9). The spark shoots out of the glory hole into a glasshouse by day, rides
 * the molten gather on a blowpipe, and is carried up into the furnace's heat at the second door. The leg is laid at
 * [0, 0] in the glassworks' cells, so the part's entry (-0.5, 0) is the glory hole's mouth.
 */

/** The strikes (show seconds). A stub's guess: the strongest notes of phrases 6 to 8. Replace with yours. */
export const GLASS_HITS: number[] = strongEighths(DOORS.glass + 0.1, DOORS.regatta - 0.2, 2.0).map((e) => e.t)

/**
 * Where the glory hole's mouth is, in the glassworks' world cells: the spark streaks back through it on the way home
 * (`DOORS.back[1]` to `DOORS.back[2]`, up and to the left), so draw it hot there then. Keep the name; set the value.
 */
export const GLORY_AT: Pt = [-0.5, 0]

export const glassworks = stub('glassworks', { exit: [16, -3], hits: GLASS_HITS, cells: 5 })
