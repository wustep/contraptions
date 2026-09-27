import type { Pt, Seg } from '../../../../../parts'
import { R } from '../../../../../parts'
import {
  CHIMNEY_X,
  FLY,
  FLYWHEEL,
  FLY_R,
  HAMMER,
  OOM,
  OOM_K,
  PHI_DOWN,
  PISTONS,
  PISTON_X,
  S_LAND,
  T0,
  T2,
  YOKE_GOES,
  YOKE_SEAT,
  flyAngle,
  hammerPhi,
  kt,
  onHelve,
  onPiston,
  onTail,
  polar,
  yokeSeatY,
} from './heart-clock'

/**
 * Peer's path through the heart, one function of show time for both parts, in gears' frame. Each piece is a ride
 * (sampled from the same function the drawing uses), a flight (a parabola between two struck moments) or the last
 * straight fall. `lane(from, to, dx)` cuts it into a lane for a part's slot.
 *
 * Every landing is on the music (a beat, or the eighth after a blow), so the hardest contacts on screen are the
 * orchestra's. Take-offs off the beat are the wave's, each on the eighth before the landing it leads to, off a head
 * rising under him (soft: the head's own speed, `launch`).
 */

type Piece =
  | { t0: number; t1: number; kind: 'ride'; at: (T: number) => Pt; hz: number }
  | { t0: number; t1: number; kind: 'hop'; from: Pt; to: Pt; g: number }
  | { t0: number; t1: number; kind: 'fly'; p0: Pt; v0: Pt; p1: Pt }
  | { t0: number; t1: number; kind: 'fall'; from: Pt; to: Pt }

/*
 * The rule of the whole path: the machine carries him, and he is never a dot in the air. At 9 to 10 cells he is a
 * 20 px ball, so the eye finds him by what he is touching: the hammer's head, the flywheel's rim, the pump heads and
 * the governor's yoke. He leaves them only in short, low hops on the music (a beat, about 0.3 s, or an eighth), and
 * never rises over the machine's top line into the lamps on the back wall. The one flight longer than a beat is the
 * first: the hammer's tail snapping up on the first blow throws him over its cam onto the head (a beat and a half).
 * The last straight fall to the chimney's foot, when the yoke goes, is the story's.
 */

/** Where he sits on the flywheel: a hair outside its pitch circle, cradled in a gap between two teeth. */
export const RIDE_F = FLY_R + 0.05

/** Where he sits on the hammer's head: on top of the helve over the head's iron. */
const HEAD_S = HAMMER.head - 0.04
const HEAD_H = HAMMER.thick / 2 + 0.06 + R
const onHead = (T: number): Pt => onHelve(hammerPhi(T), HEAD_S, HEAD_H)

/**
 * Phrase 12, the hammer. He lands on its tail (T0); the first blow (193) snaps the tail up and throws him over the cam
 * and its beam, low and quick, onto the head as the cam lifts it (194.5, a beat and a half). From then he rides the
 * head: up under the cam, down onto the anvil with it on each 1 and 3, jolted off it by the blow and caught an eighth
 * later by the head starting to rise under him.
 */
const ON_HEAD = 194.5
/** How long each blow's jolt keeps him off the head (beats), and how high (cells). */
const JOLT = 0.5
const JOLT_LIFT = 0.16
/**
 * The last ride on the head ends at the top of its lift (207.5): it tips him up onto the side of the great wheel,
 * an eighth, as the pinion drives into its teeth (FLY).
 */
const OFF_HEAD = 207.5
/**
 * Phrase 13, the flywheel. He lands on the side of the great wheel as the pinion drives into its teeth (FLY), level
 * with its hub on the hammer's side, and the wheel carries him up its side, heave by heave; from 216 he starts to roll
 * on ahead of it as he nears the top, tips over it (~219, FLICK the frame's turn to the pumps) and rolls down its far
 * face, the teeth still under him, until he drops off it on the blow at 222 (OFF_FLY) onto the first pump's head on
 * the next beat's crash (223), a short fall down the wheel's face.
 */
export const LAND_ANGLE = Math.PI
export const FLICK = kt(220)
/** He leaves the wheel on this blow (gears.ts strikes it), and is on the first head a beat later. */
export const OFF_FLY = kt(222)
const ON_PUMPS = 223
/** His angle on the flywheel at T while it carries him (before he rolls ahead of it). */
export const flyRideAngle = (T: number): number => LAND_ANGLE + flyAngle(T) - flyAngle(FLY)
/** The roll ahead of the wheel: from ROLL_FROM (at rest on it) to OFF_FLY, where he is ROLL_TO on the wheel. */
const ROLL_FROM = kt(216)
/** Where he leaves the rim (radians, y down): most of the way down its far face to the hub's level, over the first head. */
const ROLL_TO = 2 * Math.PI - 0.34
const ROLL_BY = ROLL_TO - flyRideAngle(OFF_FLY)
/** Gathering like a ball tipping over a crest: slow at first, faster once it is over. */
function roll(T: number): number {
  if (T <= ROLL_FROM) return 0
  const u = Math.min(1, (T - ROLL_FROM) / (OFF_FLY - ROLL_FROM))
  return ROLL_BY * u * u * (0.6 + 0.4 * u)
}
export const onFly = (T: number): Pt => polar(FLYWHEEL.at, RIDE_F, flyRideAngle(T) + roll(T))
/** How hard the heave on OFF_FLY kicks him out from the hub (cells a second). */
const KICK = 2.4
/** His velocity along the rim at T (cells a second): what he leaves it with. */
function flyVel(T: number): Pt {
  const dt = 0.002
  const a = onFly(T - dt)
  const b = onFly(T)
  return [(b[0] - a[0]) / dt, (b[1] - a[1]) / dt]
}

/**
 * The pump hops: the beat he lands on each head, which head, and the beat he is thrown off it. Every head carries
 * him up: he lands low and rides it up, and leaves it at the top.
 */
export const HOPS: { k: number; i: number; off: number }[] = [
  // The pumps (B): a head every two beats, across and back; landing at the bottom on 1 and 3, off the top on 2 and 4.
  { k: 224, i: 0, off: 225 },
  { k: 226, i: 1, off: 227 },
  { k: 228, i: 2, off: 229 },
  { k: 230, i: 1, off: 231 },
  { k: 232, i: 0, off: 233 },
  { k: 234, i: 1, off: 235 },
  { k: 236, i: 2, off: 237 },
  { k: 238, i: 1, off: 239 },
  // The great bellows (B again): the strokes doubled and the middle head half a stroke behind the outer two, a wave
  // (the outer heads bottom on 1 and 3, the middle one on 2 and 4). The first doubled stroke carries him up its whole
  // height and tosses him off its top on the cymbal (241); he comes down on the same head at its bottom (242).
  { k: 240, i: 0, off: 241 },
  // Then he surfs it: onto each head on the beat as it turns at the bottom to rise, carried up half its stroke, off it
  // on the eighth after (the head's own speed) and onto the next as it bottoms: the middle head on every cymbal.
  { k: 242, i: 0, off: 242.5 },
  { k: 243, i: 1, off: 243.5 },
  { k: 244, i: 2, off: 244.5 },
  { k: 245, i: 1, off: 245.5 },
  { k: 246, i: 0, off: 246.5 },
  { k: 247, i: 1, off: 247.5 },
  { k: 248, i: 2, off: 248.5 },
  { k: 249, i: 1, off: 249.5 },
  { k: 250, i: 0, off: 250.5 },
  { k: 251, i: 1, off: 251.5 },
  { k: 252, i: 2, off: 252.5 },
  { k: 253, i: 1, off: 253.5 },
  // Back onto the first head, down with it to the bottom for the seam (256), and up to its top: the runaway begins
  // with him on it.
  { k: 254, i: 0, off: 257 },
  // The runaway: off its top on the cymbal, a beat a head across the tops of the others as each turns (258, 259),
  // and off the last onto the governor's yoke (260).
  { k: 258, i: 1, off: 258 },
  { k: 259, i: 2, off: 259 },
]
/** He lands on the governor's yoke here. */
export const ON_YOKE = kt(260)

/**
 * The runaway (phrases 16–17, the fastest music of the piece). Every take-off from the yoke is on a blow (1 or 3) and
 * every landing on it on a backbeat (2 or 4, the cymbals), where the yoke's arm gives under him (`yokeGive`).
 *
 *   260     onto the yoke off the last pump head; it bucks him on every blow, a little higher each time, and the
 *           governor lifts him toward the chimney between
 *   272     the valve blows beside him and bucks him off the yoke, down onto the racing pump heads: a beat a head
 *           across and back (273 … 277), each head a blur under him, so he only touches it and is thrown on
 *   278     back up onto the yoke off the last of them; it bucks him on the blows (280, 282, 284) as the governor
 *           hits its stops (284); 286.5 the yoke gives way under him
 */
/** The beats the yoke bucks him (each lands a beat later, on a backbeat). */
export const YOKE_BUCKS: number[] = [262, 264, 266, 268, 270, 280, 282, 284]
/**
 * How high each buck goes over the seat (cells): low, so he reads on the yoke, growing as the governor gathers; the
 * last three as it hits its stops.
 */
const TOSS: Record<number, number> = { 262: 0.26, 264: 0.3, 266: 0.34, 268: 0.38, 270: 0.42, 280: 0.36, 282: 0.4, 284: 0.32 }
/** Bucked off the yoke by the valve's blast, and across the racing heads a beat each. */
const VALVE_BUCK = 272
const RUN_HEADS: { k: number; i: number }[] = [
  { k: 273, i: 2 },
  { k: 274, i: 1 },
  { k: 275, i: 0 },
  { k: 276, i: 1 },
  { k: 277, i: 2 },
]
const BACK_ON_YOKE = 278

/** Where he is on the first head: half a cell short of gears' exit (the seam). */
const SEAM_DX = 9.5 - PISTON_X[0]
const headDx = (i: number): number => (i === 0 ? SEAM_DX : 0)
const head = (i: number, T: number): Pt => onPiston(i, T, headDx(i))

/**
 * A hop from `from` to `to` over [t0, t1] whose arc rises `lift` cells over the straight line between them (so the
 * apex is about `lift` above the higher end when the two are level).
 */
const hop = (t0: number, t1: number, from: Pt, to: Pt, lift: number): Piece => ({ t0, t1, kind: 'hop', from, to, g: (8 * lift) / ((t1 - t0) * (t1 - t0)) })
/** A hop up onto something higher that still comes down onto it: at least enough lift to be falling as it lands. */
const climb = (t0: number, t1: number, from: Pt, to: Pt, lift: number): Piece => hop(t0, t1, from, to, Math.max(lift, (from[1] - to[1]) / 4 + 0.1))
/**
 * A hop that leaves with the vertical speed `vy` (cells a second, y down) of what throws it, so the take-off is soft:
 * the lift solved from it, and at least `min`.
 */
function launch(t0: number, t1: number, from: Pt, to: Pt, vy: number, min: number): Piece {
  const T = t1 - t0
  return hop(t0, t1, from, to, Math.max(min, (to[1] - from[1] - vy * T) / 4))
}

function pieces(): Piece[] {
  const out: Piece[] = []
  // On the hammer's tail from his landing until the first blow snaps it up.
  out.push({ t0: T0, t1: OOM[0], kind: 'ride', at: (T) => onTail(hammerPhi(T), S_LAND), hz: 240 })
  // Thrown over the cam and its beam, down onto the head as the cam lifts it.
  out.push(hop(OOM[0], kt(ON_HEAD), onTail(PHI_DOWN, S_LAND), onHead(kt(ON_HEAD)), 1.25))
  // On the head: up with it, down with it onto each blow, jolted off by it and caught by it an eighth later.
  let at = kt(ON_HEAD)
  for (const k of OOM_K) {
    const b = kt(k)
    if (b <= at || k >= OFF_HEAD) continue
    out.push({ t0: at, t1: b, kind: 'ride', at: onHead, hz: 240 })
    const land = kt(k + JOLT)
    out.push(hop(b, land, onHead(b), onHead(land), JOLT_LIFT))
    at = land
  }
  if (kt(OFF_HEAD) > at + 1e-6) out.push({ t0: at, t1: kt(OFF_HEAD), kind: 'ride', at: onHead, hz: 240 })
  // The head at the top of its lift tips him up onto the side of the great wheel as the pinion drives in.
  out.push(climb(kt(OFF_HEAD), FLY, onHead(kt(OFF_HEAD)), onFly(FLY), 0.12))
  // Carried up its side, over its top and down its far face.
  out.push({ t0: FLY, t1: OFF_FLY, kind: 'ride', at: onFly, hz: 60 })
  // The blow's heave kicks him out of his tooth gap: off the rim with its own speed and a push straight out from the
  // hub (so he clears the teeth at once), a short fall down the wheel's face onto the first head.
  const onPumps = kt(ON_PUMPS)
  const vRim = flyVel(OFF_FLY)
  const kick: Pt = [Math.cos(ROLL_TO) * KICK, Math.sin(ROLL_TO) * KICK]
  out.push({ t0: OFF_FLY, t1: onPumps, kind: 'fly', p0: onFly(OFF_FLY), v0: [vRim[0] + kick[0], vRim[1] + kick[1]], p1: head(0, onPumps) })
  out.push({ t0: onPumps, t1: PISTONS, kind: 'ride', at: (T) => head(0, T), hz: 20 })
  // The pumps, then the wave, then the runaway's first heads.
  HOPS.forEach((h, j) => {
    const i = h.i
    if (h.off > h.k) out.push({ t0: kt(h.k), t1: kt(h.off), kind: 'ride', at: (T) => head(i, T), hz: 120 })
    const next = HOPS[j + 1]
    if (next) {
      const t0 = kt(h.off)
      const t1 = kt(next.k)
      const from = head(i, t0)
      const to = head(next.i, t1)
      if (next.i === i) {
        // Tossed off the top of the first doubled stroke, and down onto the same head at its bottom.
        out.push(hop(t0, t1, from, to, 0.5))
      } else if (next.k - h.off >= 1) {
        // A beat across: onto a head at its bottom (the pumps), or from top to top (the runaway's first bar).
        out.push(hop(t0, t1, from, to, 0.25))
      } else {
        // The wave: an eighth across, thrown off with the head's own rise, onto the next as it bottoms.
        const vy = (head(i, t0 + 0.002)[1] - head(i, t0 - 0.002)[1]) / 0.004
        out.push(launch(t0, t1, from, to, vy, 0.2))
      }
    }
  })
  // Off the last head onto the governor's yoke.
  const seat = (T: number): Pt => [YOKE_SEAT, yokeSeatY(T) - R]
  const last = HOPS[HOPS.length - 1]
  out.push(climb(kt(last.off), ON_YOKE, head(last.i, kt(last.off)), seat(ON_YOKE), 0.25))

  // The runaway. On the yoke, it lifts him as the governor spins up, and bucks him on the blows.
  at = ON_YOKE
  const ride = (to: number) => {
    if (to > at + 1e-6) out.push({ t0: at, t1: to, kind: 'ride', at: seat, hz: 60 })
    at = to
  }
  const buck = (k: number) => {
    const up = kt(k)
    const down = kt(k + 1)
    ride(up)
    out.push(hop(up, down, seat(up), seat(down), TOSS[k]))
    at = down
  }
  for (const k of YOKE_BUCKS) if (k < VALVE_BUCK) buck(k)
  // The valve blows: bucked off the yoke onto the racing heads, touching each on a beat.
  ride(kt(VALVE_BUCK))
  let from: Pt = seat(kt(VALVE_BUCK))
  let t = kt(VALVE_BUCK)
  for (const h of RUN_HEADS) {
    const to = head(h.i, kt(h.k))
    out.push(climb(t, kt(h.k), from, to, 0.25))
    from = to
    t = kt(h.k)
  }
  // Back up onto the yoke off the last of them.
  out.push(climb(t, kt(BACK_ON_YOKE), from, seat(kt(BACK_ON_YOKE)), 0.25))
  at = kt(BACK_ON_YOKE)
  // The last blows buck him on the yoke as the governor hits its stops.
  for (const k of YOKE_BUCKS) if (k > VALVE_BUCK) buck(k)
  ride(YOKE_GOES)
  // The yoke goes: straight down to the chimney's foot.
  out.push({ t0: YOKE_GOES, t1: T2, kind: 'fall', from: [CHIMNEY_X, yokeSeatY(YOKE_GOES) - R], to: [CHIMNEY_X, 0] })
  return out
}

export const PATH = pieces()

/** A flight that leaves `p0` with velocity `v0` and arrives at `p1` after `T` seconds: gravity and a little drift solved to fit. */
function flyAt(p: Extract<Piece, { kind: 'fly' }>, t: number): Pt {
  const T = p.t1 - p.t0
  const ax = (2 * (p.p1[0] - p.p0[0] - p.v0[0] * T)) / (T * T)
  const ay = (2 * (p.p1[1] - p.p0[1] - p.v0[1] * T)) / (T * T)
  return [p.p0[0] + p.v0[0] * t + 0.5 * ax * t * t, p.p0[1] + p.v0[1] * t + 0.5 * ay * t * t]
}

/** Where Peer is at show time T on the whole path (gears' frame): for the drawings (trolls look at him). */
export function peerAt(T: number): Pt {
  const p = PATH.find((q) => T >= q.t0 && T <= q.t1) ?? (T < T0 ? PATH[0] : PATH[PATH.length - 1])
  const tt = Math.max(p.t0, Math.min(p.t1, T))
  const u = p.t1 > p.t0 ? (tt - p.t0) / (p.t1 - p.t0) : 1
  switch (p.kind) {
    case 'ride':
      return p.at(tt)
    case 'hop': {
      const arc = (p.g * (p.t1 - p.t0) ** 2) / 8
      return [p.from[0] + (p.to[0] - p.from[0]) * u, p.from[1] + (p.to[1] - p.from[1]) * u - arc * 4 * u * (1 - u)]
    }
    case 'fly':
      return flyAt(p, tt - p.t0)
    case 'fall':
      return [p.from[0] + (p.to[0] - p.from[0]) * u * u, p.from[1] + (p.to[1] - p.from[1]) * u * u]
  }
}

/** The lane segments for [from, to] (show seconds), moved `dx` cells (the runaway's frame is gears' less RUN_DX). */
export function laneOf(from: number, to: number, dx = 0): Seg[] {
  const segs: Seg[] = []
  const mv = (p: Pt): Pt => [p[0] - dx, p[1]]
  for (const p of PATH) {
    if (p.t1 <= from + 1e-9 || p.t0 >= to - 1e-9) continue
    const a = Math.max(from, p.t0)
    const b = Math.min(to, p.t1)
    if (p.kind === 'hop') {
      segs.push({ from: mv(p.from), to: mv(p.to), dur: b - a, arc: (p.g * (p.t1 - p.t0) ** 2) / 8 })
    } else if (p.kind === 'fall') {
      segs.push({ from: mv(p.from), to: mv(p.to), dur: b - a, ease: 'in' })
    } else {
      const hz = p.kind === 'ride' ? p.hz : 120
      const n = Math.max(1, Math.ceil((b - a) * hz))
      const f = p.kind === 'ride' ? p.at : (T: number) => flyAt(p, T - p.t0)
      for (let i = 0; i < n; i++) {
        const t0 = a + ((b - a) * i) / n
        const t1 = a + ((b - a) * (i + 1)) / n
        segs.push({ from: mv(f(t0)), to: mv(f(t1)), dur: t1 - t0 })
      }
    }
  }
  return segs
}
