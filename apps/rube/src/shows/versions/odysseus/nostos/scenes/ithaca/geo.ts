import { M } from '../../music'
import type { Pt } from '../../path'
import { ITHACA, SAND } from '../../voyage'

/**
 * Ithaca's ground and its clock. The island from east to west: a beach where the raft comes in, a sheer cliff with a
 * fishermen's hoist at its top, the plateau with Argos by the courtyard's gate and the palace on it (the hall below,
 * Penelope's room above its west half, a roof terrace over its east half), and the west cliff down to the harbour,
 * where the skiff waits for the end.
 *
 * The balls are people, as tokens in a human-scale world: a doorway is about three and a half balls tall, so the
 * palace is small against the cliff, and the camera goes in close to it.
 *
 * Every time here is on the music (`music.ts`): the shuttle's passes on the theme's notes, the dog's last breath where
 * the cue drops to nothing, the axes raised on the climbing notes of the quiet, the bow on the swell.
 */

/** A ball's radius, and the hero's. */
export const R = 0.13

/* ------------------------------------------------------------------ the ground */

export const TOP = ITHACA.top
export const ON_TOP = TOP - R
/** The beach's waterline, the flat sand where he lands, and the east cliff's foot and its top edge. */
export const BEACH = { water: 797.6, x0: 798.5, x1: 804.5, sand: SAND }
export const CLIFF_E = { foot: 806.4, top: 807.4 }
/** The west cliff's top edge and its foot, at the harbour. */
export const CLIFF_W = { top: 830.6, foot: 836.4 }

/**
 * The fishermen's hoist at the east edge: a gallows over the cliff with one pulley and two baskets on one rope, the
 * hero's at the foot and a basket of stones held at the top by a pin. A ball landing in the lower basket jerks the rope
 * and frees the pin; the stones go down and the ball comes up, the two baskets passing halfway.
 */
export const HOIST = {
  post: 808.1,
  pulley: [806.76, TOP - 1.55] as Pt,
  /** The two ropes' x. */
  hero: 806.55,
  stones: 806.97,
  /** Each basket's floor at the bottom and at the top. */
  foot: -0.66,
  top: TOP - 0.5,
}

/** The courtyard's front wall and its gate; Argos on his straw outside it, near the cliff's edge. */
export const GATE = { x: ITHACA.gate, half: 0.36, h: 0.92, wall: [813.4, 815.6] as [number, number], wallH: 1.1 }
export const ARGOS = { x: 809.95, y: TOP }

/** The palace: the hall, Penelope's room over its east half, the terrace over its west half. */
export const HALL = { ...ITHACA.hall }
export const ROOM = { ...ITHACA.room }
/** Wall and slab thickness. */
export const WALL = 0.2
export const SLAB = 0.17
/** The hall's east door (from the courtyard: where the arrow goes out) and west door (onto the evening). */
export const DOOR_E = { x: HALL.x0, h: 0.92 }
export const DOOR_W = { x: HALL.x1, h: 1.02 }
/** The room's door onto the terrace (in its west wall), and its east window over the sea towards Troy. */
export const ROOM_DOOR = { x: ROOM.x1, h: 0.9 }
export const WINDOW = { y0: ROOM.floor - 1.08, y1: ROOM.floor - 0.42 }
/** The terrace over the hall's west half, open to the sky, at the room's floor level. */
export const TERRACE = { x0: ROOM.x1, x1: HALL.x1, y: ROOM.floor }
/**
 * The stairs up the back wall from the hall's floor (at x0) into Penelope's room (at x1), rising westwards: the way up
 * to the room, and through it to the terrace. Their top comes up through an opening in the room's floor.
 */
export const STAIRS = { x0: 819.7, x1: 822.1, steps: 6 }
/** The opening in the room's floor over the stairs' top. */
export const STAIRWELL = { x0: 821.25, x1: 822.1 }
/** The hearth by the east door, where the beggar sits; one painted column under the room's wall, Knossos's way. */
export const HEARTH = { x: 818.98, half: 0.27 }
export const COLUMNS = [822.45]
/** The dais along the back wall of the west half, where the suitors feast, raised over the axes' heads. */
export const DAIS = { x0: 822.6, x1: 825.45, top: HALL.floor - 0.42 }
/** The light well in the terrace over the crank's plate. */
export const WELL = { x: 826.72, half: 0.2 }

/** The loom by the room's east window: its middle, its half-width, the cloth beam's height, the weights' line. */
export const LOOM = { x: ITHACA.loom.x, half: 0.42, top: ROOM.floor - 1.12, foot: ROOM.floor - 0.2 }

/**
 * The bow on its stand at the hall's west end, standing, pointing east along the axes, strung with Penelope's red
 * thread; and its rig, a bell crank west of it: a plate out to the west under the light well, cocked up, and an arm
 * standing up from the pivot, tied by a cord to the string's middle. A ball dropped on the plate from the terrace
 * that the plate gives way under brings it down, the arm swings west and draws the bow; when he rolls off the plate,
 * the bow takes the cord back and looses. The suitors drop on it too, and it does not give.
 */
export const BOW = { x: 825.75, y: HALL.floor - 0.32, half: 0.3 }
export const CRANK = { x: 826.36, y: HALL.floor - 0.06, plate: 0.38, arm: 0.36, cocked: 0.7 }
/** The twelve axes along the floor's trench, east of the bow, their eyes at the arrow's height. */
export const AXES = Array.from({ length: 12 }, (_, i) => 825.15 - i * 0.44)
/** An axe: its haft, its head, and how deep its foot sits in the trench (lying, it is hidden there). */
export const AXE = { haft: 0.37, head: 0.1, sunk: 0.11 }

/** The harbour's jetty on the west side, and the skiff's mooring. */
export const JETTY = { x0: 836.4, x1: 840.6, top: -0.42 }
export const MOORING = 841.6

/* ------------------------------------------------------------------ the clock */

/** The prologue's shuttle: it comes to rest at the other side of the warp on each of these notes. */
export const SHUTTLE = [40.54, 42.24, 46.24, 50.64, 53.57, 55.58, 59.74, 62.35, 64.56, 66.95, 69.21]

/** Home: off the beach, up the hoist, onto the top; Argos sees him, wags once, and dies where the music drops. */
export const HOME = {
  landed: 418,
  toBasket: 420.68,
  lift: 421.11,
  top: 426.04,
  hop: 426.69,
  atDog: 428.11,
  sees: 428.8,
  wag: 430.23,
  dies: M.quiet,
}

/** The hall: father and son; the axes raised; the suitors fail; he climbs, drops, and the bow sings; the arrow; home. */
export const TRIAL = {
  sonOut: 432.6,
  touch: 437.26,
  inside: 441.12,
  /** Penelope leaves her loom to watch from the head of the stairs. */
  penelope: 441.12,
  /** Telemachus trips the first axe (the east one); each one up trips the next, westwards, on these notes. */
  axes: [450.96, 451.48, 452.52, 453.0, 453.42, 453.87, 454.14, 454.66, 455.4, 455.91, 456.63, 457.36],
  /** The suitors who try: each lands on the plate on one of these, and it does not give. */
  tries: [458.07, 467.64, 476.64],
  /** He goes up the stairs a step a note, and stands at their head in her room. */
  climb: [485.45, 486.06, 486.72, 487.48, 488.21, 489.26],
  /** Out of her door onto the terrace, to the well's edge, and over. */
  out: 491.08,
  edge: 493.45,
  sing: M.last,
  drawn: 495.72,
  loose: 500.79,
  through: 501.6,
  /** The arrow, through the twelve eyes, takes Antinous in the air as he leaps at Telemachus in the doorway. */
  strike: 501.6,
  erupts: 503.15,
  meet: 508.96,
  fade: 512.68,
}
