import type { Pt } from '../../../../../parts'
import { box, scenery } from '../kit'
import { stub } from '../stub'

/** Tokyo: a stand-in until it is built. */
export const TOKYO_AT: Pt = [0, 0]
export const TOKYO_CELLS = box(-4, -4, 12 + 4, 2, 2)
export const tokyoSet = scenery<null>({ name: 'tokyo-set', draw: () => {} })
export const rematch = stub('rematch', 12, 0)
export const TOKYO_HITS: readonly number[] = []
export const TOKYO_WIDE: [number, number][] = []
