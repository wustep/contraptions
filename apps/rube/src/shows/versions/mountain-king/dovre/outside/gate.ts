import { PLAN } from '../seams'
import { stub, stubHits } from '../stub'

/**
 * STUB, the gate builder's: the flank at night and the troll gate (0 → 22.32). See dev/BUILD_BRIEF.md, "gate".
 * Keep the export names: `gate` (the part) and `GATE_HITS` (every strike, absolute show seconds, sorted).
 */
export const gate = stub(PLAN.gate, { woman: 'lead' })
export const GATE_HITS: number[] = stubHits(PLAN.gate, false)
