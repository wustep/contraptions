import { BUILD, RUBATO, onsetsIn } from '../music'
import { kitStub, strokesOf, type KitStroke } from '../stub'

/**
 * STUB (builder: solo). Carnegie Hall, the build to the loudest and fastest (369.98 → 423.34).
 * See dev/BUILD_BRIEF.md. The frame is Carnegie's (`stage.ts`): the ball enters on the snare (-0.5, 0) and leaves
 * there (exit [0, 0]). Every stroke on the hall's kit goes in `FAST_KIT` (and its time in `FAST_HITS`); the hall
 * draws the kit answering them.
 */

export const FAST_KIT: KitStroke[] = strokesOf(onsetsIn(BUILD + 0.02, RUBATO - 0.1, 1.3))
export const FAST_HITS: number[] = FAST_KIT.map((s) => s.t)

export const fast = kitStub('fast', FAST_KIT)
