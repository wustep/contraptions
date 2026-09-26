import { PLAN } from '../seams'
import { stub, stubHits } from '../stub'

/**
 * STUB, the deep builder's: the tunnels down from the gate to the hall (22.32 → 40.19). See dev/BUILD_BRIEF.md,
 * "deep". Keep the export names: `deep` and `DEEP_HITS`.
 */
export const deep = stub(PLAN.deep, { seamIn: true, woman: 'lead' })
export const DEEP_HITS: number[] = stubHits(PLAN.deep, true)
