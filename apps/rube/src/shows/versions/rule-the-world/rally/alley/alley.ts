import type { Pt } from '../../../../../parts'
import { box, scenery } from '../kit'
import { stub } from '../stub'

/** The Bowling Alley: a stand-in until it is built. */
export const ALLEY_AT: Pt = [0, 0]
export const ALLEY_CELLS = box(-4, -4, 10 + 4, 2, 2)
export const alleySet = scenery<null>({ name: 'alley-set', draw: () => {} })
export const hustle = stub('hustle', 10, 0)
export const ALLEY_HITS: readonly number[] = []
export const ALLEY_WIDE: [number, number][] = []
