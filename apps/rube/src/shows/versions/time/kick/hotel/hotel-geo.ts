import { R, type Pt } from '../../../../../parts'
import { bar, beat, half, SEAM } from '../music'
import { clock, corridorAngle, DOWN, HOTEL_GEO, OFF, ROLL, SPLASH, UP } from '../stack'

/**
 * The hotel's fixed geometry and its clock (the HOTEL builder's): the building in section, the drum, the lift, and
 * where Cobb, Ariadne and Fischer are at every moment of both parts, in the dream world's own cells (the set draws
 * there; the parts move it into their frames). Nothing here draws.
 */

export const clamp01 = (u: number): number => Math.max(0, Math.min(1, u))
export const ss = (u: number): number => {
  const v = clamp01(u)
  return v * v * (3 - 2 * v)
}
export const lerp = (a: number, b: number, u: number): number => a + (b - a) * u
export const rot = (a: number, [x, y]: Pt): Pt => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)]
export const add = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]]

/* ------------------------------------------------------------------ the building */

/**
 * The building, in section (the facade cut away). The top floor is the corridor (x left..suite) and the corner suite
 * (suite..right), under the roof; a deep slab under it; the middle floor's rooms; the lobby; the footings.
 */
export const B = {
  band: 17,
  roof: 17.8,
  ceil: 18.6,
  top: HOTEL_GEO.top,
  slab: 22.2,
  mid: HOTEL_GEO.middle,
  slab2: 29.3,
  lobby: HOTEL_GEO.lobby,
  foot: 37,
  left: -18.5,
  right: 18.5,
  wall: 0.28,
  /** The suite's wall, across the corridor's end, and its doorway. */
  suite: 6.1,
  door: 1.85,
  /** The drum's doorways are taller than the rooms' doors: they float out of it as it tips. */
  drumDoor: 2.1,
}
/** Where a ball rests on the top floor's carpet. */
export const FY = B.top - R

/* ------------------------------------------------------------------ the clock */

/** Every moment of both parts, show seconds, each on the recording. */
export const T = {
  in: SEAM.hotel,
  roof: half(96),
  land: beat(97),
  go: beat(97) + 0.11,
  stop: half(99),
  turn: ROLL.from,
  fr: half(101),
  run2: beat(103),
  rc: bar(26),
  run3: beat(105),
  cl: beat(106),
  run4: beat(107),
  lf: bar(27),
  away: bar(27),
  level: ROLL.to,
  off: OFF,
  push: half(112),
  knock: bar(29),
  catch: bar(30),
  emerge: bar(31),
  out: SEAM.snow,
  lift: SEAM.lift,
  pit: beat(201),
  burst: SEAM.lift + (UP.hotel.at[1] - HOTEL_GEO.top) / -UP.hotel.v[1],
  arm: 193.754,
  blast: bar(51),
  pass: half(206),
  slam: bar(52),
  roofUp: beat(209),
  up: SEAM.river,
}

/** The hotel's own clock, and hotel seconds since it went weightless. */
export const ch = (t: number): number => clock('hotel', t)
export const CH = {
  off: ch(OFF),
  splash: ch(SPLASH),
  out: ch(SEAM.snow),
  lift: ch(SEAM.lift),
}

/**
 * How afloat the hotel's loose things are: `tau`, hotel seconds they have been floating (0 before `OFF`), and `back`,
 * how far they have fallen back since gravity came back with the river (0..1, gathering speed).
 */
export function afloat(t: number): { tau: number; back: number } {
  if (t < OFF) return { tau: 0, back: 0 }
  const c = ch(t)
  const tau = Math.min(c, CH.splash) - CH.off
  const back = t < SPLASH ? 0 : clamp01((c - CH.splash) / 0.45) ** 2
  return { tau, back }
}

/** Lamp brightness: dim until the dreamers arrive, up on the brass, breathing a little with the orchestra. */
export function lampGain(t: number): number {
  const u = t - T.in
  const up = u < 0 ? 0.62 : 1 + 0.35 * Math.exp(-u / 0.45) * (1 - Math.exp(-u / 0.03))
  return up
}

/* ------------------------------------------------------------------ the drum */

/** The drum: the corridor's turning section, seen end-on, round its middle on the top floor. */
export const DRUM: Pt = [-4.5, 19.8]
/** The room's half-size inside (a square 2.4 by 2.4: the corridor's height), and its doorways' top (drum frame). */
export const HIN = 1.2
export const DOOR_TOP = HIN - B.drumDoor
/** The disk the room is cut in, its steel tyre, the hole in the building it turns in, and its rollers. */
export const DISK = 2.0
export const TYRE = 2.18
export const HOLE = 2.45
export const ROLLER_R = 0.2
export const ROLLERS = [52, 128, -90].map((d) => (d * Math.PI) / 180)
/** How far the drum has turned (radians, clockwise): with the van. */
export const drumAngle = (t: number): number => corridorAngle(t)
/** The brake on the tyre: 1 on, 0 off. Off on the brass as it turns; on again as it comes level. */
export function brake(t: number): number {
  if (t < T.turn) return 1
  if (t < T.level) return 1 - ss((t - T.turn) / 0.22)
  return ss((t - T.level) / 0.3)
}

/**
 * The path a ball's centre takes round the inside of the room (drum frame): a square inset by the ball's radius with
 * its corners rounded, measured from the floor-right corner (s = 0) counterclockwise on the screen, up the right wall.
 */
const Q = HIN - R
const F = 0.15
const QF = Q - F
const ARC = (F * Math.PI) / 2
const STR = 2 * QF
export const PERIM = 4 * (STR + ARC)
const QUARTER = PERIM / 4
type Piece = { len: number; at: (u: number) => Pt }
const arc = (cx: number, cy: number, a0: number, a1: number): Piece => ({
  len: F * Math.abs(a1 - a0),
  at: (u) => [cx + F * Math.cos(a0 + (a1 - a0) * u), cy + F * Math.sin(a0 + (a1 - a0) * u)],
})
const str = (a: Pt, b: Pt): Piece => ({ len: Math.hypot(b[0] - a[0], b[1] - a[1]), at: (u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u] })
const D = Math.PI / 180
const PATH: Piece[] = [
  arc(QF, QF, 45 * D, 0),
  str([Q, QF], [Q, -QF]),
  arc(QF, -QF, 0, -90 * D),
  str([QF, -Q], [-QF, -Q]),
  arc(-QF, -QF, -90 * D, -180 * D),
  str([-Q, -QF], [-Q, QF]),
  arc(-QF, QF, 180 * D, 90 * D),
  str([-QF, Q], [QF, Q]),
  arc(QF, QF, 90 * D, 45 * D),
]
export function around(s: number): Pt {
  let u = ((s % PERIM) + PERIM) % PERIM
  for (const piece of PATH) {
    if (u <= piece.len) return piece.at(piece.len > 0 ? u / piece.len : 0)
    u -= piece.len
  }
  return PATH[PATH.length - 1].at(1)
}
/** A point on the floor at drum-frame x, as a distance round the path (negative: before the floor-right corner). */
const onFloor = (x: number): number => -(ARC / 2 + (QF - x))

/* ------------------------------------------------------------------ the three of them */

export type Who = 'cobb' | 'fischer' | 'ariadne'
export const WHO: Who[] = ['cobb', 'fischer', 'ariadne']

/** Into the hotel: where each comes out of the dark (DOWN.hotel), and falls softly through the roof onto the carpet. */
const ENTRY: Record<Who, Pt> = {
  cobb: DOWN.hotel.at,
  ariadne: add(DOWN.hotel.at, DOWN.hotel.ariadne!),
  fischer: add(DOWN.hotel.at, DOWN.hotel.fischer!),
}
const V_IN = DOWN.hotel.v[1]
const TL = T.land - T.in
/** The dream's soft fall: chosen so Cobb lands on beat 97. */
export const G_FALL = (2 * (FY - ENTRY.cobb[1] - V_IN * TL)) / (TL * TL)
const fallY = (y0: number, tau: number): number => y0 + V_IN * tau + 0.5 * G_FALL * tau * tau
const landTau = (y0: number): number => (-V_IN + Math.sqrt(V_IN * V_IN + 2 * G_FALL * (FY - y0))) / G_FALL
/** Where each lands (Fischer goes over Cobb as they come down, so that Cobb leads him: Mr. Charles). */
const LAND_X: Record<Who, number> = { cobb: -9.75, fischer: -10.15, ariadne: ENTRY.ariadne[0] }
/** Their places in the drum when they stop in it, one behind the other along the floor. */
const GAP = 0.4
const SPOT: Record<Who, number> = { cobb: 0.55, fischer: 0.55 - GAP, ariadne: 0.55 - 2 * GAP }
const BACK: Record<Who, number> = { cobb: 0, fischer: GAP, ariadne: 2 * GAP }

/** When the ball roof-touches (its centre at the roof's top), for the sink on it. */
const rootTau = (y0: number, y: number): number => (-V_IN + Math.sqrt(V_IN * V_IN + 2 * G_FALL * (y - y0))) / G_FALL
/** When each one's centre reaches a height on the way in (the roof's top, its underside), for the sink there. */
export const fallAt = (who: Who, y: number): number => T.in + rootTau(ENTRY[who][1], y)

/**
 * A distance covered in `T` seconds from rest to rest: the speed rises to its cruise over `ta` (as a half cosine),
 * holds, and falls to nothing over `td`.
 */
export function glide(tau: number, Tt: number, dist: number, ta: number, td: number): number {
  const vc = dist / (Tt - ta / 2 - td / 2)
  if (tau <= 0) return 0
  if (tau >= Tt) return dist
  if (tau < ta) return (vc / 2) * (tau - (ta / Math.PI) * Math.sin((Math.PI * tau) / ta))
  if (tau < Tt - td) return (vc * ta) / 2 + vc * (tau - ta)
  const r = Tt - tau
  return dist - (vc / 2) * (r - (td / Math.PI) * Math.sin((Math.PI * r) / td))
}

/** Cobb's distance round the drum's path (the others follow him round at GAP and 2 GAP behind). */
export function trainS(t: number): number {
  const s0 = onFloor(SPOT.cobb)
  if (t < T.turn) return s0
  if (t < T.fr) return s0 * (1 - Math.pow((t - T.turn) / (T.fr - T.turn), 3))
  const run = (a: number, b: number, from: number) => from + QUARTER * Math.pow(clamp01((t - a) / (b - a)), 1.7)
  if (t < T.run2) return 0
  if (t < T.rc) return run(T.run2, T.rc, 0)
  if (t < T.run3) return QUARTER
  if (t < T.cl) return run(T.run3, T.cl, QUARTER)
  if (t < T.run4) return 2 * QUARTER
  if (t < T.lf) return run(T.run4, T.lf, 2 * QUARTER)
  return 3 * QUARTER
}
/** A ball in the drum: round its path, turned with it. */
export const inDrum = (who: Who, t: number): Pt => add(DRUM, rot(drumAngle(t), around(trainS(t) - BACK[who])))
/** Where the three are in the drum's own frame (the frame the camera turns with), their middle, smoothed over a second. */
export function drumLean(t: number): Pt {
  let x = 0
  let y = 0
  let w = 0
  for (let j = -6; j <= 6; j++) {
    const q = 1 - Math.abs(j) / 7
    const s = t + j * 0.1
    for (const who of WHO) {
      const p = around(trainS(s) - BACK[who])
      x += p[0] * q
      y += p[1] * q
      w += q
    }
  }
  return [x / w, y / w]
}

/** Weightless: their places against each other as they drift (Ariadne and Fischer above him, as they go under). */
const FORM: Record<Who, Pt> = { cobb: [0, 0], ariadne: DOWN.snow.ariadne!, fischer: DOWN.snow.fischer! }
/** While they drift, a little higher over him than that (clear of what floats in the corridor). */
const FORM_DRIFT: Record<Who, Pt> = { cobb: [0, 0], ariadne: [-0.55, -0.55], fischer: [0.55, -0.45] }
/** Where Cobb comes to rest against the sleepers' line, and his drift there. */
export const CATCH: Pt = [DOWN.snow.at[0], 20.3]
const LF: Pt = inDrum('cobb', T.off)
const LF_OFF: Record<Who, Pt> = {
  cobb: [0, 0],
  fischer: [inDrum('fischer', T.off)[0] - LF[0], inDrum('fischer', T.off)[1] - LF[1]],
  ariadne: [inDrum('ariadne', T.off)[0] - LF[0], inDrum('ariadne', T.off)[1] - LF[1]],
}
function cobbDrift(t: number): Pt {
  const [x0, y0] = LF
  const x = x0 + glide(t - T.push, T.catch - T.push, CATCH[0] - x0, 0.75, 1.7)
  // Up off the corner into the middle of the corridor, and a slow bob, settling on the line.
  const keys: [number, number, number][] = [
    [T.off, y0, 0],
    [T.push, y0 - 0.03, -0.1],
    [108.4, 20.62, -0.1],
    [109.4, 20.5, -0.22],
    [110.4, 20.13, -0.12],
    [T.knock, 20.08, 0.02],
    [112.6, 20.22, 0.05],
    [T.catch, CATCH[1], 0],
  ]
  return [x, hermite1(keys, t)]
}
function hermite1(keys: [number, number, number][], t: number): number {
  if (t <= keys[0][0]) return keys[0][1]
  const n = keys.length
  if (t >= keys[n - 1][0]) return keys[n - 1][1]
  let i = 0
  while (i < n - 2 && keys[i + 1][0] <= t) i++
  const [ta, pa, va] = keys[i]
  const [tb, pb, vb] = keys[i + 1]
  const h = tb - ta
  const u = (t - ta) / h
  const u2 = u * u
  const u3 = u2 * u
  return (2 * u3 - 3 * u2 + 1) * pa + (u3 - 2 * u2 + u) * h * va + (-2 * u3 + 3 * u2) * pb + (u3 - u2) * h * vb
}
/** Their slow bob against each other while they drift, so the three are never a rigid block. */
const bob = (who: Who, t: number): Pt => {
  if (who === 'cobb') return [0, 0]
  const k = who === 'fischer' ? 1 : 2.3
  const e = ss((t - T.push) / 1.4) * (1 - ss((t - (T.catch - 1.6)) / 1.6))
  return [0.04 * Math.sin(1.3 * t + k) * e, 0.03 * Math.sin(0.9 * t + 2 * k) * e]
}
function drift(who: Who, t: number): Pt {
  const c = cobbDrift(t)
  if (who === 'cobb') return c
  const from = LF_OFF[who]
  const u = ss((t - T.push) / 1.4)
  const v = ss((t - (T.catch - 1.6)) / 1.6)
  const mid: Pt = [lerp(from[0], FORM_DRIFT[who][0], u), lerp(from[1], FORM_DRIFT[who][1], u)]
  const off: Pt = [lerp(mid[0], FORM[who][0], v), lerp(mid[1], FORM[who][1], v)]
  return add(add(c, off), bob(who, t))
}

/**
 * Drawn down through the floors: they lie against the line hardly moving, the carpet goes soft under them and takes
 * them, they come out of the ceiling of the room below on bar 31, and are drawn on down through it, the lobby and the
 * footings into the dark, crossing it at 5 cells a second on the swell. One law for the three (a share of the way at
 * a share of the time), so they keep their places against each other.
 */
const PULL = T.out - T.catch
const PULL_D = DOWN.snow.at[1] - CATCH[1]
const UA = (T.emerge - T.catch) / PULL
const GA = (B.slab + R - CATCH[1]) / PULL_D
const S1 = (DOWN.snow.v[1] * PULL) / PULL_D
const SA = (2 * (1 - GA)) / (1 - UA) - S1
const NA = (SA * UA) / GA
export function pullShare(u: number): number {
  if (u <= 0) return 0
  if (u >= 1) return 1
  if (u < UA) return GA * Math.pow(u / UA, NA)
  const v = u - UA
  return GA + SA * v + (0.5 * (S1 - SA) * v * v) / (1 - UA)
}
/**
 * While they hang against the line: it springs them back off it a little and they come back to it, and the three turn
 * slowly about their middle and back (weightless, nothing holds them square). Nothing at either end, so the catch and
 * the pull are untouched.
 */
export const HANG = { from: 0, to: 2.75 }
function hang(who: Who, t: number): Pt {
  const u = (t - T.catch - HANG.from) / (HANG.to - HANG.from)
  if (u <= 0 || u >= 1) return [0, 0]
  const e = (1 - Math.cos(2 * Math.PI * u)) / 2
  const turn = 0.42 * Math.sin(Math.PI * u) * Math.sin(Math.PI * u)
  const recoil = -0.2 * e
  const c = WHO.reduce<Pt>((m, w) => [m[0] + FORM[w][0] / 3, m[1] + FORM[w][1] / 3], [0, 0])
  const rel: Pt = [FORM[who][0] - c[0], FORM[who][1] - c[1]]
  const r = rot(-turn, rel)
  return [r[0] - rel[0] + recoil, r[1] - rel[1] - 0.06 * e]
}
function pull(who: Who, t: number): Pt {
  const start = drift(who, T.catch)
  const end = add(DOWN.snow.at, FORM[who])
  const u = clamp01((t - T.catch) / PULL)
  return add([lerp(start[0], end[0], ss(u)), start[1] + (end[1] - start[1]) * pullShare(u)], hang(who, t))
}

/** Where each of them is at `t` in the hotel part (91.824 → 122.294), world cells. */
export function hotelAt(who: Who, t: number): Pt {
  const e = ENTRY[who]
  if (t < T.go) {
    const tau = Math.max(0, t - T.in)
    const tl = landTau(e[1])
    const y = Math.min(FY, fallY(e[1], tau))
    const x = e[0] + (LAND_X[who] - e[0]) * ss(tau / tl)
    return [x, y]
  }
  if (t < T.stop) {
    const x1 = DRUM[0] + SPOT[who]
    return [LAND_X[who] + glide(t - T.go, T.stop - T.go, x1 - LAND_X[who], 0.45, 0.7), FY]
  }
  if (t < T.off) return inDrum(who, t)
  if (t < T.catch) return drift(who, t)
  return pull(who, t)
}

/* ------------------------------------------------------------------ the lift */

export const SHAFT = HOTEL_GEO.shaftX
export const CAB: Pt = HOTEL_GEO.cabin
/** The cabin's floor at `t`: at the top floor, driven down the shaft by the blast, slammed into the pit. */
const DROP = T.slam - T.blast
const MIDWAY = T.pass - T.blast
// Its speed off the blast and its gathering: it passes the middle floor's landing on the half-beat and hits the pit on bar 52.
const A_DROP = (() => {
  const d1 = HOTEL_GEO.middle - HOTEL_GEO.top
  const d2 = HOTEL_GEO.pit - HOTEL_GEO.top
  // d1 = v0 m + a m²/2, d2 = v0 D + a D²/2
  return (2 * (d2 * MIDWAY - d1 * DROP)) / (DROP * DROP * MIDWAY - MIDWAY * MIDWAY * DROP)
})()
const V_DROP = (HOTEL_GEO.pit - HOTEL_GEO.top - 0.5 * A_DROP * DROP * DROP) / DROP
export const DROP_SPEED = { v0: V_DROP, a: A_DROP, end: V_DROP + A_DROP * DROP }
export function cabinY(t: number): number {
  if (t < T.blast) return HOTEL_GEO.top
  if (t < T.slam) {
    const u = t - T.blast
    return HOTEL_GEO.top + V_DROP * u + 0.5 * A_DROP * u * u
  }
  // The slam: a little rebound off the buffers, dying.
  const u = t - T.slam
  return HOTEL_GEO.pit - 0.12 * Math.exp(-u / 0.16) * Math.sin(Math.min(Math.PI, u / 0.09) )
}

const LIFT_X: Record<Who, number> = { cobb: 0, ariadne: UP.hotel.ariadne![0], fischer: UP.hotel.fischer![0] }
const LIFT_DY: Record<Who, number> = { cobb: 0, ariadne: UP.hotel.ariadne![1], fischer: UP.hotel.fischer![1] }
/** When each comes up through the cabin's floor. */
export const BURST: Record<Who, number> = {
  cobb: T.lift + (UP.hotel.at[1] - HOTEL_GEO.top) / -UP.hotel.v[1],
  ariadne: T.lift + (UP.hotel.at[1] + LIFT_DY.ariadne - HOTEL_GEO.top) / -UP.hotel.v[1],
  fischer: T.lift + (UP.hotel.at[1] + LIFT_DY.fischer - HOTEL_GEO.top) / -UP.hotel.v[1],
}
/** The line across the cabin catches them and draws them down to lie on its floor: height of the centre above it. */
export function caught(tau: number): number {
  if (tau <= 0) return tau * -UP.hotel.v[1]
  const c = -UP.hotel.v[1] - R / 0.05
  return R * (1 - Math.exp(-tau / 0.05)) + c * tau * Math.exp(-tau / 0.1)
}
/** Thrown up by the slam: each at one speed, to cross into the rain where the stack says. */
const KICK_FROM = HOTEL_GEO.pit - R
const KICK_V: Record<Who, number> = {
  cobb: (KICK_FROM - UP.rain.at[1]) / (T.up - T.slam),
  ariadne: (KICK_FROM - UP.rain.at[1] - UP.rain.ariadne![1]) / (T.up - T.slam),
  fischer: (KICK_FROM - UP.rain.at[1] - UP.rain.fischer![1]) / (T.up - T.slam),
}
/** Where each of them is at `t` in the lift part (191.669 → 199.585), world cells. */
export function liftAt(who: Who, t: number): Pt {
  const x = LIFT_X[who]
  if (t < BURST[who]) return [x, UP.hotel.at[1] + LIFT_DY[who] + UP.hotel.v[1] * (t - T.lift)]
  if (t < T.slam) {
    const h = caught(t - BURST[who])
    // Pinned to the floor at the slam (the last of the line's settle is under a thousandth).
    const pin = ss((t - (T.slam - 0.6)) / 0.6)
    return [x, cabinY(t) - lerp(h, R, pin)]
  }
  return [x, KICK_FROM - KICK_V[who] * (t - T.slam)]
}

/** Where the tear is where they go up through a surface: the pit's floor, the cabin's floor, its roof, the hotel's roof. */
export const TEARS = {
  pit: { at: [0, HOTEL_GEO.pit] as Pt, t: T.lift + (UP.hotel.at[1] - HOTEL_GEO.pit) / -UP.hotel.v[1] },
  floor: { at: [0, HOTEL_GEO.top] as Pt, t: BURST.cobb },
  cabinRoof: { at: [0, HOTEL_GEO.pit - CAB[1]] as Pt, t: T.slam + (KICK_FROM - (HOTEL_GEO.pit - CAB[1])) / KICK_V.cobb },
  roof: { at: [0, B.roof] as Pt, t: T.slam + (KICK_FROM - B.roof) / KICK_V.cobb },
}

/* ------------------------------------------------------------------ the sleepers and Arthur */

/**
 * The sleepers (two of the team, silhouettes): asleep on the suite's beds; afloat when the van goes off; tied together
 * by Arthur and tethered to the bed's foot; the three of them come to rest against that line and go under; then
 * (in the hotel's slow time, while they are below) Arthur tows the bundle along the corridor into the lift, sets the
 * charges on its cables and waits at the landing with the plunger.
 */
export const BEDS: [number, number][] = [
  [10.8, 12.6],
  [13.2, 15.0],
]
export const LINE_FOOT: Pt = [10.72, B.top - 0.05]
export const LINE_TOP: Pt = [10.62, 19.6]
/** The tow, the charges and Arthur's post, as shares of the hotel's time between their going under and their return. */
const span = CH.lift - CH.out
export const TOW = { from: CH.out + span * 0.22, to: CH.out + span * 0.58 }
export const CHARGES_AT = CH.out + span * 0.66
export const POST_AT = CH.out + span * 0.8
export const BUNDLE_SUITE: Pt = [11.35, 19.38]
export const BUNDLE_CAB: Pt = [0.05, -1.32]
/** The bundle's centre and turn at `t` (world), and whether it is in the cabin. */
export function bundleAt(t: number): { at: Pt; turn: number; inCab: boolean } {
  const c = ch(t)
  const f = afloat(t)
  if (c >= TOW.to) {
    const cy = cabinY(t)
    const settle = f.back > 0 ? f.back * 0.5 : 0
    return { at: [BUNDLE_CAB[0], cy + BUNDLE_CAB[1] + settle], turn: 0.04 * Math.sin(c * 0.7), inCab: true }
  }
  if (c > TOW.from) {
    // Along the corridor at the corridor's middle height, easing into the cabin.
    const u = ss((c - TOW.from) / (TOW.to - TOW.from))
    const x = lerp(BUNDLE_SUITE[0], BUNDLE_CAB[0], u)
    const y = lerp(BUNDLE_SUITE[1], HOTEL_GEO.top + BUNDLE_CAB[1], u) - 0.25 * Math.sin(Math.PI * u)
    return { at: [x, y], turn: 0.1 * Math.sin(Math.PI * u), inCab: false }
  }
  return { at: BUNDLE_SUITE, turn: 0.05 * Math.sin(c * 0.6), inCab: false }
}

/* ------------------------------------------------------------------ the camera's roll */

/**
 * The camera turns with the drum (radians, clockwise on the screen), so that on the screen the room stands still and
 * gravity swings round it: from the brake coming off on the brass until the cut up to the van. Square everywhere
 * else (the cut is where it goes back to square: the whole turn is done by then but for a fifth).
 */
export const roll = (t: number): number => (t >= T.turn && t < T.away ? -drumAngle(t) : 0)
