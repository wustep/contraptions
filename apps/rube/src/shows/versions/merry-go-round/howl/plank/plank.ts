import type { Pt } from '../../../../../parts'
import { stub } from '../stub'

/**
 * The castle falls apart; the plank on legs; the heart given back; the slide to the cliff; the cadenza (243.635 → 292.734): the plank builder's. A stub until its builder replaces it: keep the export names (the score imports them).
 */
export const plank = stub('plank', 50, 0, { howl: [0.36, 0], cells: 6 })

/** Every strike of this part, in show seconds. */
export const PLANK_HITS: number[] = []

/** Where the collapse leg starts in the wastes world: far from the hills, so the two castles are never both in view. */
export const PLANK_AT: Pt = [400, 0]
