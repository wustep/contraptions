import type { Pt } from '../../../../../parts'
import { stub } from '../stub'

/**
 * The castle's room: Calcifer, Markl, the dial, Howl, breakfast, the door to the flowers (151.998 → 178.051): the door builder's. A stub until its builder replaces it: keep the export names (the score imports them).
 */
export const morning = stub('morning', 12, 0, { howl: [0.36, 0], markl: [-0.45, 0], cells: 4.5 })

/** Every strike of this part, in show seconds. */
export const MORNING_HITS: number[] = []

/** Where the room leg starts in the room world (the part's own origin): Sophie comes in at the door. */
export const MORNING_AT: Pt = [0.8, 0]
