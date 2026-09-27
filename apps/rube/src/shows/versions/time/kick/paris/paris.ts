import type { Pt } from '../../../../../parts'
import { box, scenery } from '../kit'
import { stub } from '../stub'

/** PARIS (stub): the architect's lesson, from the strings' downbeat to the pulse's. */
export const PARIS_AT: Pt = [0, 0]
export const parisSet = scenery<null>({ name: 'paris-set', draw: () => {} })
export const PARIS_CELLS: Pt[] = box(-10, -8, 40, 4, 2)
export const paris = stub('paris', [30, 0], { ariadne: [1.5, 0], cells: 5 })
export const PARIS_HITS: number[] = []
/** The camera's roll while the street folds over (radians, clockwise); 0 outside Paris. */
export const parisRoll = (_t: number): number => 0
