import { laneAt, R, type Pt, type Seg } from '../../../../../parts'
import { CAB } from '../cab'
import { carried, route, type Way } from '../kit'
import { a, at, beats, SEAM } from '../music'
import { hop } from '../physics'

/**
 * New Jersey's clock and ground (138.142 → 176.689, bars 65 to 82: the guitar solo, then "I can't stand this
 * indecision"), in the place's own cells. Marty comes in at (-0.5, 0) on the back seat of Wally's cab, Rachel beside him.
 *
 * Left to right, one long night: the two-lane road (poles, posts, trees), the farmhouse in its yard, the barn, the
 * field, and the airfield's apron, where the airliner stands with its boarding stair rolled up to its rear door.
 */

export const T0 = SEAM.jersey
export const T1 = SEAM.tokyo

/** The road's surface (the cab's wheels on it), and a ball resting on the ground. */
export const ROAD = CAB.road
export const GB = ROAD - R

/* ------------------------------------------------------------------ the drive */

/** Cruising speed, cells a second. */
const V = 4
/** The guitar comes in: the cab pulls away. */
export const PULL = T0
const CRUISE = at(66, 1)
const BRAKE = at(68, 3)
/** It pulls up at the farmhouse. */
export const HALT = at(69, 1)
export const START_X = -0.5
const X_CRUISE = START_X + 0.5 * V * (CRUISE - T0)
const X_BRAKE = X_CRUISE + V * (BRAKE - CRUISE)
/** Where the cab's back seat stops: everything at the farm is laid from here. */
export const S = X_BRAKE + 0.5 * V * (HALT - BRAKE)
/** Wally backs away, after the first shots. */
export const REVERSE = at(71, 1)

/** The back seat's x: from rest on the guitar, up to speed in a bar, cruising, braking to the farmhouse; then away. */
export function cabX(t: number): number {
  if (t <= T0) return START_X
  if (t < CRUISE) return START_X + (0.5 * V * (t - T0) ** 2) / (CRUISE - T0)
  if (t < BRAKE) return X_CRUISE + V * (t - CRUISE)
  if (t < HALT) {
    const s = t - BRAKE
    return X_BRAKE + V * s - (0.5 * V * s * s) / (HALT - BRAKE)
  }
  if (t < REVERSE) return S
  const s = t - REVERSE
  // Backing off: up to 3 cells a second in a second and a half.
  const acc = 2
  const tm = 1.5
  return s < tm ? S - 0.5 * acc * s * s : S - 0.5 * acc * tm * tm - acc * tm * (s - tm)
}

/** The road's joints the front wheels hit, one a beat while it drives: the body jolts on its springs. */
export const BUMPS = beats([65, 2], [68, 4])

const knockUp = (since: number, f: number, tau: number) => (since < 0 ? 0 : Math.exp(-since / tau) * Math.sin(since * f * Math.PI * 2))
/** A sag that starts from rest: the body squatting on its springs as it pulls away. */
const squat = (since: number, f: number, tau: number) => (since < 0 ? 0 : Math.exp(-since / tau) * 0.5 * (1 - Math.cos(since * f * Math.PI * 2)))

/** The body's bob on its springs, cells (y down). */
export function bob(t: number): number {
  let y = 0.07 * squat(t - PULL, 1.6, 0.45)
  for (const b of BUMPS) y -= 0.075 * knockUp(t - b, 2.6, 0.2)
  y += 0.09 * knockUp(t - HALT, 2.2, 0.28)
  return y
}

/* ------------------------------------------------------------------ the farm */

/** The farmhouse, its porch, the gate. */
export const HOUSE: [number, number] = [S + 5.6, S + 12.2]
export const PORCH: [number, number] = [S + 6.6, S + 10.6]
export const PORCH_Y = ROAD - 0.55
export const GATE_X = S + 4.2
/** The window the shots come from (ground floor, right of the porch), its centre. */
export const SHOT_WIN: Pt = [S + 11.3, ROAD - 2.0]
/** The barn: its two end walls' outer faces; the loft. */
export const BX0 = S + 13.8
export const BX1 = S + 22.2
export const LOFT_Y = ROAD - 3.4
export const LOFT_X1 = S + 19.7
/** The barn's back window (the shot at the lantern comes through it) and the lantern on its hook. */
export const BARN_WIN: Pt = [S + 15.4, ROAD - 2.3]
export const LANTERN: Pt = [S + 17.2, ROAD - 2.75]
export const BALES_TOP = ROAD - 0.9
/** The far end's hay door, hinged at its head: its inner face, its head. */
export const DOOR_FACE = BX1 - 0.22
export const DOOR_HEAD = ROAD - 2.5

/* ------------------------------------------------------------------ the clock of the trouble */

export const HOP_M = at(69, 2)
export const LAND_M = at(69, 3)
export const HOP_R = at(69, 3)
export const LAND_R = at(69, 4)
/** The porch light clicks on. */
export const PORCH_ON = at(70, 1)
export const GATE_T = at(70, 3)
/** The shots from the window: white bursts on the guitar's hard beats. */
export const SHOTS = [at(70, 4), at(71, 2), at(71, 4)]
/** They flinch on the first, and land on its "a". */
export const FLINCH = a(70, 4)
/** In at the barn's open end. */
export const IN_BARN = at(72, 1)
/** The shot through the barn's window that takes the lantern off its hook. */
export const LANTERN_SHOT = at(72, 2)
/** It lands in the hay and bursts: the barn is alight. */
export const LANTERN_DOWN = at(72, 3)
export const FLARE = at(72, 4)
/** Burning hay falling from the loft, landing on beats: where, and when. */
export const HAY: { x: number; t: number; big?: boolean }[] = [
  { x: S + 16.2, t: at(72, 4) },
  { x: S + 18.95, t: at(73, 1), big: true },
  { x: S + 17.6, t: at(74, 2) },
  { x: S + 18.9, t: at(74, 4), big: true },
  { x: S + 20.7, t: at(75, 1), big: true },
  { x: S + 15.3, t: at(75, 2) },
  { x: S + 18.2, t: at(75, 4), big: true },
  { x: S + 16.8, t: at(76, 2) },
]
/** Marty against the shut hay door, on the beat; back to the floor on its "a": a rally against a door. */
export const DOOR_HITS = [at(73, 2), at(73, 3), at(73, 4), at(74, 1)]
export const DOOR_FLOORS = [a(73, 2), a(73, 3), a(73, 4)]
/** The door gives on the fourth. */
export const DOOR_OPEN = at(74, 1)
export const OUT_LAND = a(74, 1)

/* ------------------------------------------------------------------ the ambulance */

/** Where Rachel stops in the field; the ambulance's back end, parked. */
const RACHEL_RUN0 = at(74, 2)
const RACHEL_MID = at(74, 4)
export const RACHEL_STOP = at(75, 3)
const RS_X = S + 20.3 + 0.5 * 3 * (RACHEL_MID - RACHEL_RUN0) + 0.5 * 3 * (RACHEL_STOP - RACHEL_MID)
export const RS = RS_X
export const AMB_X = RS - 0.95
/** Its length, from its back end; the roof's height over the road. */
export const AMB_LEN = 5.6
export const AMB_ROOF = 2.45
export const AMB_FROM = at(75, 1)
export const AMB_STOP = at(76, 3)
export const DOORS_OPEN = at(76, 4)
export const COT_OUT = at(77, 1)
export const ON_COT = at(77, 2)
export const COT_IN0 = at(77, 3)
export const COT_IN = at(77, 4)
export const SHUT = at(78, 1)
export const LEAVE = at(78, 2)
/** Its red light, flashing on every beat it is in the picture. */
export const RED_FLASHES = beats([75, 3], [80, 2])
const AMB_IN = 18
const AMB_ACC = (2 * AMB_IN) / (AMB_STOP - AMB_FROM) ** 2
const LEAVE_ACC = 0.55
const LEAVE_V = 2.2

/** The ambulance's back end: braking in from the right; parked; pulling away to the left, toward the city. */
export function ambX(t: number): number {
  if (t < AMB_STOP) return AMB_X + 0.5 * AMB_ACC * (AMB_STOP - t) ** 2
  if (t < LEAVE) return AMB_X
  const s = t - LEAVE
  const tm = LEAVE_V / LEAVE_ACC
  return s < tm ? AMB_X - 0.5 * LEAVE_ACC * s * s : AMB_X - 0.5 * LEAVE_ACC * tm * tm - LEAVE_V * (s - tm)
}
/** The cot: how far it is out of the back doors (0 in, 1 out). */
export function cotOut(t: number): number {
  if (t < DOORS_OPEN + 0.1) return 0
  if (t < COT_OUT) return easeIn((t - DOORS_OPEN - 0.1) / (COT_OUT - DOORS_OPEN - 0.1))
  if (t < COT_IN0) return 1
  if (t < COT_IN) return 1 - (t - COT_IN0) / (COT_IN - COT_IN0)
  return 0
}
const easeIn = (u: number) => {
  const v = Math.max(0, Math.min(1, u))
  return v * v * (3 - 2 * v)
}
/** How far the cot reaches out past the back end, all the way out; its top's height. */
export const COT_REACH = 2.1
export const COT_TOP = ROAD - 0.62

/* ------------------------------------------------------------------ the airfield */

/** The boarding stair's foot, its six steps (0.4 up and 0.4 along each), the door at its head. */
export const SF = S + 28.0
export const STEP = 0.4
export const STEPS = 6
export const DOOR_X = SF + STEP * STEPS
/** The cabin floor, level with the stair's head; the window's sill and its centre. */
export const FLOOR = ROAD - STEP * STEPS
export const WIN_X = DOOR_X + 1.0
export const SILL = FLOOR - 1.05
export const WIN_R = 0.3
export const WIN_C: Pt = [WIN_X, SILL - WIN_R - 0.02]
/** Where he rests at the cut. */
export const REST: Pt = [WIN_X, SILL - R]

/** The indecision, and the stair. */
const M0 = RS + 0.45
const LEFT1 = at(79, 3)
const RIGHT1 = at(80, 1)
const LEFT2 = at(80, 2)
const FOOT = at(80, 4)
export const STOPS = [LEFT1, RIGHT1, LEFT2, FOOT]
export const STEP_TIMES = beats([81, 1], [82, 2])
export const IN_CABIN = at(82, 3)
export const ON_SILL = at(82, 4)

/* ------------------------------------------------------------------ the ways */

/** Timed waypoints, built up a move at a time from where the last left off. */
class Path {
  ways: Way[]
  constructor(t: number, p: Pt) {
    this.ways = [{ at: t, p }]
  }
  get last(): Way {
    return this.ways[this.ways.length - 1]
  }
  hold(t: number): this {
    this.ways.push({ at: t, p: this.last.p })
    return this
  }
  hop(t: number, p: Pt): this {
    this.ways.push(hop(this.last, p, t))
    return this
  }
  /** A roll from rest to rest: up to speed and down again, half and half. */
  roll(t: number, x: number, y = this.last.p[1]): this {
    const from = this.last
    const mid = (from.at + t) / 2
    const v = (2 * Math.abs(x - from.p[0])) / (t - from.at)
    this.ways.push({ at: mid, p: [(from.p[0] + x) / 2, (from.p[1] + y) / 2], ramp: [0, v] })
    this.ways.push({ at: t, p: [x, y], ramp: [v, 0] })
    return this
  }
  /** A straight run from one speed to another. */
  ramp(t: number, v0: number, v1: number, y = this.last.p[1]): this {
    const from = this.last
    const x = from.p[0] + ((v0 + v1) / 2) * (t - from.at)
    this.ways.push({ at: t, p: [x, y], ramp: [Math.max(1e-3, Math.abs(v0)), Math.max(1e-3, Math.abs(v1))] })
    return this
  }
  to(t: number, p: Pt): this {
    this.ways.push({ at: t, p })
    return this
  }
}

/** On the seat, riding with the cab exactly. */
const seated = (dx: number) => (t: number): Pt => [cabX(t) + dx, bob(t)]
const RIDE_N = (t0: number, t1: number) => Math.ceil((t1 - t0) * 90)

/** The run from the gate to the barn: up to speed in a beat and a third, then flat out. */
const V_RUN = 5

/** Marty's lane. */
function martyWay(): Seg[] {
  const ride = carried(seated(0), T0, HOP_M, RIDE_N(T0, HOP_M))
  const p = new Path(HOP_M, seated(0)(HOP_M))
  p.hop(LAND_M, [S + 0.45, GB])
  p.hold(PORCH_ON)
  p.roll(GATE_T, GATE_X)
  p.hold(SHOTS[0])
  p.hop(FLINCH, [GATE_X, GB])
  p.ramp(SHOTS[1], 0, V_RUN)
  p.ramp(IN_BARN, V_RUN, V_RUN)
  // Through the barn to the shut hay door, slowing to the speed of his first hop at it.
  const contact: Pt = [DOOR_FACE - R, GB - 0.55]
  const p0: Pt = [contact[0] - 0.75, GB]
  const vHop = 0.75 / (DOOR_HITS[0] - at(73, 1))
  const dist = p0[0] - p.last.p[0]
  const vEnd = Math.max(0.6, (2 * dist) / (at(73, 1) - IN_BARN) - V_RUN)
  p.ways.push({ at: at(73, 1), p: p0, ramp: [V_RUN, vEnd] })
  void vHop
  // The rally against the door: up to it on the beat, back to the floor on the "a".
  for (let i = 0; i < DOOR_HITS.length; i++) {
    p.hop(DOOR_HITS[i], contact)
    if (i < DOOR_FLOORS.length) p.hop(DOOR_FLOORS[i], p0)
  }
  // It gives: out through it, down onto the field, rolling on, and back to her.
  p.hop(OUT_LAND, [BX1 + 0.9, GB])
  const vOut = (BX1 + 0.9 - contact[0]) / (OUT_LAND - DOOR_OPEN)
  const stopX = BX1 + 0.9 + (vOut / 2) * (RACHEL_MID - OUT_LAND)
  p.ways.push({ at: RACHEL_MID, p: [stopX, GB], ramp: [vOut, 0] })
  p.hold(at(75, 2))
  p.roll(at(75, 4), M0)
  // The indecision: toward her tail lights, back toward the plane, toward the lights, and to the stair.
  p.hold(at(79, 1))
  p.roll(LEFT1, M0 - 1.2)
  p.roll(RIGHT1, M0 + 0.85)
  p.roll(LEFT2, M0 + 0.25)
  p.roll(FOOT, SF - 0.3)
  // Up the stair, a step a beat.
  for (let k = 1; k <= STEPS; k++) p.hop(STEP_TIMES[k - 1], [SF + STEP * k - 0.2, ROAD - STEP * k - R])
  p.roll(IN_CABIN, WIN_X - 0.5)
  p.hop(ON_SILL, REST)
  p.hold(T1)
  return [...ride, ...route(p.ways)]
}

/** Rachel's lane: the same, her own way, until she is inside the ambulance. */
function rachelWay(): Seg[] {
  const ride = carried(seated(0.6), T0, HOP_R, RIDE_N(T0, HOP_R))
  const p = new Path(HOP_R, seated(0.6)(HOP_R))
  p.hop(LAND_R, [S + 1.15, GB])
  p.hold(PORCH_ON)
  p.roll(GATE_T, GATE_X + 0.55)
  p.hold(SHOTS[0])
  p.hop(FLINCH, [GATE_X + 0.55, GB])
  p.ramp(SHOTS[1], 0, V_RUN)
  p.ramp(IN_BARN, V_RUN, V_RUN)
  // She stops under the loft's edge, behind him; the burning hay lands just behind her and she is thrown on, hurt.
  const stopAt = a(72, 4)
  const x0 = p.last.p[0]
  const stopX = Math.min(S + 19.75, x0 + (V_RUN / 2) * (stopAt - IN_BARN))
  p.ways.push({ at: stopAt, p: [stopX, GB], ramp: [V_RUN, 0.001] })
  p.hold(HAY[1].t)
  p.hop(a(73, 1), [S + 20.3, GB])
  p.hold(RACHEL_RUN0)
  p.ramp(RACHEL_MID, 0, 3)
  p.ramp(RACHEL_STOP, 3, 0)
  // Onto the cot as it comes out to her; slid in with it.
  p.hold(ON_COT - (at(77, 2) - at(77, 1)))
  const onCot: Pt = [RS - 0.05, COT_TOP - 0.06 - R]
  p.hop(ON_COT, onCot)
  p.hold(COT_IN0)
  p.to(COT_IN, [onCot[0] - COT_REACH, onCot[1]])
  p.hold(SHUT + 0.2)
  return [...ride, ...route(p.ways)]
}

export const MARTY_SEGS = martyWay()
const RACHEL_SEGS = rachelWay()
const RACHEL_LANE = { segs: RACHEL_SEGS, fire: 0 }
const MARTY_LANE = { segs: MARTY_SEGS, fire: 0 }

/** Where each of them is at show time `t`. */
export const martyAt = (t: number): Pt => {
  const q = laneAt(MARTY_LANE, t - T0)
  return [q.x, q.y]
}
export const rachelAt = (t: number): Pt => {
  const q = laneAt(RACHEL_LANE, t - T0)
  return [q.x, q.y]
}
/** She is gone (inside, the doors shut) from here; out of the picture from a moment after. */
export const RACHEL_GONE = SHUT + 0.06

/* ------------------------------------------------------------------ strikes */

export const JERSEY_STRIKES: number[] = [
  PULL,
  ...BUMPS,
  HALT,
  HOP_M,
  LAND_M,
  LAND_R,
  PORCH_ON,
  ...SHOTS,
  FLINCH,
  LANTERN_SHOT,
  LANTERN_DOWN,
  FLARE,
  ...HAY.map((h) => h.t),
  a(73, 1),
  ...DOOR_HITS,
  ...DOOR_FLOORS,
  OUT_LAND,
  ...RED_FLASHES,
  AMB_STOP,
  DOORS_OPEN,
  COT_OUT,
  ON_COT,
  COT_IN,
  SHUT,
  LEAVE,
  ...STOPS,
  ...STEP_TIMES,
  IN_CABIN,
  ON_SILL,
]
  .filter((t, i, all) => all.findIndex((u) => Math.abs(u - t) < 1e-6) === i)
  .sort((x, y) => x - y)
