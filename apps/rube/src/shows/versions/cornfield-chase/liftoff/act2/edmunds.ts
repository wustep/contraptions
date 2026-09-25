import type p5 from 'p5'
import { outline, solid } from '../../../../../../../../src/core/draw'
import { clamp, easeInQuad, easeOutCubic } from '../../../../../../../../src/core/ease'
import { laneAt, mixHex, puff, R, type Lane, type Pt, type Seg } from '../../../../../parts'
import { alpha, box, carried, frame, hash, knock, lastOf, part, route, smooth, type Companion, type Ctx, type PartShot, type Way } from '../kit'
import { cue, DURATION, FINAL, MIX_END, PEAK } from '../music'
import { G_EARTH, hop } from '../physics'
import { BRAND, DARK, VOID } from '../worlds'

/**
 * Edmunds' planet: the end of the show.
 *
 * The ball went into the wormhole in the last part. The far side opens from
 * the sphere's centre and the camera whips after it: a desert world at dawn,
 * a dark sky with a thin gold band on the horizon, Gargantua small and high.
 * The far mouth hangs in that sky, and on 213 the Ranger comes out of it with
 * the ball in its canopy. The mouth's wave shakes it as it passes (214).
 *
 * Then the descent, the real order of a landing, one stage a beat: a pitch-up
 * on the thrusters (215, stopped on the and); four retro burns from the nose
 * (216–219), each one taking speed off; the drogue mortar (220), the chute
 * blooming reefed (220½), opening in two steps (221, 222); the heat shield
 * dropped (223); the chute cut and the belly engines lit (224); a landing leg
 * down on each of 225 and 226, the engines pulsing with them; the flare, the
 * dust coming up (227); and touchdown on the peak (228).
 *
 * The camp is Brand's: a small dome with a light on in its porthole, a flag,
 * her helmet set down on a rock, and the cairn she built for Edmunds, and she
 * is there by the cairn, blue, small at the edge of the frame as the Ranger
 * touches down.
 *
 * On the ground: the canopy swings open (229), the ramp runs out and slams
 * down (230) and she sets off from the cairn; the seat kicks Cooper out over
 * the nose (231), he lands on the ramp on the and, rolls down into the camp
 * and stops on the plate at the foot of its lamp, and on the last hit (232)
 * the lamp lights. The stop on the plate drops, he rolls on, and under the
 * lamp, as the music stops, they meet (CAMP_MEET) and rest together. The
 * camera draws back and holds, the sun's edge comes up behind the cairn, and
 * the credits roll over the two of them.
 *
 * The part's frame: the ball comes in hidden at the wormhole's centre,
 * (-0.5, 0). The landing ground is at y = G (the ball rolling on it is at
 * G − R). The land is painted in depth: the horizon is at the eye's height,
 * and a thing on the ground `s` times nearer than the landing site sits `s`
 * times as far below the horizon as the site does.
 */

const TAU = Math.PI * 2

/* ------------------------------------------------------------------ the clock (show seconds) */

const BEGIN = cue(212)
/** Out of the far mouth. */
const OUT = cue(213)
/** The mouth rings behind the Ranger; the wave goes past it. */
const RING = cue(214)
/** Thrusters: a pitch-up started, and stopped on the and. */
const PITCH = cue(215)
const PITCH_STOP = cue(215.5)
/** Four retro burns from the nose. */
const RETRO = [cue(216), cue(217), cue(218), cue(219)]
/** The drogue: the mortar, the bloom (reefed), and two steps open. */
const MORTAR = cue(220)
const BLOOM = cue(220.5)
const REEFS = [cue(221), cue(222)]
/** The heat shield let go. */
const SHIELD = cue(223)
/** The chute cut away, the belly engines lit. */
const CUT = cue(224)
/** The landing legs, front then rear. */
const LEGS = [cue(225), cue(226)]
/** The flare: engines up, the dust comes. */
const FLARE = cue(227)
const TOUCH = PEAK
/** On the ground: the canopy, the ramp, the kick, the ball on the ramp, the lamp. */
const CANOPY = cue(229)
const RAMP = cue(230)
const KICK = cue(231)
const ONRAMP = cue(231.5)
const LAMP = FINAL
/** When Cooper and Brand first touch at her camp: under the lamp, a beat after it lights, as the music stops. */
export const CAMP_MEET = cue(233)
/** She sets off from the cairn when the ship touches down: a slow start, so the approach is long and unhurried. */
const SET_OUT = TOUCH

/** The far side opens at the sphere's centre on 212 (the whip starts from it); the ship is out on 213. */
export const EDMUNDS_HITS = [BEGIN, OUT, RING, PITCH, PITCH_STOP, ...RETRO, MORTAR, BLOOM, ...REEFS, SHIELD, CUT, ...LEGS, FLARE, TOUCH, CANOPY, RAMP, KICK, ONRAMP, LAMP]

/* ------------------------------------------------------------------ helpers */

const rgba = (hex: string, a: number): string => {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.max(0, Math.min(1, a))})`
}
/** A pulse: up over `rise`, then away over `fall`. 0 before. */
const pulse = (d: number, rise: number, fall: number): number => (d < 0 ? 0 : d < rise ? smooth(d, 0, rise) : Math.exp(-(d - rise) / fall))
const softplus = (x: number, w: number): number => (x / w > 30 ? x : w * Math.log1p(Math.exp(x / w)))
const lerp = (a: number, b: number, u: number): number => a + (b - a) * u

function glow(p: p5, x: number, y: number, r: number, hex: string, a: number): void {
  if (a <= 0.004 || r <= 0) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, rgba(hex, a))
  g.addColorStop(0.35, rgba(hex, a * 0.45))
  g.addColorStop(1, rgba(hex, 0))
  ctx.fillStyle = g
  ctx.fillRect(x - r, y - r, 2 * r, 2 * r)
}

/* ------------------------------------------------------------------ colours: only the dark's, mixed */

const SKY_LOW = mixHex(DARK.deep, DARK.violet, 0.42)
const SKY_WARM = mixHex(DARK.violet, DARK.amber, 0.58)
const HAZE = mixHex(mixHex(DARK.slate, DARK.violet, 0.3), DARK.gold, 0.42)
const LAND = mixHex(mixHex(DARK.slate, DARK.deep, 0.25), DARK.amber, 0.28)
const LAND_FAR = mixHex(LAND, HAZE, 0.4)
const LAND_NEAR = mixHex(DARK.deep, LAND, 0.62)
const ROCK = mixHex(DARK.deep, DARK.slate, 0.62)
const MESA = mixHex(SKY_WARM, DARK.slate, 0.4)
const DUST = mixHex(LAND, DARK.gold, 0.42)
const STAR = '#F4EEDF'

/* ------------------------------------------------------------------ the Ranger, in its own cells */

/**
 * The hub's Ranger (`hub.ts`), the ship that left the station in `undock.ts`:
 * long and low, a black belly and nose, a swept wing hanging under its after
 * half, a docking collar on its back, two bells, the ball in a bubble canopy
 * on a sliding hood. It is drawn as the hub draws it, in the hub's ship units
 * (x nose-ward from the ball, y down) at the hub's scale, from the side undock
 * leaves it on: nose right.
 *
 * The flight and the mechanisms are in the part's own cells: u nose-ward, v up
 * from the belly line; the origin is on the belly line under the seat-back.
 */
const SHIP = 0.86
/** The hub's origin (the ball) along the ship, and its belly line, in its units. */
const XO = -0.205
const YB = 0.41
/** A point in the hub's ship units, in the Ranger's cells. */
const hu = (x: number, y: number): Pt => [(x - XO) * SHIP, (YB - y) * SHIP]

/** The hull (hub units): the nose, the sill under the canopy, the spine, the tail, the belly. */
const HULL: Pt[] = [
  [1.4, 0.27],
  [1.12, 0.19],
  [0.84, 0.13],
  [0.56, 0.1],
  [-0.46, 0.1],
  [-0.55, 0.0],
  [-0.78, -0.05],
  [-1.86, -0.06],
  [-2.02, -0.01],
  [-2.06, 0.36],
  [-1.98, 0.41],
  [0.35, 0.41],
  [0.86, 0.38],
  [1.16, 0.32],
]
/** The black of the belly and the nose. */
const BELLY: Pt[] = [
  [1.4, 0.27],
  [1.16, 0.32],
  [0.86, 0.38],
  [0.35, 0.41],
  [-1.98, 0.41],
  [-2.05, 0.33],
  [0.35, 0.335],
  [0.86, 0.305],
  [1.13, 0.25],
]
/** The wing, swept and drooped: seen side-on it hangs under the after half. */
const WING: Pt[] = [
  [-0.3, 0.36],
  [-1.72, 0.72],
  [-2.14, 0.72],
  [-1.98, 0.36],
]
/** The two bells, as bands of the tail. */
const BELLS: [number, number][] = [
  [0.02, 0.17],
  [0.21, 0.36],
]
/** The canopy's foot at the windscreen. Open, the hood is slid back along the spine by `SLIDE`. */
const SCREEN: Pt = [0.56, 0.1]
const SLIDE: Pt = [-0.86, -0.12]
/** The docking collar on its back (its middle, its size), the fuel port, the wingtip lamp. */
const COLLAR: Pt = [-1.66, -0.1]
const COLLAR_W = 0.36
const COLLAR_H = 0.09
/** The collar's lid, which the drogue's mortar blows off. */
const LID = 0.03
const PORT: Pt = [-1.5, 0.2]
const WINGTIP: Pt = [-1.95, 0.7]
/** The hub's tin, in the dark's colours. */
const TIN = mixHex(DARK.hull, DARK.deep, 0.34)

/** The underside, tail to nose: flat under the belly, rising under the nose. */
const UNDER: Pt[] = [hu(-1.98, 0.41), hu(0.35, 0.41), hu(0.86, 0.38), hu(1.16, 0.32), hu(1.4, 0.27)]
/** The underside's height at `u`. */
function underAt(u: number): number {
  for (let i = 1; i < UNDER.length; i++) {
    const [u0, v0] = UNDER[i - 1]
    const [u1, v1] = UNDER[i]
    if (u <= u1) return v0 + ((v1 - v0) * (Math.max(u, u0) - u0)) / (u1 - u0)
  }
  return UNDER[UNDER.length - 1][1]
}
/** The ball's seat in the cockpit. */
const SEAT: Pt = hu(0, 0)
/** The nose's tip, where the retros fire. */
const NOSE: Pt = hu(1.4, 0.27)
/** The drogue, packed in the docking collar: the top of the collar, where its bridle comes out. */
const CAN: Pt = hu(COLLAR[0], COLLAR[1] - COLLAR_H / 2)
/** Landing legs: hinges on the underside, and where the foot is when down. */
const LEG_U = [0.86, -0.9]
const LEG_V = LEG_U.map(underAt)
const LEG_REACH = 0.55
const LEG_OUT = 0.22
/** Each leg's reach from its hinge down to the foot's line, and its length. */
const legReach = (i: number): number => LEG_REACH + LEG_V[i]
const legLen = (i: number): number => Math.hypot(LEG_OUT, legReach(i))
/** The belly engines, ahead of the wing. */
const ENGINES = [-0.02, 0.38]
/** The heat shield along the underside, tail to nose. */
const SHIELD_U: [number, number] = [-1.45, 1.2]
const SHIELD_MID = (SHIELD_U[0] + SHIELD_U[1]) / 2
/** The belly's height over the ground on its legs, and the sink as they take the weight. */
const CLEAR = LEG_REACH + 0.03
const SETTLE = 0.06
/** The ramp: hinged under the nose. */
const NOSE_HINGE: Pt = hu(1.28, 0.295)
const RAMP_LEN = 1.2

/* ------------------------------------------------------------------ the flight */

/** The far mouth, in Edmunds' sky, and its radius. */
const MOUTH: Pt = [12.6, 0.9]
const RM = 1.75
/** The ball as the Ranger clears the mouth; the Ranger's origin then, and its speed. */
const BALL0: Pt = [MOUTH[0] + 2.21, MOUTH[1] - 0.37]
const P0: Pt = [BALL0[0] - SEAT[0], BALL0[1] + SEAT[1]]
const V0: Pt = [4.3, 0.28]

/** Speed along, cells a second: a glide, a step off it every burn, the chute, and the engines letting it down. */
function vxAt(T: number): number {
  if (T <= OUT) return V0[0]
  let v = V0[0] - 0.16 * Math.min(T - OUT, 3)
  for (const r of RETRO) v -= 0.62 * smooth(T, r, r + 0.3)
  v *= 1 - 0.4 * smooth(T, BLOOM, BLOOM + 0.3) - 0.18 * smooth(T, REEFS[0], REEFS[0] + 0.25) - 0.14 * smooth(T, REEFS[1], REEFS[1] + 0.25)
  v *= 1 - smooth(T, CUT, TOUCH)
  return Math.max(0, v)
}

/** Speed down, cells a second. */
function vyUnder(T: number): number {
  let v = V0[1] + 0.24 * (Math.min(T, MORTAR) - OUT)
  for (const r of RETRO) v -= 0.1 * smooth(T, r, r + 0.3)
  if (T > MORTAR) {
    v += 0.06 * (T - MORTAR)
    v -= 0.4 * smooth(T, BLOOM, BLOOM + 0.3) + 0.3 * smooth(T, REEFS[0], REEFS[0] + 0.25) + 0.22 * smooth(T, REEFS[1], REEFS[1] + 0.25)
  }
  return v
}
const V_CUT = vyUnder(CUT)
function vyAt(T: number): number {
  if (T <= OUT) return V0[1]
  if (T <= CUT) return vyUnder(T)
  // Cut loose: a moment's fall, then the engines take it and let it down, pulsing on the beats.
  let v = lerp(V_CUT + 0.42 * smooth(T, CUT, CUT + 0.3), 0.3, smooth(T, CUT + 0.3, TOUCH - 0.3))
  for (const b of [...LEGS, FLARE]) v -= 0.16 * pulse(T - b, 0.1, 0.3)
  return v
}

/** The track, integrated once: where the Ranger's origin is from the mouth to touchdown. */
const TRACK = (() => {
  const n = Math.round((TOUCH - OUT) * 240)
  const dt = (TOUCH - OUT) / n
  const x = [P0[0]]
  const y = [P0[1]]
  for (let i = 1; i <= n; i++) {
    const t0 = OUT + (i - 1) * dt
    x.push(x[i - 1] + 0.5 * (vxAt(t0) + vxAt(t0 + dt)) * dt)
    y.push(y[i - 1] + 0.5 * (vyAt(t0) + vyAt(t0 + dt)) * dt)
  }
  return { x, y, dt, n }
})()
function trackAt(T: number): Pt {
  if (T <= OUT) return [P0[0] - V0[0] * (OUT - T), P0[1] - V0[1] * (OUT - T)]
  const f = Math.min(TRACK.n, (T - OUT) / TRACK.dt)
  const i = Math.min(TRACK.n - 1, Math.floor(f))
  const u = f - i
  return [lerp(TRACK.x[i], TRACK.x[i + 1], u), lerp(TRACK.y[i], TRACK.y[i + 1], u)]
}

/** Touchdown: where the Ranger's origin comes down, and the ground under it. */
const LAND_AT = trackAt(TOUCH)
const LX = LAND_AT[0]
const G = LAND_AT[1] + CLEAR

/** How far the legs have given under it since touchdown. */
const sinkAt = (d: number): number => (d <= 0 ? 0 : SETTLE - SETTLE * Math.exp(-d / 0.17) * Math.cos(d * 9))

/** Nose up is positive. */
function pitchAt(T: number): number {
  let th = 0.28 * smooth(T, PITCH, PITCH_STOP)
  th -= 0.2 * smooth(T, BLOOM, REEFS[1] + 0.3)
  th -= 0.08 * smooth(T, CUT, CUT + 0.7)
  th += 0.05 * pulse(T - FLARE, 0.25, 0.4)
  const ring = T - RING
  if (ring > 0) th += 0.07 * Math.exp(-ring / 0.4) * Math.sin(ring * 11)
  for (const r of RETRO) th += 0.03 * pulse(T - r, 0.05, 0.18)
  for (const j of [BLOOM, ...REEFS]) th -= 0.035 * pulse(T - j, 0.06, 0.2)
  const td = T - TOUCH
  if (td > 0) th += 0.018 * Math.exp(-td / 0.3) * Math.sin(td * 11)
  return th
}

interface Pose {
  x: number
  y: number
  th: number
}
function poseAt(T: number): Pose {
  if (T >= TOUCH) return { x: LX, y: LAND_AT[1] + sinkAt(T - TOUCH), th: pitchAt(T) }
  const [x, y] = trackAt(T)
  // The wave from the mouth shakes it as it passes.
  const ring = T - RING
  const shake = ring > 0 ? 0.035 * Math.exp(-ring / 0.35) * Math.sin(ring * 16) : 0
  return { x, y: y + shake, th: pitchAt(T) }
}
/** A point of the Ranger (u nose-ward, v up) in the part's cells. */
const W = (q: Pose, u: number, v: number): Pt => [q.x + u * Math.cos(q.th) - v * Math.sin(q.th), q.y - u * Math.sin(q.th) - v * Math.cos(q.th)]

/** The ball in its seat presses forward on every check of speed, and drops a little at touchdown. */
function jigAt(T: number): Pt {
  let du = 0
  let dv = 0
  for (const r of RETRO) du += 0.034 * pulse(T - r, 0.05, 0.2)
  for (const j of [BLOOM, ...REEFS]) du += 0.024 * pulse(T - j, 0.05, 0.2)
  const ring = T - RING
  if (ring > 0) du += 0.02 * Math.exp(-ring / 0.35) * Math.sin(ring * 15)
  const td = T - TOUCH
  if (td > 0) {
    du += 0.03 * pulse(td, 0.04, 0.15)
    dv -= 0.025 * Math.exp(-td / 0.2) * Math.sin(Math.min(Math.PI, td * 10))
  }
  return [du, dv]
}
const seatAt = (T: number): Pt => {
  const [du, dv] = jigAt(T)
  return W(poseAt(T), SEAT[0] + du, SEAT[1] + dv)
}

/* ------------------------------------------------------------------ the ground: the ramp, the camp */

const SETTLED: Pose = { x: LX, y: LAND_AT[1] + SETTLE, th: 0 }
const HINGE_W = W(SETTLED, NOSE_HINGE[0], NOSE_HINGE[1])
const RAMP_A = Math.asin((G - HINGE_W[1]) / RAMP_LEN)
const RAMP_DIR: Pt = [Math.cos(RAMP_A), Math.sin(RAMP_A)]
const RAMP_N: Pt = [Math.sin(RAMP_A), -Math.cos(RAMP_A)]
const FOOT: Pt = [HINGE_W[0] + RAMP_LEN * RAMP_DIR[0], G]
/** The ball's centre on the ramp, `d` down it. */
const onRamp = (d: number): Pt => [HINGE_W[0] + d * RAMP_DIR[0] + R * RAMP_N[0], HINGE_W[1] + d * RAMP_DIR[1] + R * RAMP_N[1]]
/** Where the kicked ball lands on the ramp. */
const LAND_D = 0.6
/** The lamp's plate, the ball at rest on it against the stop, and the mast. */
const PLATE_X = FOOT[0] + 0.74
const PLATE_W = 0.36
const PLATE_H = 0.035
const REST: Pt = [PLATE_X + 0.06, G - R - PLATE_H + 0.012]
const STOP_X = REST[0] + R + 0.035
const MAST_X = PLATE_X + 0.34
const LAMP_Y = G - 1.72
/** The camp: the dome, the flag, the cairn, and her helmet set down on a rock beyond it, where she took it off. */
const DOME_X = PLATE_X + 3.1
const DOME_R = 0.92
const FLAG_X = PLATE_X + 4.5
const CAIRN_X = PLATE_X + 5.45
const HELMET_X = CAIRN_X + 0.88

/**
 * The meeting, under the lamp: the stop on the plate drops once the lamp is
 * lit and he rolls off the plate's end to meet her; she has come all the way
 * from the cairn. Where each of them rests: close, a hand's breadth apart,
 * not pressed together.
 */
const STOP_DOWN: [number, number] = [LAMP + 0.3, LAMP + 0.48]
const MEET_H: Pt = [PLATE_X + 0.42, G - R]
/** A little light between them. */
const MEET_GAP = 0.07
const MEET_B: Pt = [MEET_H[0] + 2 * R + MEET_GAP, G - R]
/** Where she waits, by the cairn's side. */
const WAIT: Pt = [CAIRN_X - 0.5, G - R]
/** They settle against each other: a soft give, and back. */
const give = (T: number): number => {
  const s = T - CAMP_MEET
  return s <= 0 ? 0 : 0.012 * Math.sin(Math.PI * clamp(s / 0.42)) * (s < 0.42 ? 1 : 0)
}
/** Brand at her camp: waiting by the cairn, then out across the camp to him, and at rest with him under the lamp. */
function brandAt(T: number): Companion {
  if (T < SET_OUT) return { x: WAIT[0], y: WAIT[1] }
  if (T < CAMP_MEET) {
    // Slow to start, then gathering, then easing in to stop: 4u³ - 3u⁴, whose speed rises as u² and falls to rest.
    const u = (T - SET_OUT) / (CAMP_MEET - SET_OUT)
    const e = 4 * u * u * u - 3 * u * u * u * u
    return { x: lerp(WAIT[0], MEET_B[0], e), y: WAIT[1] }
  }
  return { x: MEET_B[0] + give(T), y: MEET_B[1] }
}

/** The kick's lob: high enough to clear the long nose ahead of the cockpit. */
const G_HOP = G_EARTH

/** The ball's run from the ramp to the plate: a path, and how far along it is at `T`. */
const RUN: Pt[] = [onRamp(LAND_D), onRamp(RAMP_LEN - 0.05), [FOOT[0] + 0.12, G - R], [PLATE_X - PLATE_W / 2 - 0.02, G - R], [PLATE_X - PLATE_W / 2 + 0.08, G - R - PLATE_H], [REST[0], G - R - PLATE_H]]
const RUN_LEN = (() => {
  let s = 0
  for (let i = 1; i < RUN.length; i++) s += Math.hypot(RUN[i][0] - RUN[i - 1][0], RUN[i][1] - RUN[i - 1][1])
  return s
})()
function alongRun(s: number): Pt {
  let left = Math.max(0, s)
  for (let i = 1; i < RUN.length; i++) {
    const l = Math.hypot(RUN[i][0] - RUN[i - 1][0], RUN[i][1] - RUN[i - 1][1])
    if (left <= l || i === RUN.length - 1) {
      const u = Math.min(1, left / l)
      return [lerp(RUN[i - 1][0], RUN[i][0], u), lerp(RUN[i - 1][1], RUN[i][1], u)]
    }
    left -= l
  }
  return RUN[RUN.length - 1]
}
/** The kicked ball's speed along the ramp as it lands, and at the stop. */
const V_LAND = (() => {
  const a = seatAt(KICK)
  const b = onRamp(LAND_D)
  const T1 = ONRAMP - KICK
  const vx = (b[0] - a[0]) / T1
  const vy = (b[1] - a[1]) / T1 + 0.5 * G_HOP * T1
  return Math.max(0.5, vx * RAMP_DIR[0] + vy * RAMP_DIR[1])
})()
const V_STOP = 1.5
function runAt(T: number): Pt {
  const D = LAMP - ONRAMP
  const u = clamp((T - ONRAMP) / D)
  // Hermite: leaves at V_LAND, gathers down the ramp, slows on the sand, meets the stop at V_STOP.
  const h10 = u * u * u - 2 * u * u + u
  const h01 = -2 * u * u * u + 3 * u * u
  const h11 = u * u * u - u * u
  return alongRun(h10 * V_LAND * D + h01 * RUN_LEN + h11 * V_STOP * D)
}

/* ------------------------------------------------------------------ the part */

interface EdmundsState {
  begin: number
  lane: Lane
}

export const edmunds = part<EdmundsState>(
  {
    name: 'edmunds',
    flight: true,
    draw: (p, s, c) => drawAll(p, s, c),
    over: (p, s, c) => drawOver(p, s, c),
  },
  (slot) => {
    const at = (T: number) => T - slot.begin
    const end = slot.end - slot.begin
    const segs: Seg[] = []
    // Through: hidden, while the camera whips to the far mouth.
    segs.push(...route([{ at: 0, p: [-0.5, 0] }, { at: at(OUT), p: seatAt(OUT), ease: 'inout', hidden: true }]))
    // In the canopy all the way down, and on the ground until the kick.
    segs.push(...carried((a) => seatAt(a + slot.begin), at(OUT), at(KICK), Math.ceil((KICK - OUT) * 40)))
    // Kicked out over the nose onto the ramp.
    const kicked: Way = { at: at(KICK), p: seatAt(KICK) }
    segs.push(...route([kicked, hop(kicked, onRamp(LAND_D), at(ONRAMP), G_HOP)]))
    // Down the ramp and across the sand to the plate.
    segs.push(...carried((a) => runAt(a + slot.begin), at(ONRAMP), at(LAMP), 24))
    // Against the stop, a little back; the stop drops, and he rolls off the plate's end to meet her, and settles against her.
    const stop = runAt(LAMP)
    segs.push(
      ...route([
        { at: at(LAMP), p: stop },
        { at: at(LAMP) + 0.13, p: [stop[0] - 0.045, stop[1]], ease: 'out' },
        { at: at(STOP_DOWN[0]), p: REST, ease: 'inout' },
        { at: at(CAMP_MEET), p: MEET_H, ease: 'inout' },
        { at: at(CAMP_MEET) + 0.21, p: [MEET_H[0] - 0.012, MEET_H[1]], ease: 'out' },
        { at: at(CAMP_MEET) + 0.42, p: MEET_H, ease: 'inout' },
        { at: end, p: MEET_H },
      ]),
    )
    const lane: Lane = { segs, fire: at(OUT) }
    return {
      cells: box(-4, -5, CAIRN_X + 6, G + 3, 2),
      exit: [MEET_H[0] + 0.5, MEET_H[1]],
      lane,
      state: { begin: slot.begin, lane },
      // Brand, at her camp, from while the camera is still at the wormhole (the camp far out of the frame) to the end.
      company: [{ from: BEGIN, to: DURATION + 1, who: 'brand', at: (T) => ({ ...brandAt(T), color: BRAND }) }],
      // What comes through the wormhole is the ball itself, whatever the station made of it.
      changes: [{ at: 0, ghost: false }],
    }
  },
  (slot) => shotsFor(slot),
)

/* ------------------------------------------------------------------ the camera */

function shotsFor(slot: { begin: number; end: number }): PartShot[] {
  return [
    // On the sphere as the ball goes in; then the whip to the far mouth, landing as the Ranger comes out.
    { t: slot.begin, cells: 7.5, hold: [-0.5, 0] },
    { t: OUT, cells: 6.2, hold: [P0[0] + 0.3, P0[1] - 0.2] },
    // With it down the sky, looking ahead and a little down.
    { t: RING + 0.3, cells: 5.8, off: [1.0, 0.2] },
    { t: RETRO[3] + 0.3, cells: 5.8, off: [0.6, 0.15] },
    // Wider for the chute overhead.
    { t: REEFS[0], cells: 7.0, off: [-0.4, -0.8] },
    { t: SHIELD, cells: 7.0, off: [-0.2, -0.45] },
    // The camp comes into the frame as it comes down.
    { t: LEGS[0], cells: 7.2, hold: [LX + 2.0, G - 2.7], w: 0.55 },
    { t: TOUCH, cells: 6.8, hold: [LX + 2.55, G - 1.9] },
    { t: CANOPY + 0.4, cells: 5.8, hold: [LX + 2.0, G - 1.2] },
    { t: KICK, cells: 5.4, hold: [LX + 2.3, G - 1.1] },
    { t: LAMP, cells: 5.4, hold: [LX + 2.75, G - 1.2] },
    // In on the two of them as they meet under the lamp, and held close through the music's last bars: the
    // film's last reunion, near enough to see. Then, in the silence, back to the whole of the camp at dawn.
    { t: CAMP_MEET - 0.35, cells: 3.7, hold: [(MEET_H[0] + MEET_B[0]) / 2, G - 0.9], w: 0.95 },
    { t: CAMP_MEET + 0.55, cells: 2.9, hold: [(MEET_H[0] + MEET_B[0]) / 2, G - 0.8], w: 1 },
    { t: 259.7, cells: 2.75, hold: [(MEET_H[0] + MEET_B[0]) / 2, G - 0.8], w: 1 },
    { t: 262.0, cells: END_CELLS, hold: END_HOLD },
    { t: MIX_END, cells: END_CELLS + 0.25, hold: [END_HOLD[0] + 0.05, END_HOLD[1] - 0.08] },
    // Under the credits the camera goes on drawing back, slower, and up a little into the sky they are written in.
    { t: DURATION, cells: END_CELLS + 0.75, hold: [END_HOLD[0] + 0.1, END_HOLD[1] - 0.3] },
  ]
}

/* ------------------------------------------------------------------ drawing: the eye */

type Frame = ReturnType<typeof frame>
interface View {
  f: Frame
  /** The horizon, at the eye's height. */
  E: number
  /** The eye over the landing ground. */
  A: number
}

/**
 * The eye's height over the landing ground for a camera at `alt`, which is
 * where the horizon sits: level with the Ranger as it comes out, then the
 * camera pitches down to the plain as it falls (the horizon rises up the
 * frame), and levels out low for the landing (the horizon sinks behind the
 * camp). The horizon is `tilt` below the frame's middle. Never under the ground.
 */
function eyeAlt(alt: number): number {
  const tilt = 1.85 - 3.35 * smooth(alt, 2.8, 8.5) + 1.9 * smooth(alt, 10, 14.5)
  return 0.35 + softplus(alt - tilt - 0.35, 0.15)
}
function viewOf(f: Frame): View {
  const A = eyeAlt(G - f.cy)
  return { f, E: G - A, A }
}
/** A point of the ground `s` times nearer than the landing site, at `gx` in the site's own measure, on the screen. */
const groundX = (v: View, gx: number, s: number): number => v.f.cx + (gx - v.f.cx) * s
const groundY = (v: View, s: number): number => v.E + v.A * s
/** Far things fixed to the sky: offsets from the frame's middle, in cells. */
/** Where the last shot holds, and how wide. */
const END_HOLD: Pt = [LX + 3.75, G - 2.1]
const END_CELLS = 6.8
/** The sun comes up behind the cairn in the last shot: across the frame, as a share of its width. */
const SUN_F = (CAIRN_X - 0.01 - (END_HOLD[0] + 0.05)) / ((END_CELLS + 0.25) * (16 / 9))
/** Gargantua, high on the other side, as shares of the frame. */
const GARG_F: Pt = [-0.34, -0.31]

/** The far side opens from the sphere's middle: its radius. */
const revealAt = (T: number): number => 0.25 + 30 * Math.pow(clamp((T - BEGIN) / 0.6), 2.2)

/* ------------------------------------------------------------------ drawing: everything */

function drawAll(p: p5, s: EdmundsState, c: Ctx): void {
  if (c.t < 0) return
  const T = s.begin + c.t
  const { k } = c
  const X = (v: number) => v * k
  const f = frame(p, k)
  const v = viewOf(f)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const rev = revealAt(T)
  const opening = T < BEGIN + 0.62
  ctx.save()
  if (opening) {
    ctx.beginPath()
    ctx.arc(X(-0.5), 0, X(rev), 0, TAU)
    ctx.clip()
  }
  drawSky(p, c, v, T)
  drawLand(p, c, v, T)
  drawMouth(p, c, T)
  drawShield(p, c, T)
  drawChute(p, c, T)
  drawCamp(p, c, v, T)
  drawDust(p, c, T, 0)
  drawRanger(p, c, T)
  drawRamp(p, c, T)
  drawDust(p, c, T, 1)
  drawMouthGlass(p, c, T)
  drawBallShadow(p, s, c, T)
  ctx.restore()
  if (opening) {
    // The edge of the far side going out past the frame: a lensed rim.
    const u = clamp((T - BEGIN) / 0.6)
    const a = 1 - smooth(u, 0.55, 1)
    p.noFill()
    p.stroke(alpha(p, DARK.ice, 0.35 * a))
    p.strokeWeight(X(0.18))
    p.circle(X(-0.5), 0, X(2 * rev + 0.2))
    p.stroke(alpha(p, VOID.ink, 0.95 * a))
    p.strokeWeight(Math.max(1.2, X(0.045)))
    p.circle(X(-0.5), 0, X(2 * rev))
  }
}

function drawOver(p: p5, s: EdmundsState, c: Ctx): void {
  if (c.t < 0) return
  const T = s.begin + c.t
  const f = frame(p, c.k)
  const v = viewOf(f)
  drawCanopy(p, c, T)
  drawPlateLip(p, c, T)
  drawLampLight(p, c, v, T)
}

/* ------------------------------------------------------------------ the sky */

function drawSky(p: p5, c: Ctx, v: View, T: number): void {
  const { k } = c
  const { f, E } = v
  const X = (x: number) => x * k
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const dawn = smooth(T, BEGIN, MIX_END)
  ctx.fillStyle = VOID.bg
  ctx.fillRect(X(f.x0 - 1), X(f.y0 - 1), X(f.x1 - f.x0 + 2), X(f.y1 - f.y0 + 2))
  const top = E - 7.5
  const g = ctx.createLinearGradient(0, X(top), 0, X(E))
  g.addColorStop(0, VOID.bg)
  g.addColorStop(0.46, DARK.deep)
  g.addColorStop(0.8 - 0.05 * dawn, SKY_LOW)
  g.addColorStop(0.935, SKY_WARM)
  g.addColorStop(1, DARK.gold)
  ctx.fillStyle = g
  ctx.fillRect(X(f.x0 - 1), X(top), X(f.x1 - f.x0 + 2), X(E - top + 0.05))

  // Stars, going out toward the band, and a little with the dawn.
  p.noStroke()
  const cell = 1.25
  const ox = f.cx * 0.97
  const oy = f.cy * 0.97
  for (let i = Math.floor((f.x0 - ox) / cell) - 1; i <= Math.ceil((f.x1 - ox) / cell); i++) {
    for (let j = Math.floor((f.y0 - oy) / cell) - 1; j <= Math.ceil((E - oy) / cell); j++) {
      if (hash(i, j, 61) > 0.42) continue
      const x = ox + (i + hash(i, j, 62)) * cell
      const y = oy + (j + hash(i, j, 63)) * cell
      const a = smooth(E - y, 1.3, 4.6) * (1 - 0.35 * dawn) * (0.35 + 0.65 * hash(i, j, 64)) * (0.8 + 0.2 * Math.sin(T * 1.4 + i * 2.3 + j))
      if (a <= 0.03) continue
      p.fill(alpha(p, STAR, a))
      p.circle(X(x), X(y), 1.1 + 1.5 * hash(i, j, 65))
    }
  }

  // The sun, just under the horizon behind the camp: its light along the band, and its edge up at the very end.
  const sx = f.cx + SUN_F * (f.x1 - f.x0)
  // Up to its edge by the music's end; then, under the credits, the rest of the way over the horizon.
  const rise = smooth(T, LAMP, MIX_END) + smooth(T, MIX_END, DURATION)
  glow(p, X(sx), X(E + 0.1), X(3.6 + 0.8 * dawn), DARK.gold, 0.36 + 0.22 * dawn)
  glow(p, X(sx), X(E), X(1.1), VOID.ink, 0.16 + 0.3 * rise)
  const sy = E + 0.3 - 0.21 * rise
  if (sy - 0.26 < E) {
    glow(p, X(sx), X(E - 0.02), X(0.8), DARK.gold, 0.55 * rise)
    p.noStroke()
    p.fill(mixHex(DARK.gold, VOID.ink, 0.8))
    p.circle(X(sx), X(sy), X(0.52))
  }

  // Gargantua, small and high: the dark, its disk edge-on across it, the far side of the disk bent over the top.
  const gx = f.cx + GARG_F[0] * (f.x1 - f.x0)
  const gy = f.cy + GARG_F[1] * (f.y1 - f.y0)
  const r = 0.2
  // Far away, it keeps its size on the screen as the camera comes in and goes out (drawn to a 6.8-cell frame).
  const far = (f.y1 - f.y0) / 6.8
  glow(p, X(gx), X(gy), X(1.1 * far), DARK.amber, 0.1)
  p.push()
  p.translate(X(gx), X(gy))
  p.scale(far)
  p.rotate(-0.09)
  p.noFill()
  p.stroke(alpha(p, DARK.amber, 0.5))
  p.strokeWeight(Math.max(1, X(0.03)))
  p.line(X(-r * 4.6), 0, X(r * 4.6), 0)
  p.stroke(alpha(p, DARK.gold, 0.9))
  p.strokeWeight(Math.max(1, X(0.02)))
  p.line(X(-r * 3), 0, X(r * 3), 0)
  p.noStroke()
  p.fill(VOID.bg)
  p.circle(0, 0, X(2 * r))
  p.noFill()
  p.stroke(alpha(p, DARK.gold, 0.9))
  p.strokeWeight(Math.max(1, X(0.04)))
  p.arc(0, 0, X(2 * r * 1.3), X(2 * r * 1.3), Math.PI + 0.25, TAU - 0.25)
  p.strokeWeight(Math.max(0.8, X(0.018)))
  p.arc(0, 0, X(2 * r * 1.24), X(2 * r * 1.24), 0.4, Math.PI - 0.4)
  p.stroke(alpha(p, VOID.ink, 0.85))
  p.strokeWeight(Math.max(0.8, X(0.014)))
  p.line(X(-r * 1.1), 0, X(r * 1.1), 0)
  p.pop()
}

/* ------------------------------------------------------------------ the land, in depth */

/**
 * A range of flat-topped mesas along the horizon at depth `s`: tablelands
 * with cliffs and flared talus, drifting with how far off they are, lit along
 * their tops on the sunward side. None stands in front of the sun.
 */
function drawRange(p: p5, c: Ctx, v: View, s: number, gap: number, tall: number, seed: number, fill: string, lit: number, sunX: number): void {
  const { k, weight } = c
  const { f } = v
  const X = (x: number) => x * k
  const base = v.E + 0.01
  const a0 = f.cx + (f.x0 - 2 - f.cx) / s
  const a1 = f.cx + (f.x1 + 2 - f.cx) / s
  for (let i = Math.floor(a0 / gap) - 1; i <= Math.ceil(a1 / gap); i++) {
    if (hash(i, seed) > 0.3) continue
    const h = (0.12 + 0.4 * Math.pow(hash(i, seed + 2), 1.6)) * tall * s
    const w = h * (1.2 + 3.6 * hash(i, seed + 1))
    const x0 = groundX(v, (i + 0.3 * hash(i, seed + 3)) * gap, s)
    const x1 = x0 + w
    if (x1 + w * 0.3 > sunX - 0.55 && x0 - w * 0.3 < sunX + 0.55) continue
    const talus = w * (0.3 + 0.25 * hash(i, seed + 4))
    const cliff = 0.35 + 0.25 * hash(i, seed + 5)
    p.noStroke()
    p.fill(fill)
    p.beginShape()
    p.vertex(X(x0 - talus), X(base))
    p.quadraticVertex(X(x0 - talus * 0.05), X(base - h * 0.05), X(x0), X(base - h * cliff))
    p.vertex(X(x0 + w * 0.06), X(base - h))
    p.vertex(X(x1 - w * 0.08), X(base - h * 0.97))
    p.vertex(X(x1), X(base - h * cliff))
    p.quadraticVertex(X(x1 + talus * 0.05), X(base - h * 0.05), X(x1 + talus), X(base))
    p.endShape(p.CLOSE)
    // A notch of shadow down the cliff, and the lit rim along the top and down the sunward face.
    p.stroke(alpha(p, DARK.gold, lit))
    p.strokeWeight(Math.max(0.9, weight * 0.55))
    p.noFill()
    p.line(X(x0 + w * 0.06), X(base - h), X(x1 - w * 0.08), X(base - h * 0.97))
    p.line(X(x1 - w * 0.08), X(base - h * 0.97), X(x1), X(base - h * cliff))
  }
}

function drawLand(p: p5, c: Ctx, v: View, T: number): void {
  const { k, weight } = c
  const { f, E, A } = v
  const X = (x: number) => x * k
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const bottom = Math.max(f.y1 + 0.5, E + 0.1)
  const sunX = f.cx + SUN_F * (f.x1 - f.x0)
  // The far range first, standing on the horizon, hazed nearly to the sky.
  drawRange(p, c, v, 0.014, 40, 42, 71, MESA, 0.5, sunX)
  // The ground from the horizon down: a thin haze, the planet's rust, darker close to.
  const span = Math.max(0.01, bottom - E)
  const g = ctx.createLinearGradient(0, X(E), 0, X(bottom))
  const at = (y: number) => clamp((y - E) / span)
  const s1 = at(E + Math.min(0.3, 0.06 + A * 0.02))
  const s2 = Math.max(s1, at(E + Math.min(1.4, A * 0.3)))
  const s3 = Math.max(s2, at(G + 0.9))
  g.addColorStop(0, HAZE)
  g.addColorStop(s1, LAND_FAR)
  g.addColorStop(s2, LAND)
  g.addColorStop(s3, LAND_NEAR)
  g.addColorStop(1, LAND_NEAR)
  ctx.fillStyle = g
  ctx.fillRect(X(f.x0 - 1), X(E), X(f.x1 - f.x0 + 2), X(bottom - E + 1))

  // The plain: long drifts of sand, then stones, cracks and craters, at their depths.
  const rows: number[] = []
  for (let j = 0; j < 34; j++) rows.push(Math.pow(1.16, -j))
  for (let j = 1; j < 10; j++) rows.push(Math.pow(1.16, j))
  for (const s of rows) {
    const y = groundY(v, s)
    if (y < E + 0.025 || y > f.y1 + 0.4) continue
    const j = Math.round(Math.log(s) / Math.log(1.16)) + 50
    const fz = Math.min(0.6, (A * s) / 9)
    // Drifts: long, flat, light on their sunward crest.
    if (s < 0.95) {
      const step = 5 / s
      const b0 = f.cx + (f.x0 - 3 - f.cx) / s
      const b1 = f.cx + (f.x1 + 3 - f.cx) / s
      for (let i = Math.floor(b0 / step) - 1; i <= Math.ceil(b1 / step); i++) {
        if (hash(i, j, 41) > 0.45) continue
        const len = (1.5 + 3 * hash(i, j, 42)) * s
        const x = groundX(v, (i + hash(i, j, 43)) * step, s)
        const th = Math.max(0.006, Math.min(0.1, 0.35 * fz * s))
        p.noStroke()
        p.fill(alpha(p, VOID.bg, 0.16))
        p.ellipse(X(x), X(y + th * 0.5), X(len), X(th * 2))
        p.fill(alpha(p, DARK.gold, 0.1))
        p.ellipse(X(x + len * 0.08), X(y - th * 0.4), X(len * 0.7), X(th))
      }
    }
    const step = 1.3 / s
    const b0 = f.cx + (f.x0 - 0.6 - f.cx) / s
    const b1 = f.cx + (f.x1 + 0.6 - f.cx) / s
    for (let i = Math.floor(b0 / step) - 1; i <= Math.ceil(b1 / step); i++) {
      const h = hash(i, j, 81)
      if (h > (s > 1.05 ? 0.25 : 0.6)) continue
      const sj = s * (1 + 0.07 * (hash(i, j, 82) - 0.5))
      const gx = (i + hash(i, j, 83)) * step
      const x = groundX(v, gx, sj)
      const yy = groundY(v, sj)
      // The camp's ground is cleared.
      if (sj > 0.8 && sj < 1.35 && gx > LX - 2.2 && gx < CAIRN_X + 1.2) continue
      const kind = hash(i, j, 84)
      if (kind < 0.42 && sj < 1.3) {
        // A stone: an upright lump, lit on the sunward side.
        const w = (0.12 + 0.3 * hash(i, j, 85)) * sj
        if (w < 0.022) continue
        const hh = w * (0.4 + 0.3 * hash(i, j, 86))
        p.noStroke()
        p.fill(ROCK)
        p.beginShape()
        p.vertex(X(x - w / 2), X(yy))
        p.quadraticVertex(X(x - w * 0.35), X(yy - hh), X(x + w * 0.05), X(yy - hh))
        p.quadraticVertex(X(x + w * 0.4), X(yy - hh * 0.9), X(x + w / 2), X(yy))
        p.endShape(p.CLOSE)
        if (w > 0.05) {
          p.noFill()
          p.stroke(alpha(p, DARK.gold, 0.6))
          p.strokeWeight(Math.max(0.8, weight * 0.5))
          p.line(X(x + w * 0.08), X(yy - hh * 0.98), X(x + w * 0.42), X(yy - hh * 0.5))
        }
      } else if (kind < 0.78) {
        // A crack, or a ripple of sand.
        const l = (0.4 + 0.9 * hash(i, j, 87)) * sj
        if (l < 0.05) continue
        p.stroke(alpha(p, VOID.bg, 0.32))
        p.strokeWeight(Math.max(0.8, weight * 0.55 * Math.min(1, sj)))
        p.line(X(x - l / 2), X(yy), X(x + l / 2), X(yy))
      } else if (sj < 1.2) {
        // A crater: a ring squashed by how low we look at it, its far wall lit, its floor in shadow.
        const rx = (0.3 + 0.9 * hash(i, j, 88)) * sj
        const ry = rx * fz
        if (rx < 0.05 || ry < 0.01) continue
        p.noStroke()
        p.fill(alpha(p, VOID.bg, 0.3))
        p.ellipse(X(x), X(yy), X(2 * rx), X(2 * ry))
        p.noFill()
        p.stroke(alpha(p, DARK.gold, 0.4))
        p.strokeWeight(Math.max(0.8, weight * 0.55))
        p.arc(X(x), X(yy), X(2 * rx * 0.94), X(2 * ry * 0.94), Math.PI * 0.95, Math.PI * 1.6)
        p.stroke(alpha(p, VOID.bg, 0.35))
        p.arc(X(x), X(yy), X(2 * rx), X(2 * ry), Math.PI * 0.1, Math.PI * 0.9)
      }
    }
  }
  void T
}

/* ------------------------------------------------------------------ the far mouth */

function drawMouth(p: p5, c: Ctx, T: number): void {
  const { k, ink, weight } = c
  const X = (x: number) => x * k
  const [mx, my] = MOUTH
  const ctx = p.drawingContext as CanvasRenderingContext2D
  glow(p, X(mx), X(my), X(RM * 1.7), DARK.ice, 0.14)
  // Through it, the other side: the dark by Saturn, its rings, stars squeezed to the edge.
  ctx.save()
  ctx.beginPath()
  ctx.arc(X(mx), X(my), X(RM), 0, TAU)
  ctx.clip()
  p.noStroke()
  p.fill(DARK.deep)
  p.circle(X(mx), X(my), X(2 * RM))
  for (let j = 0; j < 90; j++) {
    const rho = Math.pow(hash(j, 21), 0.4)
    const a = hash(j, 22) * TAU + T * 0.02
    const r = RM * rho * 0.98
    const b = 0.3 + 0.7 * hash(j, 23)
    const len = 0.02 + 0.45 * Math.pow(rho, 8)
    if (len < 0.06) {
      p.noStroke()
      p.fill(alpha(p, STAR, b * 0.8))
      p.circle(X(mx + Math.cos(a) * r), X(my + Math.sin(a) * r), Math.max(1.1, X(0.022) * (0.6 + b)))
    } else {
      p.noFill()
      p.stroke(alpha(p, STAR, b * 0.7))
      p.strokeWeight(Math.max(1, X(0.016)))
      p.arc(X(mx), X(my), X(r * 2), X(r * 2), a, a + len)
    }
  }
  // Saturn, small and bent, low in the glass.
  const sx = mx - 0.55
  const sy = my + 0.62
  p.push()
  p.translate(X(sx), X(sy))
  p.rotate(-0.3)
  p.noFill()
  p.stroke(alpha(p, DARK.hull, 0.5))
  p.strokeWeight(Math.max(1, X(0.035)))
  p.arc(0, 0, X(1.05), X(0.24), Math.PI, TAU)
  p.noStroke()
  p.fill(DARK.gold)
  p.circle(0, 0, X(0.46))
  p.fill(alpha(p, DARK.deep, 0.7))
  p.circle(X(0.12), X(-0.05), X(0.48))
  p.noFill()
  p.stroke(alpha(p, DARK.hull, 0.6))
  p.strokeWeight(Math.max(1, X(0.035)))
  p.arc(0, 0, X(1.05), X(0.24), 0, Math.PI)
  p.pop()
  // The Ranger's image coming up through the glass before it is out.
  const img = smooth(T, OUT - 0.55, OUT)
  if (img > 0 && T < OUT + 0.05) {
    const q = poseAt(T)
    const sc = 0.18 + 0.82 * img * img
    const cx = mx + (q.x - mx) * sc
    const cy = my + (q.y - my) * sc
    p.push()
    p.translate(X(cx), X(cy))
    p.scale(sc)
    // Its silhouette, all of it: the hull, the wing under it, the bubble on its back.
    inHub(p, c, (h) => {
      p.noStroke()
      p.fill(mixHex(DARK.deep, DARK.hull, 0.7 * img))
      poly(p, h.k, HULL)
      poly(p, h.k, WING)
      bubble(p, h.k)
    })
    p.pop()
  }
  // A bright crescent on the side toward the dawn, the band bent round its foot.
  p.noFill()
  p.stroke(alpha(p, DARK.gold, 0.55))
  p.strokeWeight(X(0.07))
  p.arc(X(mx), X(my), X(RM * 1.86), X(RM * 1.86), Math.PI * 0.15, Math.PI * 0.85)
  p.stroke(alpha(p, DARK.hull, 0.25))
  p.strokeWeight(X(0.09))
  p.arc(X(mx), X(my), X(RM * 1.6), X(RM * 1.6), Math.PI * 1.1, Math.PI * 1.4)
  ctx.restore()
  outline(p, alpha(p, DARK.hull, 0.95).toString(), weight * 1.1)
  p.circle(X(mx), X(my), X(2 * RM))
  // Out: a flash where it comes through. (Its wave on 214 is felt, not drawn: the Ranger shakes as it passes.)
  const out = T - OUT
  if (out > -0.05 && out < 0.8) {
    const q = seatAt(Math.max(T, OUT))
    glow(p, X(q[0] - 0.3), X(q[1] + 0.1), X(1.4), VOID.ink, 0.75 * knock(out, 0.2))
  }
  void ink
}

/** While the Ranger's tail is still in the mouth, the glass over it. */
function drawMouthGlass(p: p5, c: Ctx, T: number): void {
  if (T < OUT - 0.02 || T > OUT + 0.6) return
  const { k } = c
  const X = (x: number) => x * k
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.beginPath()
  ctx.arc(X(MOUTH[0]), X(MOUTH[1]), X(RM), 0, TAU)
  ctx.clip()
  p.noStroke()
  p.fill(alpha(p, DARK.deep, 0.62))
  p.circle(X(MOUTH[0]), X(MOUTH[1]), X(2 * RM))
  ctx.restore()
}

/* ------------------------------------------------------------------ the Ranger */

function drawRanger(p: p5, c: Ctx, T: number): void {
  if (T < OUT - 0.02) return
  const { k, ink, weight } = c
  const X = (x: number) => x * k
  const q = poseAt(T)
  const V = (u: number, v: number) => p.vertex(X(u), -X(v))
  const ctx = p.drawingContext as CanvasRenderingContext2D

  // The shadow on the ground under it, as it comes in.
  const alt = G - q.y
  if (alt < 3.5) {
    const a = 1 - smooth(alt, CLEAR + 0.1, 3.5)
    p.noStroke()
    p.fill(alpha(p, VOID.bg, 0.45 * a))
    p.ellipse(X(q.x - 0.2), X(G), X(3.4 - 0.5 * a), X(0.14))
  }

  p.push()
  p.translate(X(q.x), X(q.y))
  p.rotate(-q.th)

  // The belly engines: lit from the cut, pulsing on the beats, cut at touchdown; the bells glow as they cool.
  const lit = T >= CUT && T < TOUCH + 0.12
  let thrust = 0
  if (lit) {
    thrust = 0.55 * smooth(T, CUT, CUT + 0.12) + 0.45 * Math.max(...[CUT, ...LEGS, FLARE].map((b) => pulse(T - b, 0.06, 0.28)))
    thrust += 0.25 * smooth(T, FLARE - 0.3, FLARE)
    thrust *= 1 - smooth(T, TOUCH, TOUCH + 0.12)
  }
  const exposed = T >= SHIELD
  if (exposed) {
    for (const u of ENGINES) {
      if (thrust > 0.01) {
        const flick = 0.88 + 0.12 * Math.sin(T * 67 + u * 9)
        const len = (0.35 + 0.75 * thrust) * flick
        glow(p, X(u), X(0.2 + len * 0.4), X(0.35 + 0.4 * thrust), DARK.amber, 0.55 * thrust)
        solid(p, alpha(p, ink, 0.6).toString(), weight * 0.5, DARK.amber)
        p.beginShape()
        V(u - 0.07, -0.1)
        V(u, -0.1 - len)
        V(u + 0.07, -0.1)
        p.endShape(p.CLOSE)
        p.noStroke()
        p.fill(alpha(p, VOID.ink, 0.85))
        p.beginShape()
        V(u - 0.035, -0.1)
        V(u, -0.1 - len * 0.45)
        V(u + 0.035, -0.1)
        p.endShape(p.CLOSE)
      }
      const cool = T > TOUCH ? Math.exp(-(T - TOUCH) / 3.5) : lit ? 1 : 0
      solid(p, ink, weight * 0.6, mixHex(DARK.slate, DARK.amber, 0.8 * cool))
      p.beginShape()
      V(u - 0.05, 0.01)
      V(u - 0.08, -0.1)
      V(u + 0.08, -0.1)
      V(u + 0.05, 0.01)
      p.endShape(p.CLOSE)
    }
  }

  // The legs: stowed along the belly, swung down one a beat, taking the weight at touchdown. The rear one comes
  // down behind the wing.
  if (exposed) for (let i = 0; i < 2; i++) drawLeg(p, c, T, q, i)

  // The ship: the hub's drawing.
  drawBody(p, c, T)

  // The heat shield on the belly until it goes, glowing at its leading edge while the burns take the speed off.
  if (!exposed) {
    solid(p, ink, weight * 0.6, DARK.slate)
    p.beginShape()
    V(SHIELD_U[0], 0.01)
    V(0.48, 0.01)
    V(0.92, 0.036)
    V(SHIELD_U[1], 0.09)
    V(SHIELD_U[1] - 0.06, 0.03)
    V(0.9, -0.04)
    V(0.45, -0.07)
    V(SHIELD_U[0] + 0.05, -0.07)
    p.endShape(p.CLOSE)
    const heat = smooth(T, RETRO[0] - 0.2, RETRO[1]) * (1 - smooth(T, MORTAR, SHIELD))
    if (heat > 0.01) {
      p.noFill()
      p.stroke(alpha(p, DARK.amber, 0.7 * heat))
      p.strokeWeight(X(0.03))
      p.beginShape()
      V(0.2, -0.07)
      V(0.45, -0.07)
      V(0.9, -0.04)
      V(SHIELD_U[1] - 0.06, 0.03)
      V(SHIELD_U[1], 0.09)
      p.endShape()
    }
  }

  // The wing, over the hull's flank, and its lamp.
  drawWing(p, c, T)

  // The mortar: a bang of smoke off the collar, and its lid thrown back end over end.
  {
    const d = T - MORTAR
    if (d >= 0 && d < 1.1) {
      const qm = poseAt(MORTAR)
      const back: Pt = [-Math.cos(qm.th), Math.sin(qm.th)]
      const up: Pt = [-Math.sin(qm.th), -Math.cos(qm.th)]
      const [cx0, cy0] = W(qm, CAN[0], CAN[1] + 0.02)
      p.pop()
      const e = Math.sqrt(d / 1.1)
      p.push()
      ctx.globalAlpha = 0.85 * (1 - d / 1.1)
      puff(p, k, ink, weight * 0.45, DARK.hull, cx0 + vxAt(MORTAR) * d * 0.5 + back[0] * 0.3 * e + up[0] * 0.2 * e, cy0 + vyAt(MORTAR) * d * 0.5 + back[1] * 0.3 * e + up[1] * 0.2 * e, 0.06 + 0.14 * e)
      p.pop()
      const lx = cx0 + (back[0] * 1.4 + up[0] * 1.1 + vxAt(MORTAR) * 0.3) * d
      const ly = cy0 + (back[1] * 1.4 + up[1] * 1.1 + vyAt(MORTAR) * 0.3) * d + 0.5 * 3 * d * d
      p.push()
      p.translate(X(lx), X(ly))
      p.rotate(-qm.th - 9 * d)
      solid(p, ink, weight * 0.5, TIN)
      p.rect(0, 0, X(COLLAR_W * SHIP), X(LID * SHIP + 0.01), X(0.01))
      p.pop()
      p.push()
      p.translate(X(q.x), X(q.y))
      p.rotate(-q.th)
    }
  }

  // The nose retros: a burn forward from the tip on each of four beats.
  const burn = Math.max(...RETRO.map((r) => (T < r ? 0 : smooth(T, r, r + 0.04) * (T - r < 0.22 ? 1 : Math.exp(-(T - r - 0.22) / 0.12)))))
  if (burn > 0.01) {
    const [nu, nv] = NOSE
    const flick = 0.9 + 0.1 * Math.sin(T * 73)
    const len = 1.35 * burn * flick
    glow(p, X(nu + 0.12 + len * 0.35), -X(nv), X(0.45 + 0.6 * burn), DARK.amber, 0.7 * burn)
    solid(p, alpha(p, ink, 0.6).toString(), weight * 0.5, DARK.amber)
    p.beginShape()
    V(nu - 0.02, nv + 0.06)
    V(nu + len * 0.3, nv + 0.12)
    V(nu + len, nv)
    V(nu + len * 0.3, nv - 0.12)
    V(nu - 0.02, nv - 0.06)
    p.endShape(p.CLOSE)
    p.noStroke()
    p.fill(alpha(p, VOID.ink, 0.92))
    p.beginShape()
    V(nu, nv + 0.035)
    V(nu + len * 0.5, nv)
    V(nu, nv - 0.035)
    p.endShape(p.CLOSE)
  }
  p.pop()

  // The hood home against its stop: the cabin's air let out at the seal it opened.
  {
    const d = T - CANOPY
    if (d >= 0 && d < 0.9) {
      const seal = hu(SCREEN[0], SCREEN[1])
      const [sx0, sy0] = W(poseAt(TOUCH + 0.5), seal[0] + 0.02, seal[1] + 0.03)
      const e = Math.sqrt(d / 0.9)
      p.push()
      ctx.globalAlpha = 0.8 * (1 - d / 0.9)
      puff(p, k, ink, weight * 0.45, DARK.hull, sx0 + 0.3 * e, sy0 - 0.22 * e, 0.05 + 0.12 * e)
      p.pop()
    }
  }

  // Thruster puffs, in the world: the pitch-up (under the nose, over the tail) and the stop (over the nose, under the wingtip).
  const puffs: [number, number, number, number, number][] = [
    [PITCH, 1.1, 0.05, 0, -1],
    [PITCH, -1.5, 0.42, 0, 1],
    [PITCH_STOP, 1.0, 0.24, 0, 1],
    [PITCH_STOP, -1.48, -0.27, 0, -1],
  ]
  for (const [at, u, v, , dir] of puffs) {
    const age = T - at
    if (age < 0 || age > 0.8) continue
    const qa = poseAt(at)
    const [x, y] = W(qa, u, v)
    const n: Pt = [-Math.sin(qa.th) * dir, -Math.cos(qa.th) * dir]
    const e = Math.sqrt(age / 0.8)
    const vx = vxAt(at) * age * 0.6
    p.push()
    ctx.globalAlpha = 0.75 * (1 - age / 0.8)
    puff(p, k, ink, weight * 0.45, DARK.hull, x + vx + n[0] * 0.35 * e, y + n[1] * 0.35 * e + vyAt(at) * age * 0.6, 0.05 + 0.1 * e)
    p.pop()
  }
}

/** Draw in the hub's ship units, inside the Ranger's frame, keeping the stage's line weights. */
function inHub(p: p5, c: Ctx, draw: (c: Ctx) => void): void {
  p.push()
  p.translate(-c.k * XO * SHIP, -c.k * YB * SHIP)
  p.scale(SHIP)
  draw({ ...c, weight: c.weight / SHIP })
  p.pop()
}

function poly(p: p5, k: number, pts: Pt[]): void {
  p.beginShape()
  for (const [x, y] of pts) p.vertex(x * k, y * k)
  p.endShape(p.CLOSE)
}

/** The bubble, from the windscreen over the seat to its back: the cockpit's well, and the glass that closes over it. */
function bubble(p: p5, k: number): void {
  const X = (v: number) => v * k
  p.beginShape()
  p.vertex(X(SCREEN[0]), X(SCREEN[1]))
  p.bezierVertex(X(0.42), X(-0.14), X(0.14), X(-0.31), X(-0.1), X(-0.3))
  p.bezierVertex(X(-0.36), X(-0.29), X(-0.5), X(-0.12), X(-0.46), X(0.1))
  p.endShape(p.CLOSE)
}

/** How far the seat-back has swung forward: it kicks on 231 and settles back. */
const kickAt = (T: number): number => (T >= KICK ? Math.min(1, (T - KICK) / 0.07) * Math.exp(-Math.max(0, T - KICK - 0.07) / 0.35) : 0)

/** The hull, its belly and nose, the bells, the collar, and the cockpit's well under the ball (hub units). */
function drawBody(p: p5, c0: Ctx, T: number): void {
  inHub(p, c0, (c) => {
    const { k, ink, weight } = c
    const X = (v: number) => v * k
    const faint = alpha(p, ink, 0.45).toString()
    // The bells, on the tail: cold, the main engine is not lit here.
    for (const [y0, y1] of BELLS) {
      solid(p, ink, weight * 0.7, TIN)
      poly(p, k, [
        [-2.05, y0 + 0.025],
        [-2.26, y0 - 0.015],
        [-2.26, y1 + 0.015],
        [-2.05, y1 - 0.025],
      ])
    }
    // The hull, the black of its belly and nose.
    solid(p, ink, weight, DARK.hull)
    poly(p, k, HULL)
    p.noStroke()
    p.fill(DARK.deep)
    poly(p, k, BELLY)
    // Panel lines, the hatch, the fuel port.
    outline(p, faint, weight * 0.5)
    for (const x of [-0.78, -1.62]) p.line(X(x), X(-0.04), X(x), X(0.33))
    p.rect(X(-1.1), X(0.16), X(0.3), X(0.18), X(0.04))
    solid(p, ink, weight * 0.5, DARK.slate)
    p.circle(X(PORT[0]), X(PORT[1]), X(0.12))
    // The docking collar on its back, the drogue packed in it: the mortar blows its lid off and leaves it open.
    solid(p, ink, weight * 0.7, TIN)
    if (T < MORTAR) p.rect(X(COLLAR[0]), X(COLLAR[1]), X(COLLAR_W), X(COLLAR_H), X(0.02))
    else {
      p.rect(X(COLLAR[0]), X(COLLAR[1] + LID / 2), X(COLLAR_W), X(COLLAR_H - LID), X(0.02))
      p.noStroke()
      p.fill(DARK.deep)
      p.rect(X(COLLAR[0]), X(COLLAR[1] - COLLAR_H / 2 + LID + 0.012), X(COLLAR_W - 0.08), X(0.022))
    }
    // The cockpit: its well dark under the glass, the lit panel, the red seat-back behind the ball. On 231 the
    // seat-back swings forward and kicks the ball out over the nose.
    solid(p, ink, weight * 0.6, DARK.deep)
    bubble(p, k)
    glow(p, 0, 0, X(0.42), DARK.amber, 0.28)
    for (const [x, y, col] of [
      [0.4, 0.04, DARK.amber],
      [0.33, -0.05, DARK.ice],
      [0.26, -0.12, DARK.hull],
    ] as const) {
      p.noStroke()
      p.fill(col)
      p.circle(X(x), X(y), X(0.05))
    }
    p.push()
    p.translate(X(-0.235), X(0.1))
    p.rotate(0.95 * kickAt(T))
    solid(p, ink, weight * 0.6, DARK.red)
    poly(p, k, [
      [-0.075, 0],
      [0.005, -0.24],
      [0.095, -0.24],
      [0.075, 0],
    ])
    p.pop()
  })
}

/** The wing, swept back and hung down under the after half, over the hull's flank; its lamp blinks on every hit. */
function drawWing(p: p5, c0: Ctx, T: number): void {
  inHub(p, c0, (c) => {
    const { k, ink, weight } = c
    const X = (v: number) => v * k
    solid(p, ink, weight * 0.9, TIN)
    poly(p, k, WING)
    outline(p, alpha(p, ink, 0.45).toString(), weight * 0.5)
    p.line(X(-0.75), X(0.47), X(-2.02), X(0.47))
    const blink = T < LAMP + 0.5 ? knock(lastOf(EDMUNDS_HITS, T).ago, 0.18) : 0
    if (blink > 0.02) glow(p, X(WINGTIP[0]), X(WINGTIP[1]), X(0.28), DARK.red, 0.8 * blink)
    solid(p, ink, weight * 0.5, blink > 0.3 ? DARK.amber : DARK.red)
    p.circle(X(WINGTIP[0]), X(WINGTIP[1]), X(0.075))
  })
}

function legAngle(T: number, i: number): number {
  const d = smooth(T, LEGS[i] - 0.2, LEGS[i])
  // A little past on the beat, and back into its lock.
  const over = T > LEGS[i] ? 0.1 * Math.exp(-(T - LEGS[i]) / 0.22) * Math.sin((T - LEGS[i]) * 13) : 0
  const e = easeInQuad(d)
  const down = Math.atan2(legReach(i), LEG_OUT)
  if (i === 0) return Math.PI + (Math.PI * 2 - down - Math.PI) * e + over
  return Math.PI * 2 - (Math.PI * 2 - (Math.PI + down)) * e - over
}

function drawLeg(p: p5, c: Ctx, T: number, q: Pose, i: number): void {
  const { k, ink, weight } = c
  const X = (x: number) => x * k
  const hu0 = LEG_U[i]
  const top: Pt = [hu0, LEG_V[i]]
  const a = legAngle(T, i)
  let foot: Pt = [hu0 + Math.cos(a) * legLen(i), top[1] + Math.sin(a) * legLen(i)]
  if (T >= TOUCH) {
    // The foot stays where it touched; the strut takes up the sink.
    const sink = sinkAt(T - TOUCH)
    const th = q.th
    // The ground under the foot, in the craft's frame (small pitch, so near enough): the foot is `sink` higher up the leg.
    foot = [hu0 + (i === 0 ? LEG_OUT : -LEG_OUT), -LEG_REACH + sink + th * (hu0 + (i === 0 ? LEG_OUT : -LEG_OUT))]
  }
  const mid: Pt = [top[0] + (foot[0] - top[0]) * 0.55, top[1] + (foot[1] - top[1]) * 0.55]
  // The brace from the belly to the strut.
  const bu = hu0 + (i === 0 ? -0.32 : 0.32)
  const brace: Pt = [bu, underAt(bu)]
  outline(p, ink, weight * 0.7)
  p.line(X(brace[0]), -X(brace[1]), X(mid[0]), -X(mid[1]))
  outline(p, ink, weight * 1.7)
  p.line(X(top[0]), -X(top[1]), X(mid[0]), -X(mid[1]))
  p.stroke(DARK.hull)
  p.strokeWeight(weight * 0.9)
  p.line(X(top[0]), -X(top[1]), X(mid[0]), -X(mid[1]))
  outline(p, ink, weight * 0.9)
  p.line(X(mid[0]), -X(mid[1]), X(foot[0]), -X(foot[1]))
  solid(p, ink, weight * 0.6, DARK.slate)
  p.ellipse(X(foot[0]), -X(foot[1] - 0.015), X(0.22), X(0.05))
  solid(p, ink, weight * 0.5, DARK.hull)
  p.circle(X(top[0]), -X(top[1]), X(0.06))
}

/** The hood over the ball: unlatched, run back along the spine, and home against its stop on 229. */
function canopyOpen(T: number): number {
  if (T < CANOPY - 0.34) return 0
  const u = clamp((T - (CANOPY - 0.34)) / 0.34)
  const bounce = T > CANOPY ? 0.045 * Math.exp(-(T - CANOPY) / 0.22) * Math.sin((T - CANOPY) * 13) : 0
  return easeInQuad(u) - bounce
}

/** The hood's glass over the ball, its windscreen frame, a glint (hub units, over the ball). */
function drawCanopy(p: p5, c0: Ctx, T: number): void {
  if (T < OUT - 0.02) return
  const q = poseAt(T)
  const open = canopyOpen(T)
  p.push()
  p.translate(q.x * c0.k, q.y * c0.k)
  p.rotate(-q.th)
  inHub(p, c0, (c) => {
    const { k, ink, weight } = c
    const X = (v: number) => v * k
    p.translate(X(SLIDE[0] * open), X(SLIDE[1] * clamp(open)))
    solid(p, ink, weight * 1.1, alpha(p, DARK.ice, 0.24).toString())
    bubble(p, k)
    outline(p, ink, weight * 0.8)
    p.line(X(0.16), X(-0.27), X(0.32), X(0.1))
    outline(p, alpha(p, ink, 0.6).toString(), Math.max(1, X(0.035)))
    p.arc(X(-0.02), X(-0.02), X(0.46), X(0.46), -2.4, -1.5)
  })
  p.pop()
}

/* ------------------------------------------------------------------ the heat shield and the chute */

function drawShield(p: p5, c: Ctx, T: number): void {
  const d = T - SHIELD
  if (d < 0 || d > 3) return
  const { k, ink, weight } = c
  const X = (x: number) => x * k
  const q = poseAt(SHIELD)
  const [x0, y0] = W(q, SHIELD_MID, -0.03)
  const push: Pt = [Math.sin(q.th) * 0.8 - 0.5, Math.cos(q.th) * 0.8]
  const x = x0 + (vxAt(SHIELD) + push[0]) * d
  const y = y0 + (vyAt(SHIELD) + push[1]) * d + 0.5 * 5 * d * d
  if (y > G + 1) return
  // A shallow dish, its hot face down: it tips as it drops, so its bowl shows.
  p.push()
  p.translate(X(x), X(y))
  p.rotate(-q.th + 0.5 * d + 0.6 * d * d)
  const heat = Math.exp(-d / 0.9)
  solid(p, ink, weight * 0.6, DARK.slate)
  p.beginShape()
  const hw = (SHIELD_U[1] - SHIELD_U[0]) / 2
  p.vertex(X(-hw), X(-0.02))
  p.quadraticVertex(0, X(0.2), X(hw), X(-0.02))
  p.quadraticVertex(0, X(0.08), X(-hw), X(-0.02))
  p.endShape(p.CLOSE)
  p.noFill()
  p.stroke(alpha(p, DARK.amber, 0.75 * heat))
  p.strokeWeight(X(0.03))
  p.beginShape()
  p.vertex(X(-hw + 0.18), X(0.03))
  p.quadraticVertex(0, X(0.2), X(hw - 0.18), X(0.03))
  p.endShape()
  p.pop()
  // The bolts' puffs as it goes.
  if (d < 0.6) {
    const ctx = p.drawingContext as CanvasRenderingContext2D
    for (const u of [-0.9, 0.9]) {
      const [px, py] = W(q, u, underAt(u) - 0.02)
      p.push()
      ctx.globalAlpha = 0.7 * (1 - d / 0.6)
      puff(p, k, ink, weight * 0.45, DARK.hull, px + vxAt(SHIELD) * d * 0.7, py + vyAt(SHIELD) * d * 0.7 + 0.15 * Math.sqrt(d), 0.05 + 0.1 * Math.sqrt(d))
      p.pop()
    }
  }
}

/** The chute: where its mouth is and which way it points (away from the Ranger), how open it is. */
function chuteAt(T: number): { mouth: Pt; dir: Pt; r: number; attached: boolean; line: number } | null {
  if (T < MORTAR || T > CUT + 3) return null
  const attachedAt = (t: number) => {
    const q = poseAt(t)
    const anchor = W(q, CAN[0], CAN[1])
    let dx = -vxAt(t)
    let dy = -vyAt(t) - 0.7
    const l = Math.hypot(dx, dy) || 1
    dx /= l
    dy /= l
    const sway = 0.07 * Math.sin(t * 4.6) + 0.04 * Math.sin(t * 2.3 + 1)
    const cs = Math.cos(sway)
    const sn = Math.sin(sway)
    const dir: Pt = [dx * cs - dy * sn, dx * sn + dy * cs]
    const out = 2.1 * easeOutCubic(clamp((t - MORTAR) / (BLOOM - MORTAR)))
    return { anchor, dir, out }
  }
  let r = 0
  const snap = (at: number, to: number, from: number) => (T < at ? from : lerp(from, to, easeOutCubic(clamp((T - at) / 0.12))) + (to - from) * 0.2 * Math.exp(-(T - at) / 0.22) * Math.sin((T - at) * 13))
  if (T >= BLOOM - 0.05) {
    r = snap(BLOOM - 0.05, 0.26, 0.05)
    if (T >= REEFS[0]) r = snap(REEFS[0], 0.42, 0.26)
    if (T >= REEFS[1]) r = snap(REEFS[1], 0.6, 0.42)
  }
  if (T < CUT) {
    const a = attachedAt(T)
    return { mouth: [a.anchor[0] + a.dir[0] * a.out, a.anchor[1] + a.dir[1] * a.out], dir: a.dir, r, attached: true, line: a.out }
  }
  // Cut: it stops in the air and drifts off, spilling.
  const a = attachedAt(CUT)
  const m0: Pt = [a.anchor[0] + a.dir[0] * a.out, a.anchor[1] + a.dir[1] * a.out]
  const d = T - CUT
  const keep = 0.35 * (1 - Math.exp(-d / 0.35))
  const mouth: Pt = [m0[0] + vxAt(CUT) * keep - 0.3 * d, m0[1] + vyAt(CUT) * keep - 0.12 * d]
  const tilt = 0.5 * smooth(d, 0, 2)
  const dir: Pt = [a.dir[0] * Math.cos(tilt) - a.dir[1] * Math.sin(tilt), a.dir[0] * Math.sin(tilt) + a.dir[1] * Math.cos(tilt)]
  return { mouth, dir, r: r * (1 - 0.35 * smooth(d, 0, 2.5)), attached: false, line: a.out }
}

function drawChute(p: p5, c: Ctx, T: number): void {
  const ch = chuteAt(T)
  if (!ch) return
  const { k, ink, weight } = c
  const X = (x: number) => x * k
  const [mx, my] = ch.mouth
  const [dx, dy] = ch.dir
  // Across the mouth.
  const nx = -dy
  const ny = dx
  const q = poseAt(T)
  const anchor = W(q, CAN[0], CAN[1])
  const conf: Pt = [mx - dx * 0.6, my - dy * 0.6]
  // The lines: the bridle to the Ranger, and the risers to the skirt.
  outline(p, alpha(p, ink, 0.8).toString(), weight * 0.5)
  if (ch.attached) p.line(X(anchor[0]), X(anchor[1]), X(conf[0]), X(conf[1]))
  else {
    // The cut bridle hangs from it.
    const d = T - CUT
    p.noFill()
    p.beginShape()
    p.vertex(X(conf[0]), X(conf[1]))
    p.quadraticVertex(X(conf[0] - dx * 0.4 + 0.1), X(conf[1] - dy * 0.4 + 0.3), X(conf[0] - dx * (0.9 - 0.2 * d) + 0.1 * d), X(conf[1] + 0.9 - 0.1 * d))
    p.endShape()
  }
  if (ch.r < 0.08) {
    // Still a pack, going out on its line.
    solid(p, ink, weight * 0.6, DARK.red)
    p.circle(X(mx), X(my), X(0.14))
    return
  }
  const r = ch.r
  for (const sgn of [-1, 0, 1]) p.line(X(conf[0]), X(conf[1]), X(mx + nx * r * sgn * 0.95), X(my + ny * r * sgn * 0.95))
  // The canopy: a dome of gores, red and bone, seen side on.
  const depth = r * 0.85
  const P = (a: number, b: number): Pt => [mx + nx * a + dx * b, my + ny * a + dy * b]
  const n = 6
  for (let i = 0; i < n; i++) {
    const a0 = Math.cos(Math.PI * (i / n))
    const a1 = Math.cos(Math.PI * ((i + 1) / n))
    solid(p, ink, weight * 0.55, i % 2 === 0 ? DARK.red : DARK.hull)
    p.beginShape()
    const steps = 6
    for (let j = 0; j <= steps; j++) {
      const a = a0 + ((a1 - a0) * j) / steps
      const [x, y] = P(a * r, depth * Math.sqrt(Math.max(0, 1 - a * a)) + 0.02)
      p.vertex(X(x), X(y))
    }
    for (let j = steps; j >= 0; j--) {
      const a = a0 + ((a1 - a0) * j) / steps
      const [x, y] = P(a * r * 0.98, 0)
      p.vertex(X(x), X(y))
    }
    p.endShape(p.CLOSE)
  }
  // The skirt's hem.
  outline(p, ink, weight * 0.7)
  const [hx0, hy0] = P(-r, 0)
  const [hx1, hy1] = P(r, 0)
  p.line(X(hx0), X(hy0), X(hx1), X(hy1))
  // The snap of each opening: a flick of air off the hem.
  for (const at of [BLOOM, ...REEFS]) {
    const e = T - at
    if (e < 0 || e > 0.4) continue
    p.stroke(alpha(p, VOID.ink, 0.7 * (1 - e / 0.4)))
    p.strokeWeight(Math.max(1, weight * 0.6))
    for (const sgn of [-1, 1]) {
      const [ax, ay] = P(sgn * (r + 0.06 + e * 0.5), -0.05)
      const [bx, by] = P(sgn * (r + 0.2 + e * 0.7), -0.12)
      p.line(X(ax), X(ay), X(bx), X(by))
    }
  }
}

/* ------------------------------------------------------------------ the ramp */

function rampState(T: number): { len: number; angle: number } {
  // Runs out level from under the nose, then drops to the sand on the beat.
  const out = smooth(T, RAMP - 0.55, RAMP - 0.2)
  const drop = easeInQuad(clamp((T - (RAMP - 0.2)) / 0.2))
  const bounce = T > RAMP ? 0.045 * Math.exp(-(T - RAMP) / 0.2) * Math.sin((T - RAMP) * 14) : 0
  return { len: RAMP_LEN * out, angle: RAMP_A * drop - bounce }
}

function drawRamp(p: p5, c: Ctx, T: number): void {
  if (T < RAMP - 0.56) return
  const { k, ink, weight } = c
  const X = (x: number) => x * k
  const { len, angle } = rampState(T)
  const q = poseAt(T)
  const [hx, hy] = W(q, NOSE_HINGE[0], NOSE_HINGE[1])
  // It runs out from inside the nose: only the part past the hinge shows.
  const ex = hx + Math.cos(angle) * len
  p.push()
  p.translate(X(hx), X(hy))
  p.rotate(angle)
  solid(p, ink, weight * 0.8, DARK.hull)
  p.rect(X(len / 2), X(0.035), X(len), X(0.07))
  outline(p, ink, weight * 0.45)
  for (let i = 1; i < 5; i++) {
    const x = (len * i) / 5
    if (x > 0.02) p.line(X(x), X(0.01), X(x), X(0.06))
  }
  p.pop()
  solid(p, ink, weight * 0.6, DARK.slate)
  p.circle(X(hx), X(hy + 0.035), X(0.07))
  // The foot hits the sand.
  const hit = T - RAMP
  if (hit >= 0 && hit < 1.2) {
    const ctx = p.drawingContext as CanvasRenderingContext2D
    for (const side of [-1, 1]) {
      p.push()
      ctx.globalAlpha = 0.8 * (1 - hit / 1.2)
      puff(p, k, alpha(p, ink, 0.5).toString(), weight * 0.5, DUST, ex + side * (0.12 + 0.35 * Math.sqrt(hit)), G - 0.06 - 0.12 * hit, 0.05 + 0.1 * Math.sqrt(hit))
      p.pop()
    }
  }
  // The ball comes down on it on the and: a knock along it.
  const on = T - ONRAMP
  if (on >= 0 && on < 0.3) {
    const [bx, by] = onRamp(LAND_D)
    p.stroke(alpha(p, VOID.ink, 0.8 * (1 - on / 0.3)))
    p.strokeWeight(Math.max(1, weight * 0.6))
    for (const sgn of [-1, 1]) {
      const a = RAMP_A + Math.PI / 2 + sgn * 0.7
      p.line(X(bx + Math.cos(a) * 0.2), X(by + R + Math.sin(a) * 0.2), X(bx + Math.cos(a) * (0.28 + on * 0.4)), X(by + R + Math.sin(a) * (0.28 + on * 0.4)))
    }
  }
}

/* ------------------------------------------------------------------ dust */

/** How hard the engines' wash is on the ground under it (0..1). */
function washAt(T: number): number {
  if (T < CUT || T > TOUCH + 0.2) return 0
  const alt = G - poseAt(T).y
  return (1 - smooth(alt, 0.9, 2.8)) * (1 - smooth(T, TOUCH, TOUCH + 0.2))
}

const LOBES: [number, number, number][] = [
  [0, 0, 1],
  [0.7, 0.25, 0.7],
  [-0.65, 0.28, 0.66],
  [0.15, -0.45, 0.62],
]
/** A cloud of dust: flat lobes, no line, the sun catching its top. */
function cloud(p: p5, k: number, x: number, y: number, r: number, a: number): void {
  if (a <= 0.01) return
  const X = (v: number) => v * k
  p.noStroke()
  p.fill(alpha(p, DUST, a))
  for (const [dx, dy, f] of LOBES) p.circle(X(x + dx * r), X(y + dy * r), X(2 * r * f))
  p.fill(alpha(p, DARK.gold, a * 0.35))
  p.circle(X(x + 0.3 * r), X(y - 0.35 * r), X(r * 0.9))
}

function drawDust(p: p5, c: Ctx, T: number, layer: number): void {
  if (T < CUT) return
  const { k } = c
  // Wash: blown out both ways from under the engines while they are near the ground.
  for (let i = 0; i < 40; i++) {
    if (i % 2 !== layer) continue
    const born = FLARE - 1.1 + i * 0.055
    const age = T - born
    if (age < 0 || age > 2.4) continue
    const w = washAt(born)
    if (w < 0.05) continue
    const side = hash(i, 5) > 0.5 ? 1 : -1
    const speed = (1.4 + 1.8 * hash(i, 6)) * w
    const dist = speed * 0.7 * (1 - Math.exp(-age / 0.7))
    const x = poseAt(born).x + side * (0.35 + dist)
    const y = G - 0.1 - 0.22 * age * hash(i, 7)
    const r = (0.07 + 0.17 * Math.sqrt(age)) * (0.6 + 0.6 * w)
    cloud(p, k, x, y, r, 0.42 * (1 - age / 2.4) * w)
  }
  // Touchdown: a skirt of it thrown out low along the ground, and hanging a while.
  const td = T - TOUCH
  if (td >= 0 && td < 4) {
    for (let i = 0; i < 16; i++) {
      if (i % 2 !== layer) continue
      const side = i % 4 < 2 ? -1 : 1
      const sp = 1.3 + 2.2 * hash(i, 31)
      const dist = sp * 0.5 * (1 - Math.exp(-td / 0.45))
      const x = LX + side * (0.55 + dist)
      const y = G - 0.08 - (0.06 + 0.22 * hash(i, 32)) * Math.sqrt(td)
      const r = (0.08 + 0.14 * hash(i, 33)) * (0.8 + 0.9 * Math.sqrt(Math.min(td, 2)))
      cloud(p, k, x, y, r, 0.5 * Math.pow(1 - td / 4, 1.6))
    }
  }
}

/* ------------------------------------------------------------------ the camp */

function drawCamp(p: p5, c: Ctx, v: View, T: number): void {
  const { k, ink, weight } = c
  const { f } = v
  const X = (x: number) => x * k
  // Nothing of it is in the frame until we are down near it.
  if (G < f.y0 - 0.5 || f.x1 < LX + 1 || f.x0 > CAIRN_X + 1) return
  const lampOn = T >= LAMP ? 1 : 0
  const warm = lampOn * (0.85 + 0.15 * knock(T - LAMP, 0.3))
  // Long dawn shadows, thrown back toward the Ranger.
  p.noStroke()
  p.fill(alpha(p, VOID.bg, 0.32))
  for (const [x, w, len] of [[DOME_X - DOME_R * 0.5, DOME_R * 1.6, 3.2], [FLAG_X, 0.05, 2.4], [CAIRN_X, 0.35, 1.3], [HELMET_X, 0.4, 0.8], [MAST_X, 0.06, 2.6]] as [number, number, number][]) {
    p.beginShape()
    p.vertex(X(x + w / 2), X(G - 0.005))
    p.vertex(X(x - len), X(G + 0.018))
    p.vertex(X(x - len), X(G + 0.045))
    p.vertex(X(x - w / 2), X(G + 0.05))
    p.endShape(p.CLOSE)
  }

  // The cairn for Edmunds: flat stones laid up, a marker on the top.
  const stones: [number, number, number, number][] = [
    [-0.24, 0, 0.3, 0.13],
    [0.06, 0, 0.3, 0.14],
    [0.3, 0, 0.2, 0.1],
    [-0.12, -0.13, 0.3, 0.12],
    [0.15, -0.14, 0.24, 0.12],
    [0.02, -0.26, 0.26, 0.11],
    [0.0, -0.37, 0.18, 0.09],
  ]
  stones.forEach(([dx, dy, w, h], i) => {
    solid(p, ink, weight * 0.6, mixHex(ROCK, LAND, 0.25 + 0.2 * hash(i, 17)))
    const x = CAIRN_X + dx
    const y = G + dy - h / 2
    const lean = (hash(i, 18) - 0.5) * 0.04
    p.beginShape()
    p.vertex(X(x - w / 2), X(y + h / 2))
    p.quadraticVertex(X(x - w / 2 - 0.02), X(y - h * 0.1), X(x - w * 0.3), X(y - h / 2 + lean))
    p.quadraticVertex(X(x), X(y - h / 2 - 0.02), X(x + w * 0.32), X(y - h / 2 - lean))
    p.quadraticVertex(X(x + w / 2 + 0.02), X(y), X(x + w / 2), X(y + h / 2))
    p.endShape(p.CLOSE)
  })
  solid(p, ink, weight * 0.6, mixHex(ROCK, DARK.hull, 0.25))
  p.rect(X(CAIRN_X), X(G - 0.5), X(0.07), X(0.13), X(0.015))
  p.noFill()
  p.stroke(alpha(p, DARK.gold, 0.6))
  p.strokeWeight(Math.max(1, weight * 0.6))
  for (const [dx, dy, w, h] of stones) p.line(X(CAIRN_X + dx + w / 2 - 0.02), X(G + dy - h + 0.02), X(CAIRN_X + dx + w / 2 - 0.02), X(G + dy - 0.02))

  // The flag: the dawn wind, and the Ranger's wash across it as it lands.
  drawFlag(p, c, T)

  // The dome: a low habitat on a ring, an airlock tunnel to the lamp side, a porthole, an aerial.
  const dx0 = DOME_X
  solid(p, ink, weight, DARK.hull)
  p.rect(X(dx0 - DOME_R - 0.3), X(G - 0.26), X(0.62), X(0.52), X(0.08), X(0.08), 0, 0)
  solid(p, ink, weight * 0.8, DARK.slate)
  p.ellipse(X(dx0 - DOME_R - 0.55), X(G - 0.26), X(0.12), X(0.42))
  solid(p, ink, weight, DARK.hull)
  p.arc(X(dx0), X(G - 0.08), X(2 * DOME_R), X(2 * DOME_R * 0.92), Math.PI, TAU, p.CHORD)
  solid(p, ink, weight * 0.8, DARK.slate)
  p.rect(X(dx0), X(G - 0.04), X(2 * DOME_R + 0.08), X(0.09), X(0.02))
  outline(p, ink, weight * 0.5)
  for (const f0 of [0.42, 0.75]) p.arc(X(dx0), X(G - 0.08), X(2 * DOME_R * f0), X(2 * DOME_R * 0.92), Math.PI, TAU)
  p.arc(X(dx0), X(G - 0.08), X(2 * DOME_R), X(2 * DOME_R * 0.92 * 0.45), Math.PI, TAU)
  // The lit side of it, toward the dawn.
  p.stroke(alpha(p, DARK.gold, 0.75))
  p.strokeWeight(Math.max(1, weight * 0.9))
  p.arc(X(dx0), X(G - 0.08), X(2 * DOME_R - 0.04), X(2 * DOME_R * 0.92 - 0.04), -Math.PI * 0.42, -0.04)
  // The lamp on its near side.
  if (warm > 0) {
    p.stroke(alpha(p, DARK.amber, 0.55 * warm))
    p.arc(X(dx0), X(G - 0.08), X(2 * DOME_R - 0.04), X(2 * DOME_R * 0.92 - 0.04), Math.PI * 1.05, Math.PI * 1.35)
  }
  // A window in its side, a light left on inside: hers.
  const home = 0.7 + 0.3 * smooth(T, CAMP_MEET, CAMP_MEET + 2)
  const ph: Pt = [dx0 - 0.36, G - 0.5]
  if (home > 0) glow(p, X(ph[0]), X(ph[1]), X(0.6), DARK.amber, 0.4 * home)
  p.push()
  p.translate(X(ph[0]), X(ph[1]))
  p.rotate(-0.42)
  solid(p, ink, weight * 0.7, DARK.slate)
  p.rect(0, 0, X(0.34), X(0.17), X(0.06))
  p.noStroke()
  p.fill(mixHex(VOID.bg, mixHex(DARK.gold, VOID.ink, 0.35), home))
  p.rect(0, 0, X(0.25), X(0.09), X(0.035))
  p.pop()
  // Its aerial.
  outline(p, ink, weight * 0.6)
  p.line(X(dx0 + 0.25), X(G - 0.08 - DOME_R * 0.92), X(dx0 + 0.32), X(G - 0.08 - DOME_R * 0.92 - 0.32))
  solid(p, ink, weight * 0.5, DARK.hull)
  p.arc(X(dx0 + 0.34), X(G - 0.08 - DOME_R * 0.92 - 0.3), X(0.16), X(0.16), -Math.PI * 0.2, Math.PI * 0.8, p.CHORD)

  // Her helmet, set down on a flat rock, its visor toward the Ranger: it takes the lamp's light.
  const hx = HELMET_X
  solid(p, ink, weight * 0.8, mixHex(ROCK, LAND, 0.35))
  p.beginShape()
  p.vertex(X(hx - 0.34), X(G))
  p.vertex(X(hx - 0.3), X(G - 0.13))
  p.vertex(X(hx - 0.12), X(G - 0.18))
  p.vertex(X(hx + 0.2), X(G - 0.17))
  p.vertex(X(hx + 0.32), X(G - 0.09))
  p.vertex(X(hx + 0.36), X(G))
  p.endShape(p.CLOSE)
  p.noFill()
  p.stroke(alpha(p, DARK.gold, 0.55))
  p.strokeWeight(Math.max(1, weight * 0.6))
  p.line(X(hx + 0.2), X(G - 0.17), X(hx + 0.32), X(G - 0.09))
  const hy = G - 0.18
  const hr = 0.2
  // The neck ring it sits on, the shell, the visor.
  solid(p, ink, weight * 0.7, DARK.slate)
  p.rect(X(hx + 0.01), X(hy - 0.035), X(0.3), X(0.07), X(0.02))
  solid(p, ink, weight * 0.85, DARK.hull)
  p.arc(X(hx), X(hy - 0.07), X(2 * hr), X(2 * hr * 1.05), Math.PI * 0.9, Math.PI * 2.1, p.CHORD)
  const visor = mixHex(mixHex(DARK.gold, DARK.slate, 0.35), mixHex(DARK.gold, VOID.ink, 0.35), warm)
  solid(p, ink, weight * 0.7, visor)
  p.beginShape()
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI * 0.72 + (Math.PI * 0.7 * i) / 10
    p.vertex(X(hx + 0.03 + Math.cos(a) * hr * 0.86), X(hy - 0.1 + Math.sin(a) * hr * 0.78))
  }
  p.vertex(X(hx + 0.02), X(hy - 0.05))
  p.endShape(p.CLOSE)
  p.noFill()
  p.stroke(alpha(p, VOID.ink, 0.55 + 0.35 * warm))
  p.strokeWeight(Math.max(1, weight * 0.55))
  p.arc(X(hx + 0.03), X(hy - 0.1), X(hr * 1.2), X(hr * 1.05), Math.PI * 1.1, Math.PI * 1.32)

  // The lamp: a mast on a tripod, a plate at its foot for the ball, a rod up to the switch, the lamp at the top.
  const lever = T >= LAMP ? 1 : 0
  outline(p, ink, weight * 0.8)
  p.line(X(MAST_X - 0.28), X(G), X(MAST_X), X(G - 0.42))
  p.line(X(MAST_X + 0.3), X(G), X(MAST_X), X(G - 0.42))
  solid(p, ink, weight * 0.8, DARK.slate)
  p.rect(X(MAST_X), X((G + LAMP_Y) / 2), X(0.07), X(G - LAMP_Y))
  // The rod, and the switch arm at its top: down when lit.
  outline(p, ink, weight * 0.5)
  const rodTop = LAMP_Y + 0.22 + 0.03 * lever
  p.line(X(MAST_X - 0.08), X(G - 0.06), X(MAST_X - 0.08), X(rodTop))
  outline(p, ink, weight * 0.8)
  const sw = lever ? 0.5 : -0.3
  p.line(X(MAST_X - 0.08), X(rodTop), X(MAST_X - 0.08 - 0.14 * Math.cos(sw)), X(rodTop - 0.14 * Math.sin(-sw)))
  // The lamp head: a hooded lantern, its lens toward the Ranger.
  solid(p, ink, weight * 0.8, DARK.hull)
  p.rect(X(MAST_X - 0.02), X(LAMP_Y + 0.02), X(0.26), X(0.2), X(0.03))
  solid(p, ink, weight * 0.8, DARK.slate)
  p.rect(X(MAST_X - 0.02), X(LAMP_Y - 0.1), X(0.34), X(0.06), X(0.02))
  solid(p, ink, weight * 0.7, lampOn ? mixHex(DARK.gold, VOID.ink, 0.55) : mixHex(DARK.slate, VOID.bg, 0.4))
  p.circle(X(MAST_X - 0.13), X(LAMP_Y + 0.02), X(0.14))

  // The plate at the mast's foot, and the stop the ball comes up against (it drops into the plate once the lamp is lit).
  const sink = T >= LAMP ? 0.02 * (1 - Math.exp(-(T - LAMP) / 0.05)) : 0
  solid(p, ink, weight * 0.7, DARK.slate)
  p.rect(X(PLATE_X), X(G - PLATE_H / 2 + sink), X(PLATE_W), X(PLATE_H), X(0.01))
  drawStop(p, c, T)
}

/** The stop at the plate's end: up until the lamp is lit, then down into the plate to let him by. */
function drawStop(p: p5, c: Ctx, T: number): void {
  const h = 0.2 * (1 - smooth(T, STOP_DOWN[0], STOP_DOWN[1]))
  if (h <= 0.004) return
  solid(p, c.ink, c.weight * 0.7, DARK.hull)
  p.rect(c.k * (STOP_X + 0.02), c.k * (G - h / 2), c.k * 0.04, c.k * h, c.k * 0.01)
}

function drawFlag(p: p5, c: Ctx, T: number): void {
  const { k, ink, weight } = c
  const X = (x: number) => x * k
  const top = G - 1.55
  outline(p, ink, weight * 0.9)
  p.line(X(FLAG_X), X(G), X(FLAG_X), X(top - 0.05))
  solid(p, ink, weight * 0.5, DARK.hull)
  p.circle(X(FLAG_X), X(top - 0.06), X(0.06))
  // Wind: a breeze, and the landing's wash across the camp.
  const wash = smooth(T, FLARE - 0.4, TOUCH) * (1 - smooth(T, TOUCH + 0.3, TOUCH + 2.6))
  const wind = 0.3 + 0.7 * wash
  const L = 0.62
  const H = 0.36
  const n = 12
  const edge = (row: number): Pt[] => {
    const pts: Pt[] = []
    for (let i = 0; i <= n; i++) {
      const u = i / n
      const droop = (1 - wind) * 0.35 * u * u
      const wave = (0.03 + 0.05 * wind) * u * Math.sin(u * 7 - T * (3 + 6 * wind) + row * 0.4)
      const x = FLAG_X + L * u * (0.72 + 0.28 * wind) - droop * 0.4
      const y = top + row * H + droop + wave
      pts.push([x, y])
    }
    return pts
  }
  const upper = edge(0)
  const lower = edge(1)
  const band = (a: number, b: number, fill: string) => {
    solid(p, ink, weight * 0.6, fill)
    p.beginShape()
    for (let i = 0; i <= n; i++) {
      const [x0, y0] = upper[i]
      const [x1, y1] = lower[i]
      p.vertex(X(lerp(x0, x1, a)), X(lerp(y0, y1, a)))
    }
    for (let i = n; i >= 0; i--) {
      const [x0, y0] = upper[i]
      const [x1, y1] = lower[i]
      p.vertex(X(lerp(x0, x1, b)), X(lerp(y0, y1, b)))
    }
    p.endShape(p.CLOSE)
  }
  band(0, 1, DARK.hull)
  band(0.7, 1, DARK.red)
}

function drawPlateLip(p: p5, c: Ctx, T: number): void {
  if (T < ONRAMP) return
  const { k, weight } = c
  const X = (x: number) => x * k
  // The stop, in front of the ball, and its tap.
  drawStop(p, c, T)
  const hit = T - LAMP
  if (hit >= 0 && hit < 0.35) {
    p.stroke(alpha(p, VOID.ink, 0.8 * (1 - hit / 0.35)))
    p.strokeWeight(Math.max(1, weight * 0.6))
    for (const a of [-0.9, -0.3, 0.3]) p.line(X(STOP_X + 0.1 + Math.cos(a) * 0.05), X(G - 0.14 + Math.sin(a) * 0.05), X(STOP_X + 0.1 + Math.cos(a) * (0.12 + hit * 0.5)), X(G - 0.14 + Math.sin(a) * (0.12 + hit * 0.5)))
  }
}

function drawLampLight(p: p5, c: Ctx, v: View, T: number): void {
  if (T < LAMP) return
  const { k } = c
  const X = (x: number) => x * k
  const d = T - LAMP
  // It catches with a flicker, blooms, and settles to a steady light; it swells a little again as the two of them meet under it.
  const flick = d < 0.2 ? (Math.sin(d * 95) > -0.3 ? 1 : 0.4) : 1
  const on = smooth(d, 0, 0.04) * flick
  const bloom = Math.max(knock(d, 0.4), 0.45 * pulse(T - CAMP_MEET, 0.25, 1.1))
  const lx = MAST_X - 0.13
  const ly = LAMP_Y + 0.02
  glow(p, X(lx), X(ly), X(2.8 + 2.2 * bloom), DARK.gold, (0.3 + 0.3 * bloom) * on)
  glow(p, X(lx), X(ly), X(0.55 + 0.3 * bloom), VOID.ink, 0.85 * on)
  // Its pool on the ground, flattened by how low we look, spreading out as it blooms.
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const flat = Math.max(0.07, Math.min(0.3, v.A * 0.22))
  const reach = 1.4 + 1.4 * smooth(d, 0, 0.5)
  ctx.save()
  ctx.translate(X(lx - 0.1), X(G))
  ctx.scale(1, flat)
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, X(reach))
  g.addColorStop(0, rgba(DARK.gold, (0.42 + 0.2 * bloom) * on))
  g.addColorStop(0.55, rgba(DARK.amber, 0.14 * on))
  g.addColorStop(1, rgba(DARK.amber, 0))
  ctx.fillStyle = g
  ctx.fillRect(X(-reach), X(-reach), X(2 * reach), X(2 * reach))
  ctx.restore()
}

/** A dark spot under each ball on the ground: they sit on the sand, not over it. */
function drawBallShadow(p: p5, s: EdmundsState, c: Ctx, T: number): void {
  const { k } = c
  const X = (x: number) => x * k
  const her = brandAt(T)
  p.noStroke()
  p.fill(alpha(p, VOID.bg, 0.5))
  p.ellipse(X(her.x - 0.04), X(G - 0.005), X(0.3), X(0.05))
  if (T < ONRAMP) return
  const b = laneAt(s.lane, c.t)
  const h = G - (b.y + R)
  if (b.x < FOOT[0] - 0.2) return
  const a = 1 - smooth(h, 0, 0.35)
  p.noStroke()
  p.fill(alpha(p, VOID.bg, 0.5 * a))
  p.ellipse(X(b.x - 0.04), X(G - 0.005), X(0.3), X(0.05))
}
