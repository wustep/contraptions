import { M, boomNear, onsetNear, tick, tickAt } from '../../music'
import { WINDOWS } from '../../plan'

/**
 * When everything in Arrakeen happens, show seconds, each on something the recording has: the drums' blows (booms),
 * the click's ticks, and the onsets. Both of Arrakeen's scenes and their drawings read these.
 */

/** The click's tick at or just after `t` that falls on its own attack. */
const tickOn = (t: number): number => tick(tickAt(t))

export const ARRIVAL = {
  from: WINDOWS.arrival[0],
  to: WINDOWS.arrival[1],
  /** The frigate comes down on the drums' first three blows and stands on the field on the third. */
  descent: [M.drop, boomNear(111.07), boomNear(114.18)],
  touch: boomNear(116.3),
  /** It settles on its legs, and the ramp comes down onto the field. */
  settle: boomNear(118.32),
  ramp: onsetNear(119.53, 0.7, 0.05),
  /** The Duke comes out first, then Jessica, then Paul. */
  leto: boomNear(120.11),
  jessica: boomNear(121.31),
  paul: tickOn(121.6),
  /** Inside the great hall. */
  hall: tickOn(125.35),
  /** Paul's hop up onto the winch's foot lever, and his four steps on it; the head is on its hook on the last. */
  up: onsetNear(127.98, 0.7, 0.05),
  pulls: [onsetNear(128.4, 1, 0.05), onsetNear(128.81, 1, 0.05), onsetNear(129.65, 1, 0.05), onsetNear(130.06, 1, 0.05)],
} as const

export const ATTACK = {
  from: WINDOWS.attack[0],
  to: WINDOWS.attack[1],
  dissolve: 2.6,
  /** Paul at his window; the Duke alone in the hall under the bull. */
  window: boomNear(200.79),
  duke: onsetNear(203.19, 1, 0.05),
  /** Out over the whole city under its shield; the shield goes out from its crown down across the sky. */
  dome: onsetNear(205.09, 1, 0.05),
  shieldOut: boomNear(206.83),
  /** The armada: its near ships passing low over the palace's roof; then all of it over the city. */
  armada: boomNear(210.11),
  sky: onsetNear(215.0, 1, 0.05),
  /** In close on the palace's roof as a shell comes in and the roof takes fire. */
  roof: onsetNear(216.31, 1, 0.05),
  /** Paul at his window, watching the city burn; his mother comes to him; the blast over the window. */
  watch: onsetNear(220.08, 1, 0.05),
  mother: onsetNear(221.08, 1, 0.05),
  /** The terrace: the Harkonnen ornithopter comes down out of the smoke onto the pad. */
  terrace: onsetNear(225.69, 1, 0.05),
  landed: boomNear(226.32),
  /** The bombardment: each a shell's hit. */
  hits: [onsetNear(212.71, 1, 0.05), onsetNear(215.0, 1, 0.05), boomNear(217.38), onsetNear(218.19, 1, 0.05), onsetNear(220.08, 1, 0.05),
    onsetNear(221.08, 1, 0.05), boomNear(222.1), onsetNear(225.69, 1, 0.05), onsetNear(228.16, 1, 0.05)],
  /** Back in Paul's room; the door breaks; the soldiers come in off the terrace on the next onsets. */
  room: boomNear(230.08),
  door: onsetNear(232.58, 1, 0.05),
  soldiers: [onsetNear(233.18, 1, 0.05), onsetNear(233.84, 0.8, 0.05), onsetNear(234.93, 1, 0.05), boomNear(235.49)],
  /** They are taken: held up between them, out of the door, across the terrace, into the ornithopter on the pad. */
  taken: onsetNear(236.18, 0.8, 0.05),
  across: onsetNear(238.69, 0.8, 0.05),
  /** It lifts off with them, and turns away east into the dark. */
  lift: onsetNear(243.17, 0.8, 0.05),
  away: onsetNear(243.9, 0.8, 0.05),
  /** The great hall: the Duke bound in his chair under the bull; the Baron comes down out of the vault, a blow a step. */
  hall: onsetNear(245.89, 1, 0.05),
  baron: [boomNear(250.07), onsetNear(252.59, 1, 0.05), boomNear(254.36), boomNear(256.04)],
  /** The tooth, the gas, the guards going grey, the Baron away, the Duke's death, the lamps swinging. */
  bite: onsetNear(260.08, 1, 0.05),
  gas: [boomNear(263.07), boomNear(265.03)],
  guards: [onsetNear(266.33, 1, 0.05), onsetNear(266.9, 1, 0.05)],
  flee: boomNear(267.18),
  last: onsetNear(269.65, 1, 0.05),
  death: M.great,
  fall: boomNear(272.17),
} as const
