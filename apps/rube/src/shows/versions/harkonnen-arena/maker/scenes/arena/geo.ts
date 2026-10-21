import { onsetNear } from '../../music'
import { T } from '../../timeline'

/**
 * Giedi Prime's arena: where it is, and when what happens in it, every moment on the music.
 *
 * The arena is a bowl seen from its floor. The floor is the action's plane (y = 0, x round `X0`); its far side is a wall
 * of tiers behind it, drawn in a layer (`STANDS_F` the size of the floor's plane) whose rim dips at the middle, where the
 * bowl is furthest, and towers toward the frame's edges, where it comes round toward us. Two black pylons stand at the
 * floor's ends, each with a gate: Feyd-Rautha's on the west, the prisoners' on the east.
 */

/** The floor's middle. */
export const X0 = 6000
/** The gates: the inside face of each pylon, and the opening's width and height. */
export const WEST_GATE = X0 - 14
export const EAST_GATE = X0 + 14
export const PYLON_W = 4.6
export const PYLON_H = 17
export const GATE_W = 1.7
export const GATE_H = 1.5

/** The stands' layer: how big against the floor's plane, and the world y it shrinks toward (above the floor, so the floor shows behind the fighters). */
export const STANDS_F = 0.6
export const STANDS_PIVOT = -3.5

/** A strike on the onset nearest `t` (at least `g` strong, within `tol`). */
const on = (t: number, g = 0.2, tol = 0.05): number => onsetNear(t, g, tol)

/** When it all happens. */
export const A = {
  /** The dissolve in from the eclipse, and how long it takes. */
  in: T.arena,
  inFor: 2.2,
  /** Feyd-Rautha's gate opens, and he comes out; the prisoners' gate opens, and they are shoved out, one, two, three. */
  westGate: on(190.113),
  eastGate: on(190.764),
  shoved: [on(191.524), 192.25, 192.95],
  /** The two-shot of the floor. */
  floor: on(196.57),
  /** The two blows: the hardest of the cue. */
  blow1: on(198.008, 1),
  blow2: on(202.153, 1),
  /** The crowd's answer to each. */
  roar1: on(198.577, 1),
  roar2: on(202.437, 1),
  /** The third comes at him. */
  advance: on(203.842, 0.4),
  clash1: on(205.055, 0.8),
  /** The flurry, five strokes in a second. */
  flurry: [on(207.494, 1), on(207.761, 1), on(207.929, 1), on(208.196, 1), on(208.48, 1)],
  part: on(210.187, 0.4),
  clash2: on(213.386, 1),
  /** The wide shot: the crowd swaying as one. */
  wide: on(216.857, 1),
  back: on(218.47, 0.3),
  /** The prisoner rams him: knocked back, down, and up again. */
  ram: on(221.466, 1),
  down: on(222.627, 0.5),
  up: on(223.684, 0.8),
  circle: on(224.11, 0.3),
  feint: on(230.354, 0.7),
  clash3: on(233.686, 0.9),
  /** The close exchange. */
  close: on(235.868, 1),
  exchange: [on(235.868, 1), on(236.768, 1), on(237.041, 1), on(237.476, 0.7)],
  lunge: on(243.473, 0.6),
  /** The kill, after the held breath. */
  kill: on(250.114, 1),
  /** The sky: the ink. */
  sky: on(252.0, 0.4),
  ink: [on(250.114, 1), on(254.862, 1), on(258.264, 1)],
  out: T.charge,
} as const

/** The slow pulse the crowd sways on, under the duel (about 1.16 s, 212 to 224). */
export const SWAY = { from: 212.163, period: 1.1606, to: 224.2 }
