import { PLAN } from '../seams'
import { stub, stubHits } from '../stub'

/**
 * STUB, the heart builder's: the runaway, the machine past all control, laid mirrored (124.01 → 134.25, the coda's
 * first chord). See dev/BUILD_BRIEF.md, "heart". Keep the export names: `runaway` and `RUNAWAY_HITS`.
 */
export const runaway = stub(PLAN.runaway, { seamIn: true })
export const RUNAWAY_HITS: number[] = stubHits(PLAN.runaway, true)
