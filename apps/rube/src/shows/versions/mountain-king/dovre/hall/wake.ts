import { PLAN } from '../seams'
import { stub, stubHits } from '../stub'

/**
 * STUB, the hall builder's: the court wakes, "Slay him!", the chase breaks out and Peer drops through the floor
 * (58.02 → 74.42). See dev/BUILD_BRIEF.md, "hall". Keep the export names: `wake` and `WAKE_HITS`.
 */
export const wake = stub(PLAN.wake, { seamIn: true, woman: 'leave' })
export const WAKE_HITS: number[] = stubHits(PLAN.wake, true)
