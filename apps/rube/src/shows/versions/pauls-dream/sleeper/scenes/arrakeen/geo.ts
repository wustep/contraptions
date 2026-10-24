import { PAD } from '../../plan'
import type { Pt } from '../../paint'

/**
 * Arrakeen's ground plan, in world cells (up negative, the city's floor at y = 0). Every drawing of the city and every
 * scene that moves in it agree on these.
 *
 * West to east: the rock wall of the bowl; the landing field the frigate comes down on; the palace, a sloped block of a
 * building with its great hall at the foot of its west mass and a lower east wing whose roof is the ornithopters' pad;
 * and the bowl's rock again. People are balls, so a door is about three and a half of them tall (0.9 cells).
 */

/** The landing field, and where the frigate sets down (its middle when it stands on its legs). */
export const FIELD = { x0: 4, x1: 54 }
export const FRIGATE_AT: Pt = [28, -2.6]
/** Where the frigate is at the fold: the frame's middle at FOLD.cells, the field's floor at the frame's foot. */
export const FRIGATE_FOLD: Pt = [28, -13]
/** The frigate's hatch (where the family comes out from behind its hull) and its ramp, which lands on the field east. */
export const HATCH: Pt = [31.4, -1.15]
export const RAMP_FOOT: Pt = [35.4, 0]

/** The palace's outline: the battered west face, the west mass's roof, the east wing's roof terrace, the east face. */
export const PALACE: Pt[] = [
  [56, 0],
  [62.5, -24],
  [100, -24],
  [100, -14.8],
  [135, -14.8],
  [141, 0],
]
/** How thick the cut walls and floors are where the palace is shown in section. */
export const WALL = 0.9

/** The great hall, at the foot of the west mass: its floor, ceiling and walls, and the door in its west wall. */
export const HALL = { x0: 66, x1: 96, floor: 0, ceil: -13.9 }
export const HALL_DOOR = { x0: 59.5, x1: 66, top: -2.4 }
/** The slits in the hall's vault the sun comes through: [x middle, width]. */
export const SLITS: [number, number][] = [[72.5, 0.6], [79.5, 0.6], [86.0, 0.6], [92.5, 0.6]]
export const SLIT_TOP = -11.6
export const SLIT_FOOT = -4.2
/** The bull's hook on the hall's back wall: where the plaque's top hangs. */
export const HOOK: Pt = [81, -3.4]
/** The pulley in the vault the hoist's chain runs over, and the winch's ratchet at the foot of the wall. */
export const PULLEY: Pt = [81, -11.9]
export const WINCH: Pt = [83.4, -0.75]
/** The winch's foot lever: its pivot, its end (where Paul lands on it), at rest; a step on it swings it down. */
export const LEVER_PIVOT: Pt = [83.4, -0.75]
export const LEVER_END: Pt = [85.35, -1.1]
/** The crate the head came from Caladan in, open on the hall's floor under the hook. */
export const CRATE = { x0: 80.1, x1: 81.9, top: -0.75 }
/** The Duke's chair on the night (under the hook). */
export const CHAIR: Pt = [79.6, 0]
/** The one lamp in the hall by night: a tall iron stand under the bull, between the Duke and where the Baron comes to; its bowl. */
export const LAMP: Pt = [80.9, -1.95]
/** The vault the Baron comes down out of and goes back up into. */
export const VAULT_Y = -12.2

/**
 * Paul's room, on the floor over the hall at the east end of the west mass, level with the terrace: its tall window in
 * the back wall, and its door in the east wall, straight out onto the terrace and the pad. The room west of it on the
 * same floor, and the rooms over both, are dark.
 */
export const ROOM = { x0: 89, x1: 99.2, floor: -14.8, ceil: -18.6 }
export const WEST_ROOM = { x0: 66, x1: 88.2, floor: -14.8, ceil: -18.6 }
export const TOP_ROOMS = { x0: 66, x1: 99.2, floor: -19.4, ceil: -23.1 }
export const WINDOW = { x0: 92.4, x1: 97.4, top: -18.0, foot: -15.0 }
export const ROOM_DOOR = { x0: 99.2, x1: 100, top: -15.85 }
/** The terrace's top; the pad is a slab on it, its top at PAD's height. */
export const TERRACE_Y = -14.8
export const PAD_X: [number, number] = [PAD[0] - 5, PAD[0] + 5]

/** The rock walls of the bowl, near the city: west of the field and east of the palace. */
export const WEST_ROCK = { x0: -60, x1: -6 }
export const EAST_ROCK = { x0: 146, x1: 200 }

/** The house shield over the palace and the whole city in its bowl: a dome's middle and its half width and height. */
export const SHIELD = { cx: 70, w: 112, h: 62 }
