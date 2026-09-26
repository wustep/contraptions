import { clamp, easeOutQuad } from '../../../../../../../src/core/ease'
import { FLOOR, R, type Pt } from '../../../../parts'
import { smooth } from './kit'
import { beatsOf, swing, SWING_MID, SWING_SOFT } from './music'

/**
 * The studio's clock and its motion: every strike as a show second, the set's
 * geometry, and where he and she are at any moment. The drawing and the lane
 * both read these, so the dolly never leaves them behind.
 *
 * The story, on the swing (bars on k ≡ 1 mod 4):
 *
 *   221  the lights come up on the gate       222  the barrier arm rises, just in time
 *   223  the stage's roller door goes up      224  the red lamp over it: rolling
 *   225  the slate snaps: take one            226–228  three banks of lamps strike, beams swing on
 *   229  the grip's winch takes up: the dolly lurches off, and every beat its front wheels drop a track joint
 *   233, 237, 241, 245  the slate: a take a bar   234  the brute on its stand hits them with its beam
 *   246  the buffer at the track's end        247, 248  the banks dim, the brute goes out: the set half dark
 *   253  the follow spot, hunting since 248, finds HER    253½–256  the chairs behind them applaud, a seat at a time
 *   257  she taps him: he rolls               257½  all six seats together
 *   259  the front gate drops into a ramp     260  the wind machine's switch: the blades start
 *   263  the blast: they are blown across the floor      264–274  the gust reaches a flat a beat, down the row
 *   273  the rain rig lets its curtain down   275  the far roller door goes up
 *   278–281  lightning, four flashes          282  the lights go down; out through the door into the dark
 */

/* ------------------------------------------------------------------ the clock */

export const BEGIN = swing(SWING_MID)
export const END = swing(SWING_SOFT)
export const SPAN = END - BEGIN

export const LIGHTS = swing(221)
export const ARM = swing(222)
export const DOOR = swing(223)
export const RED = swing(224)
export const SLATES = [225, 229, 233, 237, 241, 245].map(swing)
export const BANKS = [226, 227, 228].map(swing)
export const CRANK = swing(229)
export const JOINTS = beatsOf(swing, 230, 245)
export const BRUTE = swing(234)
export const BUFFER = swing(246)
export const DIM = swing(247)
export const BRUTE_OFF = swing(248)
export const SPOT = swing(253)
export const CLAPS = [253.5, 254, 254.5, 255, 255.5, 256].map(swing)
export const TAP = swing(257)
export const UNISON = swing(257.5)
export const FLAP = swing(259)
export const FAN_ON = swing(260)
export const BLAST = swing(263)
export const GUSTS = beatsOf(swing, 264, 274)
export const RAIN = swing(273)
export const OUT_DOOR = swing(275)
export const FLASHES = [278, 279, 280, 281].map(swing)
export const BLACK = swing(282)

/* ------------------------------------------------------------------ the set */

/** They come in at this pace, level. */
export const V_IN = 2.5
/** The gate: two pillars, an arch, the barrier arm on the right pillar. */
export const GATE_L = 1.0
export const GATE_R = 2.6
export const GATE_TOP = -1.95
export const ARM_PIVOT: Pt = [GATE_R - 0.3, -0.24]
export const ARM_LEN = 1.5
/** The stage's near wall, and its roller door. */
export const WALL_IN = 3.6
export const WALL_T = 0.46
export const DOOR_TOP = -2.55
/** The far wall is set by where they end (below). */

/** The dolly track begins here; the dolly rides it, its platform this long, its top here. */
export const TRACK0 = 5.0
export const PLAT_LEN = 2.0
export const PLAT_TOP = -0.16
export const RIDE_Y = PLAT_TOP - R
export const RAIL_Y = FLOOR - 0.04
/** The tail ramp's run, and the front gate's length (it drops to become the ramp off). */
export const TAIL = 0.75
export const GATE_LEN = 0.6
/** The dolly's pace once the winch has it. */
export const V_DOLLY = 1.2
/** Where he rests on the platform (from its back), before the buffer slides him on. */
const REL0 = 1.5
const SLIDE = 0.15
export const REL_REST = REL0 + SLIDE

/** The batten over the first bay, its three banks, and the brute on its stand. */
export const BATTEN_Y = -2.8
export const BANK_X = [6.3, 9.7, 13.1]
export const BRUTE_X = 12.3
export const BRUTE_Y = -1.35
/** The follow spot, on a tall stand at the flat's foot, where the track ends. */
export const SPOT_X = 14.2
export const SPOT_Y = -2.05
/** The day flat behind the first bay. */
export const FLAT1_X0 = 4.8
export const FLAT1_X1 = 18.6
export const FLAT_TOP = -2.55

/* ------------------------------------------------------------------ the dolly */

/** A start from rest that gathers over a few `tau`: what a winch's take-up looks like as the slack goes. */
export const gather = (since: number, tau: number): number => {
  if (since <= 0) return 0
  const at = (s: number) => 1 - (1 + s / tau + (s * s) / (2 * tau * tau)) * Math.exp(-s / tau)
  return Math.min(1, at(since) / at(14 * tau))
}

/** How far the dolly has run along its track at show time `T`: the lurch, the run, the stop against the buffer and its rebound. */
export function dollyRun(T: number): number {
  if (T <= CRANK) return 0
  if (T < BUFFER) {
    const a = T - CRANK
    // v = V (1 - e^{-a/τ}) integrated.
    const tau = 0.07
    return V_DOLLY * (a - tau * (1 - Math.exp(-a / tau)))
  }
  const a = T - BUFFER
  return S_END - 0.05 * Math.exp(-a / 0.25) * Math.sin(a * 14)
}
/** Its full run. */
export const S_END = (() => {
  const a = BUFFER - CRANK
  const tau = 0.07
  return V_DOLLY * (a - tau * (1 - Math.exp(-a / tau)))
})()

/** The platform's dip as its front wheels drop a joint: crisp down, a quick damped return. */
export function dollyDip(T: number): number {
  let d = 0
  for (const j of JOINTS) {
    const a = T - j
    if (a > 0 && a < 0.6) d += 0.04 * Math.exp(-a / 0.1) * Math.sin(a * 24)
  }
  return d
}

/** The hop a joint gives whoever rides the platform, `h` high, over a fifth of a second. */
export function jointHop(T: number, h: number): number {
  let lift = 0
  for (const j of JOINTS) {
    const u = (T - j) / 0.2
    if (u > 0 && u < 1) lift += h * 4 * u * (1 - u)
  }
  return lift
}

/* ------------------------------------------------------------------ his motion */

/** He passes the door's line at this speed and slows onto the dolly, level with its pace by the time the winch has it going. */
const T1 = BEGIN + (WALL_IN + 1.3 + 0.5) / V_IN
const T2 = CRANK + 0.35
const X1 = -0.5 + V_IN * (T1 - BEGIN)
/** Where the dolly's platform begins, at rest: so that he is settled at REL0 on it as it gets going. */
export const PLAT_BACK0 = (() => {
  const x2 = X1 + ((V_IN + V_DOLLY) / 2) * (T2 - T1)
  return x2 - dollyRun(T2) - REL0
})()
export const PLAT_FRONT0 = PLAT_BACK0 + PLAT_LEN
/** The track's far end, and the winch beyond it. */
export const TRACK1 = PLAT_FRONT0 + S_END + 0.3
export const WINCH_X = TRACK1 + 0.32
/** Where the platform rests after the buffer, and its front lip. */
export const REST_BACK = PLAT_BACK0 + S_END
export const LIP_X = REST_BACK + PLAT_LEN
/** The chairs, behind them at the flat's foot. */
export const CHAIRS = [0, 1, 2, 3, 4, 5].map((i) => REST_BACK - 0.9 + i * 0.5)

/** His pace along the floor after her tap, in seconds since it: a gather, the ramp, the wind building, the blast, the wind carrying him. */
function pace(T: number): number {
  const a = T - TAP
  let v = 0.55 * gather(a, 0.2)
  v += 0.55 * smooth(T, FLAP + 0.05, FLAP + 0.55)
  v += 0.25 * smooth(T, FAN_ON, BLAST)
  if (T > BLAST) {
    const b = T - BLAST
    if (b < 0.25) v += 1.0 * smooth(b, 0, 0.25)
    else v = 1.5 + 0.8 * Math.exp(-(b - 0.25) / 1.2)
  }
  return v
}

/** His run from the tap on, as a table: seconds since the tap to cells from his rest on the platform. */
const RUN = (() => {
  const dt = 0.002
  const n = Math.ceil((END - TAP) / dt)
  const x = new Float64Array(n + 1)
  for (let i = 1; i <= n; i++) x[i] = x[i - 1] + pace(TAP + (i - 0.5) * dt) * dt
  return { dt, x }
})()
function runAt(T: number): number {
  const i = (T - TAP) / RUN.dt
  if (i <= 0) return 0
  if (i >= RUN.x.length - 1) return RUN.x[RUN.x.length - 1]
  const j = Math.floor(i)
  return RUN.x[j] + (RUN.x[j + 1] - RUN.x[j]) * (i - j)
}

/** His x at show time `T`. */
export function heroX(T: number): number {
  if (T <= T1) return -0.5 + V_IN * (T - BEGIN)
  if (T <= T2) {
    const tau = T - T1
    return X1 + V_IN * tau - ((V_IN - V_DOLLY) * tau * tau) / (2 * (T2 - T1))
  }
  const slide = SLIDE * easeOutQuad(clamp((T - BUFFER) / 0.3))
  return PLAT_BACK0 + dollyRun(T) + REL0 + slide + runAt(T)
}

/** Where the floor is under a ball at `x`, at `T`: the stage floor, the dolly's tail ramp, its platform, its front gate down as a ramp. */
export function groundY(x: number, T: number): number {
  const back = PLAT_BACK0 + dollyRun(T)
  const front = back + PLAT_LEN
  if (x < back - TAIL || x > front + GATE_LEN) return 0
  if (x < back) return RIDE_Y * clamp((x - (back - TAIL)) / TAIL) + dollyDip(T) * clamp((x - (back - TAIL)) / TAIL)
  if (x <= front) return RIDE_Y + dollyDip(T)
  // The front gate: up until it drops, then a ramp down to the floor.
  if (T < FLAP) return RIDE_Y + dollyDip(T)
  const drop = gateDrop(T)
  const along = clamp((x - front) / (GATE_LEN * Math.cos(rampAngle())))
  return RIDE_Y * (1 - along) * drop + RIDE_Y * (1 - drop)
}

/** The angle the front gate lies at once it is down: its length reaching the floor. */
export const rampAngle = (): number => Math.asin(Math.min(1, (FLOOR - PLAT_TOP) / GATE_LEN))
/** 0 with the gate up, 1 down as a ramp: it falls, and hits the floor on the beat, and stays. */
export function gateDrop(T: number): number {
  const a = T - (FLAP - 0.16)
  if (a <= 0) return 0
  return Math.min(1, (a / 0.16) * (a / 0.16))
}

export function heroAt(T: number): Pt {
  const x = heroX(T)
  return [x, groundY(x, T) - jointHop(T, 0.09)]
}

/* ------------------------------------------------------------------ her motion */

/** Her place beside him: a step behind, the tap, the hesitations. */
function herOffset(T: number): number {
  let dx = -0.32
  // The tap: she comes forward to touch him on the beat, and back.
  const a = T - TAP
  if (a < 0) dx += 0.06 * smooth(a, -0.35, 0)
  else dx += 0.06 * (1 - smooth(a, 0, 0.3))
  // He rolls; she hesitates, then follows.
  if (a > 0) dx -= 0.2 * smooth(a, 0.1, 0.7) * (1 - smooth(a, 1.2, 2.6))
  // The blast: she is caught a moment later than him, and catches up.
  const b = T - BLAST
  if (b > 0) dx -= 0.3 * smooth(b, 0, 0.3) * (1 - smooth(b, 0.8, 3.0))
  return dx
}

export function miaAt(T: number): Pt {
  const x = heroX(T) + herOffset(T)
  return [x, groundY(x, T) - jointHop(T, 0.065)]
}

/* ------------------------------------------------------------------ the far end */

/** Where he ends: the lane's last point, and the far wall with its door just beyond. */
export const X_END = heroX(END)
export const EXIT_X = X_END + 0.5
export const WALL_OUT = X_END + 0.15
/** The wind machine, and the row of flats the gust runs down. */
export const FAN_X = WINCH_X + 0.9
export const FAN_Y = -1.2
export const FAN_R = 0.72
export const PANEL0 = FAN_X + 1.4
export const PANEL_GAP = 0.06
export const PANEL_W = (WALL_OUT - 0.5 - PANEL0) / GUSTS.length - PANEL_GAP
/** The rain rig's pipe, over the last of the row to the door. */
export const RAIN_X0 = PANEL0 + 6.6
export const RAIN_X1 = WALL_OUT - 0.25
export const RAIN_Y = -2.45
export const BATTEN2_X0 = PANEL0 - 0.3
export const BATTEN2_X1 = WALL_OUT - 0.2

/** A flat's rock as the gust reaches it: blown over a little, and back, damped. Radians, positive leaning right. */
export function panelRock(i: number, T: number): number {
  const a = T - GUSTS[i]
  if (a <= 0 || a > 1.4) return 0
  return 0.11 * Math.exp(-a / 0.32) * Math.sin(a * 9)
}
