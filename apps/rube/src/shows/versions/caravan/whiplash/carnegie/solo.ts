import { SOLO, HUSH, onsetsIn } from '../music'
import { kitStub, strokesOf, type KitStroke } from '../stub'

/**
 * STUB (builder: solo). Carnegie Hall, the solo, loud and dense (270.52 → 323.27). The kit as the final machine: sticks, snare, hi-hat, toms.
 * See dev/BUILD_BRIEF.md. The frame is Carnegie's (`stage.ts`): the ball enters on the snare (-0.5, 0) and leaves
 * there (exit [0, 0]). Every stroke on the hall's kit goes in `SOLO_KIT` (and its time in `SOLO_HITS`); the hall
 * draws the kit answering them.
 */

export const SOLO_KIT: KitStroke[] = strokesOf(onsetsIn(SOLO + 0.02, HUSH - 0.1, 1.4))
export const SOLO_HITS: number[] = SOLO_KIT.map((s) => s.t)

export const solo = kitStub('solo', SOLO_KIT)
