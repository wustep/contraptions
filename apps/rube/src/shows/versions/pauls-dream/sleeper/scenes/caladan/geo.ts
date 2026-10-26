import { M, boomNear, tick } from '../../music'
import type { Pt } from '../../paint'

/**
 * Caladan's ground plan and its clock. Castle Caladan stands on a sea cliff, the sea to the west of it, the landing
 * field to the east on the cliff's top. The balls are people, so a room is about five balls high; the castle is
 * enormous round them.
 *
 * Cells, up negative; sea level y = 0.
 */

/** The sea's level: the cliff stands 22 cells out of it, the castle on its top. */
export const SEA = 10
/** The cliff's top edge, and its foot in the sea. */
export const CLIFF = { top: -12, edge: -560, foot: -569 } as const

/** The tower on the cliff's edge, the long block east of it, and the roof's peak. */
export const TOWER = { x0: -560, x1: -549, top: -30, peak: -32.6 } as const
export const BLOCK = { x0: -549, x1: -524, top: -21.5 } as const

/** Paul's room at the top of the tower: its floor, ceiling, walls; the window in its west wall onto the sea. */
export const ROOM = { x0: -558.2, x1: -554.0, floor: -26, ceil: -28.2, win: { y0: -27.75, y1: -26.45 } } as const
/** His bed, against the east wall: its top, where he lies. */
export const BED = { x0: -555.7, x1: -554.15, top: -26.22 } as const

/** The test room in the block: floor, ceiling, walls; the sliding door in its east wall, and the passage beyond. */
export const TEST = { x0: -546.6, x1: -541.4, floor: -19, ceil: -21.2, door: -541.4, hall1: -538.4 } as const
/** The box on its low table, the Reverend Mother's seat, where Jessica waits outside. */
export const BOX = { x: -543.7, top: -19.44, w: 0.46, h: 0.44 } as const
export const SEAT: Pt = [-545.35, -19.2 - 0.13 * 1.3]
export const OUTSIDE: Pt = [-540.85, -19.0 - 0.13]

/** The hall in the tower's foot: its tall window onto the sea, the bull's head on its back wall, the crate. */
export const HALL = { x0: -558.2, x1: -551.4, floor: -12.6, ceil: -16.4, win: { x: -558.2, y0: -15.7, y1: -13.1 } } as const
export const HOOK: Pt = [-554.4, -15.2]
export const CRATE = { x: -554.4, w: 1.55, h: 1.3 } as const

/** The landing field, the frigate on it, its ramp. */
export const FIELD = { x0: -524, x1: -440 } as const
export const FRIGATE_AT: Pt = [-495, CLIFF.top - 2.45]
export const RAMP = { foot: [-500.6, CLIFF.top - 0.13] as Pt, top: [-498.6, CLIFF.top - 1.05] as Pt }

/** The cloud deck the frigate climbs through, and the heighliner over it: its belly, and its open hold. */
export const CLOUDS = { y0: -66, y1: -52 } as const
export const HEIGHLINER = { x0: -980, x1: -120, belly: -150, top: -232, hold: { x0: -512, x1: -470, depth: 26 } } as const

/** The clock: every moment of Caladan, on the music. */
export const T = {
  /** The figure every five seconds, and its answer a slow beat later: a wave breaks on the cliff, and its spray falls. */
  waves: [0, 1, 2, 3, 4].map((i) => tick(16 * (i + 1))),
  answers: [0, 1, 2, 3, 4].map((i) => tick(16 * (i + 1) + 4)),
  /** The first low swell: the great wave. */
  great: M.swell,
  /** The camera leaves the sea for the cliff, and arrives at his window. */
  rise: 15.058,
  window: 25.054,
  /** The lament: he stirs; the call: the dream opens. */
  stir: M.lament,
  dream: M.call,
  /** The swell: he wakes. */
  wake: boomNear(46.7),
  /** He rolls to his window and looks at the sea. */
  look: 48.29,
  /** A cut to the test room: its door slides open, and they come in. */
  door: M.wake,
  test: 52.7,
  atBox: 54.65,
  /** Jessica is sent out; the door shuts. */
  sent: 57.37,
  shut: 58.82,
  /** His hand into the box; the needle comes up; it is at his neck on the swell, and the pain begins. */
  hand: 59.26,
  needle: 61.1,
  neck: boomNear(62.3),
  /** The pain's worst blows, and the breath. */
  blows: [64.05, 65.63, 68.71, 70.66, 71.34, 72.53, 74.18, 79.66],
  worst: 71.34,
  /** Cut to Jessica outside the door, and back. */
  outside: 72.53,
  back: 77.4,
  /** It is over. */
  over: M.figure,
  /** The door opens and she comes to him. */
  open: 83.14,
  /** The hall: Leto at the window; out to the sea; back in; the head comes down into its crate; the lid. */
  hall: 87.55,
  sea: 89.91,
  inside: 92.25,
  lower: [94.69, 96.35, 97.7],
  lid: 99.14,
  /** The field; the lift; the clouds; the heighliner; the fold. */
  field: M.build,
  lift: boomNear(103.1),
  clouds: 105.16,
  hold: 109.35,
  fold: M.drop,
} as const
