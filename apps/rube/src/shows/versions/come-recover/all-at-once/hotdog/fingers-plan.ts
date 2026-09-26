import { R, type Pt } from '../../../../../parts'
import { G } from '../physics'
import { DOJO_PLAN } from '../dojo/dummies'
import { LEG as DUMMY_LEG, legAt as dummyLegAt, seatAt as dummySeatAt, thighOf as dummyThigh } from '../dojo/dummies-plan'

/**
 * Hot dog fingers, worked out: where everything is and how it moves, as functions of show time, so the ball's
 * lane and the drawing read the same things.
 *
 * The part's frame: the ball comes in at (-0.5, 0) on 97.152, leaving the pianist's stockinged shin exactly as it
 * left the wooden man's thigh in the dojo (her knee is where his hip was, her shin winds down as his thigh did, and
 * she is kicked on at the same speed). A grand piano seen from the keyboard; the pianist is above, out of the
 * frame: her legs come down to the bass keys and her arm to the treble end, where her hand lies palm up on the
 * keys, all sausages. A mustard bottle stands on the piano's lid.
 *
 * Angles are screen headings: clockwise from pointing right, y down (a finger pointing left is π; lifting its tip
 * makes the heading larger).
 */

/* ------------------------------------------------------------------ small tools */

const clamp01 = (u: number) => Math.max(0, Math.min(1, u))
export const ease = (u: number): number => {
  const x = clamp01(u)
  return x * x * (3 - 2 * x)
}
const lerp = (a: number, b: number, u: number) => a + (b - a) * u
export const lerpP = (a: Pt, b: Pt, u: number): Pt => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)]
/** A cubic from 0 to `d` over u in [0, 1], leaving at slope `v0` and arriving at slope `v1` (per unit of u). */
const hermite = (u: number, d: number, v0: number, v1: number): number => {
  const s = clamp01(u)
  return (s * s * s - 2 * s * s + s) * v0 + (-2 * s * s * s + 3 * s * s) * d + (s * s * s - s * s) * v1
}
/** A blow's ring: 0 at the blow, a quick peak, decaying. */
export const ring = (u: number, f: number, d: number): number => (u <= 0 ? 0 : Math.exp(-u / d) * Math.sin(2 * Math.PI * f * u))
/** A give under a landing: leaves at slope 1, peaks at `tau`, returns. */
const give = (u: number, tau: number): number => (u <= 0 ? 0 : u * Math.exp(-u / tau))

/* ------------------------------------------------------------------ the seam */

/** The jump in, and the velocity she leaves the foot with (the seam's). */
export const KICK = 97.152
export const V0: Pt = [2.0, -2.2]
/** The jump out, on the index finger's flick, and the velocity it gives her (the next seam's). */
export const FLICK = 106.731
export const V1: Pt = [1.4, -3.0]

/**
 * The kicking leg mirrors the wooden man's: his hip is her knee, his thigh her shin, his seat on the thigh the
 * ball's place on her shin; and before the jump her shin winds down exactly as his thigh does (the flickers show it).
 */
const MAN = DOJO_PLAN.men[2]
const D_BALL = dummySeatAt(MAN, KICK)
const D_HIP = dummyLegAt(MAN, KICK).hip
export const KNEE_K: Pt = [-0.5 + (D_HIP[0] - D_BALL[0]), -(D_HIP[1] - D_BALL[1])]
/** Where along the shin the ball sits and how far off its line; the shin (knee to ankle) and the foot. */
export const SEAT = DUMMY_LEG.seat
export const SEAT_UP = DUMMY_LEG.r + R
export const SHIN = 1.16
export const FOOT = 0.6
/** How far the flexed foot turns up from the shin's line, making the crook she sits in. */
const FLEX = 1.1

/* ------------------------------------------------------------------ the keyboard */

/** The first landing: the seam's flight carried on to 97.71, where it comes down on a key. */
const T_LAND0 = 97.71
const L0: Pt = [-0.5 + V0[0] * (T_LAND0 - KICK), V0[1] * (T_LAND0 - KICK) + 0.5 * G * (T_LAND0 - KICK) ** 2]
/** The white keys: their tops' line, width, count and front face (the first set so a key's middle is under that landing). */
export const KEY = { top: L0[1] + R, w: 0.24, n: 30, face: 0.19 }
export const KX0 = L0[0] - 11.5 * KEY.w
export const KX1 = KX0 + KEY.n * KEY.w
export const keyX = (i: number): number => KX0 + (i + 0.5) * KEY.w
export const keyOf = (x: number): number => Math.floor((x - KX0) / KEY.w)
/** The lid's line (the case's top) and the floor. */
export const LID = 0.12
export const FLOOR_Y = 3.3
/** How long she rides a key down and up. */
const RIDE = 0.12
/** The ball's key landings (show time, key), up the keyboard to her hand. */
const LANDINGS: [number, number][] = [
  [T_LAND0, 11],
  [98.348, 14],
  [98.894, 16],
  [99.219, 17],
  [99.776, 19],
  [100.171, 20],
  [100.635, 22],
  [101.065, 23],
]

/* ------------------------------------------------------------------ the pianist's legs */

export interface LegPose {
  knee: Pt
  /** The shin's heading, knee to ankle. */
  psi: number
  /** The foot's heading, ankle to toe. */
  foot: number
}
export const ankleOf = (l: LegPose): Pt => [l.knee[0] + SHIN * Math.cos(l.psi), l.knee[1] + SHIN * Math.sin(l.psi)]
export const toeOf = (l: LegPose): Pt => {
  const a = ankleOf(l)
  return [a[0] + FOOT * Math.cos(l.foot), a[1] + FOOT * Math.sin(l.foot)]
}
/** A leg standing on the keys with its ankle at `x`: the foot nearly level, sole on the key tops. */
function onKeys(x: number, psi: number, foot = 0.1, lift = 0): LegPose {
  const ankle: Pt = [x, KEY.top - 0.15 - lift]
  return { knee: [ankle[0] - SHIN * Math.cos(psi), ankle[1] - SHIN * Math.sin(psi)], psi, foot }
}
const blendLeg = (a: LegPose, b: LegPose, u: number): LegPose => ({ knee: lerpP(a.knee, b.knee, u), psi: lerp(a.psi, b.psi, u), foot: lerp(a.foot, b.foot, u) })

/** The feet's notes: the left foot stomps a low chord, the kicking foot comes down and plays. */
export const STOMPS = [97.489]
const STOMPER_REST = onKeys(-2.05, 1.33, 0.08)
/**
 * The kicking foot comes down to play, and walks up the keyboard behind her: on each of her strong landings it plays
 * a note of its own a little way back, a duet; after her last key it lifts away, out of the hand's shot.
 */
const WALK: [number, number][] = [
  [97.93, -0.5],
  [98.348, keyX(14) - 1.25],
  [98.894, keyX(16) - 1.25],
  [99.776, keyX(19) - 1.25],
  [100.635, keyX(22) - 1.25],
  [101.065, keyX(23) - 1.25],
]
export const STEPS = WALK.map(([t]) => t)
/** How long each walking note is held down, and how far the key (and the foot on it) goes. */
export const STEP_HOLD = 0.12
const STEP_DEPTH = 0.07
/** A note's press, 0..1: down fast on the note, held, let up. */
export const pressOf = (u: number, hold: number): number => (u < 0 ? 0 : u < 0.035 ? u / 0.035 : u < hold ? 1 : Math.max(0, 1 - (u - hold) / 0.09))

/** The kicking foot on the keys at `t`: planted on a note, lifted and carried to the next, and away at the end. */
function walk(t: number): LegPose {
  let x = WALK[0][1]
  let lift = 0
  for (let i = 0; i + 1 < WALK.length; i++) {
    const [t0, x0] = WALK[i]
    const [t1, x1] = WALK[i + 1]
    if (t < t0) break
    const v = Math.max(0, Math.min(1, (t - t0 - STEP_HOLD - 0.02) / (t1 - t0 - STEP_HOLD - 0.02)))
    x = x0 + (x1 - x0) * ease(v)
    // Up quickly, and down onto the next note a little faster than it rose.
    lift = t < t1 ? 0.3 * Math.sin(Math.PI * Math.pow(v, 0.7)) : 0
  }
  const [tl, xl] = WALK[WALK.length - 1]
  const away = ease((t - tl - 0.22) / 0.8)
  if (away > 0) {
    x = xl - 2.6 * away
    lift = 1.4 * away
  }
  // Down with the key on each note.
  let press = 0
  for (const [n] of WALK) press = Math.max(press, pressOf(t - n, STEP_HOLD))
  const l = lift / 0.3
  return onKeys(x, 1.2 - 0.1 * Math.min(1, l), 0.1 - 0.22 * Math.min(1.5, l), lift - STEP_DEPTH * press)
}

/** A foot's press: lifted before it, driven down onto the keys on the note, and resting after. */
function pressed(rest: LegPose, notes: number[], t: number): LegPose {
  let pose = rest
  for (const n of notes) {
    const u = t - n
    if (u < -0.34 || u > 0.5) continue
    // Up, and a little back, then down hard on the note; a small bounce off the keys after.
    const up = u < -0.08 ? ease((u + 0.34) / 0.2) : u < 0 ? 1 - Math.pow((u + 0.08) / 0.08, 2) : -0.25 * ring(u, 5, 0.1)
    const lifted = onKeys(ankleOf(rest)[0] - 0.05 * up, rest.psi - 0.12 * up, rest.foot - 0.25 * up, 0.24 * up)
    pose = blendLeg(pose, lifted, 1)
  }
  return pose
}

/** The stomping leg, at show time `t`. */
export const stomper = (t: number): LegPose => pressed(STOMPER_REST, STOMPS, t)

/** The kicking leg, at show time `t`: wound with the wooden man before the jump, kicking through, and down to play. */
export function kicker(t: number): LegPose {
  if (t <= KICK) {
    const psi = -dummyThigh(MAN, t)
    return { knee: KNEE_K, psi, foot: psi - FLEX }
  }
  const u = t - KICK
  // The kick checks hard once she is off it (a short rise at her speed, stopped), so she flies clear; the foot
  // flops down and away from her path, and the leg falls back before it comes down to play.
  const psiR = -dummyThigh(MAN, KICK)
  const w = Math.hypot(V0[0], V0[1]) / Math.hypot(SEAT, SEAT_UP)
  const rise = 0.26
  const psi = psiR - rise * (1 - Math.exp(-(u * w) / rise)) + 0.22 * ease((u - 0.1) / 0.3)
  const flop = ease(u / 0.12)
  const through: LegPose = { knee: KNEE_K, psi, foot: psi - FLEX * (1 - flop) + 0.45 * flop + 0.3 * ring(u - 0.08, 2.4, 0.3) }
  const down = ease((t - (KICK + 0.26)) / (STEPS[0] - KICK - 0.26))
  const keys = walk(t)
  return down >= 1 ? keys : blendLeg(through, keys, down)
}

/** The ball on the kicking shin, where she sits before the jump (the wooden man's seat, mirrored). */
export function onShin(l: LegPose): Pt {
  const d: Pt = [Math.cos(l.psi), Math.sin(l.psi)]
  // Up off the shin: its heading turned a quarter anticlockwise on the screen.
  const up: Pt = [d[1], -d[0]]
  return [l.knee[0] + SEAT * d[0] + SEAT_UP * up[0], l.knee[1] + SEAT * d[1] + SEAT_UP * up[1]]
}

/* ------------------------------------------------------------------ the hand and the bottle */

/** The hand lies palm up on the top keys: the palm's foot on the keys, its knuckles, its fingers pointing left. */
export const PALM = { x0: 4.46, x1: 5.04, h: 0.2 }
export const KNUCKLE: Pt = [PALM.x0, KEY.top - 0.085]
/** Four sausages, index first (nearest, lowest), each a little higher behind. */
export const FINGERS = { r: 0.085, len: [0.82, 0.88, 0.84, 0.7], lift: 0.075 }
/** Where she sits on the index finger (along it), and in the palm. */
const ON_FINGER = 0.5
const SEAT_FINGER = FINGERS.r + R
const PALM_REST: Pt = [4.76, KEY.top - PALM.h - R + 0.035]
/** The mustard bottle on the lid, and where she meets its shoulder. */
export const BOTTLE = { x: 3.2, w: 0.34, h: 0.62, nozzle: 0.2 }
const ON_BOTTLE: Pt = [BOTTLE.x + 0.17, LID - BOTTLE.h - R + 0.04]

/** The hand's times: she lands on the fingers, is held, tossed, the fingers slap down, the bottle, back to the palm, tossed to the finger, the heavy landing. */
export const HAND = {
  land: 101.518,
  hold: 102.06,
  toss1: 102.922,
  slap: 103.12,
  squirt: 103.561,
  catch2: 104.432,
  toss2: 105.314,
  land2: 105.848,
  lift: 106.0,
  snap: FLICK - 0.14,
}
/** How long a toss's push lasts before she leaves the hand. */
const PRE = 0.1

/** The ball's place on the index finger pointing at heading `a`, from its knuckle `k`. */
export function seatOnIndex(k: Pt, a: number, s = ON_FINGER): Pt {
  return [k[0] + s * Math.cos(a) - SEAT_FINGER * Math.sin(a), k[1] + s * Math.sin(a) + SEAT_FINGER * Math.cos(a)]
}
/** How that place moves as the finger turns (per radian). */
const seatTurn = (a: number, s = ON_FINGER): Pt => [-s * Math.sin(a) - SEAT_FINGER * Math.cos(a), s * Math.cos(a) - SEAT_FINGER * Math.sin(a)]

/* ------------------------------------------------------------------ the ball's path */

export interface Piece {
  t0: number
  t1: number
  /** A flight under G from `a` to `b`. */
  fly?: { a: Pt; b: Pt }
  /** Carried: where she is, by a function of show time. */
  at?: (t: number) => Pt
}

/** A flight's leaving and arriving velocities, from `a` at `ta` to `b` at `tb`. */
export function flight(a: Pt, ta: number, b: Pt, tb: number): { out: Pt; in: Pt } {
  const T = tb - ta
  const vx = (b[0] - a[0]) / T
  const vy = (b[1] - a[1]) / T - 0.5 * G * T
  return { out: [vx, vy], in: [vx, vy + G * T] }
}

export interface Toss {
  t: number
  v: Pt
  /** Where she rests before the push. */
  from: Pt
}
export interface Ride {
  t: number
  key: number
  /** How far the key (and she on it) is down, at show time t. */
  dip: (t: number) => number
}
export interface HotdogPlan {
  pieces: Piece[]
  rides: Ride[]
  tosses: Toss[]
  /** The palm's catches: when, and the velocity she comes in with. */
  catches: { t: number; v: Pt }[]
  /** The index finger's final: its heading at the release, speed, and the low it snaps from. */
  flick: { a: number; w: number; low: number }
}

/** Work the path out, once. */
export function hotdog(): HotdogPlan {
  const pieces: Piece[] = []
  const rides: Ride[] = []
  // The kick's flight, from the seam to the first key.
  pieces.push({ t0: KICK, t1: T_LAND0, fly: { a: [-0.5, 0], b: L0 } })
  let vin = flight([-0.5, 0], KICK, L0, T_LAND0).in
  const yKey = KEY.top - R
  const fingerLand: Pt = seatOnIndex(KNUCKLE, Math.PI)
  // Up the keys: each a ride down and up, and a hop to the next.
  for (let j = 0; j < LANDINGS.length; j++) {
    const [t, key] = LANDINGS[j]
    const x = j === 0 ? L0[0] : keyX(key)
    const next: [number, Pt] = j + 1 < LANDINGS.length ? [LANDINGS[j + 1][0], [keyX(LANDINGS[j + 1][1]), yKey]] : [HAND.land, fingerLand]
    const Tf = next[0] - (t + RIDE)
    // Where she leaves the key, so her pace on it runs evenly from how she came to how she goes.
    const launchX = (x + (RIDE * vin[0]) / 2 + (RIDE * next[1][0]) / (2 * Tf)) / (1 + RIDE / (2 * Tf))
    const launch: Pt = [launchX, yKey]
    const out = flight(launch, t + RIDE, next[1], next[0]).out
    const vx0 = vin[0]
    const vy0 = vin[1]
    const along = (tt: number): Pt => {
      const u = (tt - t) / RIDE
      return [x + hermite(u, launchX - x, vx0 * RIDE, out[0] * RIDE), yKey + hermite(u, 0, vy0 * RIDE, out[1] * RIDE)]
    }
    pieces.push({ t0: t, t1: t + RIDE, at: along })
    rides.push({ t, key, dip: (tt) => (tt < t || tt > t + RIDE ? 0 : along(tt)[1] - yKey) })
    pieces.push({ t0: t + RIDE, t1: next[0], fly: { a: launch, b: next[1] } })
    vin = flight(launch, t + RIDE, next[1], next[0]).in
  }

  // Onto the index finger, and rolling along it into the palm, where she is held.
  const vLand = vin
  pieces.push({
    t0: HAND.land,
    t1: HAND.hold,
    at: (t) => {
      const u = (t - HAND.land) / (HAND.hold - HAND.land)
      const x = fingerLand[0] + hermite(u, PALM_REST[0] - fingerLand[0], vLand[0] * (HAND.hold - HAND.land), 0)
      return [x, lerp(fingerLand[1], PALM_REST[1], ease(u)) + Math.max(0, vLand[1]) * give(t - HAND.land, 0.05)]
    },
  })

  // The tosses and catches, worked out so each push leaves at the flight's speed.
  const tosses: Toss[] = []
  const catches: { t: number; v: Pt }[] = []
  const toss = (t: number, from: Pt, to: Pt, tl: number): { rel: Pt; v: Pt } => {
    let v: Pt = [0, -3]
    let rel: Pt = from
    for (let i = 0; i < 20; i++) {
      rel = [from[0] + (v[0] * PRE) / 2, from[1] + (v[1] * PRE) / 2]
      v = flight(rel, t, to, tl).out
    }
    tosses.push({ t, v, from })
    return { rel, v }
  }
  const t1 = toss(HAND.toss1, PALM_REST, ON_BOTTLE, HAND.squirt)
  const catch2In = flight(ON_BOTTLE, HAND.squirt, PALM_REST, HAND.catch2).in
  catches.push({ t: HAND.catch2, v: catch2In })
  const t2 = toss(HAND.toss2, PALM_REST, fingerLand, HAND.land2)
  const land2In = flight(t2.rel, HAND.toss2, fingerLand, HAND.land2).in

  // The flick: the heading at which turning the finger up sends her the seam's way, how fast, and where it snaps from.
  let lo = Math.PI - 0.6
  let hi = Math.PI + 0.6
  const want = Math.atan2(V1[1], V1[0])
  const dirAt = (a: number) => {
    const d = seatTurn(a)
    return Math.atan2(d[1], d[0])
  }
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2
    // Raising the finger turns her way from up-right toward right: find where it is the seam's.
    if (dirAt(mid) < want) lo = mid
    else hi = mid
  }
  const aR = (lo + hi) / 2
  const w = Math.hypot(V1[0], V1[1]) / Math.hypot(...seatTurn(aR))
  const flick = { a: aR, w, low: aR - (w * (FLICK - HAND.snap)) / 2 }
  plan0 = { pieces, rides, tosses, catches, flick }

  pieces.push({ t0: HAND.hold, t1: HAND.toss1, at: (t) => add(PALM_REST, palmOff(t)) })
  pieces.push({ t0: HAND.toss1, t1: HAND.squirt, fly: { a: t1.rel, b: ON_BOTTLE } })
  pieces.push({ t0: HAND.squirt, t1: HAND.catch2, fly: { a: ON_BOTTLE, b: PALM_REST } })
  pieces.push({ t0: HAND.catch2, t1: HAND.toss2, at: (t) => add(PALM_REST, palmOff(t)) })
  pieces.push({ t0: HAND.toss2, t1: HAND.land2, fly: { a: t2.rel, b: fingerLand } })
  catches.push({ t: HAND.land2, v: land2In })
  pieces.push({ t0: HAND.land2, t1: FLICK, at: (t) => seatOnIndex(knuckleAt(t), indexHeading(t)) })
  return plan0
}

const add = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]]

/** The plan as worked out (the hand's motion reads its tosses and catches). */
let plan0: HotdogPlan | null = null

/** How far the palm is from its rest at `t`: tossing, falling back, catching, and lifting her for the flick. */
export function palmOff(t: number): Pt {
  const p = plan0
  let x = 0
  let y = 0
  if (!p) return [0, 0]
  for (const s of p.tosses) {
    const u = t - (s.t - PRE)
    if (u <= 0 || u > PRE + 0.6) continue
    if (u <= PRE) {
      // The push: from rest, evenly harder, to her speed as she leaves.
      x += (s.v[0] * u * u) / (2 * PRE)
      y += (s.v[1] * u * u) / (2 * PRE)
    } else {
      // Followed through, then fallen back onto the keys.
      const v = u - PRE
      const tau = 0.05
      const back = 1 - ease(v / 0.2)
      x += ((s.v[0] * PRE) / 2 + s.v[0] * tau * (1 - Math.exp(-v / tau))) * back
      y += ((s.v[1] * PRE) / 2 + s.v[1] * tau * (1 - Math.exp(-v / tau))) * back
    }
  }
  for (const c of p.catches) {
    const u = t - c.t
    if (u <= 0 || u > 0.8) continue
    // She lands: the hand gives with her and comes back.
    x += c.v[0] * 0.35 * give(u, 0.05)
    y += Math.max(0, c.v[1]) * give(u, 0.06)
  }
  // Lifted for the flick, and held there while the finger snaps.
  const up = ease((t - HAND.lift) / (HAND.snap - 0.04 - HAND.lift))
  x += 0.05 * up
  y -= 0.34 * up
  return [x, y]
}

/** The index finger's knuckle at `t`. */
export const knuckleAt = (t: number): Pt => add(KNUCKLE, palmOff(t))

/** The index finger's heading at `t` while it has her for the flick: level, sagging as she is lifted, then the snap. */
export function indexHeading(t: number): number {
  const f = (plan0 ?? hotdog()).flick
  if (t < HAND.lift) return Math.PI
  if (t < HAND.snap) return Math.PI + (f.low - Math.PI) * ease((t - HAND.lift) / (HAND.snap - HAND.lift))
  const u = Math.min(t, FLICK + 0.3) - HAND.snap
  const pre = FLICK - HAND.snap
  if (u <= pre) return f.low + (f.w * u * u) / (2 * pre)
  // After the flick (in the next world, unseen) it rises and falls back.
  return f.a + f.w * 0.08 * (1 - Math.exp(-(u - pre) / 0.08))
}
