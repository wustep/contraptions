import { R, type Pt } from '../../../../../parts'
import { OPENING_END, PIANO } from '../club/geometry'
import { dream, snap } from '../music'
import { G } from '../physics'

/**
 * Lipton's, as numbers the room and the kiss share: where everything stands (in the piano's frame, the opening
 * part's origin: the lowest key's left edge is x = 0, a ball on a white key is at y = 0, y runs down), and when
 * everything happens (show seconds). The room draws from these; the kiss builds its lane and Mia from them, so the
 * lamp that lights, the cup that rises and the balls in it are one clock.
 */

/** The kiss part's frame, in the piano's: its (-0.5, 0) is the top key, where the opening leaves him. */
export const K0: Pt = [OPENING_END[0] + 0.5, OPENING_END[1]]

/* ------------------------------------------------------------------ the room */

export const ROOM = {
  floor: PIANO.floor,
  stage: PIANO.stage,
  /** The left wall (the door is in it), outer and inner faces; the right wall's inner and outer faces. */
  wallL0: -14.4,
  wallL1: -13.9,
  wallR0: 12.8,
  wallR1: 13.3,
  /** The ceiling's underside, the roof's top. */
  ceil: -5.7,
  roof: -6.35,
  /** The stage's front edge (it runs to the right wall, with the piano and the tree on it). */
  stageX0: -1.7,
  /** The wainscot's rail. */
  rail: 1.85,
}

/** A ball's centre resting on the floor, and on the stage. */
export const ON_FLOOR = ROOM.floor - R
export const ON_STAGE = ROOM.stage - R

/** The door in the left wall: its opening's top, and the leaf's width when it swings round into view. */
export const DOOR = { top: 2.02, leaf: 0.74 }
/** The bell on its curled spring, just inside, over the door. */
export const BELL: Pt = [ROOM.wallL1 + 0.2, DOOR.top - 0.2]

/** The tables she passes, their centres; a table's top and half-width. */
export const TABLES = [-9.9, -7.7, -5.5, -3.3]
export const TABLE = { top: 2.71, half: 0.4 }

/** The tree, on the stage beside the piano: its middle, its pot's top, its tip, its half-width at the foot. */
export const TREE = { x: 9.6, foot: 2.18, tip: -4.72, half: 2.3 }
/** The star on its tip, which is the pulley the cup's cord runs over. */
export const STAR: Pt = [TREE.x, -5.03]
export const STAR_R = 0.3

/** The cup: half a glass bauble, hung from the star on the cord's left strand. Its seats (the balls' centres). */
export const CUP = { x: TREE.x - STAR_R, low: ON_STAGE - 0.12, high: -4.43, seat: 0.135 }
/** The counterweight: a gold bauble on the right strand. */
export const WEIGHT = { x: TREE.x + STAR_R, r: 0.2 }

/**
 * The string of bulbs across the room: the wire's hooks, from the tree's top to the far side of the room, each
 * hung from the ceiling on a drop. A swag between hooks sags `SAG`.
 */
export const HOOKS: Pt[] = [
  [CUP.x - 0.47, CUP.high + R + 0.015],
  [4.0, -3.95],
  [-0.8, -3.35],
  [-5.7, -2.6],
  [-10.6, -1.65],
]
export const SAG = 0.55
/** How far above the wire a ball's centre rides. */
export const RIDE = R + 0.015
/** Bulbs on each swag. */
export const BULBS = 6
/** How far the wire gives under the two of them, mid-swag. */
export const DIP = 0.07

/** The wire of swag `i` at `u` (0 at its right hook, 1 at its left). */
export function wire(i: number, u: number): Pt {
  const [ax, ay] = HOOKS[i]
  const [bx, by] = HOOKS[i + 1]
  return [ax + (bx - ax) * u, ay + (by - ay) * u + 4 * SAG * u * (1 - u)]
}

/** The garland's run down from the last hook to the floor by the door: a cubic, and its end on the floor. */
export const GARLAND: Pt[] = [
  [HOOKS[4][0], HOOKS[4][1]],
  [-11.0, 0.2],
  [-12.0, ROOM.floor],
  [-12.95, ROOM.floor],
]

/* ------------------------------------------------------------------ the clock */

/** A time moved onto the measured onset within 30 ms of it. */
const on = (t: number): number => snap(t, 0.03)?.t ?? t

export const T = {
  /** Mia is Lipton's from here (the stage light opening again), to the curtain. */
  miaFrom: 39.95,
  miaTo: 90.2,
  /** The door: she reaches it, it swings in, and the bell on its onset. */
  doorIn: [42.458, 43.003] as [number, number],
  /** She steps up onto the stage. */
  stepUp: 58.63,
  hush: 61.777,
  /** He lifts off the top key into the quiet. */
  lift: 62.1,
  kiss: 65.515,
  /**
   * The bloom: the room's own lights come on in a wave out both ways from over the kiss, on the orchestra's swell.
   * The tree's lights first (it is nearest), then each table's lamp as the wave reaches it, nearest first.
   */
  bloomTree: on(65.712),
  bloomTables: [on(66.223), on(66.386), on(66.827), on(67.117)],
  /** Into the cup: she, then he. */
  hopMia: 71.134,
  hopSeb: 71.378,
  /** The cup rises, and reaches the star on the band's first strong beat. */
  rise: [71.6, dream(22)] as [number, number],
  /** The cup tips them out onto the wire; the first swag. */
  tip: dream(24),
  swags: [dream(25), dream(29), dream(33), dream(37), dream(41)],
  /** The ride's big accents: the star flashes as the cup spills them; the bulb they are passing flares; the string pulses once. */
  starFlash: on(77.764),
  flares: [on(78.495), on(79.424), on(79.644), on(81.316), on(85.275)],
  pulse: on(81.525),
  /** Onto the door, which swings out; and shut again behind them. */
  doorOut: dream(47),
  doorShut: dream(49),
  end: dream(51),
}

/* ------------------------------------------------------------------ small tools */

const clamp01 = (u: number) => Math.max(0, Math.min(1, u))
export const inout = (u: number) => 0.5 - 0.5 * Math.cos(Math.PI * clamp01(u))

/** Hermite position along a run of length `L` over `D` seconds, leaving at speed `v0` and arriving at `v1`. */
export function hermite(tau: number, D: number, L: number, v0: number, v1: number): number {
  const u = clamp01(tau / D)
  const u2 = u * u
  const u3 = u2 * u
  return (u3 - 2 * u2 + u) * D * v0 + (-2 * u3 + 3 * u2) * L + (u3 - u2) * D * v1
}

function bezier(p: Pt[], u: number): Pt {
  const a = 1 - u
  const b0 = a * a * a
  const b1 = 3 * a * a * u
  const b2 = 3 * a * u * u
  const b3 = u * u * u
  return [b0 * p[0][0] + b1 * p[1][0] + b2 * p[2][0] + b3 * p[3][0], b0 * p[0][1] + b1 * p[1][1] + b2 * p[2][1] + b3 * p[3][1]]
}

/** A path sampled by arc length: `at(s)` is the point `s` cells along it. */
export interface Path {
  length: number
  at(s: number): Pt
}

export function pathOf(pts: Pt[]): Path {
  const acc = [0]
  for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))
  const length = acc[acc.length - 1]
  return {
    length,
    at(s: number): Pt {
      if (s <= 0) return pts[0]
      if (s >= length) return pts[pts.length - 1]
      let lo = 0
      let hi = acc.length - 1
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1
        if (acc[mid] <= s) lo = mid
        else hi = mid
      }
      const f = (s - acc[lo]) / (acc[hi] - acc[lo] || 1)
      return [pts[lo][0] + (pts[hi][0] - pts[lo][0]) * f, pts[lo][1] + (pts[hi][1] - pts[lo][1]) * f]
    },
  }
}

const sampleBezier = (p: Pt[], n: number): Pt[] => Array.from({ length: n + 1 }, (_, i) => bezier(p, i / n))

/* ------------------------------------------------------------------ the cup and its weight */

/** The cup's seats' height at `t`: resting on the stage, then drawn up the tree to the star. */
export function cupY(t: number): number {
  const [a, b] = T.rise
  return CUP.low + (CUP.high - CUP.low) * inout((t - a) / (b - a))
}

/** How far the cup is tipped (radians, positive tips its left lip down), about its bail's top. */
export function cupTip(t: number): number {
  const a = T.tip
  if (t < a) return 0
  const tilt = 0.5 * inout((t - a) / 0.3)
  // Once they are out it swings back, and settles on its cord.
  const back = t - (a + 0.62)
  if (back < 0) return tilt
  return 0.5 * Math.exp(-back / 0.32) * Math.cos(2 * Math.PI * 1.1 * back)
}

/** Where the bail's top is (the point the cup hangs and tips about). */
export const bailTop = (t: number): Pt => [CUP.x, cupY(t) - 0.36]

/** A seat of the cup (side -1 left, +1 right) at `t`, tipped with it. */
export function seat(t: number, side: -1 | 1): Pt {
  const [px, py] = bailTop(t)
  const a = cupTip(t)
  const dx = side * CUP.seat
  const dy = cupY(t) - py
  const c = Math.cos(a)
  const s = Math.sin(a)
  return [px + dx * c + dy * s, py - dx * s + dy * c]
}

/** The counterweight's centre: it goes down as the cup goes up. */
export const weightY = (t: number): number => -4.45 + (CUP.low - cupY(t))

/* ------------------------------------------------------------------ Mia's walk, and the moments before the cup */

interface Move {
  t0: number
  t1: number
  x0: number
  x1: number
  y: number
}

/** She is drawn across the room by the theme, table by table: she moves on its phrases, and waits on its breaths. */
const WALK: Move[] = [
  { t0: 40.3, t1: 42.35, x0: -18.4, x1: -14.72, y: ON_FLOOR },
  { t0: 42.95, t1: 44.5, x0: -14.72, x1: -11.6, y: ON_FLOOR },
  { t0: 45.743, t1: 47.4, x0: -11.6, x1: -8.8, y: ON_FLOOR },
  { t0: 48.739, t1: 50.4, x0: -8.8, x1: -6.6, y: ON_FLOOR },
  { t0: 52.036, t1: 53.8, x0: -6.6, x1: -4.4, y: ON_FLOOR },
  { t0: 55.066, t1: 56.9, x0: -4.4, x1: -2.08, y: ON_FLOOR },
]
/** Up onto the stage, and along it under the keyboard as he runs up the keys, to the piano's end. */
const UP_FROM: Pt = [-2.08, ON_FLOOR]
const UP_TO: Pt = [-1.42, ON_STAGE]
const UP_LEAVE = T.stepUp - 0.4
export const MIA_WAIT: Pt = [6.4, ON_STAGE]
const RUN: [number, number] = [T.stepUp, 61.62]
/** Where they are when they touch. */
export const KISS_SEB: Pt = [6.09, ON_STAGE]
export const KISS_MIA: Pt = [KISS_SEB[0] + 2 * R, ON_STAGE]

/* ------------------------------------------------------------------ the bloom */

/** Where the bloom's wave starts: over the two of them. */
export const BLOOM_X = (KISS_SEB[0] + KISS_MIA[0]) / 2

/** The wave to the left, as (distance from BLOOM_X, show time) through each table, nearest first. */
const WAVE: [number, number][] = [[0, T.kiss], ...[3, 2, 1, 0].map((i, j): [number, number] => [BLOOM_X - TABLES[i], T.bloomTables[j]])]

/** When the bloom's wave reaches `x` (show seconds). To the right it runs at the pace that reaches the tree on its onset. */
export function reach(x: number): number {
  const d = x - BLOOM_X
  if (d >= 0) return T.kiss + (d * (T.bloomTree - T.kiss)) / (TREE.x - BLOOM_X)
  const dist = -d
  let i = 1
  while (i < WAVE.length - 1 && dist > WAVE[i][0]) i++
  const [a, ta] = WAVE[i - 1]
  const [b, tb] = WAVE[i]
  return ta + ((tb - ta) * (dist - a)) / (b - a)
}

/** How far to the left the wave has gone at `t` (cells from BLOOM_X): the inverse of `reach` there. */
export function bloomFront(t: number): number {
  if (t <= T.kiss) return 0
  let i = 1
  while (i < WAVE.length - 1 && t > WAVE[i][1]) i++
  const [a, ta] = WAVE[i - 1]
  const [b, tb] = WAVE[i]
  return a + ((b - a) * (t - ta)) / (tb - ta)
}

/** A flight from `a` to `b` over [t0, t1] under gravity `g`, at `t`. */
function flight(a: Pt, b: Pt, t0: number, t1: number, t: number, g = G): Pt {
  const T_ = t1 - t0
  const u = clamp01((t - t0) / T_)
  const lift = ((g * T_ * T_) / 8) * 4 * u * (1 - u)
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u - lift]
}

/** After the kiss they go together along the stage to the tree, and hop into the cup: her first. */
const OFF = 68.6
const MIA_HOP_FROM: Pt = [8.98, ON_STAGE]
const SEB_HOP_FROM: Pt = [8.72, ON_STAGE]
const HOP_T = 0.37

/** Mia, from the stage light opening to the cup tipping them out. */
function miaEarly(t: number): Pt {
  if (t < WALK[0].t0) return [WALK[0].x0, ON_FLOOR]
  if (t < UP_LEAVE) {
    let x = WALK[0].x0
    for (const m of WALK) {
      if (t >= m.t1) x = m.x1
      else if (t >= m.t0) x = m.x0 + (m.x1 - m.x0) * inout((t - m.t0) / (m.t1 - m.t0))
    }
    return [x, ON_FLOOR]
  }
  if (t < T.stepUp) return flight(UP_FROM, UP_TO, UP_LEAVE, T.stepUp, t)
  if (t < RUN[1]) {
    // From the landing, running along the stage with him, easing to a stop at the piano's end.
    const u = (t - RUN[0]) / (RUN[1] - RUN[0])
    return [UP_TO[0] + (MIA_WAIT[0] - UP_TO[0]) * hermite(u, 1, 1, 0.55, 0), ON_STAGE]
  }
  // She waits; as he comes down she looks up (a hair back), and leans in to him for the touch.
  if (t < 65.25) {
    const look = 0.018 * inout((t - 63.2) / 1.2)
    return [MIA_WAIT[0] + look, ON_STAGE]
  }
  if (t < T.kiss) return [MIA_WAIT[0] + 0.018 + (KISS_MIA[0] - MIA_WAIT[0] - 0.018) * inout((t - 65.25) / (T.kiss - 65.25)), ON_STAGE]
  if (t < OFF) return KISS_MIA
  const leave = T.hopMia - HOP_T
  if (t < leave) return [KISS_MIA[0] + (MIA_HOP_FROM[0] - KISS_MIA[0]) * inout((t - OFF) / (leave - OFF)), ON_STAGE]
  if (t < T.hopMia) return flight(MIA_HOP_FROM, [CUP.x + CUP.seat, CUP.low], leave, T.hopMia, t)
  return seat(t, 1)
}

/* ------------------------------------------------------------------ Seb, from the top key to the street */

/** He lifts straight up off the key, over the piano's cheek, and down beside it to her. */
const FLOAT_PATH = pathOf([
  ...sampleBezier([OPENING_END, [OPENING_END[0] - 0.08, -1.1], [KISS_SEB[0], -1.2], [KISS_SEB[0], -0.2]], 48),
  KISS_SEB,
])

/** The ride from the cup on: sampled once, for the lane and for Mia, who keeps a ball's width behind him. */
const RIDE_DT = 1 / 120

function festoon(t: number): Pt {
  const i = Math.min(3, Math.max(0, Math.floor((t - T.swags[0]) / (T.swags[1] - T.swags[0]))))
  const tau = clamp01((t - T.swags[i]) / (T.swags[i + 1] - T.swags[i]))
  // Slow over each hook, fastest at the bottom of the swag: the way a thing rolls through a dip.
  const a = 0.45
  const u = tau - (a * Math.sin(2 * Math.PI * tau)) / (2 * Math.PI)
  const [x, y] = wire(i, u)
  // Riding on the wire: a ball's radius off it, along its normal.
  const [x1, y1] = wire(i, Math.min(1, u + 0.002))
  const [x0, y0] = wire(i, Math.max(0, u - 0.002))
  const dx = x1 - x0
  const dy = y1 - y0
  const L = Math.hypot(dx, dy) || 1
  // The normal pointing up (y down): the wire runs right to left, so (dy, -dx) turned toward -y.
  let nx = dy / L
  let ny = -dx / L
  if (ny > 0) {
    nx = -nx
    ny = -ny
  }
  const give = DIP * Math.sin(Math.PI * u)
  return [x + nx * RIDE, y + give + ny * RIDE]
}

const hookBall = (i: number): Pt => {
  const [x, y] = HOOKS[i]
  return [x, y - RIDE]
}

/** Points along a line, moved `d` off it on its upper side. */
function riding(pts: Pt[], d: number): Pt[] {
  return pts.map((q, i) => {
    const a = pts[Math.max(0, i - 1)]
    const b = pts[Math.min(pts.length - 1, i + 1)]
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const L = Math.hypot(dx, dy) || 1
    let nx = dy / L
    let ny = -dx / L
    if (ny > 0) {
      nx = -nx
      ny = -ny
    }
    return [q[0] + nx * d, q[1] + ny * d] as Pt
  })
}

const GARLAND_PATH = pathOf([...riding(sampleBezier(GARLAND, 60), RIDE + 0.03).slice(0, -1), [GARLAND[3][0], ON_FLOOR], [ROOM.wallL1 + R, ON_FLOOR]])
/** Where they meet the door, and where they are when the curtain has closed. */
export const DOOR_HIT: Pt = [ROOM.wallL1 + R, ON_FLOOR]
export const STREET: Pt = [-16.2, ON_FLOOR]

/** Seb from the top key (the hush) to the street (the curtain). */
export function seb(t: number): Pt {
  if (t < T.lift) return OPENING_END
  if (t < T.kiss) return FLOAT_PATH.at(hermite(t - T.lift, T.kiss - T.lift, FLOAT_PATH.length, 0, 0.12))
  if (t < OFF + 0.14) return KISS_SEB
  const leave = T.hopSeb - HOP_T
  if (t < leave) return [KISS_SEB[0] + (SEB_HOP_FROM[0] - KISS_SEB[0]) * inout((t - OFF - 0.14) / (leave - OFF - 0.14)), ON_STAGE]
  if (t < T.hopSeb) return flight(SEB_HOP_FROM, [CUP.x - CUP.seat, CUP.low], leave, T.hopSeb, t)
  if (t < T.tip) return seat(t, -1)
  if (t < T.swags[0]) {
    // Tipped out over the lip and onto the wire's end, gathering speed.
    const from = seat(T.tip, -1)
    const to = hookBall(0)
    const u = (t - T.tip) / (T.swags[0] - T.tip)
    const f = u * u
    return [from[0] + (to[0] - from[0]) * f, from[1] + (to[1] - from[1]) * f - 0.05 * Math.sin(Math.PI * u)]
  }
  if (t < T.swags[4]) return festoon(t)
  if (t < T.doorOut) {
    const D = T.doorOut - T.swags[4]
    return GARLAND_PATH.at(hermite(t - T.swags[4], D, GARLAND_PATH.length, 1.5, 1.8))
  }
  // Through the door and out into the snow, slowing to a stroll.
  const D = T.end - T.doorOut
  return [DOOR_HIT[0] + (STREET[0] - DOOR_HIT[0]) * hermite(t - T.doorOut, D, 1, 1.25 / Math.abs(STREET[0] - DOOR_HIT[0]), 0.35 / Math.abs(STREET[0] - DOOR_HIT[0])), ON_FLOOR]
}

/** The ride sampled, with arc length, from his seat in the cup (Mia's seat just before it) to the curtain. */
const RIDE_TABLE = (() => {
  const t0 = T.tip
  const n = Math.ceil((T.end - t0) / RIDE_DT)
  const ts: number[] = []
  const xs: number[] = []
  const ys: number[] = []
  const ss: number[] = []
  let s = 0
  let prev = seb(t0)
  for (let i = 0; i <= n; i++) {
    const t = Math.min(T.end, t0 + i * RIDE_DT)
    const q = seb(t)
    s += Math.hypot(q[0] - prev[0], q[1] - prev[1])
    ts.push(t)
    xs.push(q[0])
    ys.push(q[1])
    ss.push(s)
    prev = q
  }
  return { ts, xs, ys, ss }
})()

/** How far behind him she rides: touching. */
const GAP = 2 * R + 0.01

function rideAt(s: number, t: number): Pt {
  const { xs, ys, ss } = RIDE_TABLE
  if (s <= 0) {
    // Still in the cup, from her seat toward the lip where his ride began (so she meets his path where it starts).
    const f = Math.max(0, Math.min(1, (s + GAP) / GAP))
    const a = seat(t, 1)
    const b: Pt = [xs[0], ys[0]]
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]
  }
  let lo = 0
  let hi = ss.length - 1
  if (s >= ss[hi]) return [xs[hi], ys[hi]]
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (ss[mid] <= s) lo = mid
    else hi = mid
  }
  const f = (s - ss[lo]) / (ss[hi] - ss[lo] || 1)
  return [xs[lo] + (xs[hi] - xs[lo]) * f, ys[lo] + (ys[hi] - ys[lo]) * f]
}

function sebS(t: number): number {
  const { ts, ss } = RIDE_TABLE
  const u = (t - ts[0]) / RIDE_DT
  const i = Math.max(0, Math.min(ts.length - 2, Math.floor(u)))
  const f = Math.max(0, Math.min(1, u - i))
  return ss[i] + (ss[i + 1] - ss[i]) * f
}

/** Mia, in the piano's frame, from the stage light opening to the curtain. */
export function mia(t: number): Pt {
  if (t < T.tip) return miaEarly(t)
  return rideAt(sebS(t) - GAP, t)
}

/** When each swag's bulbs light (as he goes over its right-hand hook). */
export const SWAG_LIT = T.swags.slice(0, 4)
