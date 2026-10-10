import type { Pt } from '../../../../../parts'
import { box, scenery } from '../kit'
import { stub } from '../stub'

/** The Ward: a stand-in until it is built. */
export const HOSPITAL_AT: Pt = [0, 0]
export const HOSPITAL_CELLS = box(-4, -4, 12 + 4, 2, 2)
export const hospitalSet = scenery<null>({ name: 'hospital-set', draw: () => {} })
export const nursery = stub('nursery', 12, 0, { rachel: [1.3, -0.35] })
export const HOSPITAL_HITS: readonly number[] = []
export const HOSPITAL_WIDE: [number, number][] = []
