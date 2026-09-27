import { box, scenery } from '../kit'
import { stub } from '../stub'

/**
 * Derelicte (the RUNWAY builder's): the set, Derek's lane from the wings down the runway to the Prime Minister and
 * Magnum, Mugatu, the Prime Minister, and the camera. A stub until it is built: keep these export names. Its build
 * must include the tower builder's `TOWER_COMPANY` (Hansel) in its `company`.
 */
export const DERELICTE_CELLS = box(-6, -12, 32, 5, 2)
export const derelicteSet = scenery<null>({ name: 'derelicte-set', draw: () => {} })
export const runway = stub('runway', 22, 2, { pm: [2, -0.5], cells: 6 })
export const RUNWAY_HITS: number[] = []
