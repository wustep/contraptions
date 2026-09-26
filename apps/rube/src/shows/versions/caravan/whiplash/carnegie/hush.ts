import { BUILD, HUSH, onsetsIn } from '../music'
import { kitStub, strokesOf, type KitStroke } from '../stub'

/**
 * STUB (the director's). Carnegie Hall, the hush (323.27 → 369.98): the solo drops to soft cymbals and hi-hat, with
 * bursts. Fletcher steps down to the kit and sets the tilting crash cymbal straight on its stand, and goes back.
 * The frame is Carnegie's (`stage.ts`).
 */

export const HUSH_KIT: KitStroke[] = strokesOf(onsetsIn(HUSH + 0.02, BUILD - 0.1, 1.0))
export const HUSH_HITS: number[] = HUSH_KIT.map((s) => s.t)

export const hush = kitStub('hush', HUSH_KIT)
