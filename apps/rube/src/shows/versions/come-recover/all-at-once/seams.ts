import type { Pt } from '../../../../parts'
import { JUMPS } from './music'

/**
 * What the ball is doing at each verse-jump, so the parts on either side agree without seeing each other. At a jump
 * the camera carries the last framing across exactly (a match cut on the ball), so the ball's place on the screen
 * is continuous by construction; its motion is continuous only if both sides keep to these:
 *
 * - `v`: the ball's velocity at the cut, cells a second, y down. The part before ends its lane moving at this; the
 *   part after starts moving at it (a flight carries on as the same parabola: `throwFor` in `physics.ts`).
 * - `cells`: how close the camera is at the cut. The part before has a key at the jump (or just before it) at this
 *   distance, framed on the ball; the part after starts from it and makes its own moves.
 */
export interface Seam {
  t: number
  v: Pt
  cells: number
  /** What the ball is doing, in words, for whoever builds either side. */
  what: string
}

export const SEAMS: Record<keyof typeof JUMPS, Seam> = {
  premiere: { t: JUMPS.premiere, v: [2.2, -2.6], cells: 2.6, what: 'thrown out of the dryer\'s burst door, up and to the right, in a flight under home gravity (12)' },
  dojo: { t: JUMPS.dojo, v: [2.4, -0.6], cells: 4.5, what: 'shot out of the alley\'s drainpipe mouth, a flat flight to the right' },
  hotdog: { t: JUMPS.hotdog, v: [2.0, -2.2], cells: 4.5, what: 'kicked off the last dummy, a flight up and to the right' },
  hibachi: { t: JUMPS.hibachi, v: [1.4, -3.0], cells: 4.5, what: 'flicked up by a floppy finger, a steep flight' },
  surf: { t: JUMPS.surf, v: [2.2, -4.0], cells: 5, what: 'flipped high by the spatula, a long flight up and to the right' },
  void: { t: JUMPS.void, v: [0.8, 0.6], cells: 5, what: 'drifting down to the right into the dark, slowing (low gravity there)' },
  mosaic: { t: JUMPS.mosaic, v: [0, 0.9], cells: 4, what: 'tipping into the bagel\'s hole, falling straight down, slowly' },
  eye: { t: JUMPS.eye, v: [0, 0], cells: 3.2, what: 'at rest, alone, on the great hit: the googly eye' },
  rocks: { t: JUMPS.rocks, v: [0, 0], cells: 3.2, what: 'at rest after the fight\'s last hit; in the rocks, at rest on the ledge' },
  brink: { t: JUMPS.brink, v: [0.4, 3.0], cells: 7, what: 'falling off the canyon\'s last ledge, down and a little right' },
  home: { t: JUMPS.home, v: [0, 0], cells: 2.4, what: 'at rest at the bottom of a circle (the bagel\'s hole, then a washer\'s window), Joy beside her' },
}

/**
 * The circle the peak hands to home: the bagel's hole as it has shrunk at 264.14, which is exactly a washer's window
 * in the laundromat. Its radius in cells, and where its centre is from Evelyn. Joy is beside her, to her right.
 */
export const HOME_CIRCLE = { r: 0.42, fromBall: [0.12, -0.24] as Pt, joy: [0.27, 0] as Pt }
