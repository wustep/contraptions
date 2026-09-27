import { R, type Pt } from '../../../../../parts'
import { G as GRAVITY } from '../physics'
import { A, deckAt, G, LIFT, PEDAL, pedalAt, rampPoint, TENTS, WATCH_X } from './geo'
import { heliPoint, SEAT_L } from './heli'

/**
 * Where Louise and Ian are in Montana at every show time of the valley's two legs, in world cells (the VALLEY
 * builder's). Each path is a function of show time, so the lanes carry her on exactly what the drawing shows; the
 * parts sample them.
 */

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const inout = (u: number) => {
  const v = clamp01(u)
  return v * v * (3 - 2 * v)
}
const easeOut = (u: number, p = 2) => 1 - Math.pow(1 - clamp01(u), p)
const easeIn = (u: number, p = 2) => Math.pow(clamp01(u), p)
/** 0 to 1 over a move that starts at `m0` and ends at `m1` (speeds as a share of the mean). */
const hermite01 = (u: number, m0: number, m1: number) => {
  const v = clamp01(u)
  const v2 = v * v
  const v3 = v2 * v
  return (v3 - 2 * v2 + v) * m0 + (-2 * v3 + 3 * v2) + (v3 - v2) * m1
}

/** A polyline walked from `t0` to `t1`, `profile` of the way along its length at each moment. */
function along(pts: Pt[], t0: number, t1: number, profile: (u: number) => number): { at: (t: number) => Pt; length: number } {
  const lens: number[] = [0]
  for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))
  const total = lens[lens.length - 1]
  return {
    length: total,
    at: (t: number) => {
      const s = profile((t - t0) / (t1 - t0)) * total
      let i = 1
      while (i < pts.length - 1 && lens[i] < s) i++
      const seg = lens[i] - lens[i - 1] || 1
      const f = clamp01((s - lens[i - 1]) / seg)
      return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f]
    },
  }
}

/** Up a ramp lying on the meadow: along the grass to where the ball first sits on the ramp's face, up it to its hinge. */
function upRamp(side: 'her' | 'ian', t: number, from: number): Pt[] {
  const dir = side === 'her' ? 1 : -1
  let s = LIFT.ramp
  for (let i = 0; i < 40; i++) {
    const [, y] = rampPoint(t, side, s, R)
    s = Math.max(0, Math.min(LIFT.ramp, s - y / 0.43))
  }
  const pts: Pt[] = [[from, 0]]
  for (let j = 0; j <= 8; j++) pts.push(rampPoint(t, side, s * (1 - j / 8), R))
  pts.push([LIFT.x + dir * (LIFT.half - 0.08), LIFT.rest - R])
  return pts
}

/* ------------------------------------------------------------------ the arrival */

/** Where she stands on the deck, and Ian beside her on her left (the contact seam: 0.42 to her left). */
export const HER_DECK = LIFT.x + 0.45
export const IAN_DECK = HER_DECK - 0.42

/** The door's sill (local), when she goes along the floor to it, when she leaves it, when she is aboard the deck. */
const SILL_L: Pt = [-0.28, SEAT_L[1]]
const FALL = GRAVITY
const DROP_H = (() => {
  const [, y] = heliPoint(110.25, SILL_L)
  return -y
})()
const FALL_T = Math.sqrt((2 * DROP_H) / FALL)
const EDGE = A.touch - FALL_T
const ABOARD = 113.85
/** How fast she leaves the sill (cells a second, to the left), and where she lands. */
const OUT_V = 2.7
/** Along the floor from rest, gathering evenly to OUT_V at the sill. */
const LEAVE = EDGE - (2 * (SEAT_L[0] - SILL_L[0])) / OUT_V
const LAND: Pt = (() => {
  const [x] = heliPoint(EDGE, SILL_L)
  return [x - OUT_V * FALL_T, 0]
})()

/** The decon tent's two ends: she goes in at its right on one beat and comes out at its left on the next. */
const TENT_L = TENTS[0].x - TENTS[0].w / 2
const TENT_R = TENTS[0].x + TENTS[0].w / 2
export const HER_IN = A.out
export const HER_OUT = A.suited
/** Where she is as she goes in (her far side just inside the door), and as she comes out (her centre at the door). */
const IN_X = TENT_R - R
const OUT_X = TENT_L

const herToTent = along([LAND, [IN_X, 0]], A.touch, HER_IN, (u) => u)
const herThrough = along([[IN_X, 0], [OUT_X, 0]], HER_IN, HER_OUT, (u) => u)
const herAboard = (() => {
  const path = upRamp('her', 112.5, OUT_X).concat([[HER_DECK, LIFT.rest - R]])
  let len = 0
  for (let i = 1; i < path.length; i++) len += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1])
  const v = (IN_X - OUT_X) / (HER_OUT - HER_IN)
  // Out of the tent at the pace she went through it, up the ramp, easing to a stop beside him.
  return along(path, HER_OUT, ABOARD, (u) => hermite01(u, (v * (ABOARD - HER_OUT)) / len, 0))
})()

/** Her, from the cut to the top of the lift. */
export function herArrive(t: number): Pt {
  if (t < LEAVE) return heliPoint(t, SEAT_L)
  if (t < EDGE) {
    // Along the cabin floor to the sill, gathering to the speed she leaves it with.
    const u = clamp01((t - LEAVE) / (EDGE - LEAVE))
    return heliPoint(t, [SEAT_L[0] - (SEAT_L[0] - SILL_L[0]) * easeIn(u, 2), SEAT_L[1]])
  }
  if (t < A.touch) {
    // Off the sill and down to the grass: a fall from rest, carried on at the speed she left it.
    const [sx, sy] = heliPoint(EDGE, SILL_L)
    const tt = t - EDGE
    return [sx - OUT_V * tt, sy + (0 - sy) * (tt / FALL_T) ** 2]
  }
  if (t < HER_IN) return herToTent.at(t)
  if (t < HER_OUT) return herThrough.at(t)
  if (t < ABOARD) return herAboard.at(t)
  return [HER_DECK, deckAt(t) - R]
}
/** Whether she has her suit on: from inside the tent. */
export const herSuited = (t: number): boolean => t > (HER_IN + HER_OUT) / 2 && t < A.end + 0.5

/** Ian: in the decon tent from the cut, in his suit; out of its near door as the helicopter comes, up the ramp first. */
const IAN_START: Pt = [TENTS[0].x + 0.2, 0]
const IAN_OUT = 109.35
const IAN_ABOARD = 111.5
const ianRoll = along(upRamp('her', 110.2, IAN_START[0]).concat([[IAN_DECK, LIFT.rest - R]]), IAN_OUT, IAN_ABOARD, (u) => hermite01(u, 0, 0) * 0.6 + easeOut(u, 2) * 0.4)

export function ianArrive(t: number): Pt {
  if (t < IAN_OUT) return IAN_START
  if (t < IAN_ABOARD) return ianRoll.at(t)
  return [IAN_DECK, deckAt(t) - R]
}
/** When Ian comes out of the tent's near door (its flap swings), and when she goes in and comes out. */
export const IAN_EXIT = (() => {
  for (let t = IAN_OUT; t < IAN_ABOARD; t += 0.005) if (ianArrive(t)[0] <= TENT_L) return t
  return IAN_OUT
})()

/* ------------------------------------------------------------------ the going */

/** Where she is at the cut in: on the meadow between the lift and the pedal, at rest. */
export const HER_START: Pt = [PEDAL.x0 - 0.4, 0]
/** On the pedal: over its plate once it is pressed flat. */
const ON_PEDAL: Pt = [PEDAL.x0 + 0.2, -0.055]
/** Where she watches from, and where they meet. */
const WATCH: Pt = [WATCH_X, 0]
export const MEET: Pt = [14.2, 0]
export const IAN_FROM: Pt = [23.2, 0]
const OFF = G.down + 0.1
const REST = 317.9
const IAN_GO = 325.0
const SETTLE = 331.7

/** How high the pedal's plate holds her above the grass at `t` (it rises again as she leaves it). */
const onPlate = (t: number) => ON_PEDAL[1] - (1 - pedalAt(t)) * 0.07

export function herGoing(t: number): Pt {
  if (t < G.pedal) {
    // Across to the pedal and up onto its raised end as it gives under her.
    const u = inout((t - G.shut) / (G.pedal - G.shut))
    const climb = 0.1 * Math.sin(Math.PI * clamp01((u - 0.5) / 0.5)) * (u > 0.5 ? 1 : 0)
    return [HER_START[0] + (ON_PEDAL[0] - HER_START[0]) * u, HER_START[1] + (ON_PEDAL[1] - HER_START[1]) * inout((u - 0.45) / 0.55) - climb]
  }
  if (t < OFF) return [ON_PEDAL[0], onPlate(t)]
  if (t < REST) {
    // Off it, on out into the meadow, to see the shell go.
    const u = hermite01((t - OFF) / (REST - OFF), 0.4, 0)
    const [x0, y0] = [ON_PEDAL[0], onPlate(OFF)]
    const down = inout((t - OFF) / 0.4)
    return [x0 + (WATCH[0] - x0) * u, y0 * (1 - down)]
  }
  if (t < G.lit) return WATCH
  if (t < G.touch) {
    const u = hermite01((t - G.lit) / (G.touch - G.lit), 0, 0.5)
    return [WATCH[0] + (MEET[0] + 0.03 - WATCH[0]) * u, 0]
  }
  // They touch: a little give, and rest together.
  const s = t - G.touch
  const give = -0.06 * Math.exp(-s / 0.35) * Math.sin(Math.min(Math.PI, s * 3.2))
  return [MEET[0] + 0.03 - 0.03 * inout(s / (SETTLE - G.touch)) + give, 0]
}

export function ianGoing(t: number): Pt {
  if (t < IAN_GO) return IAN_FROM
  const meet = MEET[0] + 0.03 + 2 * R + 0.005
  if (t < G.touch) {
    const u = hermite01((t - IAN_GO) / (G.touch - IAN_GO), 0, 0.35)
    return [IAN_FROM[0] + (meet - IAN_FROM[0]) * u, 0]
  }
  const s = t - G.touch
  const give = 0.07 * Math.exp(-s / 0.35) * Math.sin(Math.min(Math.PI, s * 3.2))
  return [meet + (MEET[0] + 0.36 - meet) * inout(s / (SETTLE - G.touch)) + give, 0]
}
