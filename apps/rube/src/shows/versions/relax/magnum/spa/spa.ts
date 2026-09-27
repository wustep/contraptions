import type { Pt } from '../../../../../parts'
import { box, scenery } from '../kit'
import { stub } from '../stub'

/** Mugatu's day spa (the SPA builder's). A stub until it is built: keep these export names. */
export const SPA_AT: Pt = [0, 0]
export const SPA_CELLS = box(-4, -8, 24, 4, 2)
export const spaSet = scenery<null>({ name: 'spa-set', draw: () => {} })
export const spa = stub('spa', 18, 0, { mugatu: [0.42, 0], cells: 5 })
export const SPA_HITS: number[] = []
