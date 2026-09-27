import type { Pt } from '../../../../../parts'
import { ORIGIN, exitFor } from '../stack'
import { stub, stubBand } from '../stub'

/**
 * RAIN (stub): level 1, the city in the rain: the street, Fischer's taxi, the freight train, the van, the bridge and
 * the river; the van's fall (`stack.ts`, `vanAt`). Two parts: `rain` (the cut in from the plane to going under in the
 * van, on the brass) and `river` (up out of the hotel into the hanging van, the splash, the river, the surface).
 */

/** The job's first part's origin: Cobb comes in at (-0.5, 0) from it, under an awning. */
export const RAIN_AT: Pt = [-48, -0.13]
const band = stubBand('rain')
export const rainSet = band.piece
export const RAIN_CELLS = band.cells
export const rain = stub('rain', exitFor(RAIN_AT, ORIGIN.hotel), { ariadne: [-0.62, 0], cells: 6 })
export const river = stub('river', [12, -15], { ariadne: [-0.6, 0.25], fischer: [0.6, 0.3], cells: 7 })
export const RAIN_HITS: number[] = []
