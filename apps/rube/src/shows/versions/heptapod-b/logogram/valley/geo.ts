import { R, type Pt } from '../../../../../parts'

/**
 * The valley's fixed geometry (the director's): where the shell hangs, where its slot is, where the meadow is and
 * where the lift stands under the slot. The valley builder (set, flight, base, departure) and the lift builder both
 * read these; neither moves them. Valley cells, y down.
 *
 * The meadow's surface is y = MEADOW. A ball resting on the meadow has its centre at MEADOW - R. The shell hangs with
 * its belly's lowest point at (SHELL_X, BELLY), 14 cells over the meadow; its slot is centred on SHELL_X, SLOT_W
 * wide. The lift stands on the meadow directly under the slot: its deck at its lowest is 1 cell over the meadow, and
 * the lift part's origin is LIFT_AT, so Louise comes onto the deck at LIFT_AT + (-0.5, 0).
 */
export const MEADOW = 0
export const SHELL_X = 0
export const BELLY = MEADOW - 14
export const SHELL_H = 150
export const SHELL_W = 63
export const SLOT_W = 2.6
/** The lift's origin: the ball's rest line on its deck at its lowest (deck top 1 cell over the meadow). */
export const LIFT_AT: Pt = [SHELL_X - 0.4, MEADOW - 1 - R]
/**
 * Where the lift's lane ends, relative to its origin, at the cut into the shell: the deck risen into the slot, the
 * ball's centre just inside the belly's line.
 */
export const LIFT_EXIT: Pt = [0.5, BELLY - 0.3 - LIFT_AT[1]]
