import type { Pt } from '../../../../../parts'
import { box, scenery } from '../kit'
import { stub } from '../stub'

/** The Derek Zoolander Center for Kids Who Can't Read Good (the CENTER builder's). A stub until it is built: keep these export names. */
export const CENTER_AT: Pt = [0, 0]
export const CENTER_CELLS = box(-8, -12, 16, 4, 2)
export const centerSet = scenery<null>({ name: 'center-set', draw: () => {} })
export const center = stub('center', 4, 0, { hansel: [0.42, 0], cells: 5 })
export const CENTER_HITS: number[] = []
