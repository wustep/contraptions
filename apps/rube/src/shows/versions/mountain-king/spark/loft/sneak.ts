import type { Pt } from '../../../../../parts'
import { LOFT_SEAM, THEME, strongEighths } from '../music'
import { stub } from '../stub'
import { HANDOFF } from './layout'

/**
 * LOFT-A's part (a stub until built): the sneak, from the first frame to phrase 3 (`LOFT_SEAM`). The spark slips off
 * its wick while the cat sleeps, and creeps west along the bench and the drying rack. Laid at [0, 0], so its entry
 * (-0.5, 0) is the wick (`WICK`), and its lane ends at `HANDOFF` (its exit is `HANDOFF + [0.5, 0]`).
 */

/** The strikes (show seconds). A stub's guess: the strongest notes of phrases 0 to 2. Replace with yours. */
export const SNEAK_HITS: number[] = strongEighths(THEME + 0.1, LOFT_SEAM - 0.2, 2.2).map((e) => e.t)

export const sneak = stub('loft-sneak', { exit: [HANDOFF[0] + 0.5, HANDOFF[1]] as Pt, hits: SNEAK_HITS, cells: 5 })
