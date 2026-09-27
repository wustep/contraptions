import { box, scenery, type Company } from '../kit'

/**
 * The DJ's tower at Derelicte (the TOWER builder's): the scaffold, the booth, the turntable and the plug, and Hansel's
 * way up it (`TOWER_COMPANY`, in the runway part's frame). A stub until it is built: keep these export names.
 */
export const TOWER_CELLS = box(24, -9, 31, 3, 2)
export const towerSet = scenery<null>({ name: 'tower-set', draw: () => {} })
export const TOWER_COMPANY: Company[] = []
export const TOWER_HITS: number[] = []
