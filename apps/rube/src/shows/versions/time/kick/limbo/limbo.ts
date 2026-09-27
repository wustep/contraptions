import type { Pt } from '../../../../../parts'
import { LIMBO_GEO, ORIGIN, exitFor } from '../stack'
import { stub, stubBand } from '../stub'

/**
 * LIMBO (stub): limbo's shore, sea, city and house, and the tower on the column. Two parts: the prologue (`shore`, from
 * the show's first frame to the cut into Paris) and the return (`limbo`, from the dark of sleep on the peak to the
 * kick off the tower's roof on the summit, and the throw up to the snow).
 */

/** The prologue's origin in the dream world: Cobb comes in at (-0.5, 0) from it, face down in the surf. */
export const SHORE_AT: Pt = [-6.5, LIMBO_GEO.sea - 0.13]
const band = stubBand('limbo')
export const limboSet = band.piece
export const LIMBO_CELLS = band.cells
export const shore = stub('shore', [24, -1.4], { cells: 5 })
export const limbo = stub('limbo', exitFor(ORIGIN.limbo, ORIGIN.vault), { ariadne: [-0.55, -0.5], cells: 7 })
export const LIMBO_HITS: number[] = []
