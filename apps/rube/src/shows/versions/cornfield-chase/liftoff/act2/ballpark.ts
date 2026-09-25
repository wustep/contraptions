import type p5 from 'p5'
import { outline, solid } from '../../../../../../../../src/core/draw'
import { clamp, easeInOutSine, easeOutCubic } from '../../../../../../../../src/core/ease'
import { FLOOR, R, laneAt, mixHex, puff, type Lane, type Pt, type Seg } from '../../../../../parts'
import { alpha, carried, hash, knock, part, smooth, type Company, type Ctx, type PartShot } from '../kit'
import { cue } from '../music'
import { BALL, DUST, MURPH } from '../worlds'
import { fromRim, RIM_R, SEAM, standOnRim, stationFrame } from './station'

/**
 * The ballpark: Cooper Station's baseball, and the film's gag. The field
 * stands on the ring where the ground has turned to a wall, so the whole
 * diamond is sideways: first base at the foot, the mound, home plate under
 * its gallows, and a light tower up the wall.
 *
 * The ball comes up the first-base line and over the bag, a treadle that
 * springs the mitt ahead open (132); the mitt shuts on it (133) and flips it
 * to the pitching machine (134). It drops in the hopper (135). The machine's
 * wheels spin up a notch at a time (136, 138) while a winch draws the bat
 * back (137, 139); the gate lets the ball into the wheels on the eighth
 * (139½) and the bat, let go, meets the pitch on the accent (140). The
 * tower's lamps come on, a bank a beat (141–144). Over it all, on a mast
 * out in the air where the ground has turned to a wall, the scoreboard: its
 * home row turns over a plate a beat from first base to the hit, nine beats,
 * nine innings, and its clock's second hand goes round with the organ.
 *
 * The ball goes back over the pitcher, across the scoreboard's face and up
 * toward the axis, and curves: in the station's still frame it flies
 * straight, and the ring turns under it. It swings under the hub in the quiet
 * bars (145–149 are left to the long arc and the gathering music), and comes
 * down on the far side through the tip of a poplar (150) and the top of a
 * round tree (151) and in at an attic window of the house at the foot of the
 * lift's spoke, on the accent and the step up (152). It runs across the
 * attic into an old trunk, which knocks the trapdoor's latch (153). The door
 * goes down on its counterweight onto its stop (153½), and the ball rolls
 * down it and off its end with the speed the slope gave it, drops to the
 * floor (154) and rolls on over the lift car's threshold, a low wooden lip,
 * into its doorway.
 *
 * Murph is in the rocking chair by the far wall: his daughter, a lifetime
 * older than he is now, in a room that is hers, his old watch hung on the
 * wall by her chair and a quilt over its back. She has been there all along,
 * rocking gently with the organ; the crash upstairs
 * stops her. When he is down she rocks back once and forward, the chair
 * pitches her out onto the floor on the eighth, and she rolls out across the
 * room to him; and he, in the car's doorway, turns back out over the lip to
 * her. They meet in the open floor on the beat (155). Then she sends him on:
 * she walks him back to the lift, he over the lip and she up to it, and on
 * the eighth (155½) she pushes him on (go to her); he rolls to the middle of
 * the car by the big step (156), where the hub has him. She stays at the lip;
 * the car's gate comes down in front of her, the empty chair rocks itself
 * still behind her, and the car climbs away.
 *
 * The camera rolls with the ring while the ball is across the axis (the
 * score's `rollAt`), so the far-side house stands upright for all of this.
 */

/* ------------------------------------------------------------------ the clock (show seconds) */

/** Over first base: its treadle springs the mitt open. */
const IN = cue(132)
/** Into the mitt, which shuts on it. */
const CATCH = cue(133)
/** The mitt flips it to the machine. */
const TOSS = cue(134)
/** Into the hopper. */
const FEED = cue(135)
/** The wheels spin up, a notch and another. */
const SPIN1 = cue(136)
const SPIN2 = cue(138)
/** The winch draws the bat back, a notch and another. */
const COCK1 = cue(137)
const COCK2 = cue(139)
/** The gate lets the ball into the wheels. */
const PITCH = cue(139.5)
/** Bat on ball. */
const HIT = cue(140)
/** The light tower's banks, one a beat. */
const LAMPS = [141, 142, 143, 144].map(cue)
/** The scoreboard's home row: a plate a beat, nine beats from first base to the hit, nine innings. */
const INNINGS = [132, 133, 134, 135, 136, 137, 138, 139, 140].map(cue)
/** Through the tip of the poplar by the far house, and the top of the round tree. */
const POPLAR = cue(150)
const TREE = cue(151)
/** Through the window, across the station. */
const WINDOW = cue(152)
/** Into the trunk; the trapdoor goes. */
const HATCH = cue(153)
/** Down to the floor off the trapdoor; her touch across the car's threshold. */
const SEAT = cue(154)
const DOWN = cue(155)
/** Her nudge: on into the car. */
const INCAR = cue(155.5)
const OUT = cue(156)
/** Murph's span ends here, the car well up the spoke and the house out of the frame behind it. */
const MURPH_GONE = cue(162)
const xy = (q: Pt): { x: number; y: number } => ({ x: q[0], y: q[1] })

/** The trapdoor comes down on its stop. */
const STOP = cue(153.5)

export const BALLPARK_HITS = [IN, CATCH, TOSS, FEED, cue(135.5), SPIN1, COCK1, SPIN2, COCK2, PITCH, HIT, ...LAMPS, POPLAR, TREE, WINDOW, HATCH, STOP, SEAT, DOWN, INCAR]

/* ------------------------------------------------------------------ the geometry */

const F = stationFrame(SEAM.ballparkIn)
/** The axis, in this part's cells. */
const AX = F.axis
/** The angle the ball comes in at, and the far-side house's. */
const A_IN = 0.12
const A_HOUSE = Math.PI * 1.18
/** A point upright on the ground at angle `a` (x along the way, y down), in this part's cells. */
const U = (a: number, x: number, y: number): Pt => fromRim(AX, a, x, y)
/** The inverse: a point of this part's cells, in the upright frame at angle `a`. */
function toRim(a: number, q: Pt): Pt {
  const gx = AX[0] + RIM_R * Math.cos(a)
  const gy = AX[1] + RIM_R * Math.sin(a)
  const r = a - Math.PI / 2
  const dx = q[0] - gx
  const dy = q[1] - gy
  return [dx * Math.cos(r) + dy * Math.sin(r), -dx * Math.sin(r) + dy * Math.cos(r)]
}
/** A direction of this part's cells, in the upright frame at `a`. */
function dirIn(a: number, d: Pt): Pt {
  const r = a - Math.PI / 2
  return [d[0] * Math.cos(r) + d[1] * Math.sin(r), -d[0] * Math.sin(r) + d[1] * Math.cos(r)]
}
/** The angle `s` cells along the ground from the entry. */
const along = (s: number): number => A_IN - s / RIM_R

/** The rim hands the ball over rolling at this pace. */
const V_IN = 1.45
/** Where things stand, in cells along the ground from the entry. */
const S_MITT = V_IN * (CATCH - IN)
const S_PITCH = 4.2
const S_PLATE = 6.8
const S_TOWER = 9.9
/** The scoreboard's mast, on the free ground between the mitt and the mound; the board high over the field. */
const S_BOARD = 3.0
const A_BOARD = along(S_BOARD)
const A_MITT = along(S_MITT)
const A_PITCH = along(S_PITCH)
const A_PLATE = along(S_PLATE)
const A_TOWER = along(S_TOWER)

/** The ring's weight near the ground, for the short throws and drops. */
const G = 10

/** A parabola in an upright frame (y down) from `a` at `t0` to `b` at `t1`, under `g`. */
function throwAt(a: Pt, b: Pt, t0: number, t1: number, g: number): (T: number) => Pt {
  const D = t1 - t0
  const vx = (b[0] - a[0]) / D
  const vy = (b[1] - a[1]) / D - 0.5 * g * D
  return (T: number) => {
    const u = T - t0
    return [a[0] + vx * u, a[1] + vy * u + 0.5 * g * u * u]
  }
}
const ease2 = (u: number): number => 1 - (1 - u) * (1 - u)

/* ------------------------------------------------------------------ the mitt (its own upright frame) */

/** The flipper's hinge, and how far the pocket is from it. */
const M_PIVOT: Pt = [0.62, -R]
const M_ARM = 0.62
/** A short flick, its arm let go at the angle the toss leaves at, so the ball goes on the way the pocket was going. */
const FLIP = 0.09
const BETA = 0.45
/** The pocket's centre, the arm up by `b`. */
const pocket = (b: number): Pt => [M_PIVOT[0] - M_ARM * Math.cos(b), M_PIVOT[1] - M_ARM * Math.sin(b)]

function mittArm(T: number): number {
  if (T < TOSS) return 0
  const u = (T - TOSS) / FLIP
  // Sprung on the beat and gathering: at the top it is going the speed, and the way, the toss goes on at.
  if (u < 1) return BETA * u * u
  const since = T - TOSS - FLIP
  // Against the stop: a rebound. Then it lies back down.
  const bounce = 0.08 * Math.exp(-since / 0.22) * Math.abs(Math.sin(since * 15))
  const down = smooth(T, TOSS + 0.8, TOSS + 1.7)
  return (BETA - bounce) * (1 - down)
}

/** The fingers: open (1) or shut (0) on the pocket. */
function mittJaw(T: number): number {
  // Lying half shut until first base's treadle springs it open.
  if (T < IN) return 0.3
  if (T < CATCH - 0.07) return 0.3 + 0.7 * easeOutCubic(clamp((T - IN) / 0.09))
  if (T < CATCH) return 1 - ((T - CATCH + 0.07) / 0.07) ** 2
  if (T < TOSS + FLIP - 0.02) return 0
  return 0.8 * smooth(T, TOSS + FLIP - 0.02, TOSS + FLIP + 0.06)
}

/* ------------------------------------------------------------------ the pitching machine (its own upright frame) */

const PINCH: Pt = [0.02, -1.0]
const WHEEL_R = 0.25
const WHEELS: Pt[] = [
  [PINCH[0], PINCH[1] - (WHEEL_R + R - 0.02)],
  [PINCH[0], PINCH[1] + (WHEEL_R + R - 0.02)],
]
/** The hopper's mouth, where the toss comes down, and the gate the ball waits at. */
const MOUTH: Pt = [-0.64, -1.8]
const GATE: Pt = [-0.36, -1.0]
/** Down the hopper to its gate, which stops it on the and. */
const SLIDE = cue(135.5) - cue(135)
const INTO = 0.07

/** How fast the wheels turn: still, a notch, another; after the pitch they run down. */
const W1 = 8
const W2 = 30
const RAMP = 0.22
const RUN_DOWN = HIT + 0.9
function wheelTurn(T: number): number {
  let a = 0
  const seg = (t0: number, t1: number, r0: number, r1: number) => {
    const hi = Math.min(t1, T)
    if (hi <= t0) return
    const r = (t: number) => r0 + ((r1 - r0) * (t - t0)) / (t1 - t0)
    a += ((r(t0) + r(hi)) / 2) * (hi - t0)
  }
  seg(SPIN1, SPIN1 + RAMP, 0, W1)
  seg(SPIN1 + RAMP, SPIN2, W1, W1)
  seg(SPIN2, SPIN2 + RAMP, W1, W2)
  seg(SPIN2 + RAMP, RUN_DOWN, W2, W2)
  if (T > RUN_DOWN) a += W2 * 2.4 * (1 - Math.exp(-(T - RUN_DOWN) / 2.4))
  return a
}
function wheelRate(T: number): number {
  if (T < SPIN1) return 0
  if (T < SPIN2) return W1 * clamp((T - SPIN1) / RAMP)
  if (T < RUN_DOWN) return W1 + (W2 - W1) * clamp((T - SPIN2) / RAMP)
  return W2 * Math.exp(-(T - RUN_DOWN) / 2.4)
}

/** The throttle's notch: 0, 1, 2, and back to 0 once it has pitched. */
function throttle(T: number): number {
  const snap = (at: number) => (T < at ? 0 : easeOutCubic(clamp((T - at) / 0.08)))
  return snap(SPIN1) + snap(SPIN2) - 2 * smooth(T, HIT + 1.4, HIT + 2.0)
}

/** The gate: shut, flicked up on the eighth, and down again. */
function gateOpen(T: number): number {
  if (T < PITCH) return 0
  if (T < PITCH + 0.05) return (T - PITCH) / 0.05
  return 1 - smooth(T, PITCH + 0.45, PITCH + 0.7)
}

/* ------------------------------------------------------------------ the far house (its own upright frame) */

/** Its walls, the eaves' overhang, the ridge. */
const H_L = -2.3
const H_R = 2.35
const H_OVER = 0.22
const H_EAVE = -1.5
const H_RIDGE_X = (H_L + H_R) / 2
const H_RIDGE = -3.8
const H_ROOF = 0.13
const H_SPAN = (H_R - H_L) / 2 + H_OVER
/** The ground floor's ceiling, and the attic floor on top of it. */
const H_CEIL = -1.42
const H_LOFT = -1.52
/** Where the hub's shaft comes down through the roof, and its car's well in the attic floor. */
const SHAFT: [number, number] = [-0.66, 1.18]
const WELL: [number, number] = [-0.52, 0.52]
/** The roof's top at `x`. */
const roofAt = (x: number): number => H_RIDGE + (Math.abs(x - H_RIDGE_X) / H_SPAN) * (H_EAVE - H_RIDGE)
/** The attic window, face-on in the back wall under the roof on the side the ball comes from. */
const WIN = { x: 1.58, y: -1.8, w: 0.42, h: 0.38 }
/** The trunk at the far end of the attic, and the trapdoor in the floor against it, hinged at the trunk. */
const TRUNK = { x0: -1.92, x1: -1.5, h: 0.3 }
const DOOR_HINGE: Pt = [TRUNK.x1, H_LOFT]
const DOOR_LEN = 0.6
/** How far the door goes down, and how long its counterweight takes to let it there: on its stop on the eighth. */
const DOOR_MAX = 0.8
const DOOR_T = 0.5
/** The counterweight's pulley under the rafters, and its weight. */
const PULLEY: Pt = [-0.98, -2.55]
/**
 * Murph's rocking chair, a small one, set back against the wall and facing the car: where its rockers meet the floor,
 * and its size. Its seat's height and front, and every other measure of it below, are at full size; `CHAIR_S` shrinks
 * them.
 */
const CHAIR_X = -1.72
const CHAIR_S = 0.86
const SEAT_Y = -0.46
const SEAT_FRONT = 0.3
/** The trees by the house: a round one whose top the ball goes through, a tall poplar whose tip it clips. */
const TREE_X = 4.35
const TREE_CROWN: Pt = [4.35, -5.0]
const POPLAR_X = 5.85

/* ------------------------------------------------------------------ the pitch and the flight */

/** Where bat meets ball, in the plate's upright frame. */
const CONTACT: Pt = [0, -0.86]
const rot = (v: Pt, a: number): Pt => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a)]

/**
 * The station's turn, for the flight: radians a second. The ball flies
 * straight in the still frame, and the ring turns under it; seen from the
 * ring, it curves, round under the hub.
 */
const OMEGA = 0.12

const LAUNCH: Pt = U(A_PLATE, CONTACT[0], CONTACT[1])
const TARGET: Pt = U(A_HOUSE, WIN.x, WIN.y)
const FLIGHT = (() => {
  const T = WINDOW - HIT
  const L0: Pt = [LAUNCH[0] - AX[0], LAUNCH[1] - AX[1]]
  const W0: Pt = [TARGET[0] - AX[0], TARGET[1] - AX[1]]
  const pT = rot(W0, -OMEGA * T)
  return { L0, v: [(pT[0] - L0[0]) / T, (pT[1] - L0[1]) / T] as Pt }
})()
function flightAt(T: number): Pt {
  const u = T - HIT
  const q = rot([FLIGHT.L0[0] + FLIGHT.v[0] * u, FLIGHT.L0[1] + FLIGHT.v[1] * u], OMEGA * u)
  return [AX[0] + q[0], AX[1] + q[1]]
}
function velAt(T: number): Pt {
  const e = 1e-3
  const a = flightAt(T - e)
  const b = flightAt(T + e)
  return [(b[0] - a[0]) / (2 * e), (b[1] - a[1]) / (2 * e)]
}
/** The launch, and the way in at the window, each in its own upright frame. */
const V_LAUNCH = dirIn(A_PLATE, velAt(HIT + 1e-3))
const V_WINDOW = dirIn(A_HOUSE, velAt(WINDOW - 1e-3))

/* ------------------------------------------------------------------ the bat */

const BAT_LEN = 1.05
const SWEET = 0.78
/** The bat's hinge: off the contact point, square to the way the ball is to go, up and behind. */
const BAT_PIVOT: Pt = (() => {
  const n = Math.hypot(V_LAUNCH[0], V_LAUNCH[1])
  const u: Pt = [V_LAUNCH[0] / n, V_LAUNCH[1] / n]
  const side: Pt = [-u[1], u[0]]
  const s: Pt = side[0] > 0 ? side : [-side[0], -side[1]]
  return [CONTACT[0] + SWEET * s[0], CONTACT[1] + SWEET * s[1]]
})()
const BAT_CONTACT = Math.atan2(CONTACT[1] - BAT_PIVOT[1], CONTACT[0] - BAT_PIVOT[0])
const BAT_REST = Math.PI / 2
const BAT_BACK1 = Math.PI / 2 - 0.55
const BAT_BACK2 = Math.PI / 2 - 1.1
const SWING = 0.13
const TOP_AT = 0.12
const BAT_TOP = BAT_CONTACT + 0.8

function batAngle(T: number): number {
  const jerk = (at: number, from: number, to: number) => from + (to - from) * easeOutCubic(clamp((T - at) / 0.16))
  if (T < COCK1) return BAT_REST
  if (T < COCK2) return jerk(COCK1, BAT_REST, BAT_BACK1)
  const rel = HIT - SWING
  if (T < rel) return jerk(COCK2, BAT_BACK1, BAT_BACK2)
  if (T < HIT) {
    const u = (T - rel) / SWING
    return BAT_BACK2 + (BAT_CONTACT - BAT_BACK2) * u * u
  }
  // Through, and up; then it swings like the pendulum it is, and settles.
  if (T < HIT + TOP_AT) return BAT_CONTACT + (BAT_TOP - BAT_CONTACT) * ease2((T - HIT) / TOP_AT)
  const since = T - HIT - TOP_AT
  return BAT_REST + (BAT_TOP - BAT_REST) * Math.exp(-since / 1.6) * Math.cos((Math.PI * since) / 0.95)
}

/* ------------------------------------------------------------------ the ball's way, piece by piece */

/** The toss, in the mitt's frame. */
const TOSS_FROM = pocket(BETA)
const TOSS_TO = toRim(A_MITT, U(A_PITCH, MOUTH[0], MOUTH[1]))
const tossAt = throwAt(TOSS_FROM, TOSS_TO, TOSS + FLIP, FEED, G)

/** In the attic: in at the window, down on the boards, and along them into the trunk. */
const LOFT_Y = H_LOFT - R
const ATTIC = (() => {
  const [vx, vy] = V_WINDOW
  const g = (-vy + Math.sqrt(vy * vy + 2 * G * (LOFT_Y - WIN.y))) / G
  return { t1: g, x1: WIN.x + vx * g }
})()
const STOP_X = TRUNK.x1 + R
const BACK_X = STOP_X + 0.1
function atticAt(T: number): Pt {
  const u = T - WINDOW
  const [vx, vy] = V_WINDOW
  const { t1, x1 } = ATTIC
  if (u < t1) return [WIN.x + vx * u, WIN.y + vy * u + 0.5 * G * u * u]
  // Along the boards, a skip or two, and into the trunk on the beat.
  const w = (u - t1) / (HATCH - WINDOW - t1)
  const x = x1 + (STOP_X - x1) * w
  const skip = 0.05 * Math.abs(Math.sin(w * Math.PI * 2.5)) * (1 - w)
  return [x, LOFT_Y - skip]
}

/** The trapdoor's angle down from the floor: its latch knocked out on the beat, let down on its counterweight onto its stop. */
function doorAngle(T: number): number {
  if (T < HATCH) return 0
  const u = (T - HATCH) / DOOR_T
  if (u < 1) return DOOR_MAX * easeInOutSine(u)
  const since = T - HATCH - DOOR_T
  return DOOR_MAX - 0.022 * Math.exp(-since / 0.2) * Math.abs(Math.sin(since * 14))
}
/** A point on the trapdoor, `d` from its hinge and `h` above its face. */
function doorPoint(T: number, d: number, h = 0): Pt {
  const g = doorAngle(T)
  return [DOOR_HINGE[0] + d * Math.cos(g) + h * Math.sin(g), DOOR_HINGE[1] + d * Math.sin(g) - h * Math.cos(g)]
}
/**
 * He rolls down the door as it goes, and off its end once it is on its stop, with the speed the slope gave him: down
 * to the floor on the beat, just short of the lift car's threshold. The door's angle and length are chosen so that
 * the roll's own speed, 1.26 a second along the door, is the speed that fall needs; nothing flicks him.
 */
const OFF = cue(153.61)
const D0 = BACK_X - DOOR_HINGE[0]
function onDoor(T: number): Pt {
  if (T < HATCH + 0.12) {
    // The rebound off the trunk.
    const u = (T - HATCH) / 0.12
    return [STOP_X + (BACK_X - STOP_X) * ease2(u), LOFT_Y]
  }
  const u = clamp((T - HATCH - 0.12) / (OFF - HATCH - 0.12))
  return doorPoint(T, D0 + (DOOR_LEN - 0.06 - D0) * u * u, R)
}

/**
 * The chair's lean, forward positive, at its turns; between turns it swings as a pendulum does. She has been
 * rocking it since the lights came up, gently, with the organ: forward on the even beats, back on the odd. The
 * crash upstairs stops her, and she sits still while he comes down through the trapdoor. When he is down she rocks
 * back once and forward, hard, and the chair pitches her out onto the floor; the empty chair rocks on behind her,
 * less each time, and is still.
 */
const ROCK_A = 0.05
const GATHER = cue(153.8)
const RISE = cue(154.32)
const TURNS: [number, number][] = (() => {
  const out: [number, number][] = []
  for (let k = 104; k <= 152; k++) out.push([cue(k), k % 2 ? -ROCK_A : ROCK_A])
  out.push([cue(152.55), 0], [cue(153.62), 0], [GATHER, -0.07], [RISE, 0.22])
  out.push([cue(154.88), -0.09], [cue(155.48), 0.1], [cue(156.08), -0.06], [cue(156.68), 0.05], [cue(157.28), -0.03], [cue(157.88), 0.015], [cue(158.5), 0])
  return out
})()
function chairLean(T: number): number {
  if (T <= TURNS[0][0]) return TURNS[0][1]
  let i = 1
  while (i < TURNS.length - 1 && TURNS[i][0] < T) i++
  const [t0, a0] = TURNS[i - 1]
  const [t1, a1] = TURNS[i]
  const u = clamp((T - t0) / (t1 - t0))
  const e = (1 - Math.cos(Math.PI * u)) / 2
  // The crash shakes the house, and the chair in it.
  const w = T - WINDOW
  const shake = w > 0 && w < 1.4 ? 0.02 * Math.exp(-w / 0.3) * Math.sin(w * 15) : 0
  return a0 + (a1 - a0) * e + shake
}
/** The rockers' curve, as a circle this far over the floor (at full size): the chair rolls on it. */
const ROCKER_R = 1.13
const ROCK_R = ROCKER_R * CHAIR_S
/** A point of the chair, in its own upright cells (x from where the rockers meet the floor), in the house's. */
function chairPoint(T: number, x: number, y: number): Pt {
  const a = chairLean(T)
  const py = y + ROCK_R
  return [CHAIR_X + ROCK_R * a + x * Math.cos(a) - py * Math.sin(a), -ROCK_R + x * Math.sin(a) + py * Math.cos(a)]
}
const FLOOR_Y = -R
/** The car's threshold: a low wooden lip on the floor at its door. */
const LIP = { x0: -0.52, x1: -0.46, h: 0.04 }
/** How far short of the lip a ball's centre is when it rests against it. */
const LIP_GAP = Math.sqrt(R * R - (R - LIP.h) ** 2)
/** Where she stops, against the lip: she does not cross it. Where he waits, just over it in the car's doorway. */
const REST_X = LIP.x0 - LIP_GAP
const WAIT_X = REST_X + 2 * R
/** A ball's centre over the floor and the lip, at `x`: up the lip's near corner, along its top, down its far one. */
function lipY(x: number): number {
  if (x <= REST_X || x >= LIP.x1 + LIP_GAP) return FLOOR_Y
  if (x < LIP.x0) return -LIP.h - Math.sqrt(Math.max(0, R * R - (LIP.x0 - x) ** 2))
  if (x <= LIP.x1) return -LIP.h - R
  return -LIP.h - Math.sqrt(Math.max(0, R * R - (x - LIP.x1) ** 2))
}

/** A cubic Hermite: from `p0` with slope `m0` to `p1` with slope `m1` (slopes per unit of `u`). */
const hermite = (p0: number, m0: number, p1: number, m1: number, u: number): number =>
  (2 * u ** 3 - 3 * u * u + 1) * p0 + (u ** 3 - 2 * u * u + u) * m0 + (-2 * u ** 3 + 3 * u * u) * p1 + (u ** 3 - u * u) * m1

/* ---- the meeting: where they meet, in the open floor, and how they go to the lift together */

/**
 * They meet in the open floor between her chair and the lift's threshold, on the beat: he a little short of the lip,
 * she a ball's width behind him. Then she walks him back to it, he over it into the car's doorway and she up to it;
 * she draws back a little and nudges him on the eighth, and he rolls to the car's middle by the big step.
 */
const MEET_HIM = -0.66
const MEET_HER = MEET_HIM - 2 * R
const WALKED = cue(155.42)
/** Where he is on the walk back to the lift, 155 to WALKED: she pushes, he rolls, over the lip. */
function walkX(T: number): number {
  const D = WALKED - DOWN
  return hermite(MEET_HIM, 0.1 * D, WAIT_X, 0, clamp((T - DOWN) / D))
}

/* ---- him: off the trapdoor, on into the doorway, back out to her, walked back in, and nudged on */

/** He lands on the beat and rolls on at the speed he came down with, over the lip into the car's doorway, slowing. */
const LAND_X = -0.7
const V_DOWN = 0.86
const INSIDE = -0.42
const STOPPED = cue(154.45)
/** And turns back: out over the lip again, toward her, to meet her on the beat. */
const TURNS_BACK = cue(154.56)
const dropToFloor = throwAt(onDoor(OFF), [LAND_X, FLOOR_Y], OFF, SEAT, G)
function hisFloor(T: number): Pt {
  const s = T - SEAT
  const up = s < 0.14 ? 0.03 * Math.sin((Math.PI * s) / 0.14) : 0
  let x: number
  if (T <= STOPPED) {
    const D = STOPPED - SEAT
    x = hermite(LAND_X, V_DOWN * D, INSIDE, 0, clamp(s / D))
  } else if (T <= TURNS_BACK) x = INSIDE
  else if (T <= DOWN) {
    const D = DOWN - TURNS_BACK
    x = hermite(INSIDE, 0, MEET_HIM, 0, (T - TURNS_BACK) / D)
  } else x = walkX(T)
  return [x, lipY(x) - up]
}
/** The nudge on the eighth: a gentle push that takes him up to about a cell a second and lets him roll to the car's middle. */
function hisGo(T: number): Pt {
  const u = clamp((T - INCAR) / (OUT - INCAR))
  const w = u ** 0.7
  return [WAIT_X * (1 - w * w * (3 - 2 * w)), FLOOR_Y]
}

/* ---- Murph: still in her chair while he comes down; then out of it, and across the room to him */

/** Her place on the seat, against the chair's back, and the seat's front edge, where she goes over (full size). */
const HER_X = -0.155 * CHAIR_S
const EDGE = (SEAT_FRONT + 0.04) * CHAIR_S
const SEAT_TOP = SEAT_Y * CHAIR_S - R
/** Down the seat as the chair comes forward, pitched off its edge, down on the floor on the eighth, already rolling. */
const ROLL_ON = cue(153.96)
const OFF_EDGE = cue(154.27)
const HER_DOWN = cue(154.5)
const HER_LAND = -1.24
function chairPointAt(T: number, x: number): Pt {
  return chairPoint(T, x, SEAT_TOP)
}
/** Where she is on the seat as it tips forward, gathering way down it. */
function onSeat(T: number): Pt {
  const u = clamp((T - ROLL_ON) / (OFF_EDGE - ROLL_ON))
  return chairPointAt(T, HER_X + (EDGE - HER_X) * (0.45 * u * u * (3 - 2 * u) + 0.55 * u * u))
}
/** Her way leaving the edge, and the pace she rolls away at once she is down. */
const V_EDGE: Pt = (() => {
  const a = onSeat(OFF_EDGE - 0.004)
  const b = onSeat(OFF_EDGE)
  return [(b[0] - a[0]) / 0.004, (b[1] - a[1]) / 0.004]
})()
const V_LAND = 0.8
const V_TOUCH = 0.1
/**
 * Off the edge and down to the floor, eased: she leaves the seat the way it gave her, and comes down onto the floor
 * already rolling, her fall taken up in the last of it, so the touchdown is soft and she rolls straight on.
 */
function herDrop(T: number): Pt {
  const D = HER_DOWN - OFF_EDGE
  const u = clamp((T - OFF_EDGE) / D)
  const e = onSeat(OFF_EDGE)
  return [hermite(e[0], V_EDGE[0] * D, HER_LAND, V_LAND * D, u), hermite(e[1], V_EDGE[1] * D, FLOOR_Y, 0, u)]
}
/** Out across the floor to him, slowing, as he comes back to her: they touch on the beat. */
function across(T: number): number {
  const D = DOWN - HER_DOWN
  return hermite(HER_LAND, V_LAND * D, MEET_HER, V_TOUCH * D, clamp((T - HER_DOWN) / D))
}
/**
 * At the lip, against him, still; on the eighth she sends him on: she pushes, the two of them moving together for a moment, she on
 * after him a hair up the lip's corner as he goes on; then she settles back against it. No stop, no snap.
 */
const FOLLOW = 0.03
const SETTLED = cue(155.8)
function nudgeX(T: number): number {
  const piece = (t0: number, t1: number, p0: number, m0: number, p1: number, m1: number) => {
    const D = t1 - t0
    return hermite(p0, m0 * D, p1, m1 * D, clamp((T - t0) / D))
  }
  const on = cue(155.64)
  if (T <= INCAR) return REST_X
  if (T <= on) return REST_X + piece(INCAR, on, 0, 0, FOLLOW, 0)
  return REST_X + piece(on, SETTLED, FOLLOW, 0, 0, 0)
}
function herAt(T: number): Pt {
  if (T <= ROLL_ON) return chairPointAt(T, HER_X)
  if (T <= OFF_EDGE) return onSeat(T)
  if (T <= HER_DOWN) return herDrop(T)
  if (T <= DOWN) return [across(T), FLOOR_Y]
  // She walks him back to the lift, against him all the way.
  if (T <= WALKED) return [walkX(T) - 2 * R, FLOOR_Y]
  if (T <= SETTLED) {
    const x = nudgeX(T)
    return [x, lipY(x)]
  }
  // At the lip. The gate comes down in front of her on the step: she starts back from it, and is still.
  const g = T - OUT
  return [REST_X - (g > 0 && g < 0.35 ? 0.025 * Math.sin((Math.PI * g) / 0.35) : 0), FLOOR_Y]
}
/** The ball, at show time `T`, in this part's cells. */
function ballAt(T: number): Pt {
  if (T <= CATCH) return U(along(V_IN * (T - IN)), 0, -FLOOR)
  if (T <= TOSS) return U(A_MITT, ...pocket(0))
  if (T <= TOSS + FLIP) return U(A_MITT, ...pocket(mittArm(T)))
  if (T <= FEED) return U(A_MITT, ...tossAt(T))
  if (T <= FEED + SLIDE) {
    const e = clamp((T - FEED) / SLIDE) ** 2
    return U(A_PITCH, MOUTH[0] + (GATE[0] - MOUTH[0]) * e, MOUTH[1] + (GATE[1] - MOUTH[1]) * e)
  }
  if (T <= PITCH) return U(A_PITCH, ...GATE)
  if (T <= PITCH + INTO) {
    const u = (T - PITCH) / INTO
    return U(A_PITCH, GATE[0] + (PINCH[0] - GATE[0]) * u * u, PINCH[1])
  }
  if (T <= HIT) {
    const a = U(A_PITCH, ...PINCH)
    const u = (T - PITCH - INTO) / (HIT - PITCH - INTO)
    return [a[0] + (LAUNCH[0] - a[0]) * u, a[1] + (LAUNCH[1] - a[1]) * u]
  }
  if (T <= WINDOW) return flightAt(T)
  if (T <= HATCH) return U(A_HOUSE, ...atticAt(T))
  if (T <= OFF) return U(A_HOUSE, ...onDoor(T))
  if (T <= SEAT) return U(A_HOUSE, ...dropToFloor(T))
  if (T <= INCAR) return U(A_HOUSE, ...hisFloor(T))
  // Over the lip, and still in the middle of the car.
  return U(A_HOUSE, ...hisGo(T))
}

/* ------------------------------------------------------------------ the part */

interface BallparkState {
  begin: number
  lane: Lane
}

export const ballpark = part<BallparkState>(
  {
    name: 'ballpark',
    flight: true,
    draw: (p, s, c) => drawPark(p, s, c),
    over: (p, s, c) => overPark(p, s, c),
  },
  (slot) => {
    const begin = slot.begin
    const at = (T: number) => T - begin
    const fn = (t: number) => ballAt(t + begin)
    const pieces: [number, number, number][] = [
      [IN, CATCH, 20],
      [CATCH, TOSS, 1],
      [TOSS, TOSS + FLIP, 6],
      [TOSS + FLIP, FEED, 30],
      [FEED, FEED + SLIDE, 10],
      [FEED + SLIDE, PITCH, 1],
      [PITCH, PITCH + INTO, 4],
      [PITCH + INTO, HIT, 1],
      [HIT, WINDOW, 480],
      [WINDOW, HATCH, 50],
      [HATCH, OFF, 30],
      [OFF, SEAT, 14],
      [SEAT, DOWN, 50],
      [DOWN, INCAR, 25],
      [INCAR, slot.end, 40],
    ]
    const segs: Seg[] = []
    for (const [t0, t1, n] of pieces) segs.push(...carried(fn, at(t0), at(t1), n))
    const lane: Lane = { segs, fire: at(CATCH) }
    // Every cell anything is drawn in: the field up the wall, the flight, the far house and its tree.
    const pts: Pt[] = []
    for (let s = -1; s <= S_TOWER + 1.5; s += 0.5) for (let h = -0.8; h <= 5.6; h += 0.5) pts.push(U(along(s), 0, -h))
    for (let x = -3; x <= 5.8; x += 0.5) for (let h = -0.8; h <= 6.2; h += 0.5) pts.push(U(A_HOUSE, x, -h))
    for (let T = HIT; T <= WINDOW; T += 0.1) pts.push(flightAt(T))
    const seen = new Set<string>()
    const cells: Pt[] = []
    for (const [x, y] of pts) {
      const cx = Math.round(x)
      const cy = Math.round(y)
      const key = `${cx},${cy}`
      if (seen.has(key)) continue
      seen.add(key)
      cells.push([cx, cy])
    }
    // Murph: in the far-side house's rocking chair, old, waiting. Her span starts with this part, out of shot (the
    // house is across the ring); the pull back as the ball crosses the axis shows her as a speck in the house; she
    // meets her father on 155 and sends him on; left at the lift's threshold as the car climbs, and gone once the
    // house is out of the frame.
    const company: Company[] = [{ who: 'murph', from: begin, to: MURPH_GONE, at: (T) => ({ ...xy(U(A_HOUSE, ...herAt(T))), color: MURPH }) }]
    return { cells, exit: F.exit(SEAM.ballparkOut), lane, state: { begin, lane }, company }
  },
  (slot) => {
    const mid = (a: Pt, b: Pt, f = 0.5): Pt => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]
    // Up the wall: the camera stands off the ground, so the machines are on the right and the air they throw into on the left.
    const wall = (s: number, h: number): Pt => U(along(s), 0, -h)
    const tower = U(A_TOWER, 0, -4.2)
    const house = U(A_HOUSE, -0.15, -1.75)
    const keys: PartShot[] = [
      { t: slot.begin, cells: 5.0, off: [Math.sin(A_IN) * 0.5 - Math.cos(A_IN) * 0.5, -Math.cos(A_IN) * 0.5 - Math.sin(A_IN) * 0.5], w: 0 },
      // Held out in the air, so the scoreboard is in with the machines and the hull is a band, not half the frame.
      // The windup's frame keeps the waiting ball in under Zoom and the winch's drum in without it.
      { t: CATCH - 0.3, cells: 4.8, hold: wall(2.1, 1.9), w: 0.9 },
      { t: FEED, cells: 5.0, hold: wall(3.0, 2.0), w: 1 },
      { t: SPIN1 + 0.5, cells: 5.5, hold: wall(5.4, 2.1), w: 1 },
      { t: HIT, cells: 5.5, hold: wall(5.5, 2.1), w: 1 },
      { t: cue(141.6), cells: 13, hold: mid(flightAt(cue(141.6)), tower, 0.3), w: 0.7 },
      { t: cue(144.4), cells: 44, hold: [AX[0] + 0.8, AX[1] + 1.2], w: 1 },
      { t: cue(147.4), cells: 38, hold: [AX[0] - 2.2, AX[1] - 0.6], w: 1 },
      { t: cue(150), cells: 17, hold: mid(flightAt(cue(150)), house, 0.5), w: 0.9 },
      { t: TREE, cells: 9.5, hold: mid(flightAt(TREE), house, 0.3), w: 1 },
      { t: WINDOW + 0.1, cells: 5.6, hold: U(A_HOUSE, WIN.x - 0.5, WIN.y + 0.45), w: 1 },
      // The room: the trapdoor, her chair and the floor she crosses. In as he comes down beside her; closest as
      // she leans in, held through the moment; and out on the nudge, the car and the lip both in, to the hub's first
      // framing on the step.
      // Framed for the camera's roll, which has the house upright: the room across the frame, the attic over it. The
      // close keys are centred so that the whole room reads without Zoom, and with it (1.5 closer, the same centre)
      // her chair and the two of them are still in.
      { t: HATCH + 0.3, cells: 3.6, hold: U(A_HOUSE, -0.7, -1.1), w: 1 },
      { t: SEAT, cells: 3.15, hold: U(A_HOUSE, -0.75, -0.7), w: 1 },
      { t: DOWN, cells: 2.9, hold: U(A_HOUSE, -0.82, -0.62), w: 1 },
      { t: INCAR, cells: 3.0, hold: U(A_HOUSE, -0.62, -0.66), w: 1 },
      // The hub's first framing: back a little, the house and the car in it.
      { t: slot.end, cells: 4.8, hold: U(A_HOUSE, 0.2, -1), w: 1 },
    ]
    return keys
  },
)

/* ------------------------------------------------------------------ drawing */

function drawPark(p: p5, s: BallparkState, c: Ctx): void {
  const T = c.t + s.begin
  drawField(p, c, T)
  drawBoard(p, c, T)
  drawTower(p, c, T)
  drawMachine(p, c, T)
  drawBat(p, c, T)
  drawMitt(p, c, T, false)
  drawPoplar(p, c, T)
  drawTree(p, c, T)
  drawHouse(p, c, T)
  drawStreak(p, c, T)
}

/**
 * Pulled right back, the ball is a speck: it trails a short streak of its
 * own colour, which fades as the camera comes in and it is big again.
 */
function drawStreak(p: p5, c: Ctx, T: number): void {
  if (T <= HIT + 0.04 || T >= WINDOW) return
  const px = 2 * R * c.k
  // Not over the far house in the last instant: by then the camera is in close anyway.
  const f = clamp((18 - px) / 9) * (1 - smooth(T, WINDOW - 0.6, WINDOW - 0.25))
  if (f <= 0) return
  const X = (v: number) => v * c.k
  const n = 16
  const span = 0.55
  for (let i = n; i >= 1; i--) {
    const t0 = T - (i / n) * span
    const t1 = T - ((i - 1) / n) * span
    if (t0 < HIT) continue
    const a = flightAt(t0)
    const b = flightAt(t1)
    const u = 1 - (i - 0.5) / n
    p.stroke(alpha(p, BALL, f * 0.6 * u))
    p.strokeWeight(Math.max(2, px * 0.9) * (0.35 + 0.65 * u))
    p.line(X(a[0]), X(a[1]), X(b[0]), X(b[1]))
  }
}

function overPark(p: p5, s: BallparkState, c: Ctx): void {
  const T = c.t + s.begin
  drawMitt(p, c, T, true)
  // The flight comes down behind the far house and in at the window: until it does, the house stands in front of it.
  if (T > WINDOW - 0.5 && T < WINDOW) {
    const b = laneAt(s.lane, c.t)
    const q = toRim(A_HOUSE, [b.x, b.y])
    if (Math.abs(q[0] - H_RIDGE_X) < H_SPAN + 0.2 && q[1] < 0.1 && q[1] > roofAt(q[0]) - 0.2) {
      const ctx = p.drawingContext as CanvasRenderingContext2D
      p.push()
      ctx.beginPath()
      ctx.arc(b.x * c.k, b.y * c.k, (R + 0.04) * c.k, 0, Math.PI * 2)
      ctx.clip()
      drawHouse(p, c, T)
      p.pop()
    }
  }
  drawShards(p, c, T)
  drawLeaves(p, c, T)
}

/* ------------------------------------------------------------------ the field */

function drawField(p: p5, c: Ctx, T: number): void {
  const { k, ink, weight } = c
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const X = (v: number) => v * k
  const band = (s0: number, s1: number, depth: number, fill: string) => {
    ctx.beginPath()
    ctx.arc(X(AX[0]), X(AX[1]), X(RIM_R + depth), along(s0), along(s1), true)
    ctx.arc(X(AX[0]), X(AX[1]), X(RIM_R), along(s1), along(s0), false)
    ctx.closePath()
    ctx.fillStyle = fill
    ctx.fill()
  }
  // The infield's clay, the outfield's grass.
  band(-0.6, S_PLATE + 1.4, 0.1, DUST.wood)
  band(S_PLATE + 1.4, S_TOWER + 1.2, 0.1, DUST.sage)
  p.noFill()
  p.stroke(ink)
  p.strokeWeight(weight * 0.6)
  ctx.beginPath()
  ctx.arc(X(AX[0]), X(AX[1]), X(RIM_R + 0.1), along(-0.6), along(S_TOWER + 1.2), true)
  ctx.stroke()
  // Grass in tufts along the outfield.
  p.stroke(alpha(p, ink, 0.5))
  p.strokeWeight(weight * 0.5)
  for (let s = S_PLATE + 1.6; s < S_TOWER + 1.1; s += 0.23) {
    standOnRim(p, k, AX, along(s + hash(Math.round(s * 10), 2) * 0.1), () => {
      p.line(0, 0, X(-0.03), X(-0.09))
      p.line(X(0.04), 0, X(0.06), X(-0.07))
    })
  }
  // First base, and home plate: bone on the clay. The bag is a treadle: it goes down under the ball.
  const bag = knock(T - IN, 0.24)
  standOnRim(p, k, AX, along(0), () => {
    solid(p, ink, weight * 0.7, DUST.bone)
    p.rect(0, X(-0.04 + 0.03 * bag), X(0.36), X(0.08), X(0.025))
    const since = T - IN
    if (since > 0 && since < 0.6) {
      p.push()
      p.drawingContext.globalAlpha = 1 - since / 0.6
      puff(p, k, ink, weight * 0.5, DUST.bone, -0.25 - since * 0.4, -0.08 - since * 0.25, 0.05 + since * 0.14)
      p.pop()
    }
  })
  // The bag's wire to the mitt, along the turf.
  p.noFill()
  p.stroke(alpha(p, ink, 0.55))
  p.strokeWeight(weight * 0.5)
  ctx.beginPath()
  ctx.arc(X(AX[0]), X(AX[1]), X(RIM_R - 0.025), along(0.18), along(S_MITT + M_PIVOT[0] - 0.05), true)
  ctx.stroke()
  standOnRim(p, k, AX, A_PLATE, () => {
    solid(p, ink, weight * 0.7, DUST.bone)
    p.rect(0, X(-0.02), X(0.38), X(0.04))
  })
}

/* ------------------------------------------------------------------ the mitt */

function drawMitt(p: p5, c: Ctx, T: number, front: boolean): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  const b = mittArm(T)
  const jaw = mittJaw(T)
  standOnRim(p, k, AX, A_MITT, () => {
    if (!front) {
      // The hinge block on the ground ahead of the pocket, its spring, and the stop it flips against.
      solid(p, ink, weight, DUST.tin)
      p.rect(X(M_PIVOT[0] + 0.08), X(-0.09), X(0.32), X(0.18), X(0.03))
      p.push()
      p.translate(X(M_PIVOT[0] + 0.14), 0)
      p.rotate(-0.4)
      solid(p, ink, weight * 0.8, DUST.wood)
      p.rect(0, X(-0.3), X(0.07), X(0.6))
      p.pop()
      outline(p, ink, weight * 0.6)
      for (let i = 0; i < 2; i++) p.circle(X(M_PIVOT[0]), X(M_PIVOT[1]), X(0.12 + 0.03 * b + i * 0.07))
    }
    const pc = pocket(b)
    p.push()
    p.translate(X(pc[0]), X(pc[1]))
    p.rotate(b)
    // The fingers: a thick band hinged at the heel that wraps over the pocket when shut, and stands up open.
    const hinge: Pt = [0.26, -0.03]
    const fingers = () => {
      p.push()
      p.translate(X(hinge[0]), X(hinge[1]))
      p.rotate(jaw * 1.25)
      p.translate(-X(hinge[0]), -X(hinge[1]))
      const band = (r0: number, r1: number) => {
        p.beginShape()
        for (let i = 0; i <= 14; i++) {
          const a = -0.05 - (i / 14) * 2.75
          p.vertex(X(Math.cos(a) * r1), X(Math.sin(a) * r1))
        }
        // The tips: two stalls, rounded.
        const ta = -2.8
        p.bezierVertex(X(Math.cos(ta - 0.3) * r1), X(Math.sin(ta - 0.3) * r1), X(Math.cos(ta - 0.3) * r0), X(Math.sin(ta - 0.3) * r0), X(Math.cos(ta) * r0), X(Math.sin(ta) * r0))
        for (let i = 14; i >= 0; i--) {
          const a = -0.05 - (i / 14) * 2.75
          p.vertex(X(Math.cos(a) * r0), X(Math.sin(a) * r0))
        }
        p.endShape(p.CLOSE)
      }
      solid(p, ink, weight, DUST.wood)
      band(R + 0.02, R + 0.14)
      // Seams between the stalls, and lacing at the tips.
      outline(p, ink, weight * 0.45)
      p.noFill()
      p.arc(0, 0, X(2 * (R + 0.08)), X(2 * (R + 0.08)), -2.75, -0.35)
      for (const a of [-2.55, -2.2, -1.85]) p.line(X(Math.cos(a) * (R + 0.09)), X(Math.sin(a) * (R + 0.09)), X(Math.cos(a - 0.12) * (R + 0.14)), X(Math.sin(a - 0.12) * (R + 0.14)))
      p.pop()
    }
    if (!front) {
      // The arm, from the heel to the hinge.
      solid(p, ink, weight, DUST.tin)
      p.beginShape()
      p.vertex(X(0.24), X(0.08))
      p.vertex(X(M_ARM + 0.04), X(-0.03))
      p.vertex(X(M_ARM + 0.04), X(0.04))
      p.vertex(X(0.24), X(0.15))
      p.endShape(p.CLOSE)
      solid(p, ink, weight, DUST.denim)
      p.circle(X(M_ARM), 0, X(0.1))
      // The thumb, up at the near end; and the web laced from it to the fingers while it is open.
      p.push()
      p.translate(X(-0.24), X(0.06))
      p.rotate(0.35 * (1 - jaw))
      solid(p, ink, weight, DUST.wood)
      p.beginShape()
      p.vertex(X(-0.02), X(0.05))
      p.bezierVertex(X(-0.12), X(-0.02), X(-0.16), X(-0.18), X(-0.1), X(-0.24))
      p.bezierVertex(X(-0.05), X(-0.28), X(0.02), X(-0.2), X(0.06), X(-0.04))
      p.endShape(p.CLOSE)
      p.pop()
      if (jaw > 0.3) {
        const tip: Pt = [Math.cos(-2.6) * (R + 0.08), Math.sin(-2.6) * (R + 0.08)]
        const g = jaw * 1.25
        const tx = hinge[0] + (tip[0] - hinge[0]) * Math.cos(g) - (tip[1] - hinge[1]) * Math.sin(g)
        const ty = hinge[1] + (tip[0] - hinge[0]) * Math.sin(g) + (tip[1] - hinge[1]) * Math.cos(g)
        const th: Pt = [-0.3 + 0.1 * (1 - jaw), -0.14]
        p.stroke(alpha(p, ink, 0.8 * clamp((jaw - 0.3) / 0.3)))
        p.strokeWeight(weight * 0.5)
        for (let i = 0; i < 4; i++) {
          const f = (i + 0.5) / 4
          const ax = th[0] + (tx - th[0]) * f
          const ay = th[1] + (ty - th[1]) * f
          p.line(X(ax), X(ay), X(ax * 0.55), X(ay * 0.55 + 0.02))
        }
        p.line(X(th[0]), X(th[1]), X(tx), X(ty))
      }
      // The palm, a leather cup under the ball, and the heel's welt.
      solid(p, ink, weight, DUST.wood)
      p.beginShape()
      p.vertex(X(-0.3), X(0.0))
      p.bezierVertex(X(-0.34), X(0.24), X(0.3), X(0.26), X(0.36), X(0.03))
      p.bezierVertex(X(0.33), X(-0.04), X(0.27), X(-0.04), X(0.24), X(0.0))
      p.bezierVertex(X(0.12), X(0.16), X(-0.14), X(0.17), X(-0.22), X(-0.02))
      p.endShape(p.CLOSE)
      outline(p, ink, weight * 0.45)
      for (const x of [-0.18, -0.06, 0.06, 0.18]) p.line(X(x), X(0.15 + 0.02 * Math.cos(x * 6)), X(x + 0.03), X(0.2 + 0.02 * Math.cos(x * 6)))
      solid(p, ink, weight * 0.8, DUST.rust)
      p.rect(X(0.34), X(0.06), X(0.08), X(0.2), X(0.03))
      if (jaw > 0.5) fingers()
    } else if (jaw <= 0.5) fingers()
    p.pop()
  })
}

/* ------------------------------------------------------------------ the pitching machine */

function drawMachine(p: p5, c: Ctx, T: number): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  // Each notch of the throttle: the motor coughs and the head jumps on its tripod.
  const notch = Math.max(knock(T - SPIN1, 0.22), knock(T - SPIN2, 0.22))
  const jolt = 0.045 * notch * Math.sin((T - (T > SPIN2 ? SPIN2 : SPIN1)) * 22)
  standOnRim(p, k, AX, A_PITCH, () => {
    for (const at of [SPIN1, SPIN2]) {
      const age = T - at
      if (age < 0 || age > 0.9) continue
      const big = at === SPIN2 ? 1.4 : 1
      p.push()
      p.drawingContext.globalAlpha = 1 - age / 0.9
      puff(p, k, ink, weight * 0.5, DUST.bone, 0.55 + age * 0.35, -0.62 - age * 0.3 * big, (0.05 + age * 0.12) * big)
      p.pop()
    }
    // The mound, and the rubber on it.
    solid(p, ink, weight, DUST.wood)
    p.beginShape()
    p.vertex(X(-1.1), X(0.03))
    p.bezierVertex(X(-0.6), X(-0.19), X(0.6), X(-0.19), X(1.1), X(0.03))
    p.endShape(p.CLOSE)
    solid(p, ink, weight * 0.6, DUST.bone)
    p.rect(X(0.62), X(-0.1), X(0.22), X(0.045))
    // The tripod.
    solid(p, ink, weight, DUST.tin)
    const hub: Pt = [0, -0.46]
    for (const [fx, fy] of [[-0.46, -0.1], [0.44, -0.1]] as Pt[]) {
      p.beginShape()
      p.vertex(X(hub[0] - 0.035), X(hub[1]))
      p.vertex(X(fx - 0.035), X(fy))
      p.vertex(X(fx + 0.035), X(fy))
      p.vertex(X(hub[0] + 0.035), X(hub[1]))
      p.endShape(p.CLOSE)
    }
    // The yoke that holds both wheels, and the motor on it; the head jumps as it revs.
    p.push()
    p.translate(0, X(hub[1]))
    p.rotate(jolt)
    p.translate(0, -X(hub[1]))
    solid(p, ink, weight, DUST.teal)
    p.rect(X(0.02), X((WHEELS[0][1] + hub[1]) / 2 - 0.02), X(0.15), X(hub[1] - WHEELS[0][1] + 0.12), X(0.04))
    p.rect(X(0.26), X(-0.5), X(0.36), X(0.2), X(0.05))
    solid(p, ink, weight * 0.6, DUST.tin)
    for (let i = 0; i < 3; i++) p.line(X(0.14 + i * 0.1), X(-0.56), X(0.14 + i * 0.1), X(-0.44))
    // The chute from the hopper down to the gate: a rail under the ball, a guard rail over it.
    const n = Math.hypot(GATE[0] - MOUTH[0], GATE[1] - MOUTH[1])
    const d: Pt = [(GATE[0] - MOUTH[0]) / n, (GATE[1] - MOUTH[1]) / n]
    const nrm: Pt = [d[1], -d[0]]
    const railAt = (off: number, w: number) => {
      const a: Pt = [MOUTH[0] + nrm[0] * off, MOUTH[1] + nrm[1] * off]
      const b: Pt = [GATE[0] + d[0] * 0.08 + nrm[0] * off, GATE[1] + d[1] * 0.08 + nrm[1] * off]
      p.beginShape()
      p.vertex(X(a[0] - nrm[0] * w), X(a[1] - nrm[1] * w))
      p.vertex(X(b[0] - nrm[0] * w), X(b[1] - nrm[1] * w))
      p.vertex(X(b[0] + nrm[0] * w), X(b[1] + nrm[1] * w))
      p.vertex(X(a[0] + nrm[0] * w), X(a[1] + nrm[1] * w))
      p.endShape(p.CLOSE)
    }
    solid(p, ink, weight * 0.8, DUST.tin)
    railAt(-(R + 0.03), 0.03)
    railAt(R + 0.03, 0.02)
    // The hopper: a wire basket over the chute's top.
    solid(p, ink, weight, alpha(p, DUST.tin, 0.5).toString())
    p.beginShape()
    p.vertex(X(MOUTH[0] - 0.3), X(MOUTH[1] - 0.22))
    p.vertex(X(MOUTH[0] - 0.13), X(MOUTH[1] + 0.2))
    p.vertex(X(MOUTH[0] + 0.15), X(MOUTH[1] + 0.2))
    p.vertex(X(MOUTH[0] + 0.32), X(MOUTH[1] - 0.22))
    p.endShape()
    // The gate: a flap hung over the chute's end, flicked up for the pitch.
    const g = gateOpen(T)
    p.push()
    p.translate(X(GATE[0] + 0.17), X(GATE[1] - 0.2))
    p.rotate(-g * 1.3)
    solid(p, ink, weight * 0.8, DUST.rust)
    p.rect(0, X(0.14), X(0.05), X(0.3))
    p.pop()
    // The wheels, counter-turning.
    const turn = wheelTurn(T)
    const rate = wheelRate(T)
    const blur = clamp((rate - 5) / 16)
    WHEELS.forEach(([wx, wy], i) => {
      const a = i === 0 ? -turn : turn
      solid(p, ink, weight, ink)
      p.circle(X(wx), X(wy), X(WHEEL_R * 2))
      solid(p, ink, weight * 0.6, DUST.bone)
      p.circle(X(wx), X(wy), X(WHEEL_R * 1.25))
      p.stroke(alpha(p, ink, 1 - 0.8 * blur))
      p.strokeWeight(weight * 0.7)
      for (let j = 0; j < 4; j++) {
        const q = a + (j * Math.PI) / 2
        p.line(X(wx), X(wy), X(wx + Math.cos(q) * WHEEL_R * 0.6), X(wy + Math.sin(q) * WHEEL_R * 0.6))
      }
      if (blur > 0) {
        p.noFill()
        p.stroke(alpha(p, ink, 0.4 * blur))
        p.circle(X(wx), X(wy), X(WHEEL_R * 0.85))
        p.circle(X(wx), X(wy), X(WHEEL_R * 0.5))
      }
      solid(p, ink, weight * 0.6, DUST.teal)
      p.circle(X(wx), X(wy), X(0.08))
    })
    // The throttle on the motor: a lever over a notched quadrant, thrown a notch at a time.
    const q = throttle(T)
    const qc: Pt = [0.4, -0.58]
    // The notched quadrant: a slotted arc on the motor's flank, three teeth.
    outline(p, ink, weight * 0.8)
    p.arc(X(qc[0]), X(qc[1]), X(0.5), X(0.5), Math.PI * 1.12, Math.PI * 1.5)
    for (let j = 0; j < 3; j++) {
      const na = Math.PI * 1.17 + j * 0.18
      p.line(X(qc[0] + Math.cos(na) * 0.22), X(qc[1] + Math.sin(na) * 0.22), X(qc[0] + Math.cos(na) * 0.29), X(qc[1] + Math.sin(na) * 0.29))
    }
    const la = Math.PI * 1.17 + q * 0.18
    outline(p, ink, weight)
    p.line(X(qc[0]), X(qc[1]), X(qc[0] + Math.cos(la) * 0.3), X(qc[1] + Math.sin(la) * 0.3))
    solid(p, ink, weight * 0.7, DUST.rust)
    p.circle(X(qc[0] + Math.cos(la) * 0.3), X(qc[1] + Math.sin(la) * 0.3), X(0.09))
    p.pop()
    // The pitch: a puff of the chute's dust off the wheels.
    const since = T - PITCH - INTO
    if (since > 0 && since < 0.5) {
      p.push()
      p.drawingContext.globalAlpha = 1 - since / 0.5
      puff(p, k, ink, weight * 0.5, DUST.bone, PINCH[0] + 0.35 + since * 0.5, PINCH[1] - 0.05, 0.05 + since * 0.14)
      p.pop()
    }
  })
}

/* ------------------------------------------------------------------ the bat, its gallows and winch */

function drawBat(p: p5, c: Ctx, T: number): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  const P = BAT_PIVOT
  const post = P[0] + 0.62
  const armY = P[1] - 0.14
  const drum: Pt = [post, -0.6]
  const th = batAngle(T)
  standOnRim(p, k, AX, A_PLATE, () => {
    // The gallows: a post, an arm out over the plate, a brace.
    solid(p, ink, weight, DUST.wood)
    p.rect(X(post), X(armY / 2), X(0.12), X(-armY + 0.02))
    p.rect(X((post + P[0]) / 2 - 0.04), X(armY), X(post - P[0] + 0.24), X(0.1))
    p.push()
    p.translate(X(post - 0.26), X(armY + 0.26))
    p.rotate(-Math.PI / 4)
    p.rect(0, 0, X(0.62), X(0.07))
    p.pop()
    solid(p, ink, weight * 0.8, DUST.tin)
    p.rect(X(P[0]), X((armY + P[1]) / 2), X(0.07), X(P[1] - armY + 0.06))
    // The winch on the post: its drum and ratchet; a rope out to the bat's barrel.
    const tip: Pt = [P[0] + Math.cos(th) * (BAT_LEN - 0.1), P[1] + Math.sin(th) * (BAT_LEN - 0.1)]
    const loose = T > HIT - SWING - 0.005
    outline(p, ink, weight * 0.6)
    if (!loose && T > COCK1 - 0.4) p.line(X(drum[0]), X(drum[1]), X(tip[0]), X(tip[1]))
    else if (loose) {
      // Let go: the rope pays off the drum and hangs.
      const f = clamp((T - HIT + SWING) / 0.5)
      p.line(X(drum[0]), X(drum[1]), X(drum[0] - 0.05 - 0.1 * (1 - f)), X(drum[1] + 0.25 + 0.3 * f))
    }
    const wind = (T > COCK1 ? easeOutCubic(clamp((T - COCK1) / 0.16)) : 0) + (T > COCK2 ? easeOutCubic(clamp((T - COCK2) / 0.16)) : 0)
    solid(p, ink, weight, DUST.denim)
    p.circle(X(drum[0]), X(drum[1]), X(0.26))
    outline(p, ink, weight * 0.7)
    for (let j = 0; j < 8; j++) {
      const a = -wind * (Math.PI / 4) + (j * Math.PI) / 4
      p.line(X(drum[0] + Math.cos(a) * 0.07), X(drum[1] + Math.sin(a) * 0.07), X(drum[0] + Math.cos(a) * 0.13), X(drum[1] + Math.sin(a) * 0.13))
    }
    // The pawl, clicking over a tooth each time.
    const click = Math.max(knock(T - COCK1, 0.16), knock(T - COCK2, 0.16))
    p.line(X(drum[0] + 0.02), X(drum[1] - 0.22), X(drum[0] - 0.04), X(drum[1] - 0.13 - 0.03 * click))
    // The bat, hung by its knob.
    p.push()
    p.translate(X(P[0]), X(P[1]))
    p.rotate(th)
    solid(p, ink, weight, DUST.husk)
    p.beginShape()
    p.vertex(X(0.03), X(-0.032))
    p.vertex(X(0.42), X(-0.035))
    p.bezierVertex(X(0.6), X(-0.04), X(0.7), X(-0.078), X(BAT_LEN - 0.04), X(-0.078))
    p.bezierVertex(X(BAT_LEN + 0.02), X(-0.078), X(BAT_LEN + 0.02), X(0.078), X(BAT_LEN - 0.04), X(0.078))
    p.bezierVertex(X(0.7), X(0.078), X(0.6), X(0.04), X(0.42), X(0.035))
    p.vertex(X(0.03), X(0.032))
    p.endShape(p.CLOSE)
    solid(p, ink, weight * 0.7, DUST.denim)
    p.rect(X(0.16), 0, X(0.22), X(0.074))
    solid(p, ink, weight, DUST.husk)
    p.circle(0, 0, X(0.11))
    p.pop()
    solid(p, ink, weight * 0.7, DUST.tin)
    p.circle(X(P[0]), X(P[1]), X(0.06))
    // The crack of the bat.
    const since = T - HIT
    if (since > 0 && since < 0.22) {
      const f = 1 - since / 0.22
      p.stroke(alpha(p, ink, f))
      p.strokeWeight(weight * 0.9)
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.4
        const r0 = 0.2 + since * 1.2
        p.line(X(CONTACT[0] + Math.cos(a) * r0), X(CONTACT[1] + Math.sin(a) * r0), X(CONTACT[0] + Math.cos(a) * (r0 + 0.12)), X(CONTACT[1] + Math.sin(a) * (r0 + 0.12)))
      }
    }
  })
}

/* ------------------------------------------------------------------ the scoreboard */

/**
 * The board, in its mast's upright frame: a green face in a wood frame, two rows of nine plates on it (the
 * visitors' over the home side's), and a clock on top whose second hand goes round with the organ, a second a beat.
 */
/** The board sits off-centre on its mast, out over the mound, where the pitch and the windup are. */
const BOARD_DX = 0.4
const BOARD = { x0: BOARD_DX - 1.42, x1: BOARD_DX + 1.42, y0: -4.15, y1: -3.1 }
const PLATE = 0.19
const plateX = (i: number): number => BOARD_DX - 1.14 + i * 0.285
const ROW_HOME = -3.42
const ROW_AWAY = -3.8
const CLOCK: Pt = [BOARD_DX, -4.52]
const CLOCK_R = 0.3

/** How far plate `i` of the home row has turned over: 0 dark, 1 lit; it flips in the tenth of a second before its beat. */
function plateTurn(i: number, T: number): number {
  return clamp((T - INNINGS[i] + 0.1) / 0.1)
}

/** The second hand: a sixtieth of a turn on each beat of the cue, landing on the beat with a little shiver. */
function secondHand(T: number): number {
  const k = (T + 0.06 - cue(0)) / (cue(1) - cue(0))
  const n = Math.floor(k)
  const since = (k - n) * (cue(1) - cue(0))
  const step = since < 0.06 ? (since / 0.06) ** 2 : 1 + 0.12 * Math.exp(-(since - 0.06) / 0.05) * Math.sin((since - 0.06) * 60)
  return ((n - 1 + Math.min(step, 1.12)) / 60) * Math.PI * 2 - Math.PI / 2
}

function drawBoard(p: p5, c: Ctx, T: number): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const { x0, x1, y0, y1 } = BOARD
  standOnRim(p, k, AX, A_BOARD, () => {
    // The mast, tapering, and the two stays out to the board's lower corners.
    solid(p, ink, weight * 0.9, DUST.tin)
    p.beginShape()
    p.vertex(X(-0.08), 0)
    p.vertex(X(-0.045), X(y1))
    p.vertex(X(0.045), X(y1))
    p.vertex(X(0.08), 0)
    p.endShape(p.CLOSE)
    outline(p, ink, weight * 0.7)
    for (const sx of [-1, 1]) p.line(X(sx * 0.05), X(-2.2), X(sx * 0.95 + BOARD_DX * 0.6), X(y1))
    outline(p, alpha(p, ink, 0.45).toString(), weight * 0.5)
    for (const y of [-0.55, -1.25, -1.95]) p.line(X(-0.065), X(y), X(0.065), X(y))
    // The clock's housing on top: a round face on a short neck.
    solid(p, ink, weight * 0.8, DUST.wood)
    p.rect(X(CLOCK[0]), X((y0 + CLOCK[1]) / 2), X(0.16), X(y0 - CLOCK[1]))
    p.circle(X(CLOCK[0]), X(CLOCK[1]), X(2 * CLOCK_R + 0.1))
    // The board: a wood frame round a green face, and a rust cap along its top.
    solid(p, ink, weight, DUST.wood)
    p.rect(X((x0 + x1) / 2), X((y0 + y1) / 2), X(x1 - x0 + 0.1), X(y1 - y0 + 0.1), X(0.02))
    solid(p, ink, weight * 0.6, DUST.sage)
    p.rect(X((x0 + x1) / 2), X((y0 + y1) / 2), X(x1 - x0 - 0.04), X(y1 - y0 - 0.04))
    solid(p, ink, weight * 0.9, DUST.rust)
    p.rect(X((x0 + x1) / 2), X(y0 - 0.08), X(x1 - x0 + 0.24), X(0.07), X(0.02))
    // The plates. The visitors' row stays dark all game; the home row turns over, a plate a beat.
    const plate = (x: number, y: number, lit: boolean, squash: number) => {
      solid(p, lit ? DUST.corn : alpha(p, ink, 0.75).toString(), weight * 0.5, lit ? DUST.light : alpha(p, ink, 0.45).toString())
      p.rect(X(x), X(y), X(PLATE), X(PLATE * Math.max(0.06, squash)), X(0.015))
    }
    for (let i = 0; i < 9; i++) plate(plateX(i), ROW_AWAY, false, 1)
    for (let i = 0; i < 9; i++) {
      const u = plateTurn(i, T)
      const since = T - INNINGS[i]
      if (since > 0) {
        // A lit plate glows, and flares as it lands.
        const r = X(0.24 + 0.2 * knock(since, 0.2))
        const g = ctx.createRadialGradient(X(plateX(i)), X(ROW_HOME), 0, X(plateX(i)), X(ROW_HOME), r)
        g.addColorStop(0, `rgba(255, 244, 214, ${0.3 + 0.45 * knock(since, 0.2)})`)
        g.addColorStop(1, 'rgba(255, 244, 214, 0)')
        // Saved and restored, so p5's own idea of the fill stays true for what it draws next.
        ctx.save()
        ctx.fillStyle = g
        ctx.fillRect(X(plateX(i)) - r, X(ROW_HOME) - r, 2 * r, 2 * r)
        ctx.restore()
      }
      plate(plateX(i), ROW_HOME, u >= 0.5, Math.abs(Math.cos(Math.PI * u)))
    }
    // The clock: a bone face, twelve marks, and its hands. It keeps the station's time, which is the organ's.
    solid(p, ink, weight * 0.7, DUST.bone)
    p.circle(X(CLOCK[0]), X(CLOCK[1]), X(2 * CLOCK_R))
    outline(p, ink, weight * 0.5)
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2
      const r0 = i % 3 ? 0.84 : 0.72
      p.line(X(CLOCK[0] + Math.cos(a) * CLOCK_R * r0), X(CLOCK[1] + Math.sin(a) * CLOCK_R * r0), X(CLOCK[0] + Math.cos(a) * CLOCK_R * 0.92), X(CLOCK[1] + Math.sin(a) * CLOCK_R * 0.92))
    }
    const hand = (a: number, len: number, w: number, col: string) => {
      outline(p, col, w)
      p.line(X(CLOCK[0]), X(CLOCK[1]), X(CLOCK[0] + Math.cos(a) * CLOCK_R * len), X(CLOCK[1] + Math.sin(a) * CLOCK_R * len))
    }
    hand(-Math.PI / 2 + 0.52, 0.5, weight * 1.1, ink)
    hand(-Math.PI / 2 + 4.3 + T * 0.0017, 0.74, weight * 0.9, ink)
    hand(secondHand(T), 0.86, weight * 0.55, DUST.rust)
    solid(p, ink, weight * 0.4, DUST.rust)
    p.circle(X(CLOCK[0]), X(CLOCK[1]), X(0.045))
  })
}

/* ------------------------------------------------------------------ the light tower */

function drawTower(p: p5, c: Ctx, T: number): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  const h = 5.0
  standOnRim(p, k, AX, A_TOWER, () => {
    // The mast, a ladder up it, the rack of lamps on top turned to the field.
    solid(p, ink, weight, DUST.tin)
    p.beginShape()
    p.vertex(X(-0.1), 0)
    p.vertex(X(-0.05), X(-h))
    p.vertex(X(0.05), X(-h))
    p.vertex(X(0.1), 0)
    p.endShape(p.CLOSE)
    outline(p, alpha(p, ink, 0.5).toString(), weight * 0.5)
    for (let y = -0.4; y > -h + 0.3; y -= 0.22) p.line(X(0.1), X(y), X(0.22), X(y))
    p.push()
    p.translate(0, X(-h - 0.3))
    p.rotate(0.22)
    solid(p, ink, weight, DUST.shade)
    p.rect(0, 0, X(1.02), X(0.62), X(0.04))
    for (let i = 0; i < 4; i++) {
      const lx = -0.25 + (i % 2) * 0.5
      const ly = -0.14 + Math.floor(i / 2) * 0.28
      const since = T - LAMPS[i]
      const on = since >= 0
      if (on) {
        const ctx = p.drawingContext as CanvasRenderingContext2D
        const r = X(0.9 + 0.8 * knock(since, 0.25))
        const g = ctx.createRadialGradient(X(lx), X(ly), 0, X(lx), X(ly), r)
        g.addColorStop(0, `rgba(255, 244, 214, ${0.55 + 0.35 * knock(since, 0.25)})`)
        g.addColorStop(1, 'rgba(255, 244, 214, 0)')
        // Saved and restored, so p5's own idea of the fill stays true for what it draws next.
        ctx.save()
        ctx.fillStyle = g
        ctx.fillRect(X(lx) - r, X(ly) - r, 2 * r, 2 * r)
        ctx.restore()
      }
      solid(p, ink, weight * 0.7, on ? DUST.light : DUST.bone)
      p.circle(X(lx), X(ly), X(0.22))
      for (const dx of [-0.12, 0.12]) {
        solid(p, ink, weight * 0.5, on ? DUST.light : DUST.bone)
        p.circle(X(lx + dx), X(ly), X(0.1))
      }
    }
    p.pop()
  })
}

/* ------------------------------------------------------------------ the far house, and its tree */

function drawPoplar(p: p5, c: Ctx, T: number): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  // Where the ball will be on the beat: the tip is grown to meet it.
  const tip = toRim(A_HOUSE, flightAt(POPLAR))
  const lean = Math.atan2(tip[0] - POPLAR_X, -tip[1])
  const h = Math.hypot(tip[0] - POPLAR_X, tip[1]) - 0.1
  const since = T - POPLAR
  const whip = since > 0 ? 0.05 * Math.exp(-since / 0.8) * Math.sin(since * 6) : 0
  standOnRim(p, k, AX, A_HOUSE, () => {
    p.push()
    p.translate(X(POPLAR_X), 0)
    p.rotate(lean)
    solid(p, ink, weight, DUST.wood)
    p.rect(0, X(-0.6), X(0.14), X(1.2))
    // A tall narrow crown, its top whipped by the ball.
    p.rotate(whip)
    solid(p, ink, weight, DUST.leaf)
    const width = (y: number) => {
      const f = (y - 0.9) / (h - 0.9)
      return 0.5 * Math.sin(Math.PI * Math.pow(f, 0.75)) * (1 - 0.35 * f) + 0.05
    }
    p.beginShape()
    const n = 16
    for (let i = 0; i <= n; i++) {
      const y = 0.9 + ((h - 0.9) * i) / n
      p.vertex(X(-width(y) - 0.04 * Math.sin(i * 2.3)), X(-y))
    }
    for (let i = n; i >= 0; i--) {
      const y = 0.9 + ((h - 0.9) * i) / n
      p.vertex(X(width(y) + 0.04 * Math.sin(i * 1.7 + 1)), X(-y))
    }
    p.endShape(p.CLOSE)
    p.stroke(alpha(p, ink, 0.3))
    p.strokeWeight(weight * 0.5)
    for (let y = 1.8; y < h - 0.8; y += 0.8) p.line(X(-width(y) * 0.5), X(-y), X(width(y) * 0.3), X(-y - 0.28))
    p.pop()
  })
}

function drawTree(p: p5, c: Ctx, T: number): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  const since = T - TREE
  const sway = since > 0 ? 0.06 * Math.exp(-since / 0.7) * Math.sin(since * 7) : 0
  standOnRim(p, k, AX, A_HOUSE, () => {
    p.push()
    p.translate(X(TREE_X), 0)
    p.rotate(sway)
    solid(p, ink, weight, DUST.wood)
    p.beginShape()
    p.vertex(X(-0.13), 0)
    p.vertex(X(-0.07), X(-3.2))
    p.vertex(X(-0.4), X(-4.1))
    p.vertex(X(-0.33), X(-4.15))
    p.vertex(X(0.0), X(-3.5))
    p.vertex(X(0.3), X(-4.25))
    p.vertex(X(0.38), X(-4.2))
    p.vertex(X(0.07), X(-3.2))
    p.vertex(X(0.13), 0)
    p.endShape(p.CLOSE)
    // The crown: a few lobes, the one the ball goes through shaken.
    const lobes: [number, number, number][] = [
      [0.0, -4.55, 0.95],
      [-0.55, -4.25, 0.62],
      [0.55, -4.3, 0.66],
      [-0.2, -5.15, 0.62],
      [0.35, -5.0, 0.58],
    ]
    const shake = knock(since, 0.3)
    solid(p, ink, weight, DUST.leaf)
    for (const [lx, ly, r] of lobes) {
      const d = Math.hypot(TREE_CROWN[0] - TREE_X - lx, TREE_CROWN[1] - ly)
      const jolt = d < 0.8 ? 0.06 * shake * Math.sin(since * 16) : 0
      p.circle(X(lx + jolt), X(ly - jolt), X(r * 2))
    }
    p.noStroke()
    p.fill(DUST.leaf)
    for (const [lx, ly, r] of lobes) p.circle(X(lx), X(ly), X(r * 2 - weight / k * 2))
    p.pop()
  })
}

function drawLeaves(p: p5, c: Ctx, T: number): void {
  leavesFrom(p, c, T, TREE, TREE_CROWN, 9)
  leavesFrom(p, c, T, POPLAR, toRim(A_HOUSE, flightAt(POPLAR)), 5)
}

function leavesFrom(p: p5, c: Ctx, T: number, at: number, from: Pt, n: number): void {
  const since = T - at
  if (since < 0 || since > 3) return
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  const v = dirIn(A_HOUSE, velAt(at))
  standOnRim(p, k, AX, A_HOUSE, () => {
    for (let i = 0; i < n; i++) {
      const vx = v[0] * (0.25 + 0.2 * hash(i, 1)) + (hash(i, 2) - 0.5) * 0.8
      const vy = v[1] * 0.15 - 0.3 * hash(i, 3)
      const drift = Math.min(since, 0.4)
      const fall = Math.max(0, since - 0.25)
      const x = from[0] + vx * drift + 0.12 * Math.sin(since * 4 + i) * fall
      const y = from[1] + vy * drift + 0.55 * fall
      p.push()
      p.translate(X(x), X(y))
      p.rotate(since * (2 + hash(i, 4) * 3) + i)
      p.fill(alpha(p, i % 3 ? DUST.leaf : DUST.husk, 1 - smooth(since, 2.2, 3)))
      p.stroke(alpha(p, ink, 1 - smooth(since, 2.2, 3)))
      p.strokeWeight(weight * 0.5)
      p.ellipse(0, 0, X(0.13), X(0.07))
      p.pop()
    }
  })
}

function drawHouse(p: p5, c: Ctx, T: number): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  standOnRim(p, k, AX, A_HOUSE, () => {
    // The rooms: plaster downstairs, the attic's boards under the roof.
    p.noStroke()
    p.fill(DUST.wall)
    p.rect(X((H_L + H_R) / 2), X(H_CEIL / 2), X(H_R - H_L), X(-H_CEIL))
    p.fill(DUST.shade)
    p.triangle(X(H_L), X(H_LOFT), X(H_RIDGE_X), X(H_RIDGE + H_ROOF), X(H_R), X(H_LOFT))
    // Rafters and a collar tie, faint.
    p.stroke(alpha(p, ink, 0.18))
    p.strokeWeight(weight * 0.6)
    for (const x of [-1.6, -1.05, 1.65, 2.05]) p.line(X(x), X(H_LOFT), X(x), X(roofAt(x) + H_ROOF))
    drawWindow(p, c, T)
    drawAttic(p, c, T)
    drawRoom(p, c, T)
    drawChair(p, c, T)
    // The attic floor: boards, the trapdoor cut in them, and the flaps over the car's well.
    solid(p, ink, weight, DUST.wood)
    const slab = (x0: number, x1: number) => p.rect(X((x0 + x1) / 2), X((H_CEIL + H_LOFT) / 2), X(x1 - x0), X(H_CEIL - H_LOFT))
    slab(H_L, DOOR_HINGE[0])
    slab(DOOR_HINGE[0] + DOOR_LEN, WELL[0])
    slab(WELL[1], H_R)
    const g = doorAngle(T)
    p.push()
    p.translate(X(DOOR_HINGE[0]), X(DOOR_HINGE[1]))
    p.rotate(g)
    solid(p, ink, weight, DUST.wood)
    p.rect(X(DOOR_LEN / 2), X(0.05), X(DOOR_LEN - 0.02), X(0.1))
    solid(p, ink, weight * 0.6, DUST.tin)
    p.rect(X(DOOR_LEN - 0.08), X(-0.02), X(0.05), X(0.04))
    p.pop()
    solid(p, ink, weight * 0.7, DUST.tin)
    p.circle(X(DOOR_HINGE[0]), X(DOOR_HINGE[1] + 0.03), X(0.07))
    // The counterweight's rope from the door's end over the pulley, and the weight coming up as the door goes down.
    const end = doorPoint(T, DOOR_LEN - 0.08)
    const rope0 = Math.hypot(DOOR_HINGE[0] + DOOR_LEN - 0.08 - PULLEY[0], DOOR_HINGE[1] - PULLEY[1])
    const rope = Math.hypot(end[0] - PULLEY[0], end[1] - PULLEY[1])
    const wy = -1.95 - (rope - rope0)
    outline(p, ink, weight * 0.6)
    p.line(X(end[0]), X(end[1]), X(PULLEY[0] - 0.08), X(PULLEY[1]))
    p.line(X(PULLEY[0] + 0.08), X(PULLEY[1]), X(PULLEY[0] + 0.08), X(wy - 0.1))
    p.line(X(PULLEY[0]), X(PULLEY[1]), X(PULLEY[0]), X(roofAt(PULLEY[0]) + H_ROOF))
    // The pulley: an open sheave in its strap, not a disc; the weight, cast iron.
    solid(p, ink, weight * 0.6, DUST.tin)
    p.rect(X(PULLEY[0]), X(PULLEY[1] - 0.06), X(0.05), X(0.14))
    outline(p, ink, weight * 0.6)
    p.circle(X(PULLEY[0]), X(PULLEY[1]), X(0.14))
    p.line(X(PULLEY[0] - 0.05), X(PULLEY[1]), X(PULLEY[0] + 0.05), X(PULLEY[1]))
    solid(p, ink, weight * 0.4, ink)
    p.circle(X(PULLEY[0]), X(PULLEY[1]), X(0.03))
    solid(p, ink, weight * 0.7, mixHex(DUST.tin, ink, 0.4))
    p.rect(X(PULLEY[0] + 0.08), X(wy + 0.04), X(0.12), X(0.28), X(0.02))
    // The car's well: two flaps, pushed up by the car when it goes (the hub's, just after the ball is in).
    const up = smooth(T, OUT + 1.42, OUT + 1.75)
    for (const side of [-1, 1]) {
      const hx = side < 0 ? WELL[0] : WELL[1]
      p.push()
      p.translate(X(hx), X(H_LOFT))
      p.rotate(side < 0 ? -up * 1.45 : up * 1.45)
      solid(p, ink, weight * 0.9, DUST.wood)
      p.rect(X(-side * 0.26), X(0.05), X(0.5), X(0.1))
      p.pop()
    }
    // The walls, cut, and the roof over them, cut where the lift's shaft comes down through it.
    solid(p, ink, weight, DUST.bone)
    p.rect(X(H_L), X(H_EAVE / 2), X(0.13), X(-H_EAVE))
    p.rect(X(H_R), X(H_EAVE / 2), X(0.13), X(-H_EAVE))
    solid(p, ink, weight, DUST.rust)
    const roof = (x0: number, x1: number) => {
      p.beginShape()
      p.vertex(X(x0), X(roofAt(x0)))
      p.vertex(X(x1), X(roofAt(x1)))
      p.vertex(X(x1), X(roofAt(x1) + H_ROOF))
      p.vertex(X(x0), X(roofAt(x0) + H_ROOF))
      p.endShape(p.CLOSE)
    }
    roof(H_L - H_OVER, SHAFT[0])
    roof(SHAFT[1], H_R + H_OVER)
    // The floor, and a footing under it.
    solid(p, ink, weight, DUST.shade)
    p.rect(X((H_L + H_R) / 2), X(0.07), X(H_R - H_L + 0.14), X(0.14))
    // The car's threshold: a worn wooden lip at its door.
    solid(p, ink, weight * 0.7, DUST.wood)
    p.rect(X((LIP.x0 + LIP.x1) / 2), X(-LIP.h / 2), X(LIP.x1 - LIP.x0), X(LIP.h), X(0.012), X(0.012), 0, 0)
  })
}

function drawWindow(p: p5, c: Ctx, T: number): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  const { x, y, w, h } = WIN
  const broke = T >= WINDOW
  solid(p, ink, weight, DUST.wood)
  p.rect(X(x), X(y), X(w + 0.1), X(h + 0.1))
  p.noStroke()
  p.fill(broke ? DUST.sky : DUST.light)
  p.rect(X(x), X(y), X(w), X(h))
  if (!broke) {
    outline(p, ink, weight * 0.7)
    p.line(X(x), X(y - h / 2), X(x), X(y + h / 2))
    p.line(X(x - w / 2), X(y), X(x + w / 2), X(y))
    p.stroke(alpha(p, DUST.bone, 0.9))
    p.line(X(x - w * 0.36), X(y - h * 0.12), X(x - w * 0.18), X(y - h * 0.32))
    p.line(X(x + w * 0.14), X(y + h * 0.3), X(x + w * 0.3), X(y + h * 0.12))
  } else {
    // What is left in the frame: jagged teeth of glass at the corners, the muntins snapped off short.
    p.fill(alpha(p, mixHex(DUST.sky, '#FFFFFF', 0.35), 0.8))
    p.stroke(alpha(p, ink, 0.6))
    p.strokeWeight(weight * 0.4)
    const corners: Pt[] = [
      [x - w / 2, y - h / 2],
      [x + w / 2, y - h / 2],
      [x + w / 2, y + h / 2],
      [x - w / 2, y + h / 2],
    ]
    // Two slim teeth, top left and bottom right: enough to say glass was here, not so many they make a pattern.
    corners.forEach(([cx, cy], i) => {
      if (i % 2 === 1) return
      const sx = cx < x ? 1 : -1
      const sy = cy < y ? 1 : -1
      p.beginShape()
      p.vertex(X(cx), X(cy))
      p.vertex(X(cx + sx * w * (0.34 + 0.1 * hash(i, 1))), X(cy))
      p.vertex(X(cx + sx * w * 0.1), X(cy + sy * h * 0.14))
      p.vertex(X(cx), X(cy + sy * h * (0.26 + 0.08 * hash(i, 2))))
      p.endShape(p.CLOSE)
    })
  }
  // A curtain rod and a short curtain tied back each side.
  solid(p, ink, weight * 0.7, DUST.teal)
  for (const side of [-1, 1]) {
    const ex = x + side * (w / 2 + 0.02)
    const blow = broke ? 0.08 * Math.exp(-(T - WINDOW) / 0.6) * Math.sin((T - WINDOW) * 9) : 0
    p.beginShape()
    p.vertex(X(ex), X(y - h / 2 - 0.08))
    p.vertex(X(ex - side * 0.1), X(y - h / 2 - 0.08))
    p.vertex(X(ex - side * (0.03 + blow)), X(y + 0.02))
    p.vertex(X(ex - side * 0.06), X(y + h / 2 - 0.02))
    p.vertex(X(ex + side * 0.02), X(y + h / 2 - 0.02))
    p.endShape(p.CLOSE)
  }
}

function drawAttic(p: p5, c: Ctx, T: number): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  // The trunk the ball runs into; it jolts, and the lid claps.
  const hit = knock(T - HATCH, 0.22)
  const jx = -0.03 * hit
  const { x0, x1, h } = TRUNK
  solid(p, ink, weight, mixHex(DUST.wood, DUST.rust, 0.45))
  p.rect(X((x0 + x1) / 2 + jx), X(H_LOFT - h / 2), X(x1 - x0), X(h), X(0.02))
  solid(p, ink, weight * 0.8, DUST.wood)
  p.push()
  p.translate(X(x0 + jx), X(H_LOFT - h))
  p.rotate(-0.12 * hit * Math.abs(Math.sin((T - HATCH) * 14)))
  p.rect(X((x1 - x0) / 2), X(-0.04), X(x1 - x0 + 0.02), X(0.08), X(0.02))
  p.pop()
  outline(p, ink, weight * 0.6)
  for (const f of [0.25, 0.75]) p.line(X(x0 + (x1 - x0) * f + jx), X(H_LOFT - h + 0.02), X(x0 + (x1 - x0) * f + jx), X(H_LOFT))
  solid(p, ink, weight * 0.5, DUST.corn)
  p.rect(X((x0 + x1) / 2 + jx), X(H_LOFT - h + 0.1), X(0.07), X(0.08))
}

function drawRoom(p: p5, c: Ctx, T: number): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  // A window in the back wall, the station's day in it.
  const w = { x: 1.45, y: -0.82, w: 0.5, h: 0.56 }
  solid(p, ink, weight, DUST.wood)
  p.rect(X(w.x), X(w.y), X(w.w + 0.1), X(w.h + 0.1))
  p.noStroke()
  p.fill(DUST.light)
  p.rect(X(w.x), X(w.y), X(w.w), X(w.h))
  outline(p, ink, weight * 0.7)
  p.line(X(w.x), X(w.y - w.h / 2), X(w.x), X(w.y + w.h / 2))
  p.line(X(w.x - w.w / 2), X(w.y), X(w.x + w.w / 2), X(w.y))
  solid(p, ink, weight, DUST.wood)
  p.rect(X(w.x), X(w.y + w.h / 2 + 0.06), X(w.w + 0.2), X(0.05))
  // By the door on the near wall: a hook, and a straw hat on it. The crash upstairs sets it swinging.
  const shake = T > WINDOW ? 0.14 * Math.exp(-(T - WINDOW) / 0.6) * Math.sin((T - WINDOW) * 12) : 0
  outline(p, ink, weight)
  p.line(X(2.02), X(-1.1), X(2.09), X(-1.05))
  p.push()
  p.translate(X(2.09), X(-1.04))
  p.rotate(shake)
  solid(p, ink, weight * 0.8, DUST.husk)
  p.rect(X(0.02), X(0.08), X(0.16), X(0.1), X(0.03), X(0.03), 0, 0)
  p.rect(X(0.02), X(0.14), X(0.34), X(0.035), X(0.015))
  solid(p, ink, weight * 0.5, DUST.rust)
  p.rect(X(0.02), X(0.115), X(0.16), X(0.025))
  p.pop()
}

/**
 * Murph's rocking chair, side on: two rockers on the one arc (the far one a shade darker, just behind), turned legs
 * joined by a stretcher, the seat, an arm on a turned post with a scrolled end, and a tall raked back of spindles
 * under a curved crest rail, a small quilt folded over it. Drawn at full size in its own frame (x toward the lift,
 * y down, the rockers' arc touching the floor at 0, 0) and shrunk by `CHAIR_S`; it rolls on the rockers' arc as the
 * lean in `chairPoint` says, so the drawing and the ball on its seat move together.
 */
function drawChair(p: p5, c: Ctx, T: number): void {
  const { k, ink } = c
  const X = (v: number) => v * k
  const lean = chairLean(T)
  p.push()
  p.translate(X(CHAIR_X + ROCK_R * lean), X(-ROCK_R))
  p.rotate(lean)
  p.translate(0, X(ROCK_R))
  // Drawn at full size and shrunk; its lines are not.
  p.scale(CHAIR_S)
  const weight = c.weight / CHAIR_S
  p.strokeJoin(p.ROUND)
  const wood = DUST.wood
  const far = mixHex(DUST.wood, ink, 0.22)
  /** The rockers' arc: the height of its underside over the floor at `x`. */
  const rock = (x: number) => ROCKER_R - Math.sqrt(ROCKER_R * ROCKER_R - x * x)
  const RK = 0.055
  const RX0 = -0.5
  const RX1 = 0.5
  const rocker = (dx: number, dy: number, fill: string) => {
    solid(p, ink, weight * 0.9, fill)
    p.beginShape()
    const n = 20
    for (let i = 0; i <= n; i++) {
      const x = RX0 + ((RX1 - RX0) * i) / n
      p.vertex(X(x + dx), X(-rock(x) + dy))
    }
    // The front tip, rounded.
    p.bezierVertex(X(RX1 + 0.035 + dx), X(-rock(RX1) + dy), X(RX1 + 0.035 + dx), X(-rock(RX1) - RK + dy), X(RX1 + dx), X(-rock(RX1) - RK + dy))
    for (let i = n; i >= 0; i--) {
      const x = RX0 + ((RX1 - RX0) * i) / n
      p.vertex(X(x + dx), X(-rock(x) - RK + dy))
    }
    // The back tip, rounded.
    p.bezierVertex(X(RX0 - 0.035 + dx), X(-rock(RX0) - RK + dy), X(RX0 - 0.035 + dx), X(-rock(RX0) + dy), X(RX0 + dx), X(-rock(RX0) + dy))
    p.endShape(p.CLOSE)
  }
  /** A turned member from (x0, y0) to (x1, y1), `w` wide, with a bead a third of the way along. */
  const member = (x0: number, y0: number, x1: number, y1: number, w: number, fill: string, bead = true, line = 0.8) => {
    const L = Math.hypot(x1 - x0, y1 - y0)
    const ux = (x1 - x0) / L
    const uy = (y1 - y0) / L
    const nx = -uy * (w / 2)
    const ny = ux * (w / 2)
    solid(p, ink, weight * line, fill)
    p.beginShape()
    p.vertex(X(x0 + nx), X(y0 + ny))
    p.vertex(X(x1 + nx * 0.85), X(y1 + ny * 0.85))
    p.vertex(X(x1 - nx * 0.85), X(y1 - ny * 0.85))
    p.vertex(X(x0 - nx), X(y0 - ny))
    p.endShape(p.CLOSE)
    if (bead) {
      const bx = x0 + (x1 - x0) * 0.62
      const by = y0 + (y1 - y0) * 0.62
      p.ellipse(X(bx), X(by), X(w * 1.5), X(w * 1.5))
    }
  }
  const SEAT_B = -0.36
  const legTop = SEAT_Y + 0.07
  const FRONT_LEG = 0.2
  const BACK_LEG = -0.26
  // The far side first, a shade darker and a hair behind: its rocker and its legs.
  const fd: [number, number] = [0.05, -0.03]
  for (const x of [FRONT_LEG, BACK_LEG]) member(x + fd[0], -rock(x) - RK + fd[1], x + fd[0] - 0.01, legTop + fd[1], 0.04, far, false, 0.6)
  rocker(fd[0], fd[1], far)
  // The back: two raked posts, a crest rail, three spindles and a low rail, the whole raked back from the seat.
  const post = (u: number, y: number): [number, number] => {
    const f = (SEAT_Y - y) / (SEAT_Y + 1.12)
    return [u - 0.09 * f, y]
  }
  const B0 = SEAT_B
  const B1 = -0.13
  // Behind the spindles, the wall shows through: they are thin, and there are only two.
  for (let i = 1; i <= 2; i++) {
    const u = B0 + ((B1 - B0) * i) / 3
    const [ax, ay] = post(u, SEAT_Y - 0.1)
    const [bx, by] = post(u, -1.07)
    member(ax, ay, bx, by, 0.03, wood, false, 0.5)
  }
  for (const u of [B0, B1]) {
    const [ax, ay] = post(u, SEAT_Y + 0.02)
    const [bx, by] = post(u, -1.1)
    member(ax, ay, bx, by, 0.055, wood, false)
  }
  {
    const [ax, ay] = post(B0, SEAT_Y - 0.1)
    const [bx, by] = post(B1, SEAT_Y - 0.1)
    member(ax, ay, bx, by, 0.035, wood, false, 0.6)
  }
  // The crest rail: a gentle arch, a little proud of the posts each side.
  {
    const [lx, ly] = post(B0 - 0.03, -1.1)
    const [rx, ry] = post(B1 + 0.03, -1.1)
    solid(p, ink, weight * 0.9, wood)
    p.beginShape()
    p.vertex(X(lx), X(ly + 0.03))
    p.bezierVertex(X(lx + 0.05), X(ly - 0.05), X(rx - 0.05), X(ry - 0.05), X(rx), X(ry + 0.03))
    p.vertex(X(rx), X(ry + 0.075))
    p.bezierVertex(X(rx - 0.05), X(ry + 0.01), X(lx + 0.05), X(ly + 0.01), X(lx), X(ly + 0.075))
    p.endShape(p.CLOSE)
  }
  // The near legs, meeting the rocker, and the stretcher between them.
  for (const x of [FRONT_LEG, BACK_LEG]) member(x, -rock(x) - RK + 0.01, x - 0.01, legTop, 0.055, wood)
  member(BACK_LEG, (legTop - rock(BACK_LEG) - RK) / 2, FRONT_LEG, (legTop - rock(FRONT_LEG) - RK) / 2, 0.03, wood, false, 0.6)
  rocker(0, 0, wood)
  // The seat: a thick board, its front edge rounded over.
  solid(p, ink, weight * 0.9, wood)
  p.rect(X((SEAT_B + SEAT_FRONT + 0.04) / 2), X(SEAT_Y + 0.035), X(SEAT_FRONT + 0.04 - SEAT_B), X(0.07), X(0.02), X(0.035), X(0.035), X(0.02))
  // The arm: from the back post forward over the seat, on a turned post, its end scrolled over.
  const ARM_Y = -0.8
  const [ax0] = post(B1, ARM_Y)
  member(0.24, SEAT_Y - 0.01, 0.23, ARM_Y + 0.02, 0.045, wood)
  solid(p, ink, weight * 0.9, wood)
  p.rect(X((ax0 + 0.3) / 2), X(ARM_Y), X(0.3 - ax0), X(0.045), X(0.02))
  p.ellipse(X(0.3), X(ARM_Y + 0.012), X(0.07), X(0.065))
  // A quilt folded over the crest rail and hanging a little way down the back: bone, with a rust band at its hem.
  {
    const [l0x, l0y] = post(B0 - 0.03, -1.12)
    const [r0x, r0y] = post(B1 + 0.03, -1.12)
    const [l1x, l1y] = post(B0 - 0.02, -0.86)
    const [r1x, r1y] = post(B1 + 0.02, -0.9)
    const edge = (band: number, fill: string) => {
      solid(p, ink, weight * 0.55, fill)
      p.beginShape()
      p.vertex(X(l0x), X(l0y))
      p.bezierVertex(X(l0x + 0.06), X(l0y - 0.04), X(r0x - 0.06), X(r0y - 0.04), X(r0x), X(r0y))
      const ry = r0y + (r1y - r0y) * band
      const rx = r0x + (r1x - r0x) * band
      const ly = l0y + (l1y - l0y) * band
      const lx = l0x + (l1x - l0x) * band
      p.vertex(X(rx), X(ry))
      p.bezierVertex(X(rx - 0.05), X(ry + 0.03), X(lx + 0.06), X(ly - 0.02), X(lx), X(ly))
      p.endShape(p.CLOSE)
    }
    edge(1, DUST.rust)
    edge(0.72, DUST.bone)
  }
  p.pop()
}

/** The glass: a dozen slivers, [spread angle, speed, start across, start down, length, spin, lands on]. */
const SLIVERS = Array.from({ length: 12 }, (_, i) => ({
  // The way the ball went, spread: in, and down onto the boards.
  dir: (hash(i, 3) - 0.5) * 1.6,
  v: 0.5 + hash(i, 4) * 0.9,
  sx: (hash(i, 5) - 0.5) * WIN.w * 0.7,
  sy: (hash(i, 6) - 0.5) * WIN.h * 0.7,
  len: 0.035 + hash(i, 8) * 0.045,
  spin: (hash(i, 7) - 0.5) * 22,
}))

function drawShards(p: p5, c: Ctx, T: number): void {
  const since = T - WINDOW
  if (since < 0) return
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  const ctx = p.drawingContext as CanvasRenderingContext2D
  standOnRim(p, k, AX, A_HOUSE, () => {
    // The pane goes in a short flash of light.
    if (since < 0.16) {
      const a = 1 - since / 0.16
      const r = X(0.32 + since * 1.6)
      ctx.save()
      const g = ctx.createRadialGradient(X(WIN.x), X(WIN.y), 0, X(WIN.x), X(WIN.y), r)
      g.addColorStop(0, `rgba(255, 248, 226, ${0.85 * a})`)
      g.addColorStop(1, 'rgba(255, 248, 226, 0)')
      ctx.fillStyle = g
      ctx.fillRect(X(WIN.x) - r, X(WIN.y) - r, 2 * r, 2 * r)
      ctx.restore()
    }
    // The slivers: thin, glassy, turning so they catch the light as they go; each drops to the boards (or the sill
    // outside), bounces once, and lies there, a glint.
    const [dx, dy] = V_WINDOW
    const base = Math.atan2(dy, dx)
    for (const sl of SLIVERS) {
      const a = base + sl.dir
      const vx = Math.cos(a) * sl.v
      const vy = Math.sin(a) * sl.v * 0.6 - 0.4
      const x0 = WIN.x + sl.sx
      const y0 = WIN.y + sl.sy
      const floor = H_LOFT - 0.012
      // First fall, to the floor.
      const tHit = (() => {
        // y0 + vy t + G t²/2 = floor
        const A = 0.5 * G
        const disc = vy * vy + 4 * A * (floor - y0)
        return (-vy + Math.sqrt(Math.max(0, disc))) / (2 * A)
      })()
      let px: number
      let py: number
      let ang: number
      if (since < tHit) {
        px = x0 + vx * since
        py = y0 + vy * since + 0.5 * G * since * since
        ang = sl.spin * since
      } else {
        // One small bounce, then still.
        const b = since - tHit
        const vb = 0.25 * (vy + G * tHit)
        const tb = (2 * vb) / G
        const xb = x0 + vx * tHit
        const slide = vx * 0.3
        const s2 = Math.min(b, tb)
        px = xb + slide * s2
        py = b < tb ? floor - vb * b + 0.5 * G * b * b : floor
        ang = sl.spin * tHit + sl.spin * 0.3 * s2
      }
      px = clamp(px, WELL[1] + 0.12, H_R - 0.14)
      // A glint as each one turns face-on to us.
      const glint = Math.max(0, Math.cos(ang * 1.7)) ** 6
      const lying = since > tHit + 0.4
      const a2 = lying ? 0.8 : 1
      p.push()
      p.translate(X(px), X(py))
      p.rotate(ang)
      const L = sl.len * (lying ? 1 : 0.55 + 0.45 * Math.abs(Math.cos(ang)))
      p.noStroke()
      p.fill(alpha(p, mixHex(DUST.sky, '#FFFFFF', 0.35), 0.75 * a2))
      p.quad(X(-L), 0, X(-L * 0.1), X(-0.012), X(L), X(0.004), X(-L * 0.05), X(0.014))
      if (!lying) {
        p.stroke(alpha(p, ink, 0.55))
        p.strokeWeight(Math.max(0.6, weight * 0.35))
        p.line(X(-L), 0, X(L), X(0.004))
      }
      if (glint > 0.05 && !lying) {
        p.noStroke()
        p.fill(alpha(p, '#FFFFFF', 0.9 * glint))
        p.circle(0, 0, Math.max(1.5, X(0.03)))
      }
      p.pop()
    }
  })
}
