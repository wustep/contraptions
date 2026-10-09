import { FLOOR, R, laneAt, mixHex, type Lane, type Pt } from '../../../../../parts'
import type { ShowBall } from '../../../../../show'
import { topWobble, wakingSpin } from '../cast'
import { route, smooth, type Way } from '../kit'
import { DURATION, LAST, PIANO, PIANO_SPIN, bar, beat, onset } from '../music'
import { HOME, HOME_THEME, KIDS, KID_DARK, KID_ID, KID_SCALE } from '../worlds'

/**
 * Home, as numbers: the house and the garden, when each thing happens, where Cobb goes, where the children are and
 * how they look, how the doors swing, and how the top stands and turns at any show time. Nothing here draws
 * (`home-draw.ts` does); the part (`home.ts`) builds its lane and its camera from these.
 *
 * The house is seen side-on with its near wall taken away, left to right: the porch, the front door, a short hall
 * that is the dining room too, the kitchen table with a chair at each end, the counter, and the glass doors in the end
 * wall; then the terrace and the lawn, a tree with a swing from its branch, and a wall round the garden (limbo's
 * garden, the one he remembers). The part's frame is the world's: Cobb comes in at (-0.5, 0) through the front door.
 */

/* ------------------------------------------------------------------ the music */

/** The piano alone: in at the door on its first chord; the top set spinning on its loudest. */
export const T0 = PIANO
export const SPIN = PIANO_SPIN
/** Out through the glass doors (bar 66); the children turn (67); they come to him (68); the embrace (69). */
export const OUT = bar(66)
export const TURN = bar(67)
export const MEET = bar(68)
export const HOLD = bar(69)
/** The top's chords, alone on the screen: its tip catches and its lean lurches (bars 70, 71), and the last chord. */
export const TICKS = [bar(70), bar(71), LAST] as const

/**
 * The doors knock against their stops on the piano's soft notes: the front door, swung wide as he came in, as the
 * veil clears; the glass door, flung out as he goes through, against the house.
 */
export const KNOCK = {
  front: onset(245.354, 0.6),
  glass: beat(265),
} as const

/* ------------------------------------------------------------------ the house */

/**
 * The floor's near edge is `FLOOR` (a ball rolling on it has its centre at 0); the floor is seen a little from above,
 * running back to the wall's foot at `back`. The ceiling's underside at `ceil`.
 */
export const HOUSE = {
  back: -0.2,
  ceil: -3.5,
  slab: 0.28,
  /** The front wall, cut: its two faces, and the doorway's head. */
  front: [-1.05, -0.7] as Pt,
  frontHead: -2.32,
  /** The end wall onto the garden, cut: its faces, and the glass doorway's head. */
  end: [5.62, 5.92] as Pt,
  endHead: -2.45,
  /** The roof's ridge and eaves. */
  ridge: -5.55,
  eave: 0.5,
}

/**
 * The kitchen table and its chairs are his size (as every table in the show is, and as the one in limbo is: the same
 * table, the top on it): its top a little over a ball's height, a chair at each end, their backs outward. The near
 * one stands pulled out from the table, so he comes up to the table's end beside it and not through it.
 */
export const TABLE = { x0: 3.0, x1: 4.45, top: FLOOR - 0.32, feet: FLOOR - 0.05 }
export const CHAIRS = [
  { x0: 2.3, x1: 2.64, seat: FLOOR - 0.2, top: FLOOR - 0.64, back: 'left' as const },
  { x0: 4.59, x1: 4.93, seat: FLOOR - 0.2, top: FLOOR - 0.64, back: 'right' as const },
]
/** The counter along the back wall between the table and the doors, and the window over it. */
export const COUNTER = { x0: 4.5, x1: 5.5, top: -1.38, upper: [-3.32, -2.4] as Pt, win: [-2.28, -1.56] as Pt }

/** The top's tip on the table, by its end: lying, its crown just over the edge, over where he comes to it. */
export const TOP_AT: Pt = [TABLE.x0 + 0.25, TABLE.top]
/**
 * A top at rest lies on its side, its tip and its shoulder's rim on the table: 0.957 rad from upright (for the canonical
 * top's shape). This one lies with its crown to the left, toward him as he comes.
 */
export const LYING = 0.957

/* ------------------------------------------------------------------ the garden */

/** The garden's ground: its near edge at `FLOOR`, running back to the wall's foot at `back`. The terrace to `terrace`. */
export const GARDEN = {
  back: -0.34,
  terrace: 7.05,
  /** The wall round the garden: its coping's top. */
  wall: -1.18,
  /** The tree's trunk and the branch the swing hangs from. */
  tree: 10.6,
  swing: [9.92, -2.12] as Pt,
  rope: 1.86,
  /** The sun, low, behind the children as he sees them, over the garden wall: where the camera at `SUN_CAM` sees it. */
  sun: [9.75, -1.42] as Pt,
}
/** The camera the far things are drawn for: they move less than it does. */
export const SUN_CAM: Pt = [8.2, -0.8]

/* ------------------------------------------------------------------ Cobb */

/** Where he stops on the lawn: his mark comes to rest turned to the children (a little down, to them). */
export const STOP_X = R * (2 * Math.PI * 9 + 0.15)

/** Where he is when he comes to the table: touching its end, under the top's crown. */
const TOUCH_X = TABLE.x0 + 0.04 - R

/**
 * Cobb's lane for a slot from `begin` (the piano's first chord, the cut) to `end`: in at the door at 1.0 c/s, down the
 * hall, slowing as he comes to the table, and on the loudest chord he comes up against its end, under the top, and it
 * stands up spinning; the touch sends him back a little. He does not wait to watch it: on past the table, gathering
 * pace, to the glass doors and through them on the chord; out onto the lawn, easing to rest short of the children;
 * and there to the end.
 */
export function laneFor(begin: number, end: number): Lane {
  const u = (t: number) => t - begin
  const w0: Way = { at: 0, p: [-0.5, 0] }
  // Down the hall at the seam's pace, then slowing to the table: 1.0 c/s to half that as he comes up to it.
  const vIn = 1.0
  const vTouch = 0.5
  const D = TOUCH_X + 0.5
  const T = SPIN - begin
  const t1 = (D - ((vIn + vTouch) / 2) * T) / (vIn - (vIn + vTouch) / 2)
  const w1: Way = { at: t1, p: [-0.5 + vIn * t1, 0] }
  const w2: Way = { at: u(SPIN), p: [TOUCH_X, 0], ramp: [vIn, vTouch] }
  // The touch sends him back a little, easing to rest.
  const back = 0.22
  const rest = 0.45
  const w3: Way = { at: u(SPIN) + rest, p: [TOUCH_X - 0.5 * back * rest, 0], ramp: [back, 0] }
  // On at once, past the table, gathering pace, then steady to the doors, and through them on the chord.
  const Tgo = OUT - (SPIN + rest)
  const Tup = 1.6
  const dist = DOOR_CONTACT - w3.p[0]
  const vDoor = dist / (Tgo - Tup / 2)
  const w4: Way = { at: u(SPIN + rest + Tup), p: [w3.p[0] + (vDoor * Tup) / 2, 0], ramp: [0, vDoor] }
  const w5: Way = { at: u(OUT), p: [DOOR_CONTACT, 0] }
  // Out across the terrace onto the lawn, easing to rest.
  const stopAt = OUT + (2 * (STOP_X - DOOR_CONTACT)) / vDoor
  const w6: Way = { at: u(stopAt), p: [STOP_X, 0], ramp: [vDoor, 0] }
  const w7: Way = { at: end - begin, p: [STOP_X, 0] }
  return { segs: route([w0, w1, w2, w3, w4, w5, w6, w7]), fire: u(SPIN) }
}
/** Where his leading edge meets the closed glass door. */
export const DOOR_CONTACT = HOUSE.end[1] - 0.05 - 0.04 - R
/** Where he comes to rest on the lawn, and when. */
export const LANE = laneFor(T0, DURATION)
export const cobbAt = (t: number): Pt => {
  const p = laneAt(LANE, t - T0)
  return [p.x, p.y]
}

/* ------------------------------------------------------------------ the doors */

/** Critically damped from 0 to 1 over about `tau` × 4 seconds from `u` = 0: quick to start, easing to rest. */
const settle = (u: number, tau: number): number => (u <= 0 ? 0 : 1 - Math.exp(-u / tau) * (1 + u / tau))

/**
 * A door flung from shut to `target` (radians) by a push at `u` = 0: it swings, slowing, and knocks against its stop at
 * `T` still moving, bounces back a little and settles there.
 */
function swingTo(u: number, T: number, target: number, bounce: number): number {
  if (u <= 0) return 0
  if (u < T) {
    const s = u / T
    return target * (0.35 * s + 0.65 * (1 - (1 - s) * (1 - s)))
  }
  const v = u - T
  return target - bounce * (1 - Math.exp(-v / 0.04)) * Math.exp(-v / 0.32)
}

/**
 * The front door: how far open it stands (radians, 0 shut, π/2 back against the wall). He pushed it as he came
 * through, just before the chord; it swings wide under the veil and knocks against its stop as the veil clears.
 */
export const frontDoor = (t: number): number => swingTo(t - (T0 - 0.5), KNOCK.front - (T0 - 0.5), Math.PI / 2, 0.1)

/**
 * The glass door onto the garden, hung on the end wall's outer face: shut until he pushes it on the chord, then
 * swinging out through the garden and back against the house, where it knocks, and rests.
 */
export const glassDoor = (t: number): number => swingTo(t - OUT, KNOCK.glass - OUT, Math.PI * 0.97, 0.16)
/** The glass door's hinge (the end wall's outer face), its width, and the pane's half-thickness when shut. */
export const GLASS = { hinge: 5.92, w: 1.05, half: 0.04 }

/** The empty swing's angle from hanging straight (radians, + swings right): the children have just left it; a breeze. */
export const swingAngle = (t: number): number => 0.06 * Math.sin((2 * Math.PI * t) / 3.1) + 0.025 * Math.sin((2 * Math.PI * t) / 4.9 + 1.3)

/* ------------------------------------------------------------------ the children */

export const KR = R * KID_SCALE
const KID_Y = FLOOR - KR
/** Where they play on the lawn by the swing, their backs to the house. */
export const KIDS_AT = [8.84, 9.36] as const
/** How long each takes to turn round (the light coming round onto them), and how much after the first the second turns. */
const TURN_FOR = 1.15
const TURN_LAG = [0, 0.32]
/** When each sets off to him, and where each comes to rest: a little space from him, and from each other. */
const RUN_AT = [TURN + 1.25, TURN + 1.5]
const GAP = [0.1, 0.075]
const MEET_X = [STOP_X + R + KR + GAP[0], STOP_X + R + KR + GAP[0] + 2 * KR + GAP[1]]
/** The embrace: they close the space. */
const HUG_FROM = HOLD - 0.75
const HUG_X = [STOP_X + R + KR + 0.002, STOP_X + R + 3 * KR + 0.004]

/**
 * A child's run, as a share of the way at a share of the time: easing from rest over its first 45%, running, and
 * slowing over its last 22% to a stop that is clearly a stop (on the chord), a little short of him.
 */
const RUN_UP = 0.45
const RUN_DOWN = 0.22
const run = (s: number): number => {
  const u = Math.max(0, Math.min(1, s))
  // Speed rises as a half-sine over RUN_UP, holds, and falls straight to nothing over RUN_DOWN; the area is the way.
  const a = RUN_UP
  const d = RUN_DOWN
  const total = a / 2 + (1 - a - d) + d / 2
  let x: number
  if (u < a) x = (a / Math.PI) * (Math.PI * (u / a) / 2 - Math.sin(Math.PI * (u / a)) / 2) * 1
  else if (u < 1 - d) x = a / 2 + (u - a)
  else {
    const v = (u - (1 - d)) / d
    x = a / 2 + (1 - a - d) + d * (v - (v * v) / 2)
  }
  return x / total
}
/** How far round the child has turned: 0 its back to the house, 1 facing him in its own colours. */
export const turned = (i: number, t: number): number => smooth(t, TURN + TURN_LAG[i], TURN + TURN_LAG[i] + TURN_FOR)

/** Where child `i` is at show time `t` (x on the lawn). */
export function kidX(i: number, t: number): number {
  const x0 = KIDS_AT[i]
  // At play before they turn: small shifts of weight (on the house's own clock), stilling as they turn.
  const play = (1 - smooth(t, TURN - 1.2, TURN + 0.2)) * (i === 0 ? 0.045 * Math.sin((2 * Math.PI * t) / 4.3 + 0.4) : 0.1 * Math.sin((2 * Math.PI * t) / 3.3 + 2.1))
  if (t < RUN_AT[i]) return x0 + play
  const toMeet = run((t - RUN_AT[i]) / (MEET - RUN_AT[i]))
  let x = x0 + (MEET_X[i] - x0) * toMeet
  if (t > HUG_FROM) {
    const s = Math.min(1, (t - HUG_FROM) / (HOLD - HUG_FROM))
    x += (HUG_X[i] - MEET_X[i]) * s * s
  }
  return x
}

/**
 * Come to him, they cannot keep still: between bar 68 and the embrace each gives little hops on the beats, by turns
 * (the elder on the first and third, the younger on the second), a few hundredths of a cell, landing on the beat.
 */
const HOP_H = 0.07
const HOP_T = 0.3
const HOPS: number[][] = [[beat(4 * 68 + 1), beat(4 * 68 + 3)], [beat(4 * 68 + 2)]]
function hop(i: number, t: number): number {
  for (const at of HOPS[i]) {
    const u = (t - (at - HOP_T)) / HOP_T
    if (u > 0 && u < 1) return 4 * HOP_H * u * (1 - u)
  }
  return 0
}

/** The warm rim the sun puts round them while they are dark against it. */
export const RIM = mixHex(HOME.sun, HOME.floor, 0.32)

/** The two children as balls, at show time `t` (the part's frame, which is the world's). */
export function kids(t: number): ShowBall[] {
  return [0, 1].map((i) => {
    const e = turned(i, t)
    // Their backs to him, dark, a warm rim of sun round them and no face. As they turn the rim goes (the sun is behind
    // them now) and their faces (a ball's mark) come round over the top to him, looking up a little (he is taller).
    const r = Math.min(1, e / 0.5)
    const f = Math.max(0, Math.min(1, (e - 0.42) / 0.58))
    const face = e < 0.42 ? null : -Math.PI / 2 - (Math.PI / 2 - 0.32) * (f * f * (3 - 2 * f))
    return {
      id: KID_ID + i,
      x: kidX(i, t),
      y: KID_Y - hop(i, t),
      color: mixHex(KID_DARK, KIDS[i], e),
      rim: mixHex(RIM, HOME_THEME.ink, r * r * (3 - 2 * r)),
      scale: KID_SCALE,
      spin: face,
    }
  })
}

/* ------------------------------------------------------------------ the top */

/**
 * Its spin: set going at `W0` turns a second and slowing, so it stands upright until about 263 s (while he goes out to
 * the children), begins to lean as the camera comes back to it, and in the last bars is plainly slowing (the shine's
 * bands can be followed round), leaning about 0.33 rad at the last chord and precessing nearly three times a second:
 * wobbling, still up, still turning.
 */
const W0 = 36.9
const DECAY = 0.1108
/** Its precession's phase, integrated once (the rate changes as it slows). */
const PDT = 1 / 200
const PN = 80 * 200
const PREC = (() => {
  const a = new Float64Array(PN + 1)
  let ph = Math.PI
  a[0] = ph
  for (let i = 1; i <= PN; i++) {
    const { rate } = wakingSpin((i - 0.5) * PDT, W0, DECAY)
    ph += 2 * Math.PI * topWobble(rate).prec * PDT
    a[i] = ph
  }
  return a
})()
const precAt = (u: number): number => {
  const x = Math.max(0, u / PDT)
  const i = Math.min(PN - 1, Math.floor(x))
  const f = Math.min(1, x - i)
  return PREC[i] * (1 - f) + PREC[i + 1] * f
}

export interface TopState {
  tip: Pt
  phase: number
  lean: number
  prec: number
  blur: number
  /** How fast it turns (turns a second), 0 at rest. */
  rate: number
  /** Its lean across the screen (radians, + to the right): for its long shadow. */
  sway: number
}

/**
 * The top at show time `t`. Before the chord it lies on its side. On the chord it stands up from where he touched it
 * (swiftly, settling with a small nod) and spins; it slows (`wakingSpin`), stays upright a long while, and as it slows
 * it begins to lean and precess (`topWobble`). On each chord it is alone on the screen for, its tip catches and the
 * lean lurches across and swings back, damped.
 */
export function topAt(t: number): TopState {
  const tip: Pt = [TOP_AT[0], TOP_AT[1]]
  if (t < SPIN) return { tip, phase: 0, lean: LYING, prec: Math.PI, blur: 0, rate: 0, sway: -LYING }
  const u = t - SPIN
  const { phase, rate } = wakingSpin(u, W0, DECAY)
  const w = topWobble(rate)
  const phi = precAt(u)
  const rise = settle(u, 0.07)
  let sx = w.lean * Math.cos(phi) - LYING * (1 - rise) + 0.075 * Math.exp(-u / 0.42) * Math.sin(2 * Math.PI * 2.3 * u) * rise
  const sy = w.lean * Math.sin(phi)
  TICKS.forEach((c, i) => {
    const v = t - c
    if (v < 0 || v > 5) return
    const a = [0.11, 0.13, 0.15][i] * (i % 2 ? 1 : -1)
    sx += a * (1 - Math.exp(-v / 0.035)) * Math.exp(-v / 1.0) * Math.cos(2 * Math.PI * 1.15 * v)
    tip[0] += 0.014 * (i % 2 ? 1 : -1) * (1 - Math.exp(-v / 0.03)) * Math.exp(-v / 0.5)
  })
  const lean = Math.hypot(sx, sy)
  return { tip, phase, lean, prec: Math.atan2(sy, sx), blur: Math.min(0.9, 0.25 + rate / 30), rate, sway: sx }
}

/** For the report and the probes: how the top stands at the chords. */
export const TOP_TUNE = { W0, DECAY }
