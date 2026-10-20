import { M } from '../../music'
import type { Pt } from '../../path'

/**
 * The Cyclops' island: its ground and its clock, which every drawing and every path of the scene reads.
 *
 * The island stands behind the waterline: a dome of black rock under green turf, its west face dropping to a rock shelf
 * at the water, and in that face the cave. The fleet comes in from the west under sail, lowers its masts and lies off
 * the shelf; the cave is cut open as the camera goes in at its mouth, and closed again as it comes out.
 *
 * The cave is his, so it is his size: a man is a ball, a ewe about a ball long, and he is a hill. West to east inside:
 * the mouth, where the flock lies; the long dark heap that is the giant asleep; his fire; his club laid over a stone
 * with its point in the fire and its butt up by a ledge of fallen rock; and the back wall, where the men hide.
 */

/** The island at the waterline, west and east, and the top of its ridge. */
export const WEST = 92.4
export const EAST = 141
export const RIDGE: Pt = [116.5, -18]

/** Where the ships lie while the men are ashore (ship 0 under the cave's mouth, 1 and 2 astern of it). */
export const MOOR = [97, 90, 83] as const

/** The cave: its floor, its mouth (the gap in the west wall), its back wall. */
export const FLOOR = -2.6
export const MOUTH = { x0: 95.6, x1: 97.6, top: -6.4 }
export const BACK = 114.5

/** The inside of the cave: the floor, the back wall, the roof back to the mouth's inner edge. */
export const CAVE: Pt[] = [
  [MOUTH.x1, FLOOR],
  [BACK - 0.3, FLOOR],
  [BACK + 0.1, -3.6],
  [BACK, -5.6],
  [113.2, -7.8],
  [110.6, -9.6],
  [106.5, -10.3],
  [102.4, -9.8],
  [99.4, -8.3],
  [MOUTH.x1 + 0.25, MOUTH.top - 0.5],
  [MOUTH.x1, MOUTH.top],
]

/** The shelf from the water up to the mouth: the way in and out. */
export const SHELF: Pt[] = [
  [WEST, 0.1],
  [93.6, -0.62],
  [94.8, -1.55],
  [95.9, -2.42],
  [96.6, FLOOR],
]

/** The ground under a ball or a ewe at `x`: the shelf outside the mouth, the floor inside. */
export function ground(x: number): number {
  if (x >= SHELF[SHELF.length - 1][0]) return FLOOR
  if (x <= SHELF[0][0]) return SHELF[0][1]
  for (let i = 1; i < SHELF.length; i++) {
    const [x0, y0] = SHELF[i - 1]
    const [x1, y1] = SHELF[i]
    if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0)
  }
  return FLOOR
}

/**
 * The rock at the back: a ledge by the club's butt, a pillar on the ledge's east end, and a step up to the ledge from
 * the floor. The men go floor, step, ledge, butt; the hero goes on up the pillar and drops from it.
 */
export const LEDGE = { x0: 109.95, x1: 111.1, top: -4.35 }
export const PILLAR = { x0: 110.55, x1: 111.2, top: -5.95 }
export const STEP = { x0: 111.1, x1: 112.25, top: -3.45 }

/**
 * The club, mirrored: its point to the west, in the fire, its butt to the east, up by the ledge. `a` is how far the
 * point is turned up from level. A man on the butt barely tips it; the butt slammed to the floor brings the point up
 * four and a half cells, to where his eye is as he sleeps sitting up.
 */
export const PIVOT: Pt = [108.2, -3.9]
export const BUTT_ARM = 1.6
export const TIP_ARM = 4.73
export const STAKE_R = 0.15
/** At rest (point in the fire), and up (butt on the floor). */
export const A_REST = Math.asin((PIVOT[1] - (FLOOR - 0.2)) / TIP_ARM)
export const A_UP = Math.asin((FLOOR - STAKE_R - PIVOT[1]) / BUTT_ARM)

/** The fire on the floor, under the club's point. */
export const FIRE: Pt = [PIVOT[0] - TIP_ARM * Math.cos(A_REST), FLOOR]

/** His eye as he sleeps sitting up by the fire: where the club's point comes up to. */
export const EYE: Pt = [PIVOT[0] - TIP_ARM * Math.cos(A_UP), PIVOT[1] - TIP_ARM * Math.sin(A_UP)]

/** The boulder that shuts the mouth: where it lies on the shelf when the door is open, and seated in the gap. */
export const BOULDER_R = 1.9
export const BOULDER_OUT: Pt = [94.0, -2.95]
export const BOULDER_IN: Pt = [96.6, FLOOR - BOULDER_R]

/** Where the rock he throws comes down. */
export const SPLASH_X = 117.4

/** The clock. Every strike is on a measured onset (`odysseus-onsets.json`). */
export const T = {
  /** The fleet comes in under the island; masts come down from the soft accent. */
  mastsDown: 143.46,
  moored: 148.5,
  /** The flock goes in off the shelf; the men follow. */
  sheepIn: 146.2,
  ashore: 148.75,
  /** The cave is cut open as the camera goes in at its mouth. */
  openFrom: 145.2,
  openTo: 147.8,
  /** The hand reaches out of the dark and drags the boulder into the mouth on the low voices' entry; it settles. */
  reachDoor: 150.35,
  shut: M.ground,
  settle: 151.64,
  /** The men creep in toward the embers. */
  creep: 151.9,
  /** The heap's eye opens beside two of them; he heaves up sitting, and the fire flares; he looks. */
  eye: 155.3,
  flare: 156.45,
  look: 156.94,
  /** The hand: reaching, closing on men 4 and 5, gone up into the dark. */
  reach: 159.6,
  grab: 161.65,
  lift: 162.73,
  gone: 164.0,
  /** He sleeps sitting up. */
  sleep: 164.86,
  /** Up the step, onto the ledge, onto the butt: men 0 and 1, then 2 and 3; the hero up the pillar and down. */
  climb: [164.69, 164.86, 165.44, 167.15, 167.33, 167.72] as readonly number[],
  onA: 166.91,
  onB: 168.11,
  pillar: 168.42,
  drop: M.swell,
  strike: 169.64,
  /** He rears with his hand over the eye, gropes to the door, and grinds the boulder out. */
  rear: 170.28,
  grope: 173.85,
  open: 176.36,
  /** The flock goes out under his hand, a man under each ewe and the hero under the ram, last. */
  pats: [177.05, 177.75, 178.03, 178.42, 179.33] as readonly number[],
  /** Ships 1 and 2 get under way first; ship 0 pushes off as the hero comes down the shelf, and he jumps for it. */
  under: 179.2,
  away: 180.0,
  aboard: 181.15,
  /** The cave closes again as the camera comes out. */
  closeFrom: 180.3,
  closeTo: 181.4,
  /** On the ridge, the throw, the rock into the sea short of them. */
  rise: 181.4,
  hurl: 182.87,
  splash: 184.21,
} as const
