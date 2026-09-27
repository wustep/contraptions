import type { Pt } from '../../../../../parts'
import { box, scenery } from '../kit'
import { stub } from '../stub'

/** The awards (the AWARDS builder's). A stub until it is built: keep these export names. */
export const AWARDS_AT: Pt = [0, 0]
export const AWARDS_CELLS = box(-4, -8, 16, 4, 2)
export const awardsSet = scenery<null>({ name: 'awards-set', draw: () => {} })
export const awards = stub('awards', 10, 0, { mugatu: [0.42, 0], cells: 5 })
export const AWARDS_HITS: number[] = []
