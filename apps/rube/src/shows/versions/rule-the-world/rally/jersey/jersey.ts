import type { Pt } from '../../../../../parts'
import { box, scenery } from '../kit'
import { stub } from '../stub'

/** New Jersey: a stand-in until it is built. */
export const JERSEY_AT: Pt = [0, 0]
export const JERSEY_CELLS = box(-4, -4, 14 + 4, 2, 2)
export const jerseySet = scenery<null>({ name: 'jersey-set', draw: () => {} })
export const night = stub('night', 14, 0, { rachel: [0.6, 0] })
export const JERSEY_HITS: readonly number[] = []
export const JERSEY_WIDE: [number, number][] = []
