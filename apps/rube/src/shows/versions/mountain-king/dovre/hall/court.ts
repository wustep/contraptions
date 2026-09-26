import { PLAN } from '../seams'
import { stub, stubHits } from '../stub'

/**
 * STUB, the hall builder's: the sleeping court, Peer brought to the throne (40.19 → 58.02). This part also draws
 * the hall itself (`hall.ts`) for both of the hall's parts. See dev/BUILD_BRIEF.md, "hall". Keep the export names:
 * `court` and `COURT_HITS`.
 */
export const court = stub(PLAN.court, { seamIn: true, woman: 'lead' })
export const COURT_HITS: number[] = stubHits(PLAN.court, true)
