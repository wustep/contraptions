import { RIDE } from '../music'
import { kitStub, type KitStroke } from '../stub'

/**
 * STUB (builder: rubato). Carnegie Hall, 423.34 → 504.0: the ride cymbal. Soft and dense to 432.7, then the
 * rubato: every stroke in `RIDE` (162 of them), slowing from 0.17 s apart to 0.9 s (458.58: nearly stopped, nearly
 * silent), then speeding up to 0.13 s; a roll too fast to count swelling from 484 to the burst at 504.0. The
 * metronome that will not hold still. See dev/BUILD_BRIEF.md. The frame is Carnegie's (`stage.ts`).
 */

// The stub plays every other stroke on the hi-hat (the ride is far): the builder's machine plays them all.
export const RUBATO_KIT: KitStroke[] = RIDE.filter((_, i) => i % 2 === 0).map((t) => ({ t, piece: 'hat' as const }))
export const RUBATO_HITS: number[] = RUBATO_KIT.map((s) => s.t)

export const rubato = kitStub('rubato', RUBATO_KIT)
