import type { Pt } from '../../../../../parts'
import { box, scenery } from '../kit'
import { stub } from '../stub'

/** The Shoe Store: a stand-in until it is built. */
export const STORE_AT: Pt = [0, 0]
export const STORE_CELLS = box(-4, -4, 12 + 4, 2, 2)
export const storeSet = scenery<null>({ name: 'store-set', draw: () => {} })
export const store = stub('store', 12, 0, { rachel: [0.6, 0] })
export const STORE_HITS: readonly number[] = []
export const STORE_WIDE: [number, number][] = []
