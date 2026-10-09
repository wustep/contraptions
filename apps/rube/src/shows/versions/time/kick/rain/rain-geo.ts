import type { Pt } from '../../../../../parts'
import { bar, beat, half, SEAM } from '../music'
import { DOWN, RAIN_GEO, SPLASH, UP, VAN, clock, vanAt } from '../stack'

/**
 * The rain's clock, places and ways (the RAIN builder's): where everything in Yusuf's dream is, and when. The set, the
 * two parts and the camera all read these, so the ball never slides off what carries it.
 *
 * World cells (the dream's own: the street's kerb at y 0, the bridge's deck from x -26 to its broken end at x 0, the
 * river from 8 to 12). Everything the set does is on the rain's own clock (`eff`): while he is in the rain that is
 * show time exactly; while he is deeper it all but stops.
 */

export const clamp01 = (u: number): number => Math.max(0, Math.min(1, u))
export const sm = (u: number): number => {
  const v = clamp01(u)
  return v * v * (3 - 2 * v)
}

/** Cubic Hermite from (t0, y0, v0) to (t1, y1, v1), clamped to its ends. */
export function herm(t: number, t0: number, t1: number, y0: number, y1: number, v0: number, v1: number): number {
  const T = t1 - t0
  const s = clamp01((t - t0) / T)
  const s2 = s * s
  const s3 = s2 * s
  return (2 * s3 - 3 * s2 + 1) * y0 + (s3 - 2 * s2 + s) * T * v0 + (-2 * s3 + 3 * s2) * y1 + (s3 - s2) * T * v1
}
export type Key = [t: number, y: number, v: number]
/** A chain of Hermite keys (time, value, speed): the value at `t`, held at the ends. */
export function keyed(keys: Key[], t: number): number {
  if (t <= keys[0][0]) return keys[0][1]
  for (let i = 1; i < keys.length; i++) {
    const [t1, y1, v1] = keys[i]
    if (t <= t1) {
      const [t0, y0, v0] = keys[i - 1]
      return herm(t, t0, t1, y0, y1, v0, v1)
    }
  }
  return keys[keys.length - 1][1]
}

/* ------------------------------------------------------------------ the clock */

/** Show time as the rain's own clock has it: show time while he is in the rain (and before), slowed while he is deeper. */
const OFFSET = 80 - clock('rain', 80)
export const eff = (t: number): number => clock('rain', t) + OFFSET

/* ------------------------------------------------------------------ the music */

export const START = SEAM.rain
export const UNDER = DOWN.hotel.t
export const RISE = UP.rain.t
export const WAKE = SEAM.wake

/** The snatch. */
export const T_TAXI_STOP = beat(74)
export const T_TAXI_DOOR = half(74)
export const T_HIT = beat(75)
export const T_F_IN = bar(19)
export const T_C_IN = beat(77)
export const T_A_IN = half(77)
export const T_SLAM = beat(78)
/** The train: its lamp, the two cars and the taxi. */
export const T_LAMP = half(78)
export const T_CAR1 = beat(79)
export const T_CAR2 = half(79)
export const T_IMPACT = bar(20)
/** The van away, the puddles, the bridge. */
export const T_GO = bar(21)
export const T_PUDDLES = [beat(85), beat(86), beat(87)]
export const T_JOINT = bar(22)
export const T_CASE = beat(90)
export const T_DRIP = beat(91)
export const T_SINK = bar(23)
export const T_DROP = beat(93)
export const T_RIVER = half(94)
/** The river part. */
export const T_LAND = beat(211)
export const T_FLICKER = [bar(53), beat(213), beat(214), beat(215)]
/** The door bursts open under the water's weight on the half after the splash, and throws Ariadne and Fischer out. */
export const T_BURST = half(216)
export const T_A_UP = half(217)
export const T_F_UP = beat(218)
export const T_C_OUT = bar(55)
export const T_TURN = beat(222)

/* ------------------------------------------------------------------ places */

/** The ball's centre on the street, the pavement and the deck. */
export const LANE_Y = -0.13
/** The rain's first part's origin: Cobb comes in at (-0.5, 0) from it, under an awning. */
export const RAIN_AT: Pt = [-45, LANE_Y]
export const C0: Pt = [RAIN_AT[0] - 0.5, LANE_Y]
export const A0: Pt = [C0[0] - 0.62, LANE_Y]
/** The shop and its awning. */
export const AWNING = { x0: -47.5, x1: -44.4, y: -2.25 }
/** Where Mal stands in the rain as the train comes. */
export const MAL_AT: Pt = [-35.2, LANE_Y]
export const MAL_FROM = 73.3
export const MAL_TO = 85.6

/* ------------------------------------------------------------------ the van */

export interface Pose {
  x: number
  y: number
  angle: number
  air: boolean
}
export const VAN_Y = VAN.under[1]
export const VAN_LEN = VAN.size[0]
export const VAN_H = VAN.size[1]
/** Where it waits at the kerb, its centre. */
export const VAN_PARK = -42.1
export const WHEEL_U = 0.85
export const WHEEL_R = 0.19
/** The bench along the bay: where each sits (van cells, u along from the centre, v down from it, to the ball's centre). */
export const SEAT_U = { ariadne: -0.38, cobb: 0, fischer: 0.55 } as const
export const SEAT_V = -0.08
/** Where they come down on the bench, in through the sliding door. */
const BENCH_IN = -0.3
/** The sliding door's opening (u), clear of the rear wheel's arch, and the bay's floor (v). */
export const DOOR_U: Pt = [-0.58, 0.28]
export const FLOOR_V = 0.42

/** A point of the van (u along, v down, from its centre) in the world, for a pose. */
export function vanPoint(pose: Pose, u: number, v: number): Pt {
  const c = Math.cos(pose.angle)
  const s = Math.sin(pose.angle)
  return [pose.x + u * c - v * s, pose.y + u * s + v * c]
}

// The drive: parked at the kerb until bar 21; away up the street at a good lick; onto the bridge on bar 22 (its front
// wheels over the joint); easing on the bridge, then picking up again to the speed the director's van has at 91.824.
const T_RAMP = T_GO + 1.5
const T_SLOW = 84.5
const T_V2 = 88.4
const V_END = (vanAt(UNDER + 0.002).x - vanAt(UNDER).x) / 0.002
const piece = (t: number, t0: number, t1: number, a: number, b: number): number => {
  const T = t1 - t0
  const u = clamp01((t - t0) / T)
  return a * u * T + (b - a) * T * (u * u * u - (u * u * u * u) / 2)
}
const VC = (RAIN_GEO.deckFrom - WHEEL_U - VAN_PARK) / (0.75 + T_JOINT - T_RAMP)
const V2 =
  (VAN.under[0] - VAN_PARK - VC * (0.75 + T_SLOW - T_RAMP + (T_V2 - T_SLOW) / 2) - (V_END * (UNDER - T_V2)) / 2) / ((T_V2 - T_SLOW) / 2 + (UNDER - T_V2) / 2)
function driveX(t: number): number {
  return VAN_PARK + piece(t, T_GO, T_RAMP, 0, VC) + VC * Math.max(0, Math.min(t - T_RAMP, T_SLOW - T_RAMP)) + piece(t, T_SLOW, T_V2, VC, V2) + piece(t, T_V2, UNDER, V2, V_END)
}
/** The van's speed along the street (show time, before 91.824). */
export function driveV(t: number): number {
  return (driveX(t + 0.001) - driveX(t - 0.001)) / 0.002
}
/** Where the front wheels are over each puddle on the beats as it goes. */
export const PUDDLES = T_PUDDLES.map((t) => driveX(t) + WHEEL_U)

/** A jolt: a dip and a long damped settle, from `at`. */
const jolt = (t: number, at: number, a: number, w = 15, tau = 0.22): number => (t < at ? 0 : a * Math.exp(-(t - at) / tau) * Math.sin((t - at) * w))
/** How the van's body rides: rocked as each of them comes in and the door slams, squatting as it pulls away, jolted by the puddles and the joint. */
function ride(t: number): { dy: number; da: number } {
  let dy = 0
  let da = 0
  for (const [at, a] of [[T_F_IN, 0.018], [T_C_IN, 0.018], [T_A_IN, 0.016], [T_SLAM, 0.03]] as const) {
    dy += jolt(t, at, a, 13, 0.3)
    da += jolt(t, at, a * 0.5, 11, 0.3)
  }
  // Pulling away: it squats back on its springs and comes level.
  da -= 0.035 * (sm((t - T_GO) / 0.35) - sm((t - T_GO - 0.3) / 1.0))
  // The train going by: the ground shakes under it, and the impact's shock.
  dy += shake(t, t < T_GO ? VAN_PARK : driveX(t))
  dy += jolt(t, T_IMPACT, 0.035, 13, 0.3)
  da += jolt(t, T_IMPACT, 0.02, 11, 0.3)
  for (const at of T_PUDDLES) {
    dy += jolt(t, at, 0.022, 17, 0.2)
    da += jolt(t, at, 0.02, 17, 0.2)
  }
  dy += jolt(t, T_JOINT, 0.05, 16, 0.26)
  da += jolt(t, T_JOINT, 0.045, 16, 0.26)
  // A road's small unevenness while it goes quickly, gone by the time it creeps on the bridge.
  const road = sm((t - T_GO) / 0.8) * (1 - sm((t - 86.5) / 1.5))
  dy += road * 0.008 * (Math.sin(t * 23.1) + 0.6 * Math.sin(t * 37.7 + 1.3))
  return { dy, da }
}

/** The van, at show time `t`: mine until they go under in it, the director's (`vanAt`) from then. */
export function vanPose(t: number): Pose {
  if (t >= UNDER) return vanAt(t)
  const r = ride(t)
  const x = t < T_GO ? VAN_PARK : driveX(t)
  return { x, y: VAN_Y + r.dy, angle: r.da, air: false }
}
/** Its velocity, cells a second. */
export function vanVel(t: number): Pt {
  const a = vanPose(t - 0.004)
  const b = vanPose(t + 0.004)
  return [(b.x - a.x) / 0.008, (b.y - a.y) / 0.008]
}
/** How far its wheels have turned. */
export function wheelTurn(t: number): number {
  return (vanPose(t).x - VAN_PARK) / WHEEL_R
}
/** The sliding door: 1 open (as it waits, and burst open by the river), 0 shut. */
export function doorOpen(t: number): number {
  if (t < T_A_IN) return 1
  if (t < T_BURST) return 1 - sm((t - T_A_IN) / (T_SLAM - T_A_IN))
  return sm((t - T_BURST) / 0.14)
}
/** Its headlamps: 0 dark, 1 lit. On as the train's tail goes by; they flicker as it plunges; out in the river. */
export function lampOn(t: number): number {
  if (t < T_GO - 0.6) return 0.12
  if (t < SPLASH) {
    let v = 0.12 + 0.88 * sm((t - (T_GO - 0.6)) / 0.4)
    for (const f of T_FLICKER) if (t >= f && t < f + 0.34) v *= 0.15 + 0.85 * sm((t - f - 0.14) / 0.2)
    return v
  }
  return Math.max(0, 1 - (t - SPLASH) / 0.25) * 0.8
}
/** The case, open on the floor between them from beat 90. */
export const caseOpen = (t: number): number => sm((t - T_CASE) / 0.3)

/** A seat's point in the world at `t`: the ball's centre as it sits there. */
/** On beat 91, the drip in, they settle back into the bench, and are still. */
const settle = (t: number): number => 0.035 * sm((t - T_DRIP) / 0.6)
export const seatAt = (t: number, u: number): Pt => vanPoint(vanPose(t), u, SEAT_V + settle(t))

/* ------------------------------------------------------------------ the taxi */

/** Fischer's taxi: it comes up the street, stops at the kerb by the awning, and goes on up it into the queue. */
export const TAXI_STOP = -44.0
export const TAXI_LEN = 2.2
export const TAXI_SEAT: Pt = [-0.27, -0.8]
export const TAXI_QUEUE = -38
const T_TAXI_IN = 69.0
const TAXI_RUN = 8
const T_TAXI_GO = T_HIT + 0.1
// It pulls out briskly, as a cab does once its fare is out: slow off the kerb, it rode along behind Cobb with its wheels
// under him and Fischer. It waits in the queue from there.
const T_TAXI_Q = Math.min(T_CAR1 - 0.2, T_TAXI_GO + 1.6)
export function taxiX(te: number): number {
  if (te < T_TAXI_IN) return TAXI_STOP - TAXI_RUN - ((2 * TAXI_RUN) / (T_TAXI_STOP - T_TAXI_IN)) * (T_TAXI_IN - te)
  if (te < T_TAXI_STOP) {
    const s = (te - T_TAXI_IN) / (T_TAXI_STOP - T_TAXI_IN)
    return TAXI_STOP - TAXI_RUN * (1 - s) * (1 - s)
  }
  if (te < T_TAXI_GO) return TAXI_STOP
  return herm(te, T_TAXI_GO, T_TAXI_Q, TAXI_STOP, TAXI_QUEUE, 0, 0)
}
/** Its rear door: 0 shut, 1 open. */
export const taxiDoor = (te: number): number => sm((te - T_TAXI_DOOR + 0.16) / 0.16) * (1 - sm((te - T_TAXI_DOOR - 0.3) / 0.25))

/* ------------------------------------------------------------------ the train, and the traffic it goes through */

export const TRAIN_V = 8.5
export const LOCO_LEN = 9
export const LOCO_H = 2.4
export const WAGON_LEN = 8
export const WAGON_GAP = 0.6
export const WAGONS = 3
/** The taxi's front, where the locomotive's nose meets it on bar 20. */
const X_IMPACT = TAXI_QUEUE + TAXI_LEN / 2
/** The locomotive's nose (its left end) at the rain's time `te`; it came out of nowhere, off the bridge. */
export const trainNose = (te: number): number => X_IMPACT - TRAIN_V * (te - T_IMPACT)
export const TRAIN_FROM = T_IMPACT - 3.4
export const TRAIN_LEN = LOCO_LEN + WAGONS * (WAGON_LEN + WAGON_GAP) + 0.4

/**
 * How the ground shakes at `x` as the train comes by (cells, up and down): strongest beside it, and hardest just after
 * it hits the taxi. Everything near shudders with it but Mal, who stands too still.
 */
export function shake(te: number, x: number): number {
  if (te < TRAIN_FROM || te > T_IMPACT + 9) return 0
  const nose = trainNose(te)
  const d = x < nose ? nose - x : x > nose + TRAIN_LEN ? x - nose - TRAIN_LEN : 0
  const near = Math.exp(-d / 4) * sm((te - TRAIN_FROM) / 0.8)
  const hit = te < T_IMPACT ? 0 : 0.035 * Math.exp(-(te - T_IMPACT) / 0.3) * Math.exp(-Math.abs(x - X_IMPACT) / 5)
  return (0.022 * near + hit) * Math.sin(te * 31 + x * 1.7)
}

/** A car the locomotive meets: where it waits, when it is hit, and how it flies, turns and lands behind the train. */
export interface Flung {
  x: number
  hit: number
  vx: number
  flight: number
  turns: number
  len: number
  taxi: boolean
}
export const FLUNG: Flung[] = [
  { x: trainNoseAtFront(T_CAR1, 2.1), hit: T_CAR1, vx: -6.2, flight: 1.0, turns: 0.5, len: 2.1, taxi: false },
  { x: trainNoseAtFront(T_CAR2, 2.0), hit: T_CAR2, vx: -6.8, flight: 1.12, turns: 0.5, len: 2.0, taxi: false },
  { x: TAXI_QUEUE, hit: T_IMPACT, vx: -5.2, flight: 1.3, turns: 1.5, len: TAXI_LEN, taxi: true },
]
/** A car's centre when the nose meets its front at `t`. */
function trainNoseAtFront(t: number, len: number): number {
  return X_IMPACT - TRAIN_V * (t - T_IMPACT) - len / 2
}
/** How far back (into the street's far side) a flung car has gone: 0 in the lane, 1 against the far kerb. */
export interface FlungPose {
  x: number
  y: number
  angle: number
  far: number
}
/** The street's middle, where the traffic waits and the train runs: a little back from the kerb (higher, smaller). */
export const LANE_BACK = -0.14
export const CAR_S = 0.9
const CAR_Y = LANE_BACK - 0.47 * CAR_S
export function flungPose(c: Flung, te: number): FlungPose {
  if (te < c.hit) return { x: c.x, y: CAR_Y, angle: 0, far: 0 }
  const tau = Math.min(te - c.hit, c.flight)
  const u = tau / c.flight
  const far = sm((u - 0.55) / 0.45)
  // It comes down on its roof on the far side of the street.
  const yEnd = -0.2 - 0.56 * (CAR_S - 0.08)
  // A throw: up and back the way the train goes, turning end over end, and down behind the train.
  const vy = (CAR_Y - yEnd + 6 * c.flight * c.flight) / c.flight
  const y = CAR_Y - vy * tau + 6 * tau * tau
  let x = c.x + c.vx * tau
  let angle = -c.turns * Math.PI * 2 * (1 - Math.pow(1 - u, 1.25))
  if (te > c.hit + c.flight) {
    // It slides a little further, and rocks to rest where it came down.
    const v = te - c.hit - c.flight
    x += c.vx * 0.18 * (1 - Math.exp(-v / 0.18))
    angle += 0.08 * Math.exp(-v / 0.25) * Math.sin(v * 14)
  }
  return { x, y: te > c.hit + c.flight ? yEnd : y, angle, far }
}

/* ------------------------------------------------------------------ the ways: the rain */

/** Seconds a hop into the van takes, and its speed across: 1.1 cells from the pavement to the bench, through the door. */
/**
 * A roll along the pavement from `x0` (speed `v0`, at `t0`) that takes off on `up` and hops in through the van's door to
 * land on the bench at `u` on `land`: where it takes off, and how fast it goes across (the same on the ground and in the
 * air, so the take-off only lifts it).
 */
function rollHop(x0: number, v0: number, t0: number, up: number, land: number, u: number): { x: number; v: number } {
  const target = VAN_PARK + u
  const roll = up - t0
  const fly = land - up
  // x = x0 + (v0 + v) / 2 * roll, and v = (target - x) / fly.
  const v = (target - x0 - (v0 * roll) / 2) / (fly + roll / 2)
  return { x: x0 + ((v0 + v) / 2) * roll, v }
}
/** They take off on the beats (Fischer on the half after 75, Cobb the half after 76, Ariadne on 77) and land on the next. */
export const T_F_UP_HOP = half(75)
export const T_C_UP_HOP = half(76)
export const T_A_UP_HOP = beat(77)
const F_REST: Pt = [-44.25, LANE_Y]
const C_HIT_X = F_REST[0] - 0.26
const C_ACC = (2 * (C_HIT_X - C0[0])) / ((T_HIT - T_TAXI_STOP) * (T_HIT - T_TAXI_STOP))
const V_HIT = C_ACC * (T_HIT - T_TAXI_STOP)
const F_HOP = rollHop(F_REST[0], V_HIT * 0.95, T_HIT, T_F_UP_HOP, T_F_IN, BENCH_IN)
const C_HOP = rollHop(C_HIT_X, 0, T_HIT, T_C_UP_HOP, T_C_IN, BENCH_IN)
const A_HOP = rollHop(A0[0], 0, T_TAXI_DOOR, T_A_UP_HOP, T_A_IN, SEAT_U.ariadne)

/** A hop from `a` (at t0) landing at `b` (at t1) under gravity: where it is at `t`. */
function hopAt(t: number, t0: number, t1: number, a: Pt, b: Pt, g = 12): Pt {
  const T = t1 - t0
  const tau = Math.max(0, Math.min(T, t - t0))
  const vy = (b[1] - a[1] - 0.5 * g * T * T) / T
  return [a[0] + ((b[0] - a[0]) * tau) / T, a[1] + vy * tau + 0.5 * g * tau * tau]
}
/** On the bench, `u` along the van. */
const onBench = (t: number, u: number): Pt => vanPoint(vanPose(t), u, SEAT_V)

// Going under: the three sink through the bench, the floor and the deck together (Ariadne a tenth of a second behind
// him, Fischer less), drop out under the deck on beat 93, fall into the river on the half after beat 94, and are
// slowed by the water, and go on down through its bed and the ground into the dark, crossing on the brass.
const Y_SEAT = VAN_Y + SEAT_V + 0.035
const Y_DECK = 0.45 + 0.13
const V_DROP = 1.6
const Y_SURF = RAIN_GEO.river - 0.13
const G_DREAM = (2 * (Y_SURF - Y_DECK - V_DROP * (T_RIVER - T_DROP))) / ((T_RIVER - T_DROP) * (T_RIVER - T_DROP))
const V_SURF = V_DROP + G_DREAM * (T_RIVER - T_DROP)
// The bed: where the water has slowed him to, and when, such that the dark takes him on to 5 a second on the brass.
const BED = (() => {
  let vb = 3
  for (let i = 0; i < 60; i++) {
    const tb = UNDER - (DOWN.hotel.at[1] - RAIN_GEO.bed) / ((vb + DOWN.hotel.v[1]) / 2)
    const need = (2 * (RAIN_GEO.bed - Y_SURF)) / (tb - T_RIVER) - V_SURF
    vb += (need - vb) * 0.5
  }
  const tb = UNDER - (DOWN.hotel.at[1] - RAIN_GEO.bed) / ((vb + DOWN.hotel.v[1]) / 2)
  return { t: tb, v: vb }
})()
const SINK_KEYS: Key[] = [
  [T_SINK, Y_SEAT, 0],
  [T_DROP, Y_DECK, V_DROP],
  [T_RIVER, Y_SURF, V_SURF],
  [BED.t, RAIN_GEO.bed, BED.v],
  [UNDER, DOWN.hotel.at[1], DOWN.hotel.v[1]],
]
const X_SINK = seatAt(T_SINK, SEAT_U.cobb)[0]
const VX_SINK = vanVel(T_SINK)[0]
/** Cobb's x and y as they go under (from bar 23). */
const underX = (t: number): number => herm(t, T_SINK, UNDER, X_SINK, DOWN.hotel.at[0], VX_SINK, 0)
const underY = (t: number): number => keyed(SINK_KEYS, t)
/** When his lane leaves the van's floor and the deck (for the sink's pools): the seat, and the deck's underside. */
export const SINK_AT = { seat: T_SINK, deck: T_DROP }

/** Cobb, through the rain part (world cells). */
export function cobbRain(t: number): Pt {
  if (t <= T_TAXI_STOP) return C0
  if (t <= T_HIT) {
    const tau = t - T_TAXI_STOP
    return [C0[0] + 0.5 * C_ACC * tau * tau, LANE_Y]
  }
  if (t <= T_C_UP_HOP) return [herm(t, T_HIT, T_C_UP_HOP, C_HIT_X, C_HOP.x, 0, C_HOP.v), LANE_Y]
  if (t <= T_C_IN) return hopAt(t, T_C_UP_HOP, T_C_IN, [C_HOP.x, LANE_Y], onBench(T_C_IN, BENCH_IN))
  const settle = T_C_IN + 0.7
  if (t <= settle) return onBench(t, herm(t, T_C_IN, settle, BENCH_IN, SEAT_U.cobb, 0.8, 0))
  if (t <= T_SINK) return seatAt(t, SEAT_U.cobb)
  return [underX(t), underY(t)]
}

/** Fischer, in the rain part: in his taxi, out of it, knocked into the van, and down with them. */
export function fischerRain(t: number): Pt {
  if (t <= T_TAXI_DOOR) return [taxiX(t) + TAXI_SEAT[0], TAXI_SEAT[1]]
  const out = T_TAXI_DOOR + 0.25
  if (t <= out) return hopAt(t, T_TAXI_DOOR, out, [TAXI_STOP + TAXI_SEAT[0], TAXI_SEAT[1]], F_REST)
  if (t <= T_HIT) return F_REST
  if (t <= T_F_UP_HOP) return [herm(t, T_HIT, T_F_UP_HOP, F_REST[0], F_HOP.x, V_HIT * 0.95, F_HOP.v), LANE_Y]
  if (t <= T_F_IN) return hopAt(t, T_F_UP_HOP, T_F_IN, [F_HOP.x, LANE_Y], onBench(T_F_IN, BENCH_IN))
  const settle = T_F_IN + 0.85
  if (t <= settle) return onBench(t, herm(t, T_F_IN, settle, BENCH_IN, SEAT_U.fischer, 1.9, 0))
  if (t <= T_SINK + 0.07) return seatAt(t, SEAT_U.fischer)
  return [underX(t) + SEAT_U.fischer, underY(t - 0.07)]
}

/** Ariadne, in the rain part: beside him under the awning, after him into the van, and down with them. */
export function ariadneRain(t: number): Pt {
  if (t <= T_TAXI_DOOR) return A0
  if (t <= T_A_UP_HOP) return [herm(t, T_TAXI_DOOR, T_A_UP_HOP, A0[0], A_HOP.x, 0, A_HOP.v), LANE_Y]
  if (t <= T_A_IN) return hopAt(t, T_A_UP_HOP, T_A_IN, [A_HOP.x, LANE_Y], onBench(T_A_IN, SEAT_U.ariadne))
  if (t <= T_SINK + 0.1) return seatAt(t, SEAT_U.ariadne)
  return [underX(t) + SEAT_U.ariadne, underY(t - 0.1)]
}

/* ------------------------------------------------------------------ the ways: the river */

/**
 * Up out of the dark (from `UP.rain`: 19 a second, under gravity) through the ground and the bed, the water (which
 * slows them a little) and its surface, into the air, and up through the hanging van's floor to come down on the bench,
 * all three together on beat 211. Each is its own throw: `x0` its place in the column, `u` its seat.
 */
interface Rise {
  x0: number
  y0: number
  u: number
  bed: number
  vBed: number
  surf: number
  vSurf: number
  land: number
}
function rise(x0: number, dy: number, u: number, land: number): Rise {
  const y0 = UP.rain.at[1] + dy
  const v0 = UP.rain.v[1]
  // Through the ground to the bed: gravity only.
  const tb = (-v0 - Math.sqrt(v0 * v0 - 4 * 6 * (y0 - RAIN_GEO.bed))) / (2 * 6)
  const vb = v0 + 12 * tb
  // Through the water, and out into the air on a throw that comes down on the seat at `land`.
  const [, sy] = seatAt(land, u)
  let ts = RISE + tb + 0.3
  let vs = vb
  for (let i = 0; i < 40; i++) {
    const tau = land - ts
    vs = (sy - Y_SURF_UP - 6 * tau * tau) / tau
    const cross = (RAIN_GEO.bed - Y_SURF_UP) / ((-vb - vs) / 2)
    ts = RISE + tb + cross
  }
  return { x0, y0, u, bed: RISE + tb, vBed: vb, surf: ts, vSurf: vs, land }
}
const Y_SURF_UP = RAIN_GEO.river
const RISES = {
  cobb: rise(UP.rain.at[0], 0, SEAT_U.cobb, T_LAND),
  ariadne: rise(UP.rain.at[0] + UP.rain.ariadne![0], UP.rain.ariadne![1], SEAT_U.ariadne, T_LAND),
  fischer: rise(UP.rain.at[0] + UP.rain.fischer![0], UP.rain.fischer![1], SEAT_U.fischer, T_LAND),
}
export const SURFACE_AT = { cobb: RISES.cobb.surf, ariadne: RISES.ariadne.surf, fischer: RISES.fischer.surf }
export const BED_AT = { cobb: RISES.cobb.bed, ariadne: RISES.ariadne.bed, fischer: RISES.fischer.bed }

function risingAt(r: Rise, t: number): Pt {
  const [sx] = seatAt(r.land, r.u)
  const [svx] = vanVel(r.land)
  const x = herm(t, RISE, r.land, r.x0, sx, 0, svx)
  let y: number
  if (t <= r.bed) {
    const tau = t - RISE
    y = r.y0 + UP.rain.v[1] * tau + 6 * tau * tau
  } else if (t <= r.surf) {
    y = herm(t, r.bed, r.surf, RAIN_GEO.bed, Y_SURF_UP, r.vBed, r.vSurf)
  } else {
    const tau = t - r.surf
    y = Y_SURF_UP + r.vSurf * tau + 6 * tau * tau
  }
  return [x, y]
}
/** Sat in the van from the landing: a small give in the bench, and the lurch forward as it hits the water. */
function sat(t: number, u: number, land: number): Pt {
  const bounce = t < land ? 0 : -0.05 * Math.exp(-(t - land) / 0.2) * Math.sin((t - land) * 16)
  const lurch = t < SPLASH ? 0 : 0.1 * Math.exp(-(t - SPLASH) / 0.35) * Math.sin(Math.min(Math.PI, (t - SPLASH) * 9))
  return vanPoint(vanPose(t), u + lurch, SEAT_V + bounce)
}

/** Where he comes up through the surface on the release, and the others just before him. */
export const C_END: Pt = [3.2, RAIN_GEO.river - 0.26]
const A_END: Pt = [C_END[0] - 0.6, C_END[1] + 0.25]
const F_END: Pt = [C_END[0] + 0.6, C_END[1] + 0.3]
const bob = (t: number, ph: number): number => 0.028 * Math.sin(((t - WAKE) / 1.9) * Math.PI * 2 + ph) * sm((t - WAKE + 5) / 2)

/** Cobb, through the river part (world cells). */
export function cobbRiver(t: number): Pt {
  if (t <= T_LAND) return risingAt(RISES.cobb, t)
  if (t <= T_C_OUT) return sat(t, SEAT_U.cobb, T_LAND)
  return [keyed(C_OUT_X, t), keyed(C_OUT_Y, t)]
}
// Out of the door: pushed out clear of the van's side (its roof is toward the light now), drawn down a little in its
// wake as it sinks away under him, then turned up toward the light, and up through the surface on the release.
const C_OUT0 = sat(T_C_OUT, SEAT_U.cobb, T_LAND)
const C_OUT_V = vanVel(T_C_OUT)
const PUSH = 1.2
const C_OUT_X: Key[] = [
  [T_C_OUT, C_OUT0[0], C_OUT_V[0] + PUSH * Math.sin(vanAt(T_C_OUT).angle)],
  [beat(221), C_END[0], 0.15],
  [T_TURN, C_END[0] + 0.05, 0],
  [WAKE, C_END[0], 0],
]
const C_OUT_Y: Key[] = [
  [T_C_OUT, C_OUT0[1], C_OUT_V[1] - PUSH * Math.cos(vanAt(T_C_OUT).angle)],
  [beat(221), C_OUT0[1] + 0.13, 0.3],
  [T_TURN, C_OUT0[1] + 0.53, 0],
  [WAKE, C_END[1], -2.4],
]

/**
 * Thrown out through the door as it hits (the kick), under, and up to float at the surface; kept there (clear of the
 * van's tail while it is still out of the water) until `stay`, then over beside where he will come up.
 */
function thrown(t: number, u: number, under: Pt, up: number, float: Pt, stay: number, end: Pt, ph: number): Pt {
  const p0 = sat(T_BURST, u, T_LAND)
  const v0 = vanVel(T_BURST)
  const t1 = T_BURST + 0.45
  if (t <= t1) return [herm(t, T_BURST, t1, p0[0], under[0], v0[0] + 0.5, -0.2), herm(t, T_BURST, t1, p0[1], under[1], v0[1] + 0.8, 0.2)]
  if (t <= up) return [herm(t, t1, up, under[0], float[0], -0.2, 0), herm(t, t1, up, under[1], float[1], 0.2, 0)]
  const x = t <= stay ? float[0] : herm(t, stay, WAKE, float[0], end[0], 0, 0)
  return [x, herm(t, up, WAKE, float[1], end[1], 0, 0) + bob(t, ph)]
}
export function ariadneRiver(t: number): Pt {
  if (t <= T_LAND) return risingAt(RISES.ariadne, t)
  if (t <= T_BURST) return sat(t, SEAT_U.ariadne, T_LAND)
  return thrown(t, SEAT_U.ariadne, [1.4, 8.8], T_A_UP, [1.2, A_END[1]], 211.2, A_END, 0)
}
export function fischerRiver(t: number): Pt {
  if (t <= T_LAND) return risingAt(RISES.fischer, t)
  if (t <= T_BURST) return sat(t, SEAT_U.fischer, T_LAND)
  return thrown(t, SEAT_U.fischer, [3.35, 9.05], T_F_UP, [3.5, F_END[1]], 209.0, F_END, 2.1)
}
