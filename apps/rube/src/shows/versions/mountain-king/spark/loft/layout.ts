import type { Pt } from '../../../../../parts'

/**
 * Where things are in the loft, in the loft's world cells (y down). The director's: both loft builders and the home
 * part work from these, so they can work at once. Ask before moving one; add your own constants in your own files.
 *
 * A cell is about four inches: the spark (the ball, 0.26 across) is a candle's flame, an inch. The room is seen side
 * on, a dollhouse cut open, at night. The origin is the spark on its wick at the start: the ball's centre is at
 * `WICK`. The loft's first part is laid at [0, 0], so its own frame's entry (-0.5, 0) is the wick.
 *
 *      x: -30 ......................................... 0 ......... 10 ..... 16
 *   -14  roof boards, the ridge beam, a skylight in the roof (moonlight falls through it onto the west side)
 *    -4                                                                  stove pipe
 *     0   dipping wheel     drying rack               [candle]     | stove top (0.2), the wax vat on it
 *   2.25  ---------------- bench top (x -16 .. 3) --------------   | firebox door (x 5.2..7.8, y 2.6..5.4)
 *                                                                  | ash pan, legs
 *                                                          the cat, curled under the firebox door
 *  11.25  ================ floor ============================================================
 *
 * The sneak goes west from the candle (LOFT-A: along the bench, the drying rack), hands on at `HANDOFF` (LOFT-B: the
 * dipping wheel, down to the floor, east past the cat) and ends in the stove's firebox on statement 2's first note.
 * The dash home at the end comes back out of the same firebox door, west and up, onto the wick.
 */

/** The spark on its wick: the ball's centre. The candle stands under it. */
export const WICK: Pt = [-0.5, 0]
/** The candle: the top of its wax (a little under the wick), and its foot on the chamberstick's pan. */
export const CANDLE = { x: -0.5, top: 0.28, foot: 2.05, r: 0.34 }
/** The bench: its top surface (y) and its ends. */
export const BENCH = { top: 2.25, x0: -16, x1: 3 }
/** The floor's surface. A ball rolling on the floor has its centre at `FLOOR_Y - R`. */
export const FLOOR_Y = 11.25
/** The room's walls and roof: what the set fills, and what the camera may see. */
export const ROOM = { x0: -30, x1: 16, y0: -14, y1: 13 }
/** The skylight in the roof the moon comes through, and where its light falls. */
export const SKYLIGHT = { x0: -24, x1: -18, y0: -13.5, y1: -11.5 }

/** The drying rack on the bench's west end: rods of dipped candles hanging in pairs by their wicks. LOFT-A's. */
export const RACK = { x0: -15, x1: -8, rodY: -1.5 }
/** The dipping wheel west of the bench: a wheel of hanging wicks over a wax vat. LOFT-B's. */
export const WHEEL = { cx: -21, cy: 1.5, r: 3.2 }
/** Where LOFT-A hands the spark to LOFT-B at `SEAMS.loft` (the ball's centre, world cells). */
export const HANDOFF: Pt = [-17.5, 0.2]

/**
 * The stove, just east of the bench: a tall cast-iron parlour stove on four legs, its top plate about level with the
 * candle (the wax vat warms on it), its pipe up through the roof. LOFT-B draws it.
 */
export const STOVE = { x0: 4, x1: 9, top: 0.2, pipeX: 7.5 }
/** The firebox door on the stove's face, hinged on its west edge, and the mouth of the fire behind it: the fire-door, both ways. */
export const DOOR = { x0: 5.2, x1: 7.8, y0: 2.6, y1: 5.4, hinge: 5.2 }
export const FIRE_MOUTH: Pt = [6.5, 4.0]

/** The cat, curled asleep on the floor under the firebox door, in the stove's warmth. LOFT-B draws it. */
export const CAT = { x0: 2.0, x1: 7.8, y0: 8.8 }
