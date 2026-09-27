import { R, type Pt } from '../../../../../parts'
import { bar, beat, half, level, onset } from '../music'
import { dreamSpin } from '../cast'
import { G, G_LOW } from '../physics'
import { BAND, DOWN, FISCHER_DOWN, FISCHER_UP, LIMBO_GEO, UP } from '../stack'

/**
 * Limbo, measured (the LIMBO builder's): the shore, the sea, the tower they built and its lift, their room, the garden,
 * and every moment of both of its parts, in the dream world's own cells and in show seconds. Everything that moves is
 * a function of show time here, so the set that draws it, the lanes that ride it and the company who stand on it all
 * read the same numbers. (Limbo is the dream's bottom: its own clock is show time, so the sea breathes on either.)
 *
 * The one machine is the tower's **lift**: a cabin in the lift tower on the tower's sea side, and a counterweight in a
 * slot at the room's left, on one rope over the great wheel at the top (the weight hangs on a running block, so it goes
 * half as far as the cabin). When he rides up from the shore the weight comes down through the room, and they meet at
 * the room's floor, where a bolt joins them. On the return **Mal** stands on the weight, and the bolt is all that holds
 * them level: he draws it, and she goes down into the dark as the same rope carries him up to the roof.
 */

export const clamp01 = (v: number): number => Math.max(0, Math.min(1, v))
/** Smoothstep of u in [0, 1]. */
export const sm = (u: number): number => {
  const v = clamp01(u)
  return v * v * (3 - 2 * v)
}
/** Smootherstep: no jerk at either end. */
export const smoother = (u: number): number => {
  const v = clamp01(u)
  return v * v * v * (v * (6 * v - 15) + 10)
}
export const lerp = (a: number, b: number, u: number): number => a + (b - a) * u
export const lerpPt = (a: Pt, b: Pt, u: number): Pt => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)]
/** 0 before a, rising to 1 at b (smooth), and back to 0 from c to d. */
export const window4 = (t: number, a: number, b: number, c: number, d: number): number => Math.min(sm((t - a) / (b - a)), 1 - sm((t - c) / (d - c)))

/* ------------------------------------------------------------------ the place */

export const ROOF = LIMBO_GEO.roof
export const GROUND = LIMBO_GEO.ground
export const SEA = LIMBO_GEO.sea
export const SEABED = LIMBO_GEO.seabed
export const TOP_OF_SKY = BAND.limbo.top
export const BOTTOM = BAND.limbo.bottom
/** Where the far sea meets the sky. */
export const HORIZON = 84.9

/** The tower on the column, and the lift tower on its sea side. */
export const TOWER = { x0: LIMBO_GEO.towerX[0], x1: LIMBO_GEO.towerX[1], wall: 0.2, roofSlab: 0.3 }
export const ANNEX = { x0: -2.6, x1: TOWER.x0, top: 72.6, wall: 0.1 }
/** The counterweight's deck at its highest: under the roof's grating. */
export const CW_TOP = ROOF + TOWER.roofSlab
/** Their room's floor: where the cabin coming up meets the weight coming down (the weight goes half as far). */
export const ROOM = (2 * CW_TOP + GROUND) / 3
export const FLOOR_SLAB = 0.22
/** The tower's floors, the ground up. */
export const FLOORS = [GROUND, lerp(GROUND, ROOM, 1 / 3), lerp(GROUND, ROOM, 2 / 3), ROOM]
export const CABIN = { x: -2.05, w: 0.86, h: 1.12 }
export const SLOT = { x0: TOWER.x0 + TOWER.wall, x1: -0.92 }
export const CW = { x: (SLOT.x0 + SLOT.x1) / 2, w: 0.32, h: 1.0 }
export const WHEEL = { x: -1.64, y: 72.05, r: 0.4 }
/** The ladder up to the roof's hatch, at the room's left, beside the weight's slot. */
export const LADDER = { x: -0.7, w: 0.22 }
export const HATCH = { x0: -0.88, x1: -0.52 }
export const TABLE = { x: 0.36, w: 0.74, h: 0.32 }
/** The top's tip on the table. */
export const TOP_AT: Pt = [TABLE.x - 0.18, ROOM - TABLE.h]
/** The long window in the room's back wall (the lit window, from outside). */
export const WINDOW = { x0: -0.42, x1: 1.18, y0: 75.05, y1: 77.72 }
/** The garden at the tower's foot, their old house at its end, the tree and the swing. */
/**
 * The garden is laid out as home's garden is (the HOME builder's `GARDEN`), measured from the swing, so the two rhyme:
 * a low back wall, the lawn running back to its foot, the tree just right of the swing with a bough reaching left to
 * hang it, the two children just left of it, and a low sun behind them over the wall.
 */
export const GARDEN = { x0: TOWER.x1, x1: 8.2, wallTop: GROUND - 1.31, back: GROUND - 0.47 }
export const HOUSE = { x0: 8.2, x1: 11.7, eaves: GROUND - 2.55, ridge: GROUND - 3.9 }
export const SWING = { x: 5.1, hang: GROUND - 2.25, rope: 1.86 }
export const TREE = { x: SWING.x + 0.68 }
export const KIDS_AT: Pt[] = [
  [SWING.x - 1.08, GROUND],
  [SWING.x - 0.56, GROUND],
]
/** The low sun, behind the children over the garden wall (his memory of the garden has its own light). */
export const SUN_AT: Pt = [SWING.x - 0.17, GROUND - 1.55]
/**
 * How strongly his memory lights the garden: the low sun behind the children comes up while we are looking at them
 * (the two cutaways), and sinks back to a glow over the wall when we are not.
 */
export function memory(t: number): number {
  const on = (a: number, b: number) => (t < a - 0.2 || t > b + 0.2 ? 0 : Math.min(sm((t - (a - 0.2)) / 0.2), 1 - sm((t - b) / 0.2)))
  return Math.max(on(bar(6), bar(7)), on(half(180), beat(183)))
}
/** Where the camera looks at the children in the two cutaways. */
export const GARDEN_VIEW: Pt = [SWING.x - 0.35, GROUND - 0.95]

/**
 * The shore's profile: the height of the sand (or the seabed under the sea) at x. The sea's edge at rest is where it
 * crosses the sea's surface; it rises gently to the tower's ground and runs on flat under the garden and the house.
 */
const SAND: Pt[] = [
  [-80, SEABED],
  [-34, SEABED],
  [-22, 95.6],
  [-14.5, 92.4],
  [-10, 89.7],
  [-6.65, SEA],
  [-4.6, 87.2],
  [-3.2, 86.72],
  [-2.3, GROUND],
  [90, GROUND],
]
const sandSlopes: number[] = (() => {
  const n = SAND.length
  const d = (i: number) => (SAND[i + 1][1] - SAND[i][1]) / (SAND[i + 1][0] - SAND[i][0])
  const m = new Array(n).fill(0)
  for (let i = 1; i < n - 1; i++) {
    const a = d(i - 1)
    const b = d(i)
    if (a * b <= 0) continue
    const h0 = SAND[i][0] - SAND[i - 1][0]
    const h1 = SAND[i + 1][0] - SAND[i][0]
    const w1 = 2 * h1 + h0
    const w2 = h1 + 2 * h0
    m[i] = (w1 + w2) / (w1 / a + w2 / b)
  }
  return m
})()
export function sandY(x: number): number {
  if (x <= SAND[0][0]) return SAND[0][1]
  if (x >= SAND[SAND.length - 1][0]) return SAND[SAND.length - 1][1]
  let i = 0
  while (i < SAND.length - 2 && x > SAND[i + 1][0]) i++
  const [x0, y0] = SAND[i]
  const [x1, y1] = SAND[i + 1]
  const h = x1 - x0
  const u = (x - x0) / h
  const u2 = u * u
  const u3 = u2 * u
  return (2 * u3 - 3 * u2 + 1) * y0 + (u3 - 2 * u2 + u) * h * sandSlopes[i] + (-2 * u3 + 3 * u2) * y1 + (u3 - u2) * h * sandSlopes[i + 1]
}
/** The sea's edge at rest. */
export const WATERLINE = -6.65
/** Where a wave breaks, just out from the edge. */
export const BREAK_X = -7.05
/** A ball lying on the sand at x: its centre. */
export const onSand = (x: number): Pt => [x, sandY(x) - R]

/* ------------------------------------------------------------------ the music's moments */

/** The prologue (0 → the cut into Paris). */
export const P = {
  /** The first chord: its own attack is a little ahead of the comb (0.372); the wave breaks between the two. */
  wave0: (onset(bar(0), 1) + bar(0)) / 2,
  wave1: bar(1),
  /** He rolls up the beach and into the lift; the gate shuts behind him (the off-beat before bar 2). */
  gateShut: half(7),
  /** The brake knocks free: the weight comes down, and he goes up. */
  liftGo: bar(2),
  /** Half way up: a slab in the city shifts on its crack, the first sign. */
  crack: bar(3),
  /** At the room: the bolt shoots across and holds the cabin to the weight. */
  arrive: bar(4),
  gateOpen: beat(17),
  /** He sets the top spinning. */
  spin: bar(5),
  /** The sea's breath lifts the curtain at the long window, a chord at a time. */
  breath6: bar(6),
  breath7: bar(7),
  /** Mal comes down the ladder in the dark behind him, for the last bar. */
  malFrom: bar(7) + 0.25,
  cut: bar(8),
} as const

/** The return (the peak: out of the dark into limbo's sky → the kick off the roof on the summit). */
export const Q = {
  begin: DOWN.limbo.t,
  /** Into the sea. */
  splash: beat(163),
  /** Under: the undertow takes them. */
  under: bar(41),
  /** The swell lifts them to the surface. */
  lift: half(165),
  /** The circle: the wave washes him up where the show began. */
  circle: bar(42),
  gateShut: half(171),
  liftGo: bar(43),
  arrive: bar(44),
  gateOpen: beat(177),
  hatch: beat(179),
  /** Mal steps onto the weight, and holds. */
  hold: bar(45),
  /** A cut to the children in the garden, their backs to us (back to the room on the lever). */
  children: half(180),
  /** He takes the lever. */
  lever: beat(183),
  /** He lets go. */
  letGo: bar(46),
  roof: half(186),
  push: beat(187),
  fischerKick: bar(47),
  ariadneLeap: half(190),
  stepOff: beat(191),
  kick: bar(48),
  /** They tear up out of limbo's sky into the dark, on the off-beat after the kick. */
  tear: half(192),
  end: UP.snow.t,
} as const

/* ------------------------------------------------------------------ the waves */

/** Every breaker's time: one on every chord, all through the show (limbo's clock is show time), and a few more at the peak. */
export const WAVES: number[] = (() => {
  const out: number[] = []
  for (let n = -1; n <= 72; n++) out.push(n === 0 ? P.wave0 : bar(n))
  out.push(half(165))
  return out.sort((a, b) => a - b)
})()
/** How big the sea is at t: calm at dusk in the pad, heavy at the peak. */
export const roughness = (t: number): number => 0.35 + 0.65 * level(t)
/** How far up the sand a breaker's wash runs, from the break. */
export function reach(tk: number): number {
  if (Math.abs(tk - P.wave0) < 1e-6) return 1.95
  if (Math.abs(tk - P.wave1) < 1e-6) return 2.6
  if (Math.abs(tk - Q.circle) < 1e-6) return 1.7
  return 1.25 + 1.2 * roughness(tk)
}
export const UPRUSH = 1.7
export const BACKWASH = 2.1
/** A breaker's crest height as it comes in. */
export const crestH = (tk: number): number => 0.3 + 0.38 * roughness(tk)
/** How fast a crest comes in to the shore (cells a second). */
export const CREST_V = 1.9

/** Where the wash's leading edge is for breaker `tk` at t, or null when it has none. */
export function washFront(tk: number, t: number): number | null {
  const u = t - tk
  if (u < 0 || u > UPRUSH + BACKWASH) return null
  const r = reach(tk)
  if (u <= UPRUSH) {
    const s = u / UPRUSH
    return BREAK_X + r * (1 - (1 - s) * (1 - s))
  }
  return BREAK_X + r * (1 - sm((u - UPRUSH) / BACKWASH))
}

/* ------------------------------------------------------------------ the lift */

const ride = (t: number, t0: number, t1: number, y0: number, y1: number): number => lerp(y0, y1, smoother((t - t0) / (t1 - t0)))
/** The lift's reset between the parts (while the dream is not on the stage: Paris and the plane). */
const RESET: [number, number] = [40, 52]
/** The cabin's floor at t. */
export function cabinY(t: number): number {
  if (t < P.liftGo) return GROUND
  if (t < RESET[0]) return ride(t, P.liftGo, P.arrive, GROUND, ROOM)
  if (t < Q.liftGo) return ride(t, RESET[0], RESET[1], ROOM, GROUND)
  if (t < Q.letGo) return ride(t, Q.liftGo, Q.arrive, GROUND, ROOM)
  return ride(t, Q.letGo, Q.roof, ROOM, ROOF)
}
/** The weight's deck at t: half as far as the cabin, the other way (and a little lower under Mal as she takes hold). */
export function weightY(t: number): number {
  const y = CW_TOP + (GROUND - cabinY(t)) / 2
  // Under her the weight settles on its rope, and the bolt takes the strain (a shudder, damped).
  const u = t - Q.hold
  const dip = u < 0 ? 0 : (0.07 * (1 - Math.exp(-u / 0.12) * Math.cos(u * 22)) - 0.0) * (1 - sm((t - Q.letGo) / 0.4))
  return y + dip
}
/** How far the great wheel has turned (radians): the rope over it goes as the cabin does. */
export const wheelAngle = (t: number): number => (GROUND - cabinY(t)) / WHEEL.r
/** The bolt that holds the cabin to the weight at the room: 0 drawn back, 1 shot across. */
export function bolt(t: number): number {
  if (t < P.arrive) return 0
  if (t < RESET[0]) return sm((t - P.arrive) / 0.12)
  if (t < Q.arrive) return 1 - sm((t - RESET[0]) / 0.2)
  return sm((t - Q.arrive) / 0.12) * (1 - sm((t - Q.letGo) / 0.14))
}
/** The lever in the cabin that draws the bolt: 0 home, 1 pulled. */
export const lever = (t: number): number => (t < Q.lever - 0.3 ? 0 : 0.35 * sm((t - Q.lever + 0.3) / 0.35) + 0.65 * sm((t - Q.letGo + 0.12) / 0.18)) * (1 - sm((t - Q.roof) / 0.6))
/** The cabin's gates, 0 shut, 1 open: the sea side (the shore) and the room side (the room, the roof). */
export function gateSea(t: number): number {
  if (t < 40) return 1 - sm((t - P.gateShut + 0.35) / 0.35)
  if (t < 100) return sm((t - RESET[1]) / 1)
  return 1 - sm((t - Q.gateShut + 0.35) / 0.35)
}
export function gateRoom(t: number): number {
  if (t < 40) return sm((t - P.gateOpen) / 0.4)
  if (t < 100) return 1 - sm((t - RESET[0]) / 0.5)
  return sm((t - Q.gateOpen) / 0.4) * (1 - sm((t - Q.letGo - 0.05) / 0.3)) + sm((t - Q.roof) / 0.4)
}
/** The brake on the wheel: engaged (1) until the lift goes. */
export const brake = (t: number): number => (t < 100 ? 1 - sm((t - P.liftGo) / 0.1) + sm((t - RESET[1]) / 0.5) : 1 - sm((t - Q.liftGo) / 0.1))
/** The hatch in the roof: 0 shut, 1 open. */
export function hatch(t: number): number {
  if (t < 100) return window4(t, P.malFrom - 0.6, P.malFrom - 0.2, 40, 41)
  return Math.max(window4(t, 149.6, 150.0, 153.4, 154.0), window4(t, Q.hatch - 0.3, Q.hatch, Q.lever - 0.4, Q.lever))
}
/** How far the tower's front is cut away (the doll's house), 0 closed, 1 open. */
export function cutaway(t: number): number {
  if (t < 100) return window4(t, 6.3, 7.3, 38, 40)
  return window4(t, 161.5, 162.6, 178.6, 180.2)
}

/* ------------------------------------------------------------------ the top */

/** Set spinning at the prologue's bar 5; it never stops (a dream's top). Its lean as it rights itself. */
export function topPose(t: number): { lying: number; phase: number } {
  const u = t - P.spin
  if (u < 0) return { lying: 1, phase: 0 }
  // It stands up on its tip in a third of a second and settles, with a little damped sway.
  const up = 1 - smoother(u / 0.32)
  const sway = u > 0.32 ? 0.05 * Math.exp(-(u - 0.32) / 0.35) * Math.sin((u - 0.32) * 18) : 0
  return { lying: up + sway, phase: dreamSpin(u) }
}
/**
 * The lamp over their table: dark when he comes up out of the sea; it comes on as the lift carries him up to it (bar 3),
 * a warm flare that settles; lit from then on, and all through the return.
 */
export function lamp(t: number): number {
  if (t > 100) return 1
  const u = t - P.crack
  if (u < 0) return 0.06
  return Math.min(1, 0.06 + 0.94 * sm(u / 0.35)) + 0.35 * Math.exp(-u / 0.5) * sm(u / 0.08)
}

/** The curtain at the long window: how far the sea's breath has lifted it. */
export function curtain(t: number): number {
  let v = 0
  for (const b of [P.arrive, P.spin, P.breath6, P.breath7, Q.arrive, Q.hold, Q.letGo]) {
    const u = t - b
    if (u < 0 || u > 5) continue
    v = Math.max(v, (1 - Math.exp(-u / 0.1)) * Math.exp(-u / 1.1))
  }
  return v + 0.05 * Math.sin(t * 0.9)
}

/* ------------------------------------------------------------------ the city */

/**
 * The city they built, on the far water behind the shore: towers of concrete and glass, some broken already. `x` is
 * the tower's middle, `w` its width, `top` its roof, `base` where it stands in the far water (further away is higher,
 * nearer the horizon, and paler).
 */
export interface Tower {
  x: number
  w: number
  top: number
  base: number
  /** 0 near, 1 far. */
  far: number
  /** Its roof already broken away on one side (cells lower at its right than its left). */
  broken?: number
  /** It leans, radians (clockwise). */
  lean?: number
  /** Nearer than the city, in the middle distance: less hazed, and moving more with the camera. */
  mid?: boolean
}
export const CITY: Tower[] = [
  { x: 10.6, w: 1.6, top: 78.0, base: 85.55, far: 0.95 },
  { x: 0.5, w: 1.8, top: 75.6, base: 85.6, far: 0.88 },
  { x: 2.9, w: 1.9, top: 77.0, base: 85.7, far: 0.8 },
  { x: 5.4, w: 2.8, top: 73.8, base: 86.0, far: 0.5, broken: 0.9 },
  { x: 8.3, w: 3.0, top: 74.6, base: 86.05, far: 0.45 },
  { x: 12.8, w: 2.4, top: 75.6, base: 85.8, far: 0.7, lean: 0.035 },
  { x: 15.6, w: 3.6, top: 71.2, base: 86.15, far: 0.35, broken: 1.8 },
  { x: 20.2, w: 2.6, top: 73.6, base: 85.9, far: 0.6 },
  { x: 23.8, w: 4.2, top: 70.6, base: 86.25, far: 0.25 },
  { x: 28.9, w: 2.8, top: 74.0, base: 85.95, far: 0.55, broken: 1.2 },
  { x: 32.6, w: 3.4, top: 72.2, base: 86.1, far: 0.4 },
  { x: 37.4, w: 2.2, top: 76.0, base: 85.75, far: 0.78 },
  { x: 41.0, w: 4.0, top: 71.6, base: 86.2, far: 0.3 },
  { x: 46.5, w: 2.6, top: 75.0, base: 85.85, far: 0.66 },
  { x: 50.8, w: 3.4, top: 73.0, base: 86.05, far: 0.45 },
  { x: 56.2, w: 2.8, top: 76.2, base: 85.7, far: 0.8 },
  { x: 60.5, w: 3.8, top: 72.6, base: 86.1, far: 0.42 },
  { x: 66.0, w: 2.4, top: 75.4, base: 85.8, far: 0.72 },
  { x: 71.0, w: 3.2, top: 73.8, base: 86.0, far: 0.5 },
  { x: 76.0, w: 1.4, top: 78.8, base: 85.5, far: 1 },
  // The middle distance: nearer towers standing in the water, the ones that fall on the drums.
  { x: 2.6, w: 1.8, top: 74.4, base: 86.2, far: 0.2, mid: true },
  { x: 12.6, w: 3.0, top: 71.2, base: 86.3, far: 0.12, mid: true },
  { x: 8.8, w: 2.2, top: 72.0, base: 86.25, far: 0.22, mid: true },
]
/** The middle towers' indices. */
export const MID = { garden: 20, bay: 21, house: 22 } as const
/** How much the far layer (the far sea, the city) moves with the camera: it is far, so it moves less. */
export const PARALLAX = 0.22

/**
 * A slab calving off a tower into the sea, like ice off a glacier: it cracks, leans out over the water, and slides
 * down into it, and on the downbeat it hits the water and throws up a great slow plume of spray. `tower` is its
 * tower's index in CITY; `top`, `h` and `w` where it comes from on the tower (`side` 1 its right face, -1 its left).
 */
export interface Calving {
  tower: number
  hit: number
  /** Its top and height, and its width from the tower's side inward. */
  top: number
  h: number
  w: number
  side: 1 | -1
  /** How long it takes from the first lean to the water. */
  fall: number
  /** How far in from the tower's side its outer edge is (a slab behind one that has already gone). */
  off?: number
  /** A great one: the tower's whole top leans out, and slides down into the sea like ice off a glacier. */
  big?: boolean
}
export const CALVING: Calving[] = [
  // The drums: four great ones in the middle distance. The tower by the garden breaks on the peak's downbeat (as they
  // come out of the dark) and goes into the sea on beat 162; the bay's great tower goes on bar 41; the one behind the
  // house on bar 41's strong eighth; and the rest of the bay's tower on bar 43, as the lift goes.
  { tower: MID.garden, hit: beat(162), top: 74.4, h: 5.2, w: 1.8, side: 1, fall: beat(162) - bar(40), big: true },
  { tower: MID.bay, hit: bar(41), top: 71.2, h: 6.4, w: 3.0, side: 1, fall: 2.4, big: true },
  { tower: MID.house, hit: half(165), top: 72.0, h: 6.0, w: 2.2, side: -1, fall: half(165) - half(163), big: true },
  { tower: MID.bay, hit: bar(43), top: 77.6, h: 4.6, w: 3.0, side: -1, fall: bar(43) - beat(170), big: true },
  // As they go up the tower, far off.
  { tower: 2, hit: beat(174), top: 77.0, h: 3.0, w: 0.9, side: 1, fall: 2.3 },
  // Seen through the room's long window: the tower behind theirs sheds a corner.
  { tower: 1, hit: bar(44), top: 75.6, h: 3.0, w: 0.9, side: 1, fall: 2.5 },
  // Behind the roof: the slab that slipped on its crack in the prologue goes at last, then the rest of that tower's
  // top, on the kick.
  { tower: 3, hit: bar(47), top: 74.7, h: 4.8, w: 1.3, side: 1, fall: 3.0 },
  { tower: 3, hit: bar(48), top: 74.0, h: 6.4, w: 1.5, side: 1, off: 1.3, fall: 3.4 },
]
/** The prologue's one sign: a slab on the broken tower slips on its crack (bar 3), and hangs there leaning. */
export const CRACK = { tower: 3, at: P.crack, slab: 6 }

/* ------------------------------------------------------------------ the people */

/** His place in the surf where the show begins, and where the waves bring him back (the circle). */
export const FIRST_AT: Pt = onSand(-6.5)
const SPOTS = {
  wave0: onSand(-5.62),
  wave1: onSand(-4.55),
  cabin: [CABIN.x, GROUND - R] as Pt,
  cabinL: [CABIN.x - 0.2, GROUND - R] as Pt,
  cabinR: [CABIN.x + 0.22, GROUND - R] as Pt,
}
export { SPOTS }
/** At the table in their room: his chair (left), hers (right), and the ladder's foot. */
export const HIS: Pt = [TABLE.x - TABLE.w / 2 - 0.2, ROOM - R]
export const HERS: Pt = [TABLE.x + TABLE.w / 2 + 0.2, ROOM - R]
export const LADDER_FOOT: Pt = [LADDER.x, ROOM - R]
export const ON_ROOF = ROOF - R
/** The deck of the weight where Mal stands, and his place in the cabin's room side, facing her. */
export const DECK_X = CW.x
export const CABIN_DOOR_X = CABIN.x + 0.24

/** The fall into limbo's sky: from the crossing at 5 c/s down, under a dream's soft gravity, into the sea on beat 163. */
export const FALL_G = (2 * (SEA - DOWN.limbo.at[1] - DOWN.limbo.v[1] * (Q.splash - Q.begin))) / (Q.splash - Q.begin) ** 2
/** Where he steps off the roof's edge, and the kick's point (under gravity it meets UP.snow exactly). */
export const EDGE_X = TOWER.x1 - 0.05
/** Where he waits behind Ariadne, and how he comes up to the edge (from rest, gathering speed) and hops off. */
export const WAIT_X = 0.98
export const RUN_UP = 0.7
export const RUN_V = (2 * (EDGE_X - WAIT_X)) / RUN_UP
export const STEP_V: Pt = [0.9, 0]
export const KICK_AT: Pt = (() => {
  const T = Q.end - Q.kick
  const v0 = UP.snow.v[1] - G * T
  const y = UP.snow.at[1] - (v0 * T + 0.5 * G * T * T)
  return [EDGE_X + STEP_V[0] * (Q.kick - Q.stepOff), y]
})()
/** His hop off the edge: the up speed that brings him to the kick's point on the downbeat. */
export const STEP_VY = (() => {
  const T = Q.kick - Q.stepOff
  return (KICK_AT[1] - ON_ROOF - 0.5 * G * T * T) / T
})()

/**
 * A throw up the column from a kick at (x0, y0) at t0, to cross (x1, y1) at t1 at vy1 under gravity: straight up
 * while it clears the roof's edge, then curving in over the roof to the column, arriving with no speed across.
 */
export function kickPath(x0: number, y0: number, t0: number, x1: number, y1: number, t1: number, vy1: number): (t: number) => Pt {
  const T = t1 - t0
  const v0 = vy1 - G * T
  return (t: number): Pt => {
    const u = Math.max(0, Math.min(T, t - t0))
    const y = y0 + v0 * u + 0.5 * G * u * u
    // Across: it holds its line until it is over the roof, and comes in to the column by the crossing.
    const s = clamp01((u / T - 0.28) / 0.72)
    const e = s * s * (3 - 2 * s)
    return [lerp(x0, x1, e), y + (y1 - (y0 + v0 * T + 0.5 * G * T * T)) * (u / T)]
  }
}

/* ------------------------------------------------------------------ Fischer's path (company) */

const FD_LAND = (() => {
  const h = ON_ROOF - FISCHER_DOWN.at[1]
  const v = FISCHER_DOWN.v[1]
  return (-v + Math.sqrt(v * v + 2 * G_LOW * h)) / G_LOW
})()
/** When Fischer lands on the roof after he went down in the snow. */
export const FISCHER_LAND = FISCHER_DOWN.t + FD_LAND
/** Where he stands on the roof's edge, where Ariadne stands behind him. */
export const FISCHER_EDGE: Pt = [TOWER.x1 - 0.05, ON_ROOF]
export const ARIADNE_BACK: Pt = [TOWER.x1 - 0.66, ON_ROOF]
/** His roll off the edge, and the kick's point for him. */
const F_OFF_X = TOWER.x1 + 0.03
const F_ROLL = 0.06
const F_VX = 1.0
export const F_KICK_AT: Pt = (() => {
  const T = FISCHER_UP.t - Q.fischerKick
  const v0 = FISCHER_UP.v[1] - G * T
  const y = FISCHER_UP.at[1] - (v0 * T + 0.5 * G * T * T)
  return [F_OFF_X + F_VX * (Q.fischerKick - Q.push - F_ROLL), y]
})()
const F_VY = (() => {
  const T = Q.fischerKick - Q.push - F_ROLL
  return (F_KICK_AT[1] - ON_ROOF - 0.5 * G * T * T) / T
})()
/** Ariadne goes up the ladder first and he follows her (led), up through the hatch; on the roof she lets him by. */
const A_CLIMB = Q.gateOpen + 0.68
const F_CLIMB = A_CLIMB + 0.7
const fKick = kickPath(F_KICK_AT[0], F_KICK_AT[1], Q.fischerKick, FISCHER_UP.at[0], FISCHER_UP.at[1], FISCHER_UP.t, FISCHER_UP.v[1])

/** A straight, eased move from a to b between t0 and t1. */
const move = (t: number, t0: number, t1: number, a: Pt, b: Pt, ease: (u: number) => number = smoother): Pt => lerpPt(a, b, ease((t - t0) / (t1 - t0)))
/** A path through timed stops: [t, point] pairs, each leg eased. */
function legs(t: number, keys: [number, Pt][], ease: (u: number) => number = smoother): Pt {
  if (t <= keys[0][0]) return keys[0][1]
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) return move(t, keys[i - 1][0], keys[i][0], keys[i - 1][1], keys[i][1], ease)
  }
  return keys[keys.length - 1][1]
}

export function fischerAt(t: number): Pt {
  if (t < FISCHER_LAND) {
    const u = t - FISCHER_DOWN.t
    return [FISCHER_DOWN.at[0], FISCHER_DOWN.at[1] + FISCHER_DOWN.v[1] * u + 0.5 * G_LOW * u * u]
  }
  const hatchTop: Pt = [LADDER.x, ON_ROOF]
  const underHatch: Pt = [LADDER.x, CW_TOP + 0.35]
  if (t < F_CLIMB) {
    return legs(t, [
      [FISCHER_LAND, [FISCHER_DOWN.at[0], ON_ROOF]],
      [150.9, [FISCHER_DOWN.at[0], ON_ROOF]],
      [151.7, hatchTop],
      [153.0, LADDER_FOOT],
      [153.9, HIS],
      [F_CLIMB - 0.45, HIS],
      [F_CLIMB, LADDER_FOOT],
    ])
  }
  if (t < Q.push) {
    return legs(t, [
      [F_CLIMB, LADDER_FOOT],
      [F_CLIMB + 1.75, underHatch],
      [F_CLIMB + 2.15, hatchTop],
      [F_CLIMB + 2.35, hatchTop],
      [F_CLIMB + 4.25, FISCHER_EDGE],
    ])
  }
  const tOff = Q.push + F_ROLL
  if (t < tOff) return move(t, Q.push, tOff, FISCHER_EDGE, [F_OFF_X, ON_ROOF], (u) => u)
  if (t < Q.fischerKick) {
    const u = t - tOff
    return [F_OFF_X + F_VX * u, ON_ROOF + F_VY * u + 0.5 * G * u * u]
  }
  return fKick(t)
}

/* ------------------------------------------------------------------ Mal's paths (company) */

/** The prologue's glimpse: down the ladder from the roof in the last bar, and still, in the dark behind him. */
export const MAL_P_FROM = P.malFrom - 0.9
export function malPrologue(t: number): Pt {
  return legs(t, [
    [MAL_P_FROM, [LADDER.x, ON_ROOF]],
    [P.malFrom, [LADDER.x, CW_TOP + 0.3]],
    [P.malFrom + 1.9, [LADDER.x, ROOM - 1.05]],
  ])
}
/** The return: up out of the hatch to Fischer on the roof, down with him into the room, to her chair; then to the weight. */
export const MAL_R_FROM = 149.6
export const MAL_R_TO = Q.roof + 0.7
export function malReturn(t: number): Pt {
  if (t < Q.hold) {
    return legs(t, [
      [MAL_R_FROM, [LADDER.x, CW_TOP + 0.4]],
      [150.2, [LADDER.x, ON_ROOF]],
      [150.5, [LADDER.x, ON_ROOF]],
      [151.6, LADDER_FOOT],
      [152.5, [HERS[0], ROOM - R]],
      [F_CLIMB - 0.45, [HERS[0], ROOM - R]],
      [Q.hold, [DECK_X, weightY(Q.hold) - R]],
    ])
  }
  // She goes down with the weight, into the dark under the room.
  return [DECK_X, weightY(t) - R]
}

/* ------------------------------------------------------------------ Ariadne's path (company) */

const A_OFF = DOWN.limbo.ariadne!
const A_SPLASH = (() => {
  const h = SEA - (DOWN.limbo.at[1] + A_OFF[1])
  const v = DOWN.limbo.v[1]
  return Q.begin + (-v + Math.sqrt(v * v + 2 * FALL_G * h)) / FALL_G
})()
/** Her leap off the edge (quick and sure, a beat before his step), and her kick's point. */
const A_LEAP_X = TOWER.x1 - 0.1
const A_LEAP_VX = 0.34
export const A_KICK_AT: Pt = (() => {
  const off = UP.snow.ariadne!
  const T = Q.end - Q.kick
  const v0 = UP.snow.v[1] - G * T
  const y = UP.snow.at[1] + off[1] - (v0 * T + 0.5 * G * T * T)
  return [A_LEAP_X + A_LEAP_VX * (Q.kick - Q.ariadneLeap), y]
})()
const A_LEAP_VY = (() => {
  const T = Q.kick - Q.ariadneLeap
  return (A_KICK_AT[1] - ON_ROOF - 0.5 * G * T * T) / T
})()
const aKick = kickPath(A_KICK_AT[0], A_KICK_AT[1], Q.kick, UP.snow.at[0] + UP.snow.ariadne![0], UP.snow.at[1] + UP.snow.ariadne![1], Q.end, UP.snow.v[1])
/** Where the waves leave her at the circle: a little up the beach from him. */
export const A_CIRCLE: Pt = onSand(-5.85)

export function ariadneAt(t: number, cobb: (t: number) => Pt): Pt {
  if (t < A_SPLASH) {
    const u = t - Q.begin
    return [DOWN.limbo.at[0] + A_OFF[0], DOWN.limbo.at[1] + A_OFF[1] + DOWN.limbo.v[1] * u + 0.5 * FALL_G * u * u]
  }
  if (t < Q.circle) {
    // Under the water with him, carried in by the same sea: she goes in beside him, passes under him in the undertow,
    // and comes up a little ahead of him, nearer the shore.
    const c = cobb(t)
    const u = t - A_SPLASH
    const across = sm((u - 0.4) / 2.2)
    const under = Math.sin(Math.PI * across) * 0.42
    const start: Pt = [DOWN.limbo.at[0] + A_OFF[0], SEA]
    const into = sm(u / 0.6)
    const here: Pt = [c[0] + lerp(-0.55, 0.52, across), c[1] + under + 0.12]
    return lerpPt(start, here, into)
  }
  if (t < Q.gateOpen) {
    const inCabin: Pt = [CABIN.x + 0.22, GROUND - R]
    if (t < Q.liftGo) {
      const c = cobb(Q.circle)
      return legs(t, [
        [Q.circle, [c[0] + 0.52, c[1] + 0.12]],
        [Q.circle + 0.8, A_CIRCLE],
        [Q.circle + 0.95, A_CIRCLE],
        [Q.circle + 2.36, onSand(-2.75)],
        [Q.circle + 2.66, inCabin],
      ])
    }
    return [inCabin[0], cabinY(t) - R]
  }
  if (t < Q.push - 0.3) {
    const underHatch: Pt = [LADDER.x, CW_TOP + 0.35]
    const aside: Pt = [SLOT.x0 + 0.17, ON_ROOF]
    return legs(t, [
      [Q.gateOpen, [CABIN.x + 0.22, ROOM - R]],
      [A_CLIMB, LADDER_FOOT],
      [A_CLIMB + 1.6, underHatch],
      [A_CLIMB + 1.95, [LADDER.x, ON_ROOF]],
      [A_CLIMB + 2.45, aside],
      [F_CLIMB + 2.75, aside],
      [F_CLIMB + 4.55, ARIADNE_BACK],
      [Q.push - 0.3, ARIADNE_BACK],
    ])
  }
  if (t < Q.ariadneLeap) {
    // Into him on the beat (quick, and gone as soon as he is), then up to the edge where he stood.
    const contact: Pt = [FISCHER_EDGE[0] - 0.27, ON_ROOF]
    return legs(
      t,
      [
        [Q.push - 0.3, ARIADNE_BACK],
        [Q.push, contact],
        [Q.push + 1.0, contact],
        [Q.push + 2.0, [A_LEAP_X, ON_ROOF]],
      ],
      (u) => u * u * (3 - 2 * u),
    )
  }
  if (t < Q.kick) {
    const u = t - Q.ariadneLeap
    return [A_LEAP_X + A_LEAP_VX * u, ON_ROOF + A_LEAP_VY * u + 0.5 * G * u * u]
  }
  return aKick(t)
}
