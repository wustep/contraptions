import { BURST, FINAL, onsetsIn } from '../music'
import { kitStub, strokesOf, type KitStroke } from '../stub'

/**
 * STUB (the director's). Carnegie Hall, 504.0 → the end: the burst, the long roll and Fletcher's nod, the last
 * fill, the silence with his hands up, the band's last chord, the fist. Then the hall goes dark under the credits.
 * The frame is Carnegie's (`stage.ts`).
 */

export const FINALE_KIT: KitStroke[] = [...strokesOf(onsetsIn(BURST - 0.01, FINAL - 0.3, 1.1)), { t: FINAL, piece: 'snare' }]
export const FINALE_HITS: number[] = FINALE_KIT.map((s) => s.t)

export const finale = kitStub('finale', FINALE_KIT)
