/**
 * Where everything is, in cells (a cell is a quarter of a metre; y runs down; the cell's garden is y = 0). One
 * cross-section through the hillside above Valldemossa, west to east, falling to the east:
 *
 *   the cell: a monk's cell of the charterhouse, its eave, its window, its door        x    0 .. 28
 *   the upper garden, its rill and lemon tree                                          x   28 .. 44
 *   the steps and the chime of tiles                                                   x   44 .. 50
 *   the lower garden and the well; the cistern under it                                x   50 .. 80
 *   three olive terraces, each a wall's height under the last                          x   80 .. 150
 *   the gully and its torrent                                                          x  150 .. 172
 *   the gate on the far bank, where the road comes up                                  x  172 .. 198
 *   the road down to the valley and its river                                          x  198 .. 360
 */

/* ------------------------------------------------------------------ the cell */

export const HOUSE = {
  x0: -1,
  x1: 28,
  /** The eave's underside: where the tiles end and drip. */
  eave: -12,
  ridge: -16.5,
  /** How far the tiles stand out over the wall. */
  over: 0.7,
  window: { x0: 5.6, x1: 8.6, y0: -9.2, y1: -4.0 },
  door: { x0: 19.4, x1: 22.8, y0: -8.4, y1: 0 },
}

/** The jar under the end tile, and the lever it hangs from. */
export const JAR = {
  /** Where the drip falls from: the mouth of the end tile. */
  lip: [0.95, -12.05] as const,
  /** The lever's pivot, on an iron bracket from the wall. */
  pivot: [2.05, -10.55] as const,
  /** The jar's hook, left of the pivot, and the latch's arm, right of it. */
  hook: 1.1,
  arm: 0.55,
  /** The jar: its mouth's half width and its depth, hanging under the hook. */
  w: 0.36,
  h: 0.78,
  hang: 0.35,
}

/** The gutter: a half-round of terracotta under the eave, falling gently east. */
export const GUTTER = {
  x0: 2.35,
  x1: 13.5,
  /** Its floor (where the ball's foot is) at x0 and x1. */
  y0: -10.95,
  y1: -10.72,
  r: 0.3,
}
export const gutterY = (x: number): number => GUTTER.y0 + ((GUTTER.y1 - GUTTER.y0) * (x - GUTTER.x0)) / (GUTTER.x1 - GUTTER.x0)

/** The rainwater head (a hopper) at the gutter's end, and the pipe down the wall from it. */
export const PIPE = {
  x: 14.2,
  head: { y0: -11.25, y1: -10.0, w0: 1.0, w1: 0.34 },
  bottom: -1.15,
  /** The shoe at its foot, turned east: where the ball comes out. */
  mouth: [15.05, -0.62] as const,
}

/* ------------------------------------------------------------------ the garden */

export const GARDEN = {
  /** The upper garden's ground, and the lower's. */
  upper: 0,
  lower: 4.5,
  steps: { x0: 44, x1: 49.5 },
  /** Where the lower garden ends at the terrace wall. */
  edge: 82,
}

/**
 * The chime: five roof tiles on a rack across the steps, each on a pin at its middle, each a little lower than the
 * last. The ball lands on a tile's west end, rocks in its hollow, runs to its east end and tips it, and is tossed on
 * to the next: a knock of tile on its stop at every tip.
 */
export const CHIME = {
  pivots: [
    [44.9, 0.42],
    [47.55, 0.55],
    [50.2, 0.68],
    [52.85, 0.81],
    [55.5, 0.94],
  ] as const,
  /** Half a tile's length. */
  half: 0.8,
  /** The hollow's depth at its middle. */
  sag: 0.16,
}

/** The well in the lower garden: its curb, its iron arch and pulley, the bucket and the stone that answers it. */
export const WELL = {
  x: 59.6,
  /** The curb's outer half width, its inner (the shaft's), and its top. */
  r: 1.75,
  inner: 1.0,
  curb: 1.9,
  /** The pulley's middle. */
  pulley: [59.6, -4.4] as const,
  wheel: 0.42,
  /** The bucket hangs on the pulley's west side, the counterweight on its east, outside the curb. */
  bucket: { x: 59.18, top: 0.95, w: 0.5, h: 0.95 },
  weight: { x: 61.9, y: -0.6 },
}

/** The cistern under the lower garden: its vault, its water, the weir to the outlet in the terrace wall. */
export const CISTERN = {
  x0: 54,
  x1: 79,
  crown: 6.6,
  spring: 8.2,
  floor: 17.4,
  water: 14.1,
  /** The weir's lip, where the overflow goes over, and the outlet in the wall's face. */
  lip: [74.5, 14.1] as const,
  outlet: [82.4, 15.9] as const,
}

/** The rill along the house and through the upper garden: the ball's foot in it, west to east. */
export const RILL = { x0: 15.4, x1: 43.95, y0: -0.1, y1: 0.05 }
export const rillY = (x: number): number => RILL.y0 + ((RILL.y1 - RILL.y0) * (x - RILL.x0)) / (RILL.x1 - RILL.x0)

export const LEMON = { x: 33.5, y: 0, r: 4.2, top: -10.6 }

/* ------------------------------------------------------------------ the hillside */

/** The terraces below the garden: each a field `y` deep, from `x0` to `x1`, its wall at `x0` (the step down to it). */
export const TERRACES = [
  { x0: 82, x1: 108, y: 17.2 },
  { x0: 108, x1: 124, y: 25.2 },
  { x0: 124, x1: 140, y: 33.2 },
] as const

/** The gully: its lip on this side, its torrent's bed, and its far lip, where the gate's spur is. */
export const GULLY = { x0: 140, bed: 54.5, x1: 166, mid: 153 }

/** The gate's spur: the road's level there, and the gate in its wall. */
export const SPUR = { x0: 166, x1: 194, y: 40 }

/**
 * The road up from the valley: along the valley floor, over the river's bridge, then up the far bank's ridge to the
 * gate. It keeps to the ridge, so whoever is on it stands against the sky.
 */
export const ROAD: readonly (readonly [number, number])[] = [
  [520, 99],
  [420, 98],
  [406, 97],
  [384, 97],
  [372, 95],
  [340, 89],
  [312, 81],
  [286, 72],
  [262, 63],
  [240, 55],
  [222, 48.5],
  [206, 43.5],
  [194, 40],
  [181, 40]
]

/** The valley: its floor, the river and the bridge over it (the road's deck between `x0` and `x1`). */
export const VALLEY = { floor: 99, river: 395, bridge: { x0: 384, x1: 406, y: 97 } }

/**
 * The ground's top along the section, west to east: the hill rising behind the charterhouse, the garden's two
 * levels, the terraces' steps, the gully, the spur, and the far bank's shoulder, falling slowly east.
 */
export const PROFILE: readonly (readonly [number, number])[] = [
  [-400, -190],
  [-260, -112],
  [-150, -46],
  [-90, -14],
  [-52, -1.5],
  [-46, 0],
  [44, 0],
  [45.4, 0.9],
  [46.6, 1.8],
  [47.8, 2.7],
  [49, 3.6],
  [49.5, 4.5],
  [82, 4.5],
  [82, 17.2],
  [108, 17.2],
  [108, 25.2],
  [124, 25.2],
  [124, 33.2],
  [140, 33.2],
  [142, 37],
  [144.5, 44],
  [147, 50],
  [150, 53.5],
  [153, 54.5],
  [156, 53.5],
  [159, 49],
  [162, 44],
  [164.5, 41],
  [166, 40],
  [194, 40],
  [206, 43.5],
  [222, 48.5],
  [240, 55],
  [262, 63],
  [286, 72],
  [312, 81],
  [340, 89],
  [372, 95],
  [420, 98],
  [520, 99],
  [800, 100]
]

/** The ground's top at `x`. */
export function groundY(x: number): number {
  const P = PROFILE
  if (x <= P[0][0]) return P[0][1]
  for (let i = 1; i < P.length; i++) {
    const [x1, y1] = P[i]
    if (x <= x1) {
      const [x0, y0] = P[i - 1]
      if (x1 === x0) return Math.min(y0, y1)
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0)
    }
  }
  return P[P.length - 1][1]
}

/* ------------------------------------------------------------------ the machine below the garden */

/** A channel along a terrace's front edge: where the ball's foot is, west to east. */
export interface Channel {
  x0: number
  x1: number
  y0: number
  y1: number
}
export const chanY = (ch: Channel, x: number): number => ch.y0 + ((ch.y1 - ch.y0) * (x - ch.x0)) / (ch.x1 - ch.x0)

/** The first terrace's channel, from the cistern's outlet to the spout over the next wall. */
export const T1CH: Channel = { x0: 83.2, x1: 105.4, y0: 17.02, y1: 17.32 }
/** The second's, from the basin under the first's spout to its own spout. */
export const T2CH: Channel = { x0: 109.2, x1: 121.4, y0: 25.02, y1: 25.22 }
/** The third's, from its basin to the chute down into the gully. */
export const T3CH: Channel = { x0: 125.2, x1: 137.4, y0: 33.02, y1: 33.22 }

/**
 * The water hammers: troughs on pins, open at their east ends. Each rests with its closed west end down on a stone;
 * the channel pours into it; when it holds enough, it goes over east and empties, and swings back onto its stone.
 */
export const HAMMERS = [
  { x: 106.9, y: 17.45 },
  { x: 122.9, y: 25.45 },
  { x: 138.9, y: 33.45 },
] as const

/** The wheel in the gully: pots on its rim, turned by the torrent, lifting what it scoops from the bottom. */
export const NORIA = { x: 153, y: 44.5, r: 7.5, pots: 12 }

/** The catapult on the frame over the wheel: its pin, its long arm's length (the spoon), its short arm's. */
export const SLING = { pivot: [159.7, 37.1] as const, long: 4.5, short: 1.6 }

/** The chute from the third terrace's end down the gully's wall into the wheel's lowest pot. */
export const CHUTE: readonly (readonly [number, number])[] = [
  [140.4, 33.6],
  [142.6, 38.4],
  [144.2, 43.4],
  [146.4, 48.4],
]

/**
 * The gate on the far bank: a wall across the spur with a round-arched door, a little pent roof of tiles along its
 * top, and over the door a bell gable with one bell. A lantern hangs west of the door on a rope over a pulley; a
 * niche below it keeps a candle.
 */
export const GATE = {
  x0: 168,
  x1: 193,
  top: 28.6,
  door: { x0: 178, x1: 183, y0: 30.2, y1: 40 },
  /** The roof's ridge line, the ball's foot as it runs along the tiles' crowns, west to east. */
  roof: { x0: 168.4, x1: 175.6, y0: 27.95, y1: 28.2 },
  gable: { x0: 176.8, x1: 184.2, top: 18.2, opening: { x0: 178.4, x1: 182.6, y0: 20.6, y1: 25.3 } },
  bell: [180.5, 21.4] as const,
  /** The lantern on its rope from a bracket under the roof's east end; the niche with the candle below it. */
  lamp: { x: 175.9, hook: 29.4, hang: 31.6, low: 34.3, candle: [175.9, 35.75] as const },
  /** The catch the ball drops into off the roof, and the iron chute down the wall from it to the bell rope's cup. */
  catch: { pivot: [176.55, 29.05] as const, cup: [176.05, 28.8] as const },
  chute: [[176.55, 29.4], [177.0, 31.8], [177.45, 35.2]] as const,
  /** The bell's lever, and the rope's cup hung from it. */
  lever: [177.6, 20.9] as const,
  cup: [177.6, 35.75] as const,
}
