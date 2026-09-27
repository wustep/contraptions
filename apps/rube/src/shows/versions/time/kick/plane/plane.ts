import type { Pt } from '../../../../../parts'
import { box, scenery } from '../kit'
import { stub } from '../stub'

/**
 * PLANE (stub): the night flight. Two parts: `boarding` (the pulse's downbeat to going under) and `waking` (the release
 * to the cut home: awake, the landing, the arrivals hall).
 */
export const PLANE_AT: Pt = [0, 0]
/** Where the waking part is laid: his seat again. */
export const WAKE_AT: Pt = [0.5, 0]
export const planeSet = scenery<null>({ name: 'plane-set', draw: () => {} })
export const PLANE_CELLS: Pt[] = box(-10, -8, 40, 4, 2)
export const boarding = stub('boarding', [0.5, 0], { ariadne: [-0.62, 0], fischer: [2.6, 0], cells: 4 })
export const waking = stub('waking', [20, 0], { ariadne: [-0.62, 0], fischer: [2.6, 0], cells: 4 })
export const PLANE_HITS: number[] = []
