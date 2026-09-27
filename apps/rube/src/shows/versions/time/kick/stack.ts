import type { Pt } from '../../../../parts'
import { BRASS, KICK, PEAK, RELEASE, SEAM, SWELL, bar, beat } from './music'

/**
 * The dream, stacked (the director's; fixed: build to it). One world, `dream`, in four levels one under the other,
 * each a band of the world's cells with its own sky and its own ground, and between two levels a band of the dark of
 * sleep (`SLEEP`). Deeper is lower: the rain city at the top, then the hotel, then the snow fortress, then limbo.
 *
 * - **Going under** is a fall through the floor. On a layer's downbeat the ball, lying still where the dreamers sleep,
 *   sinks through its floor as through water, falls through the ground under it and the dark of sleep, and comes out
 *   of the next level's sky (`DOWN`).
 * - **A kick** is a fall that throws him up. On the summit's four hardest downbeats, from the bottom up, each level's
 *   dreamer drops what the sleepers lie in (the tower's roof, the fortress, the lift, the van), and on the downbeat the
 *   ball is thrown straight up out of the level, through its sky and the dark of sleep, into the level over it, where
 *   the next kick is waiting (`UP`). All four kicks are on one column of the world, `COLUMN`: the tower, the fortress,
 *   the lift shaft and the bridge's broken end stand one over the other, so a wide sees the whole chain.
 * - **Time** runs slower the higher a level is over the ball: twenty times slower a level (the film's rule), so while
 *   he is in the snow the rain is frozen in the air over the river and the van hangs off the bridge (`clock`).
 *
 * Coordinates are the dream world's cells, x to the right, y down. A part's own frame has its entry at (-0.5, 0):
 * the score places each part so that its entry is where the last left the ball.
 */

export type Level = 'rain' | 'hotel' | 'snow' | 'limbo'
export const LEVELS: readonly Level[] = ['rain', 'hotel', 'snow', 'limbo']
/** How deep a level is: the rain is one dream down, limbo four. */
export const DEPTH: Record<Level, number> = { rain: 1, hotel: 2, snow: 3, limbo: 4 }

/**
 * Each level's band of cells, top to bottom: `top` is where its sky begins under the dark of sleep over it, `bottom`
 * where its ground ends over the dark of sleep under it. Draw a level's sky down from `top` and its ground (earth, rock,
 * the hotel's foundations, the seabed) down to `bottom`, and nothing of it outside its band. Horizontally a level runs
 * as far as the camera may look: draw its sky and ground across the whole frame (`frame(p, k)`), from x -60 to 70 at
 * least, and its set wherever its story goes.
 */
export const BAND: Record<Level, { top: number; bottom: number }> = {
  rain: { top: -22, bottom: 13 },
  hotel: { top: 17, bottom: 37 },
  snow: { top: 41, bottom: 65 },
  limbo: { top: 69, bottom: 99 },
}
/** The dark of sleep between two levels: its top, its bottom and its middle, where a crossing is counted. */
export const SLEEP_BANDS: { above: Level; below: Level; top: number; bottom: number; mid: number }[] = [
  { above: 'rain', below: 'hotel', top: 13, bottom: 17, mid: 15 },
  { above: 'hotel', below: 'snow', top: 37, bottom: 41, mid: 39 },
  { above: 'snow', below: 'limbo', top: 65, bottom: 69, mid: 67 },
]

/** The kicks' column: the x of the tower, the fortress's vault, the lift shaft and the bridge's broken end. */
export const COLUMN = 0

/* ------------------------------------------------------------------ the fixed places on the column */

/**
 * The rain (level 1). The street runs at y 0 (the kerb's top; a ball on it has its centre at y -0.13, i.e. its lane at
 * 0 in a part whose floor is at FLOOR). A **bridge** carries it over a **river**: its deck at y 0 from x -26 to its
 * **broken end at x 0**, where the railing gives; the river's surface at y 8, its bed at y 12; the embankments under the
 * bridge's two ends. The van goes off the end, tumbling, and falls into the river in front of the bridge (`van`).
 */
export const RAIN_GEO = {
  street: 0,
  deckFrom: -26,
  deckEnd: 0,
  river: 8,
  bed: 12,
  /** The river's reach, under the bridge and past its end. */
  riverFrom: -30,
  riverTo: 22,
}

/**
 * The hotel (level 2). A **lift shaft** on the column, x -0.9 to 0.9, from the top floor's landing (floor at y 21) down
 * to its pit (floor at y 36), open on every floor; the **lift** a cabin 1.6 wide and 1.9 tall. The floors: the top
 * floor (y 21, the corridor that turns, from x -18 to 18), a floor under it (y 28.5, the rooms), and the lobby (y 36).
 */
export const HOTEL_GEO = {
  shaftX: [-0.9, 0.9] as Pt,
  top: 21,
  middle: 28.5,
  lobby: 36,
  pit: 36,
  cabin: [1.6, 1.9] as Pt,
}

/**
 * The snow (level 3). A mountain whose summit is at about y 45; on its lower slope, on the column, the **fortress**:
 * a block of concrete from x -7 to 7 and from y 47 to its footing at y 58, and in it the **vault** (its floor at y 56,
 * from x -2.5 to 2.5). The valley under it at y 61.
 */
export const SNOW_GEO = {
  summit: 45,
  fortress: [-7, 7] as Pt,
  fortressTop: 47,
  footing: 58,
  vaultFloor: 56,
  vault: [-2.5, 2.5] as Pt,
  valley: 61,
}

/**
 * Limbo (level 4). An endless grey sea to the left (its surface at y 88, its bed at y 97) and a shore (the sand from x
 * -4, rising gently to y 86.5 at x 4); on the shore on the column the **tower** they built, x -1.5 to 1.5, its roof at
 * y 74; the city of their towers behind it, to the right, crumbling into the water; and their house among the towers.
 */
export const LIMBO_GEO = {
  sea: 88,
  seabed: 97,
  shore: -4,
  towerX: [-1.5, 1.5] as Pt,
  roof: 74,
  ground: 86.5,
}

/* ------------------------------------------------------------------ the crossings */

/**
 * The ball as it crosses the dark of sleep, going down: where (its centre, world cells), when (a layer's downbeat) and
 * how fast (cells a second, y down). The level above ends its part here; the level below begins its part here. A
 * crossing is at the middle of the dark band. Ariadne falls beside him at `ariadne` (from him), Fischer at `fischer`
 * where he is with them (null where not).
 */
export interface Crossing {
  t: number
  at: Pt
  v: Pt
  ariadne: Pt | null
  fischer: Pt | null
  what: string
}

export const DOWN: Record<'hotel' | 'snow' | 'limbo', Crossing> = {
  hotel: {
    t: SEAM.hotel,
    at: [-10, 15],
    v: [0, 5],
    ariadne: [-0.55, -0.5],
    fischer: [0.55, -0.35],
    what: 'out of the rain into the hotel on the brass: the three of them sank through the van\'s floor on the bridge, the river and its bed, and fall through the dark into the hotel\'s roof',
  },
  snow: {
    t: SEAM.snow,
    at: [10, 39],
    v: [0, 5],
    ariadne: [-0.55, -0.5],
    fischer: [0.55, -0.35],
    what: 'out of the hotel into the snow on the swell: the three of them sank through the floor in weightlessness, drawn down, and fall out of the snow\'s sky onto the mountain',
  },
  limbo: {
    t: SEAM.limbo,
    at: [-8, 67],
    v: [0, 5],
    ariadne: [-0.55, -0.5],
    fischer: null,
    what: 'out of the snow into limbo on the peak: Fischer went down before them (Mal\'s shot); Cobb and Ariadne sank through the snow after him and fall out of limbo\'s sky into the sea',
  },
}

/**
 * The ball as it crosses the dark of sleep going up, thrown by a kick: where, when (just after the kick's downbeat) and
 * how fast. The level below owns the kick and the throw up to here; the level above catches him. Ariadne rises beside
 * him; Fischer from the snow's kick on.
 */
export const UP: Record<'snow' | 'hotel' | 'rain', Crossing> = {
  snow: {
    t: SEAM.vault,
    at: [COLUMN, 67],
    v: [0, -16.35],
    ariadne: [-0.5, 0.35],
    fischer: null,
    what: 'out of limbo into the snow: they jumped off the tower\'s roof, fell, and on the summit\'s downbeat are thrown straight up; under gravity they come to rest on the vault\'s floor (y 56), where Fischer went before them',
  },
  hotel: {
    t: SEAM.lift,
    at: [COLUMN, 39],
    v: [0, -20],
    ariadne: [-0.5, 0.35],
    fischer: [0.5, 0.35],
    what: 'out of the snow into the hotel: the fortress came down under them and threw them up; the hotel is weightless, so they fly on up the lift shaft at this speed until the lift catches them',
  },
  rain: {
    t: SEAM.river,
    at: [COLUMN, 15],
    v: [0, -19],
    ariadne: [-0.5, 0.35],
    fischer: [0.5, 0.35],
    what: 'out of the hotel into the rain: the lift slammed into its pit and threw them up the shaft (weightless, at this speed all the way); out of the dark they rise under gravity through the riverbed and the river and come to rest in the van as it hangs off the bridge',
  },
}

/**
 * Each dream part's frame origin in the dream world (the score lays them there): its entry, (-0.5, 0) in its own
 * frame, is where the ball crosses the dark of sleep into its level. The rain's own first part is laid at `RAIN_AT`
 * (the rain builder's).
 */
const originOf = (c: Crossing): Pt => [c.at[0] + 0.5, c.at[1]]
export const ORIGIN = {
  hotel: originOf(DOWN.hotel),
  snow: originOf(DOWN.snow),
  limbo: originOf(DOWN.limbo),
  vault: originOf(UP.snow),
  lift: originOf(UP.hotel),
  river: originOf(UP.rain),
} as const

/** A part's `exit` (in its own frame, origin `from`) that hands the ball to the part whose origin is `to`. */
export const exitFor = (from: Pt, to: Pt): Pt => [to[0] - from[0], to[1] - from[1]]

/** A point of the dream world in a part's own frame, for a part whose origin is `origin`. */
export const local = (origin: Pt, at: Pt): Pt => [at[0] - origin[0], at[1] - origin[1]]

/**
 * Fischer's own crossings (company: the snow builder and the limbo builder hand him over at these). Mal shoots him in
 * the vault on the swell's G (bar 38); he sinks through the vault's floor and falls down the column onto the roof of
 * limbo's tower, where she keeps him. In limbo Ariadne pushes him off the roof on bar 47, and the fall kicks him up
 * the column into the vault ahead of the others, where Eames's paddles wait.
 */
export const FISCHER_DOWN: Crossing = {
  t: bar(38) + 1.9,
  at: [-1.2, 67],
  v: [0, 5],
  ariadne: null,
  fischer: null,
  what: 'Fischer alone, shot, sinking through the vault\'s floor; out of the dark he falls onto the tower\'s roof in limbo',
}
export const FISCHER_UP: Crossing = {
  t: bar(47) + 0.6,
  at: [0.7, 67],
  v: [0, -16],
  ariadne: null,
  fischer: null,
  what: 'Fischer alone, pushed off the tower\'s roof and thrown up; he comes to rest on the vault\'s floor (y 56), on his back',
}

/* ------------------------------------------------------------------ where the ball is, and the clocks */

/** Which level the ball is in at `t` (0: not in the dream, in Paris, the plane or at home). */
export function depthAt(t: number): number {
  if (t < SEAM.paris) return DEPTH.limbo
  if (t < SEAM.rain) return 0
  if (t < DOWN.hotel.t) return DEPTH.rain
  if (t < DOWN.snow.t) return DEPTH.hotel
  if (t < DOWN.limbo.t) return DEPTH.snow
  if (t < UP.snow.t) return DEPTH.limbo
  if (t < UP.hotel.t) return DEPTH.snow
  if (t < UP.rain.t) return DEPTH.hotel
  if (t < SEAM.wake) return DEPTH.rain
  return 0
}

/** Twenty times slower a level. */
const SLOW = 20
/** How long the change of pace takes as he crosses (seconds of show, eased). */
const EASE = 1.4
const STEP = 0.02
const SPAN = 320
const CHANGES = [SEAM.paris, SEAM.rain, DOWN.hotel.t, DOWN.snow.t, DOWN.limbo.t, UP.snow.t, UP.hotel.t, UP.rain.t, SEAM.wake]

/** How fast level `level`'s own time runs at show time `t` (1 where he is, or under him). */
export function rate(level: Level, t: number): number {
  const d = DEPTH[level]
  // The depth, eased across each crossing: log-rate moves smoothly from one level's pace to the next.
  const depth = (s: number) => {
    const n = depthAt(s)
    return n === 0 ? d : n
  }
  let above = Math.max(0, depth(t) - d)
  for (const c of CHANGES) {
    if (t < c - EASE / 2 || t > c + EASE / 2) continue
    const u = (t - (c - EASE / 2)) / EASE
    const e = u * u * (3 - 2 * u)
    const a = Math.max(0, depth(c - 1e-6) - d)
    const b = Math.max(0, depth(c + 1e-6) - d)
    above = a + (b - a) * e
  }
  return Math.pow(SLOW, -above)
}

const tables = new Map<Level, Float64Array>()
function table(level: Level): Float64Array {
  let tb = tables.get(level)
  if (tb) return tb
  const n = Math.ceil(SPAN / STEP) + 1
  tb = new Float64Array(n)
  let acc = 0
  for (let i = 1; i < n; i++) {
    const t = (i - 0.5) * STEP
    acc += rate(level, t) * STEP
    tb[i] = acc
  }
  tables.set(level, tb)
  return tb
}

/**
 * Level `level`'s own clock at show time `t`: seconds of that level's time. Every set animates on its own level's
 * clock (the rain falling, the traffic, the hotel's lamps, the snowfall, the sea), never on show time, so that a level
 * over the ball is slowed twenty times a level and a wide sees the rain hang in the air. The ball's own lane is on
 * show time (the music's), and so is anything he touches.
 */
export function clock(level: Level, t: number): number {
  const tb = table(level)
  const x = Math.max(0, Math.min(SPAN, t)) / STEP
  const i = Math.floor(x)
  if (i >= tb.length - 1) return tb[tb.length - 1]
  return tb[i] + (tb[i + 1] - tb[i]) * (x - i)
}

/* ------------------------------------------------------------------ the van */

/**
 * The van, from the moment they go under in it (the rain builder's before that: it must be here then): where its
 * centre is, its tilt (radians, clockwise on the screen) and whether it is in the air. The van is 2.6 long and 1.15
 * tall; its floor is 0.42 under its centre when it sits level.
 *
 * - At `DOWN.hotel.t` it is on the bridge's deck at x -10, moving right (they sink through its floor here).
 * - The rain's time slows twenty times: it creeps on toward the deck's end. At `ROLL.from` it swerves and begins to
 *   tumble, end over end, through the railing; it turns once right round, slowly, by `OFF`.
 * - At `OFF` it leaves the deck (the hotel goes weightless: `weightless`), and falls, still turning a little, in slow
 *   motion (the rain's clock) toward the river in front of the bridge.
 * - At `SPLASH`, the rain's kick, it hits the water.
 */
export const VAN = {
  under: [-10, -0.62] as Pt,
  rollFrom: beat(100),
  off: bar(28),
  splash: KICK.rain,
  /** Where it hits the water (its centre), and its tilt then. */
  water: [2.2, 7.4] as Pt,
  size: [2.6, 1.15] as Pt,
}
export const OFF = VAN.off
export const SPLASH = VAN.splash
export const ROLL = { from: VAN.rollFrom, to: VAN.off }

const smoothstep = (u: number) => {
  const v = Math.max(0, Math.min(1, u))
  return v * v * (3 - 2 * v)
}

/**
 * The van's pose at show time `t` (from `DOWN.hotel.t` on; before it the rain builder drives it and must meet this
 * pose there). After the splash it sinks slowly, nose down, to the bed.
 */
export function vanAt(t: number): { x: number; y: number; angle: number; air: boolean } {
  const [x0, y0] = VAN.under
  if (t <= OFF) {
    // Creeping on at the rain's pace to the deck's end: rain time is slow now, so the few cells take till OFF.
    const u = smoothstep((t - DOWN.hotel.t) / (OFF - DOWN.hotel.t))
    const x = x0 + (-0.9 - x0) * (1 - (1 - u) * (1 - u))
    // The tumble: once round, end over end, starting slow, from ROLL.from to OFF (turning clockwise: its nose goes
    // down over the edge first).
    const r = smoothstep((t - ROLL.from) / (OFF - ROLL.from))
    const lift = Math.sin(Math.PI * r) * 0.55
    return { x, y: y0 - lift, angle: r * Math.PI * 2, air: false }
  }
  if (t <= SPLASH) {
    // The fall, on the rain's own clock: its progress is the rain's time since OFF over the rain's time to the splash,
    // squared (it gathers speed as anything falling does), so while he is deeper it hangs in the air off the bridge.
    const c0 = clock('rain', OFF)
    const c1 = clock('rain', SPLASH)
    const p = Math.max(0, Math.min(1, (clock('rain', t) - c0) / (c1 - c0)))
    const q = p * p
    const [wx, wy] = VAN.water
    // A throw off the edge: steady across, gathering speed down.
    const x = -0.9 + (wx + 0.9) * p
    const y = y0 + (wy - y0) * q
    // Still turning a little as it falls: a quarter turn more, nose to the water at the end.
    return { x, y, angle: Math.PI * 2 + p * 0.55, air: true }
  }
  // Sinking after the splash: down through the river to the bed over ten seconds, settling.
  const s = smoothstep((t - SPLASH) / 10)
  const [wx, wy] = VAN.water
  return { x: wx + 0.4 * s, y: wy + (RAIN_GEO.bed - 0.6 - wy) * s, angle: Math.PI * 2 + 0.55 + 0.25 * s, air: false }
}

/**
 * How weightless the hotel is at `t`, 0 to 1: nothing before the van leaves the deck, all of it (over 0.4 s) while it
 * falls, and gravity back at once when it hits the river.
 */
export function weightless(t: number): number {
  if (t < OFF || t >= SPLASH) return 0
  return smoothstep((t - OFF) / 0.4)
}

/**
 * How far the hotel's top-floor corridor has turned at `t`, radians, clockwise: with the van as it tumbles (the film's
 * turning corridor), once right round from `ROLL.from` to `OFF`, and then only as the van turns in its fall.
 */
export function corridorAngle(t: number): number {
  if (t < ROLL.from) return 0
  return vanAt(Math.max(t, DOWN.hotel.t)).angle
}

/* ------------------------------------------------------------------ for the check and the builders */

/** The moments of the job, in order, for anyone who needs them. */
export const JOB = {
  under: SEAM.rain,
  hotel: DOWN.hotel.t,
  roll: ROLL.from,
  off: OFF,
  snow: DOWN.snow.t,
  limbo: DOWN.limbo.t,
  kickLimbo: KICK.limbo,
  kickSnow: KICK.snow,
  kickHotel: KICK.hotel,
  splash: SPLASH,
  wake: RELEASE,
} as const

/** Layer downbeats the levels are entered on (the check holds the crossings to them). */
export const LAYERS = { hotel: BRASS, snow: SWELL, limbo: PEAK } as const
