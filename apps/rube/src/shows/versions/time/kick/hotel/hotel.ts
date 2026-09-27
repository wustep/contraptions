import { ORIGIN, exitFor } from '../stack'
import { stub, stubBand } from '../stub'

/**
 * HOTEL (stub): level 2, the hotel: the top floor's corridor that turns with the van, weightlessness when it falls,
 * and the lift on the column. Two parts: `hotel` (in through the roof on the brass to going under on the swell) and
 * `lift` (up out of the snow into the lift, the charges, the drop, the kick up into the rain).
 */
const band = stubBand('hotel')
export const hotelSet = band.piece
export const HOTEL_CELLS = band.cells
export const hotel = stub('hotel', exitFor(ORIGIN.hotel, ORIGIN.snow), { ariadne: [-0.55, -0.5], fischer: [0.55, -0.35], cells: 7 })
export const lift = stub('lift', exitFor(ORIGIN.lift, ORIGIN.river), { ariadne: [-0.5, 0.35], fischer: [0.5, 0.35], cells: 8 })
export const HOTEL_HITS: number[] = []
/** The camera's roll with the corridor as it turns (radians, clockwise); 0 outside the hotel's turn. */
export const hotelRoll = (_t: number): number => 0
