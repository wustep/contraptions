import type { Pt } from '../../../../../parts'
import { box, scenery } from '../kit'
import { stub } from '../stub'

/** HOME (stub): home, from the piano's first downbeat: the kitchen, the top, the garden and the children; the cut to black. */
export const HOME_AT: Pt = [0, 0]
export const homeSet = scenery<null>({ name: 'home-set', draw: () => {} })
export const HOME_CELLS: Pt[] = box(-10, -8, 40, 4, 2)
export const home = stub('home', [16, 0], { cells: 4.2 })
export const HOME_HITS: number[] = []
