import { FLOOR, mixHex, type Pt } from '../../../../../parts'
import { bar, level, SEAM } from '../music'
import { G } from '../physics'
import { CASTLE, feetAt, onBody, stairAt, STAIR_TREADS, stairLength, type CastlePose } from './castle'
import { wastesNight } from './sky'
import { WASTES } from '../worlds'

/** The fog's colour. */
export const MIST = mixHex(WASTES.mist, WASTES.sky, 0.3)

/**
 * The plan of the castle builder's two parts (the hills, 107.9 → 121.15, and the walk, 121.15 → 151.998), in the
 * wastes' own cells (the hills part's frame is the world's: Sophie comes in at (-0.5, 0)). Pure arithmetic, no
 * drawing: the ground, the castle's clock (a footfall on every downbeat of the waltz from bar 57 to bar 88), where
 * Sophie is, where Turnip Head is, how thick the fog is. The parts draw and build their lanes from these, so a
 * rider and what carries her read the same numbers.
 */

/* ------------------------------------------------------------------ the ground */

const sm = (u: number) => {
  const v = Math.max(0, Math.min(1, u))
  return v * v * (3 - 2 * v)
}

/**
 * The ground's surface (y down) at world x. The lane out of town is level at FLOOR round her way in; a low knoll
 * rises from 0.9 to 2.2 (the hilltop she stops on); past it the land falls away to the moor, which rolls on.
 */
export function ground(x: number): number {
  let y = FLOOR
  // Behind her, the lane dips back toward the town.
  y += 0.5 * sm((-3 - x) / 16)
  // The knoll: a real climb up past the hedge to the hilltop, the way out of town going up into the hills.
  y -= 1.1 * sm((x - 0.6) / 2.6)
  // Down off the knoll to the moor.
  y += 1.9 * sm((x - 7) / 12)
  // The moor's swell, and the far side's; level where the castle sits down for the night.
  const far = sm((x - 16) / 10) * (1 - sm((12 - Math.abs(x - STOP)) / 6))
  y += far * (0.6 * Math.sin((x - 16) * 0.11) + 0.25 * Math.sin((x - 16) * 0.29 + 1.0))
  const back = sm((-5 - x) / 8)
  y += back * (0.3 * Math.sin(x * 0.23 + 0.4) + 0.12 * Math.sin(x * 0.61))
  return y
}

/** Where the castle sits down for the night (world x, near enough: the ground is level for a dozen cells round it). */
const STOP = 76

/** Where a ball resting on the ground has its centre. */
export const path = (x: number): number => ground(x) - FLOOR

/* ------------------------------------------------------------------ the music's marks */

export const W = (n: number, pos = 1) => bar('waltz', n, pos)

/** The pole comes free of the hedge (the swell's bar), and Turnip Head lands on his foot. */
export const TUG = [W(55), W(55, 2)]
export const POP = W(56)
export const LANDS = W(57)
/** The castle's first footfalls in the fog, and its first out of it. */
export const THUD = [W(63), W(64)]
/** The stair drops; she catches its foot; she is on the porch. */
export const DROP = W(66)
export const CATCH = W(68)
export const TAKEOFF = W(67, 3)
/** Her climb: a hop a beat, tread to tread, the last onto the porch. */
export const CLIMB = [W(68, 2), W(68, 3), W(69), W(69, 2), W(69, 3), W(70), W(70, 2)]
/** Calcifer's roar, twice. */
export const ROAR = [W(71), W(71, 2)]
/** The last footfall (bar 88), the belly on the ground (the waltz's last note), the latch, the door flung wide. */
export const LAST = W(88)
export const SETTLE = 148.805
export const LATCH = 150.686
export const WIDE = 151.499

/* ------------------------------------------------------------------ Sophie up the hills */

interface Phase {
  T0: number
  T1: number
  x0: number
  x1: number
  /** How it goes: steady, a ramp between two speeds, or eased. */
  kind: 'lin' | 'ramp' | 'out' | 'in' | 'inout'
  v?: [number, number]
}

function phaseX(ph: Phase, T: number): number {
  const D = ph.T1 - ph.T0
  const u = Math.max(0, Math.min(1, (T - ph.T0) / D))
  switch (ph.kind) {
    case 'lin':
      return ph.x0 + (ph.x1 - ph.x0) * u
    case 'ramp': {
      const [a, b] = ph.v!
      const tau = u * D
      const dir = Math.sign(ph.x1 - ph.x0) || 1
      return ph.x0 + dir * (a * tau + ((b - a) * tau * tau) / (2 * D))
    }
    case 'out':
      return ph.x0 + (ph.x1 - ph.x0) * (1 - (1 - u) * (1 - u))
    case 'in':
      return ph.x0 + (ph.x1 - ph.x0) * u * u
    case 'inout':
      return ph.x0 + (ph.x1 - ph.x0) * (0.5 - 0.5 * Math.cos(Math.PI * u))
  }
}

/** Build phases end to end from a start, each given by its end time and how far it goes. */
function chain(T: number, x: number, steps: { T1: number; dx?: number; kind?: Phase['kind']; v?: [number, number] }[]): Phase[] {
  const out: Phase[] = []
  for (const s of steps) {
    let dx = s.dx ?? 0
    if (s.kind === 'ramp' && s.dx === undefined) dx = ((s.v![0] + s.v![1]) / 2) * (s.T1 - T)
    out.push({ T0: T, T1: s.T1, x0: x, x1: x + dx, kind: s.kind ?? 'lin', v: s.v })
    T = s.T1
    x += dx
  }
  return out
}

/** Where she stops before the hedge, the pole's end at her side. */
export const AT_POLE = -0.5 + 0.45 * (109.15 - SEAM.hills) + 0.18

const HILLS: Phase[] = chain(SEAM.hills, -0.5, [
  // In from the cut at her walking pace, slowing to the stick poking out of the hedge.
  { T1: 109.15, dx: 0.45 * (109.15 - SEAM.hills) },
  { T1: 109.95, kind: 'ramp', v: [0.45, 0] },
  { T1: TUG[0] },
  // Two tugs on the swell's beats, a strain, and the pole comes free: she sits back hard and rolls to a stop.
  { T1: TUG[0] + 0.22, dx: -0.1, kind: 'out' },
  { T1: TUG[1], dx: 0.03, kind: 'inout' },
  { T1: TUG[1] + 0.235, dx: -0.11, kind: 'out' },
  { T1: W(55, 3), dx: 0.025, kind: 'inout' },
  { T1: POP, dx: -0.085, kind: 'in' },
  { T1: POP + 0.609, dx: -0.42, kind: 'ramp', v: [1.38, 0] },
  // She watches him come down, and leans a little toward him (a glance); then she turns up the hill, and he follows.
  { T1: LANDS + 0.1 },
  { T1: LANDS + 0.45, dx: -0.07, kind: 'inout' },
  { T1: 113.05 },
  { T1: 114.05, kind: 'ramp', v: [0, 0.5] },
  { T1: THUD[0], kind: 'ramp', v: [0.5, 0.5] },
  // The ground shakes: she stops; at the second she backs away from what is coming out of the fog.
  { T1: THUD[0] + 0.4, kind: 'ramp', v: [0.5, 0] },
  { T1: THUD[1] },
  { T1: THUD[1] + 0.75, dx: 0.25, kind: 'out' },
  { T1: SEAM.walk },
])

/** Her place on the hilltop as the castle comes (the hills part's exit, less half a cell). */
export const HILLTOP: Pt = [HILLS[HILLS.length - 1].x1, path(HILLS[HILLS.length - 1].x1)]

/** Sophie in the hills at show time T (world cells), on the ground. */
export function sophieHills(T: number): Pt {
  let x = HILLS[0].x0
  for (const ph of HILLS) {
    if (T >= ph.T0) x = phaseX(ph, T)
  }
  return [x, path(x)]
}

/** Every time her motion changes in the hills (for cutting the lane there, so each is exact). */
export const HILLS_KEYS: number[] = HILLS.map((ph) => ph.T1)

/** The pole's end, at her side, while she has it. */
export const tip = (T: number): Pt => {
  const x = T < 109.95 ? AT_POLE : sophieHills(Math.min(T, POP))[0]
  return [x + 0.145, -0.02]
}

/* ------------------------------------------------------------------ the castle's clock */

/** A footfall on every downbeat from bar 57 (in the fog, out of sight) to bar 88 (it stops). */
const FIRST = 57
const LASTBAR = 88
const FOOT: number[] = []
for (let n = FIRST; n <= LASTBAR; n++) FOOT.push(W(n))
/** How far each step goes (from footfall i to i + 1): slow as it comes to her, long after the roar, shortening to the stop. */
const DIST: number[] = []
for (let n = FIRST; n < LASTBAR; n++) {
  const table: Record<number, number> = {
    65: 3.0, 66: 3.45, 67: 3.3, 68: 2.35, 69: 2.7, 70: 3.1, 71: 3.8, 72: 4.3,
    79: 4.2, 80: 3.9, 81: 3.6, 82: 3.4, 83: 3.2, 84: 3.0, 85: 2.6, 86: 2.0, 87: 1.3,
  }
  DIST.push(table[n] ?? (n < 65 ? 2.9 : 4.5))
}
const N = FOOT.length - 1
/** The lurch: slow as a foot lands, quick mid-stride. */
const LURCH = 0.3

/** Footfalls so far at show time T (a whole number on each downbeat). */
export function stepAt(T: number): number {
  if (T <= FOOT[0]) return ((T - FOOT[0]) * (1 - LURCH)) / (FOOT[1] - FOOT[0])
  if (T >= FOOT[N]) return N
  let i = 0
  while (i + 1 < N && FOOT[i + 1] <= T) i++
  const D = FOOT[i + 1] - FOOT[i]
  const u = (T - FOOT[i]) / D
  if (i === N - 1) {
    // The last step comes to rest on the last footfall.
    const m0 = (1 - LURCH) * (D / (FOOT[i] - FOOT[i - 1]))
    return i + (u * u * u - 2 * u * u + u) * m0 + (-2 * u * u * u + 3 * u * u)
  }
  return i + u - (LURCH * Math.sin(2 * Math.PI * u)) / (2 * Math.PI)
}

/** How far the castle has walked after `s` footfalls (from footfall 0, bar 57). */
export function travel(s: number): number {
  if (s <= 0) return DIST[0] * s
  let x = 0
  const i = Math.min(N, Math.floor(s))
  for (let j = 0; j < i; j++) x += DIST[j]
  if (i < N) x += DIST[i] * (s - i)
  return x
}

/** 0 standing, 1 sat on its folded legs: it settles from the last footfall onto the waltz's last note, heavily. */
export function sitAt(T: number): number {
  const a = LAST + 0.15
  if (T <= a) return 0
  const u = Math.min(1, (T - a) / (SETTLE - a))
  const s = 0.85 * u * u * (3 - 2 * u) + 0.15 * u * u
  if (T <= SETTLE) return s
  // It lands with a thud, gives back a little, and is still.
  const v = T - SETTLE
  return 1 - 0.035 * Math.exp(-v / 0.3) * (1 - Math.cos(v / 0.11)) * 0.5
}

/** The telescoping stair: dropped on bar 66 (its sections falling one after another, the last clanking home on the beat), wound up once she is aboard. */
export function stairOut(T: number): number {
  const fall = 0.42
  if (T <= DROP - fall) return 0
  if (T <= DROP) {
    const u = (T - (DROP - fall)) / fall
    return u * u
  }
  const up0 = ROAR[1] + 0.5
  const up1 = up0 + 1.9
  if (T <= up0) return 1
  if (T >= up1) return 0
  return 1 - sm((T - up0) / (up1 - up0))
}

/** The stair's swing: a kick when it drops, then the gait's sway, less with her weight on it. */
export function swingAt(T: number): number {
  const s = stepAt(T)
  let v = 0.05 * Math.sin(2 * Math.PI * s - 1.3)
  if (T > DROP) {
    const e = T - DROP
    v += 0.16 * Math.exp(-e / 1.1) * Math.sin((2 * Math.PI * e) / 1.9)
  }
  const on = T > CATCH && T < CLIMB[CLIMB.length - 1] ? 0.45 : 1
  return v * on * Math.max(0, 1 - sitAt(T))
}

/** The fog: none until the pole is out and he has gone back; thickest as the castle looms; gone as it strides clear. */
export function fogAt(T: number): number {
  return sm((T - 115.6) / 2.6) * (1 - sm((T - 121.9) / 3.6))
}

/** Where the fog bank's front is (world x): it rolls in from the left behind her, up to the hilltop. */
export function fogFront(T: number): number {
  return -14 + 17.5 * sm((T - 115.4) / 3.4)
}

/** How lost in the fog the castle is: invisible, a shape as it thuds on bar 63, clearer on 64, out of it by the stair. */
export function hazeAt(T: number): number {
  const keys: Pt[] = [[117.2, 1], [THUD[0] - 0.05, 0.8], [THUD[0] + 0.3, 0.66], [THUD[1] + 0.3, 0.46], [SEAM.walk + 0.4, 0.3], [DROP, 0.14], [124.2, 0.02], [125.2, 0]]
  if (T <= keys[0][0]) return 1
  for (let i = 1; i < keys.length; i++) {
    if (T <= keys[i][0]) {
      const [t0, a] = keys[i - 1]
      const [t1, b] = keys[i]
      return a + (b - a) * sm((T - t0) / (t1 - t0))
    }
  }
  return 0
}

/** Calcifer's roar at the chimney: a flare on each of the two hits, dying away. */
export function roarAt(T: number): number {
  let v = 0
  for (const [at, s] of [[ROAR[0], 1], [ROAR[1], 0.8]] as Pt[]) {
    const e = T - at
    if (e > -0.12 && e < 0) v = Math.max(v, s * sm((e + 0.12) / 0.12) * 0.5)
    if (e >= 0) v = Math.max(v, s * (0.5 + 0.5 * Math.exp(-e / 0.08)) * Math.exp(-e / 0.7))
  }
  return Math.min(1, v)
}

/** The door: shut on the walk; a crack of light on the latch; flung wide on the pickup before the flow. */
export function doorAt(T: number): number {
  if (T <= LATCH) return 0
  if (T <= WIDE) return 0.2 * sm((T - LATCH) / 0.45)
  const e = T - WIDE
  return Math.min(1.02, 0.2 + 0.8 * (1 - Math.exp(-e / 0.09)))
}

/** The castle's lurch forward on the roar (nose down), recovering slowly; and a lean into the pace. */
function lurch(T: number): number {
  const e = T - ROAR[0]
  const kick = e < 0 ? 0 : 0.06 * (1 - Math.exp(-e / 0.12)) * Math.exp(-e / 0.9)
  return kick
}

let X0 = 0
/** The castle's origin (world) and its pose at show time T. */
export function castleAt(T: number): { at: Pt; pose: CastlePose } {
  const s = stepAt(T)
  const x = X0 + travel(s)
  const hipF = x + CASTLE.hips[0][0]
  const hipB = x + CASTLE.hips[1][0]
  const gF = ground(hipF)
  const gB = ground(hipB)
  const y = (gF + gB) / 2
  const slope = Math.atan2(gF - gB, hipF - hipB) * 0.5
  const night = wastesNight(T)
  const fog = hazeAt(T)
  const pose: CastlePose = {
    t: T,
    step: s,
    travel: (q) => travel(q),
    ground: (gx) => ground(x + gx) - y,
    lean: slope + lurch(T),
    sit: sitAt(T),
    stair: stairOut(T),
    swing: swingAt(T),
    roar: roarAt(T),
    haze: fog,
    hazeTo: MIST,
    // Dust and steam as loud as the waltz is: big on the great strides, soft as night comes on.
    dust: 0.35 + 0.75 * level(T),
    steam: 0.45 + 0.6 * level(T),
    eye: Math.max(0, 1 - Math.abs(T - 120.2) / 3.2) * 0.9,
    jaw: roarAt(T),
    night,
    lights: sm((T - 136.8) / 7.5),
    door: doorAt(T),
    dial: 0,
    smoke: 0,
  }
  return { at: [x, y], pose }
}

/** A body point of the castle (standing cells) where it is in the world at T. */
export function onCastle(T: number, at: Pt): Pt {
  const c = castleAt(T)
  const [bx, by] = onBody(c.pose, at)
  return [c.at[0] + bx, c.at[1] + by]
}

/** A point `d` down the stair, in the world at T. */
export function onStair(T: number, d: number): Pt {
  const c = castleAt(T)
  const [bx, by] = stairAt(c.pose, d)
  return [c.at[0] + bx, c.at[1] + by]
}

/** The castle's feet in the world at T. */
export function feetWorld(T: number): { at: Pt; down: boolean }[] {
  const c = castleAt(T)
  return feetAt(c.pose).map((f) => ({ at: [c.at[0] + f.at[0], c.at[1] + f.at[1]] as Pt, down: f.down }))
}

// Set where the castle walks so that the stair's foot comes to her as she jumps for it: her hop lands on its foot
// plate a third of a cell ahead of where she stood.
{
  const want = HILLTOP[0] + 0.34
  for (let i = 0; i < 10; i++) {
    const [fx] = onStair(CATCH, stairLength(1))
    X0 += want - fx
  }
}

/* ------------------------------------------------------------------ Sophie on the castle */

/** The stair's treads she lands on, a hop a beat (cells down from the porch), and then the porch. */
const LADDER: number[] = (() => {
  const full = stairLength(1)
  const pick = [full, 5.15, 4.525, 3.3, 2.7, 1.475, 0.85]
  return pick.map((d) => STAIR_TREADS.reduce((b, q) => (Math.abs(q - d) < Math.abs(b - d) ? q : b), full))
})()
/** Where she steps off the stair onto the porch, and where she rides. */
const ONTO: Pt = [CASTLE.stairTop[0] + 0.38, CASTLE.door[1]]
const RIDE: Pt = CASTLE.ride
/** When she sets off along the porch for the door, and how she goes: up to the seam's pace, then on at it. */
const PACE = 0.6
const SPEEDUP = 1.2
const GO = SEAM.morning - (SPEEDUP + (CASTLE.door[0] - CASTLE.ride[0] - (PACE * SPEEDUP) / 2) / PACE)

/** Her x along the porch (standing castle cells) once she is on it. */
function porchX(T: number): number {
  const arrive = CLIMB[CLIMB.length - 1]
  const settle = arrive + 1.0
  if (T <= settle) {
    // Rolling off the last hop along the porch to where she rides, slowing.
    const D = settle - arrive
    const tau = Math.max(0, T - arrive)
    const a = (2 * (RIDE[0] - ONTO[0])) / D
    return ONTO[0] + a * tau - (a * tau * tau) / (2 * D)
  }
  if (T <= GO) return RIDE[0]
  const tau = T - GO
  if (tau <= SPEEDUP) return RIDE[0] + (PACE * tau * tau) / (2 * SPEEDUP)
  return RIDE[0] + (PACE * SPEEDUP) / 2 + PACE * (tau - SPEEDUP)
}

/** Sophie on the castle (world) from the catch to the cut: on the stair's treads, hopping up; along the porch; riding; to the door. */
export function sophieAboard(T: number): Pt {
  const hops = [CATCH, ...CLIMB]
  if (T < hops[hops.length - 1]) {
    let i = 0
    while (i + 1 < hops.length && hops[i + 1] <= T) i++
    const t0 = hops[i]
    const t1 = hops[i + 1]
    const u = (T - t0) / (t1 - t0)
    const d0 = LADDER[i]
    const lift = (G * (t1 - t0) * (t1 - t0)) / 8
    const bump = 4 * lift * u * (1 - u)
    if (i + 1 < LADDER.length) {
      const [x, y] = onStair(T, d0 + (LADDER[i + 1] - d0) * u)
      return [x, y - FLOOR - bump]
    }
    // The last hop: off the top tread and onto the porch floor.
    const [ax, ay] = onStair(T, d0)
    const [bx, by] = onCastle(T, ONTO)
    return [ax + (bx - ax) * u, ay + (by - ay) * u - FLOOR - bump]
  }
  const [x, y] = onCastle(T, [porchX(T), ONTO[1]])
  return [x, y - FLOOR]
}

/** Every time her motion aboard changes (for cutting the lane there). */
export const ABOARD_KEYS: number[] = [...CLIMB, CLIMB[CLIMB.length - 1] + 1.0, ...FOOT.filter((t) => t > CATCH), SETTLE, GO, GO + SPEEDUP]

/* ------------------------------------------------------------------ Turnip Head */

/** His hops: take off on the one, land by the three, a hop a bar; [take-off, landing, from x, to x]. */
const HOPS: [number, number, number, number][] = [
  // Past her and up the hill ahead of her, a hop a bar, to the hilltop.
  [W(58), W(58, 3), -1.2, -0.2],
  [W(59), W(59, 3), -0.2, 0.85],
  [W(60), W(60, 3), 0.85, 2.75],
  // He stops up there, looks back into the fog rolling up the lane, and bounds back down past her into it, for the castle.
  [W(62), W(62, 3), 2.75, -0.35],
  // Out of the fog ahead of the castle, leading it to her; the castle's foot stamps down where he took off, and he
  // bounds over her to stand at her side.
  [W(64), W(64, 3), -0.35, 0.95],
  [W(65), W(65, 3), 0.95, 3.95],
  // She is aboard: he hops after it, and falls behind.
  [W(69), W(69, 3), 3.95, 5.3],
  [W(70), W(70, 3), 5.3, 6.7],
  [W(71), W(71, 3), 6.7, 8.2],
  [W(72), W(72, 3), 8.2, 9.6],
  [W(73), W(73, 3), 9.6, 10.8],
]
/** Where he lands upright after the somersault out of the hedge. */
const LANDING_X = -1.2
/** His hops' landings (strikes). */
export const TURNIP_LANDINGS: number[] = [LANDS, ...HOPS.map((h) => h[1])]

/** Turnip Head at show time T: the foot of his pole (world), his lean (radians), and how much of him shows through the fog. */
export function turnipAt(T: number): { foot: Pt; lean: number; inHedge: boolean } {
  const THETA = 1.27
  if (T < POP) return { foot: tip(T), lean: THETA, inHedge: true }
  if (T < LANDS) {
    // Flung out of the hedge over her head, turning a full somersault, to land on his foot behind her.
    const D = LANDS - POP
    const u = (T - POP) / D
    const f0 = tip(POP)
    const c0: Pt = [f0[0] + 0.55 * Math.sin(THETA), f0[1] - 0.55 * Math.cos(THETA)]
    const c1: Pt = [LANDING_X, ground(LANDING_X) - 0.55]
    const lift = (G * D * D) / 8
    const cx = c0[0] + (c1[0] - c0[0]) * u
    const cy = c0[1] + (c1[1] - c0[1]) * u - 4 * lift * u * (1 - u)
    const th = THETA + (-2 * Math.PI - THETA) * u
    return { foot: [cx - 0.55 * Math.sin(th), cy + 0.55 * Math.cos(th)], lean: th, inHedge: false }
  }
  // On the ground or in a hop.
  let x = LANDING_X
  let lastLand = LANDS
  for (const [t0, t1, a, b] of HOPS) {
    if (T >= t1) {
      x = b
      lastLand = t1
      continue
    }
    if (T > t0) {
      const u = (T - t0) / (t1 - t0)
      const fx = a + (b - a) * u
      const fy = ground(a) + (ground(b) - ground(a)) * u - 4 * (Math.abs(b - a) > 2 ? 0.75 : 0.34) * u * (1 - u)
      // Leaning into the hop, the way he goes.
      return { foot: [fx, fy], lean: 0.14 * Math.sign(b - a) * Math.sin(Math.PI * u), inHedge: false }
    }
    break
  }
  // After each landing he rocks on his pole and settles.
  const e = T - lastLand
  let lean = 0.16 * Math.exp(-e / 0.42) * Math.sin((2 * Math.PI * e) / 0.62)
  // Before he goes back for the castle, he turns to look over his shoulder: a lean back toward the fog.
  lean -= 0.12 * sm((T - W(61)) / 0.5) * (1 - sm((T - (W(62) - 0.1)) / 0.3))
  return { foot: [x, ground(x) + 0.02 * Math.exp(-e / 0.15)], lean, inHedge: false }
}
