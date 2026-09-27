import { ORIGIN, exitFor } from '../stack'
import { stub, stubBand } from '../stub'

/**
 * SNOW (stub): level 3, the mountain and its fortress on the column, and the vault. Two parts: `snow` (out of the sky
 * on the swell, down the mountain, the fortress, Mal's shot, going under on the peak) and `vault` (up out of limbo into
 * the vault, Fischer and his father, the fortress coming down, the kick up into the hotel).
 */
const band = stubBand('snow')
export const snowSet = band.piece
export const SNOW_CELLS = band.cells
export const snow = stub('snow', exitFor(ORIGIN.snow, ORIGIN.limbo), { ariadne: [-0.55, -0.5], fischer: [0.55, -0.35], cells: 7 })
export const vault = stub('vault', exitFor(ORIGIN.vault, ORIGIN.lift), { ariadne: [-0.5, 0.35], fischer: [0.5, 0.35], cells: 7 })
export const SNOW_HITS: number[] = []
