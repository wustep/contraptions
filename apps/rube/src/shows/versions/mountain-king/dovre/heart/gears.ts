import { PLAN } from '../seams'
import { stub, stubHits } from '../stub'

/**
 * STUB, the heart builder's: the mountain's gears, laid mirrored (101.95 → 124.01). See dev/BUILD_BRIEF.md,
 * "heart". Keep the export names: `gears` and `GEARS_HITS`.
 */
export const gears = stub(PLAN.gears, { seamIn: true })
export const GEARS_HITS: number[] = stubHits(PLAN.gears, true)
