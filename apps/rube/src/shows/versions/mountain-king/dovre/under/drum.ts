import { PLAN } from '../seams'
import { stub, stubHits } from '../stub'

/**
 * STUB, the drum builder's: the trolls' drum (89.23 → 101.95). See dev/BUILD_BRIEF.md, "drum". Keep the export
 * names: `drum` and `DRUM_HITS`.
 */
export const drum = stub(PLAN.drum, { seamIn: true })
export const DRUM_HITS: number[] = stubHits(PLAN.drum, true)
