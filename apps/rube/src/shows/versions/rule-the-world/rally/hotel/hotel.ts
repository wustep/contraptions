import type { Pt } from '../../../../../parts'
import { box, scenery } from '../kit'
import { stub } from '../stub'

/** The Hotel: a stand-in until it is built. */
export const HOTEL_AT: Pt = [0, 0]
export const HOTEL_CELLS = box(-4, -4, 12 + 4, 2, 2)
export const hotelSet = scenery<null>({ name: 'hotel-set', draw: () => {} })
export const tub = stub('tub', 12, 0)
export const HOTEL_HITS: readonly number[] = []
export const HOTEL_WIDE: [number, number][] = []
