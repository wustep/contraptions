import { PLAN } from '../seams'
import { stub, stubHits } from '../stub'

/**
 * STUB, the mine builder's: the mine carts under the hall, laid mirrored (74.42 → 89.23). See dev/BUILD_BRIEF.md,
 * "mine". Keep the export names: `mine` and `MINE_HITS`.
 */
export const mine = stub(PLAN.mine, { seamIn: true })
export const MINE_HITS: number[] = stubHits(PLAN.mine, true)
