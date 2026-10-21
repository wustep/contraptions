import { R } from '../../../../parts'
import type { Pt } from './paint'

/**
 * The world, laid out west to east, in cells (up is negative). A ball is a person: about 0.26 cells across, so a cell
 * is some five metres.
 *
 * - The red gate and its tunnel stand at the west end on a grassy rise; the meadow runs down from it to the river of
 *   stones, a dry bed she crosses stone by stone.
 * - Over the far bank, stone steps up to the town: a street of eating houses with lanterns under the eaves.
 * - The bridge, red-railed, over the gorge where the railway runs, to the bathhouse.
 * - East of the bathhouse the plain the rain makes a sea, and the railway runs out over it to the stations and the
 *   Sixth Station, Swamp Bottom, at the far end.
 */

/** Monotone cubic through (x, y) points, flat outside: for the lie of the land. */
export function profile(pts: Pt[]): (x: number) => number {
  const n = pts.length
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  const d: number[] = []
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]))
  const m: number[] = new Array(n).fill(0)
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (2 * d[i - 1] * d[i]) / (d[i - 1] + d[i])
  return (x: number) => {
    if (x <= xs[0]) return ys[0]
    if (x >= xs[n - 1]) return ys[n - 1]
    let i = 0
    while (i + 1 < n && xs[i + 1] <= x) i++
    const h = xs[i + 1] - xs[i]
    const u = (x - xs[i]) / h
    const u2 = u * u
    const u3 = u2 * u
    return (2 * u3 - 3 * u2 + 1) * ys[i] + (u3 - 2 * u2 + u) * h * m[i] + (-2 * u3 + 3 * u2) * ys[i + 1] + (u3 - u2) * h * m[i + 1]
  }
}

/* ------------------------------------------------------------------ the west: the gate, the meadow, the river */

/** The gate: a red-plastered hall with a clock in its gable, the tunnel through it. Its arch's middle, and its sill. */
export const GATE = { x0: -7.2, x1: -0.2, arch: -3.4, archW: 1.25, archH: 1.15, sill: 0 }

/** The meadow's ground, from the gate's rise down to the river's near bank. */
export const meadowY = profile([
  [-30, 0],
  [-0.2, 0],
  [1.5, 0.04],
  [3.5, 0.22],
  [6, 0.5],
  [9, 0.78],
  [12, 1.05],
  [14.2, 1.32],
  [15.2, 1.75],
  [15.6, 2.05],
])

/** The river of stones: a dry bed between its banks, and the stones she crosses on (their tops, x and y). */
export const RIVER = { x0: 15.4, x1: 21.9, bed: 2.15 }
export const STONES: Pt[] = [
  [16.25, 1.98],
  [17.35, 2.02],
  [18.45, 1.95],
  [19.6, 2.0],
  [20.75, 1.96],
]

/** The far bank's stone steps: from the bed up to the town, their treads (where a ball's foot is). */
export const STAIR = { x0: 21.6, x1: 24.4, n: 10, bottom: 1.95, top: -1.2 }
export const treads: Pt[] = Array.from({ length: STAIR.n + 1 }, (_, i) => {
  const u = i / STAIR.n
  return [STAIR.x0 + (STAIR.x1 - STAIR.x0) * u, STAIR.bottom + (STAIR.top - STAIR.bottom) * u]
})

/** The town's street, and the bridge's deck: one level from the top of the steps to the bathhouse's door. */
export const STREET = { x0: 24.4, x1: 42, y: -1.2 }
export const BRIDGE = { x0: 42, x1: 54.5, y: -1.2 }

/** Where a ball resting on the ground at `x` has its middle. */
export const onMeadow = (x: number): Pt => [x, meadowY(x) - R]

/* ------------------------------------------------------------------ the bathhouse */

/**
 * The bathhouse: its front to us, its west end on the bridge, its east end over the sea. Floors (their floor lines):
 * the entrance and the great bath's hall at the bridge's level, two storeys tall with a gallery round it; then three
 * storeys of rooms; the roofs; Yubaba's rooms on top. Under it, down to the water, its timber footings, and at their
 * foot on the east the boiler room, its chimney going up the east end.
 */
export const BATH = {
  x0: 54.5,
  x1: 70.5,
  /** The entrance's floor (the bridge's level), the hall's gallery, and each storey's floor above. */
  floor: -1.2,
  gallery: -2.95,
  floors: [-1.2, -4.4, -5.5, -6.6, -7.7, -8.8],
  /** The great roof's ridge, Yubaba's rooms over it, and their dome's peak. */
  roofs: -10.0,
  top: -11.4,
  peak: -13.0,
  /** The front door's middle: under its great curved gable. */
  door: 56.4,
  /** The great bath's hall: inside, its west and east walls, and the big doors in its east wall to the sea. */
  hall: { x0: 57.6, x1: 69.0, y0: -4.4, y1: -1.2 },
  /** The tub: its rim and its floor, and the spout over it. */
  tub: { x0: 60.8, x1: 65.2, rim: -2.05, bed: -1.25 },
  spout: [66.4, -3.15] as Pt,
  /** The big doors, east, out over the sea. */
  doors: { x: 69.0, y0: -3.6, y1: -1.2 },
  /** The boiler room, at the footings' foot on the east, and its chimney going up behind the building. */
  boiler: { x0: 63.2, x1: 70.2, y0: 1.4, y1: 4.0 },
  chimney: { x: 67.0, w: 0.9, y0: 2.0, y1: -12.3 },
  /** Her room, on the third storey's east end, its door and shutter in the east wall, and the balcony outside it. */
  room: { x0: 66.2, x1: 70.5, y0: -6.6, y1: -5.5 },
  /** The east wall's door out onto the balcony: its span in the wall, and how high it is. */
  door2: { x0: 70.28, x1: 70.5, top: -6.5 },
  balcony: { x0: 70.5, x1: 72.6, y: -5.5 },
}

/* ------------------------------------------------------------------ the sea */

/** The water's surface, east of the bathhouse and in the gorge under the bridge. */
export const SEA_Y = 4.0
/** The railway: its rails just under the water, from the gorge under the bridge east over the sea. */
export const RAIL_Y = SEA_Y + 0.02
/** The bathhouse's halt, a little wooden platform in the water off its east end. */
export const HALT = { x0: 74.2, x1: 77.4, y: SEA_Y - 0.3 }
/** The lonely station on the way, where the girl waits on the platform. */
export const LONELY = { x0: 148, x1: 151, y: SEA_Y - 0.3 }
/** The Sixth Station: Swamp Bottom. Its platform, and the wood and the path to the cottage beyond it. */
export const SWAMP = { x0: 236, x1: 239.5, y: SEA_Y - 0.3, path: SEA_Y - 0.1, cottage: 252 }
