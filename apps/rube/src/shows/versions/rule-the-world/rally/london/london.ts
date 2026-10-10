import type { Pt } from '../../../../../parts'
import { box, scenery } from '../kit'
import { stub } from '../stub'

/** London: a stand-in until it is built. */
export const LONDON_AT: Pt = [0, 0]
export const LONDON_CELLS = box(-4, -4, 14 + 4, 2, 2)
export const londonSet = scenery<null>({ name: 'london-set', draw: () => {} })
export const open = stub('open', 14, 0)
export const LONDON_HITS: readonly number[] = []
export const LONDON_WIDE: [number, number][] = []
