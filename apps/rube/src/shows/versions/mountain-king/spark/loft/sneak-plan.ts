import { R, type Pt, type Seg } from '../../../../../parts'
import { carried, smooth, type PartShot } from '../kit'
import { LOFT_SEAM, inPhrase, onset } from '../music'
import { G } from '../physics'
import { SEAMS } from '../seams'
import { BENCH, HANDOFF, RACK, WICK } from './layout'
import { WICK_LEFT } from './sneak-beats'

/**
 * LOFT-A's plan: where every machine of the sneak stands, how each moves (a pure function of show time), and the
 * spark's lane through them, built from those same functions so it never slides off what carries it. The part is
 * laid at [0, 0], so its frame is the loft's world cells (the wick is `WICK`). `sneak-draw.ts` draws from this.
 *
 *   0-4.36     the candle burning; the loft wide, then close on the candle
 *   4.36       it stirs, leans, looks east at the cat, and hops off its wick into the pan lift (6.706)
 *   7.28-9.56  the windlass lets the pan down a notch a note, to the bench
 *   10.69      out onto the bench, two tiptoes, a careful hop over a hank of wick (12.351)
 *   13.47      up into the balance's pan; the beam sinks and its far end trips the snuffer's latch (14.583)
 *   15.70      the snuffer's cone clangs down on the other pan and the spark is flung up onto the rack's pole (16.816)
 *   16.8-24.5  the tightrope, hopping the wick of every pair of hanging candles
 *   25.653     a pair it jostled knocks together, seen close: the spark freezes; the camera draws back to the cat
 *   28.961     again, at the pole's end, in a two-shot: the cat's ear flicks, the spark freezes
 *   30.012     it leaps into the dish of a counterweighted candle arm, which sinks under it toward the dipping wheel
 *   31.185     it hops off onto the wheel: `HANDOFF`, moving (0.9, 0.9)
 */

const q = (n: number, j: number) => inPhrase(n, j)

/* ------------------------------------------------------------------ the beats */

export const BEAT = {
  stir: q(0, 0),
  leanWest: q(0, 2),
  look: q(0, 4),
  leave: WICK_LEFT,
  pan: q(0, 8),
  notches: [q(0, 10), q(0, 12), q(0, 14), q(0, 16)],
  touch: q(0, 18),
  out: q(0, 20),
  bench: q(0, 22),
  tiptoes: [q(0, 23), q(0, 24)],
  /** It leans in to look at the coil of wick, draws back, and jumps it high. */
  hankGo: 11.66,
  hankLand: q(0, 28),
  balGo: 12.72,
  balance: q(1, 0),
  trip: q(1, 4),
  clang: q(1, 8),
  pole: q(1, 12),
  knocks: [q(2, 12), q(2, 24)] as const,
  /** Each knocking pair swings apart off the knock and knocks again: the first on the loud note after it (26.570). */
  reknocks: [onset(26.57, 3), q(2, 26)] as const,
  /** The last leap lands in the candle arm's dish on the onset just before phrase 2's eighth 28. */
  cup: onset(30.0, 2),
  /** It crouches in the dish, then hops off to the wheel. */
  spring: LOFT_SEAM - 0.42,
  leave2: LOFT_SEAM - 0.35,
}

/* ------------------------------------------------------------------ the pan lift */

/** A windlass under the wall shelf: a drum with a ratchet and pawl, its cord down to a brass pan on a three-chain bridle. */
export const LIFT = {
  drum: [-2.15, -2.42] as Pt,
  r: 0.3,
  /** The cord leaves the drum's east side and hangs straight down to the pan: the pan's centre. */
  x: -1.85,
  w: 0.9,
  depth: 0.14,
  bridle: 0.62,
  /** The pan's floor at the top (by the wick), and resting on the bench. */
  top: 0.48,
  bottom: BENCH.top - 0.05,
}
/** How far each notch lets the pan down (the big one on phrase 0's loudest note), and the last onto the bench. */
const DROPS = [0.3, 0.52, 0.3, 0.3]
const SLIP = 0.11
const liftSteps = (): [number, number, boolean][] => [
  ...BEAT.notches.map((t, i) => [t, DROPS[i], false] as [number, number, boolean]),
  [BEAT.touch, LIFT.bottom - LIFT.top - DROPS.reduce((a, b) => a + b, 0), true],
]

/** The pan's floor without the cord's stretch: what the drum has paid out. */
export function liftPaid(t: number): number {
  let y = 0
  for (const [tn, d] of liftSteps()) {
    const s = Math.max(0, Math.min(1, (t - (tn - SLIP)) / SLIP))
    y += d * s * s
  }
  return y
}

/** The pan's floor, y: dipped by the spark's landing, let down a notch a note (each caught with a bounce), set on the bench. */
export function panY(t: number): number {
  let y = LIFT.top + liftPaid(t)
  const u0 = t - BEAT.pan
  if (u0 > 0) y += 0.07 * (1 - Math.exp(-u0 / 0.03)) * Math.exp(-u0 / 0.22)
  for (const [tn, d, last] of liftSteps()) {
    const u = t - tn
    if (u <= 0 || last) continue
    y += 0.05 * (d / 0.3) * Math.exp(-u / 0.12) * Math.sin(u * 26)
  }
  // Set down on the bench: a last small settle.
  const ub = t - BEAT.touch
  if (ub > 0) y -= 0.018 * Math.exp(-ub / 0.08) * Math.sin(ub * 30)
  return Math.min(y, LIFT.bottom + 0.004)
}

/** The drum's turn, radians: the cord it has paid out over its radius. */
export const drumTurn = (t: number): number => liftPaid(t) / LIFT.r

/** The pawl's lift off the ratchet as each tooth slips under it, 0..1: it drops, a click, on every notch. */
export function pawlLift(t: number): number {
  let v = 0
  for (const [tn] of liftSteps()) {
    const u = t - (tn - SLIP)
    if (u < 0 || u > SLIP + 0.2) continue
    v = Math.max(v, u < SLIP ? Math.sin((u / SLIP) * Math.PI * 0.5) : Math.exp(-(u - SLIP) / 0.03))
  }
  return v
}

/* ------------------------------------------------------------------ the bench */

/** A ball resting on the bench top. */
const ON_BENCH = BENCH.top - R
/** A hank of wick lying on the bench, loosely coiled: the spark hops it. */
export const HANK = { x0: -3.4, x1: -3.1, h: 0.2 }

/* ------------------------------------------------------------------ the balance and the snuffer */

/** A tall chandler's balance: an oak base, a brass pillar, a beam 1.6 across, a pan on chains at each end. */
export const BAL = { x: -5.0, y: 0.1, arm: 0.8, chain: 1.2, pan: 0.8, depth: 0.12, base: 1.1 }
const TILT = (14 * Math.PI) / 180
const DOWN = (-20 * Math.PI) / 180

/** The beam's tilt, radians, east end down: level; the spark's weight sinks the east pan; the clang throws it west-down. */
export function beamTilt(t: number): number {
  if (t < BEAT.balance) return 0
  if (t < BEAT.trip) {
    const u = t - BEAT.balance
    const span = BEAT.trip - BEAT.balance
    const jolt = 0.05 * Math.exp(-u / 0.1) * Math.sin(u * 24)
    return TILT * (0.35 * (1 - Math.exp(-u / 0.08)) + 0.65 * smooth(u, 0.04, span)) + jolt
  }
  const before = TILT + ((1 * Math.PI) / 180) * Math.min(1, (t - BEAT.trip) / (BEAT.clang - BEAT.trip))
  if (t < BEAT.clang) return before + 0.012 * Math.exp(-(t - BEAT.trip) / 0.08) * Math.sin((t - BEAT.trip) * 40)
  const u = t - BEAT.clang
  const low = DOWN - (4 * Math.PI) / 180
  if (u < 0.07) {
    const s = u / 0.07
    return before + (low - before) * (1 - (1 - s) * (1 - s))
  }
  return DOWN - ((4 * Math.PI) / 180) * Math.exp(-(u - 0.07) / 0.25) * Math.cos(14 * (u - 0.07))
}
const TILT_AT_CLANG = TILT + (1 * Math.PI) / 180

/** A beam end at tilt `a`: east (+1) or west (-1). */
export const beamEnd = (a: number, side: 1 | -1): Pt => [BAL.x + side * BAL.arm * Math.cos(a), BAL.y + side * BAL.arm * Math.sin(a)]
/** A pan's floor under a beam end: it hangs straight down on its chains. */
export const panUnder = (end: Pt): Pt => [end[0], end[1] + BAL.chain]

/**
 * The snuffer: a brass bell hung mouth-down from the end of a hinged arm, stood on the bench west of the balance and
 * held up by a latch, poised over the balance's west pan. When the balance's west end rises into the latch's tail, the
 * latch's hook lifts off the arm's end, and the arm swings the bell down onto the west pan: snuffed, an empty pan. Its
 * angle is above the east horizontal; the bell hangs from the arm's end on a pin, so it stays mouth-down.
 */
export const SNUFF = { hinge: [-6.95, 0.92] as Pt, arm: 1.15, cone: 0.42, mouth: 0.38, raised: (58 * Math.PI) / 180, top: -0.3 }
/** The latch on the snuffer's stand: its pivot, its tail over the balance's west end, when the beam meets it, and its hook. */
export const LATCH = { pivot: [-6.95, -0.14] as Pt, tail: -5.7, under: -0.11, hook: 0.61 }

/** The arm's angle that sets the cone's mouth on a pan floor at `floor`. */
const onPan = (floor: number): number => Math.asin(Math.max(-1, Math.min(1, (SNUFF.hinge[1] - (floor - SNUFF.cone)) / SNUFF.arm)))
const HIT = onPan(panUnder(beamEnd(TILT_AT_CLANG, -1))[1])

/** The snuffer arm's angle at `t`: raised; falling from the trip, slow off the top and fast at the bottom; then resting on the west pan. */
export function snufferAngle(t: number): number {
  if (t < BEAT.trip) return SNUFF.raised
  if (t < BEAT.clang) {
    const s = (t - BEAT.trip) / (BEAT.clang - BEAT.trip)
    return SNUFF.raised - (SNUFF.raised - HIT) * Math.pow(s, 2.3)
  }
  return onPan(panUnder(beamEnd(beamTilt(t), -1))[1])
}

/**
 * The bell's swing on its pin, radians (its mouth west of straight down is negative): still while it is held; as the
 * arm falls, its mouth trails; seated on the pan at the clap; then still.
 */
export function bellSwing(t: number): number {
  if (t <= BEAT.trip || t >= BEAT.clang) return 0
  const s = (t - BEAT.trip) / (BEAT.clang - BEAT.trip)
  return -0.3 * Math.sin(Math.PI * Math.pow(s, 1.3))
}

/** Where the bell hangs from (the arm's end), and the way its mouth faces (down, swung). */
export function cone(t: number): { apex: Pt; axis: Pt; angle: number } {
  const a = snufferAngle(t)
  const sw = bellSwing(t)
  return { apex: [SNUFF.hinge[0] + SNUFF.arm * Math.cos(a), SNUFF.hinge[1] - SNUFF.arm * Math.sin(a)], axis: [-Math.sin(sw), Math.cos(sw)], angle: a }
}

/** The latch's turn up about its pivot, radians: lifted by the beam's west end, sprung up at the trip. */
export function latchTurn(t: number): number {
  const end = beamEnd(beamTilt(t), -1)
  const lift = Math.max(0, LATCH.under - (end[1] - 0.04))
  const pushed = Math.atan2(lift, LATCH.tail - LATCH.pivot[0])
  if (t < BEAT.trip) return pushed
  const u = t - BEAT.trip
  return Math.max(pushed, 0.42 * (1 - Math.exp(-u / 0.035)) + 0.05 * Math.exp(-u / 0.12) * Math.sin(u * 50))
}

/* ------------------------------------------------------------------ the drying rack */

/** Where the rack stands: three uprights on the bench, the pole across them and out over the bench's end. */
export const POLE = { east: RACK.x1, mid: -11.6, west: -15.2, from: RACK.x1 + 0.15, to: -16.4, y: RACK.rodY, r: 0.065 }
/** The pairs of dipped candles, hanging by their wicks over the pole: where, what wax, how long. */
export const PAIRS: { x: number; wax: 'tallow' | 'beeswax'; len: number }[] = [
  { x: -8.9, wax: 'tallow', len: 1.34 },
  { x: -9.8, wax: 'beeswax', len: 1.26 },
  { x: -10.7, wax: 'tallow', len: 1.4 },
  { x: -12.6, wax: 'tallow', len: 1.3 },
  { x: -13.9, wax: 'beeswax', len: 1.36 },
  { x: -15.8, wax: 'tallow', len: 1.3 },
]
/** A pair's two wicks leave the pole this far either side of its middle. */
export const PAIR_HALF = 0.11
/** How far down a pair's wicks hang before the wax begins. */
export const WICK_DROP = 0.24
/** The spark's centre on the pole at rest. */
const ON_POLE = POLE.y - POLE.r - R

/** The pole walk: each hop's take-off and landing, and where it lands. The landings bounce the pole. */
interface Hop {
  launch: number
  land: number
  x: number
  /** How hard the landing is: how far the pole gives under it. */
  give: number
  /** A bounce straight on from the last landing, with no push. */
  bounce?: boolean
}
export const HOPS: Hop[] = [
  { launch: q(1, 17), land: q(1, 19), x: -9.2, give: 0.03 },
  { launch: q(1, 22), land: q(1, 24), x: -10.1, give: 0.03 },
  { launch: q(1, 26), land: q(1, 28), x: -11.0, give: 0.032 },
  { launch: q(1, 30), land: q(2, 0), x: -11.95, give: 0.028 },
  { launch: q(2, 2), land: q(2, 4), x: -12.9, give: 0.03 },
  { launch: q(2, 6), land: q(2, 8), x: -14.2, give: 0.04 },
  { launch: 26.93, land: onset(27.33, 2), x: -15.5, give: 0.035 },
  { launch: onset(27.33, 2), land: q(2, 20), x: -16.12, give: 0.06, bounce: true },
]
/** The fling off the balance lands here on the pole, just past the east upright. */
const POLE_IN = -8.35
/** Every landing on the pole (the fling's and the hops'), for the pole's give and the pairs' sway. */
const LANDINGS: { t: number; x: number; give: number }[] = [{ t: BEAT.pole, x: POLE_IN, give: 0.055 }, ...HOPS.map((h) => ({ t: h.land, x: h.x, give: h.give }))]

/** The pole's shape under a landing at `xl`: the span between two uprights holding it bows; the end past the west upright dips. */
function spanShape(x: number, xl: number): number {
  if (xl < POLE.west) return x < POLE.west ? ((POLE.west - x) / (POLE.west - POLE.to)) ** 2 / (((POLE.west - xl) / (POLE.west - POLE.to)) ** 2 || 1) : 0
  const [a, b] = xl > POLE.mid ? [POLE.east, POLE.mid] : [POLE.mid, POLE.west]
  if (x > a || x < b) return 0
  const s = Math.sin((Math.PI * (a - x)) / (a - b))
  return s / Math.max(0.3, Math.sin((Math.PI * (a - xl)) / (a - b)))
}

/** How far the pole has given at x (cells, down), from every landing so far: a quick dip, a damped ring. */
export function poleSag(x: number, t: number): number {
  let y = 0
  for (const l of LANDINGS) {
    const u = t - l.t
    if (u <= 0 || u > 2.5) continue
    y += l.give * spanShape(x, l.x) * Math.exp(-u / 0.32) * Math.sin(u * 19)
  }
  return y
}

/** The spark standing on the pole at x: its centre, riding the pole's give. */
export const onPole = (x: number, t: number): Pt => [x, ON_POLE + poleSag(x, t)]

/**
 * A pair's two candles, their swing (radians, the bottom east of the pivot is positive), west candle first. Every
 * landing near a pair sways it; the two the spark jostles on its last two hops before a knock swing apart and come
 * back together on the knock (their wax meets: the knock), rebound, and settle.
 */
export function pairSwing(i: number, t: number): [number, number] {
  const pair = PAIRS[i]
  let common = 0
  for (const l of LANDINGS) {
    const u = t - l.t
    if (u <= 0 || u > 6) continue
    const d = Math.abs(l.x - pair.x)
    if (d > 1.3) continue
    common += 0.07 * (1 - d / 1.3) * Math.exp(-u / 1.3) * Math.sin(u * 2.9) * (l.x < pair.x ? 1 : -1)
  }
  let apart = 0
  const k = KNOCKERS.indexOf(i)
  if (k >= 0) {
    const kick = KICKS[k]
    const knock = BEAT.knocks[k]
    const u = t - kick
    const uc = knock - kick
    // Swung apart by the landing next to them, they fall back together on the knock, bounce apart and knock again,
    // bounce once more, a little, and hang together.
    const T = BEAT.reknocks[k] - knock
    const [A, A2] = REBOUND[k]
    if (u > 0 && u <= uc) apart = SWING[k] * Math.sin((Math.PI * u) / uc) * (1 - 0.12 * u)
    else if (u > uc) {
      const v = u - uc
      if (v <= T) apart = A * Math.sin((Math.PI * v) / T)
      else if (v <= T * 1.55) apart = A2 * Math.sin((Math.PI * (v - T)) / (T * 0.55))
    }
  }
  return [common - apart, common + apart]
}
/** The pairs that knock, the landings that set them swinging, and how far they bounce apart after (radians). */
export const KNOCKERS = [4, 5]
/** How far the landing swings each knocking pair apart (radians): the last pair less, clear of the arm's weight. */
const SWING = [0.25, 0.16]
const REBOUND: [number, number][] = [
  [0.1, 0.02],
  [0.06, 0.012],
]
const KICKS = [HOPS[5].land, HOPS[7].land]

/* ------------------------------------------------------------------ the candle arm */

/**
 * A rise-and-fall candle arm on an iron standard at the bench's west end: a counterweighted arm pivoted on the
 * standard, its long end west with an empty socket on a drip pan (a candle's place, gimballed level), its short end
 * east with a brass weight. The spark leaps into the socket; the arm sinks under it toward the dipping wheel, and
 * when the spark hops off, the weight lifts the arm back up.
 */
export const ARM = { long: 1.5, short: 0.32, rest: (5 * Math.PI) / 180, low: (40 * Math.PI) / 180, seat: 0.2 }
/** The flight to the wheel: from where it springs, ending at `HANDOFF` moving `SEAMS.loft.v` (0.9, 0.9). */
const HOP_OFF = (() => {
  const T = LOFT_SEAM - BEAT.leave2
  const tau = BEAT.leave2 - BEAT.spring
  const [vx, vy] = SEAMS.loft.v
  const v0: Pt = [vx, vy - G * T]
  const F: Pt = [HANDOFF[0] - v0[0] * T, HANDOFF[1] - v0[1] * T - 0.5 * G * T * T]
  const S: Pt = [F[0] - (v0[0] * tau) / 2, F[1] - (v0[1] * tau) / 2]
  return { S }
})()
/** The arm's pivot, set so that the socket at the bottom of its swing holds the spark exactly where it springs from. */
export const PIVOT: Pt = [HOP_OFF.S[0] + ARM.long * Math.cos(ARM.low), HOP_OFF.S[1] + ARM.seat - ARM.long * Math.sin(ARM.low)]

/** The arm's angle below the west horizontal: at rest; sinking under the spark's landing; low; lifted back by its weight. */
export function armAngle(t: number): number {
  if (t < BEAT.cup) return ARM.rest
  if (t < BEAT.spring) {
    const u = (t - BEAT.cup) / (BEAT.spring - BEAT.cup)
    return ARM.rest + (ARM.low - ARM.rest) * (1 - (1 - u) ** 3)
  }
  if (t < BEAT.leave2) return ARM.low + 0.02 * Math.sin(((t - BEAT.spring) / (BEAT.leave2 - BEAT.spring)) * Math.PI)
  const u = t - BEAT.leave2
  return ARM.rest + (ARM.low - ARM.rest) * Math.exp(-u / 0.3) * Math.cos(u * 5.2)
}
/** The arm's west end (the socket's pin). */
export const armTip = (a: number): Pt => [PIVOT[0] - ARM.long * Math.cos(a), PIVOT[1] + ARM.long * Math.sin(a)]
/** The spark sitting in the socket. */
export const inSocket = (a: number): Pt => {
  const [x, y] = armTip(a)
  return [x, y - ARM.seat]
}

/* ------------------------------------------------------------------ the path */

const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1])

/** The spark's lane, built forward in show time: holds, eased moves, rides on what carries it, and flights. */
class Path {
  segs: Seg[] = []
  constructor(
    public t: number,
    public p: Pt,
  ) {}
  private add(seg: Seg): void {
    if (seg.dur <= 1e-9) return
    this.segs.push(seg)
    this.t += seg.dur
    this.p = seg.to
  }
  hold(until: number): void {
    this.add({ from: this.p, to: this.p, dur: until - this.t })
  }
  move(until: number, to: Pt, ease: Seg['ease'] = 'inout'): void {
    this.add({ from: this.p, to, dur: until - this.t, ease })
  }
  /** Carried by something that moves: `at` must start where the spark is. */
  ride(until: number, at: (t: number) => Pt, perSecond = 40): void {
    const a = at(this.t)
    if (dist(a, this.p) > 2e-3) console.warn(`spark: loft-sneak rides from ${a.map((v) => v.toFixed(3))}, not ${this.p.map((v) => v.toFixed(3))} at ${this.t.toFixed(3)}`)
    const n = Math.max(1, Math.round((until - this.t) * perSecond))
    for (const seg of carried(at, this.t, until, n)) this.add(seg)
    this.p = at(until)
  }
  /** Spring off: a push along the take-off velocity from now to `launch`, then the flight landing on `to` at `land`. */
  leap(launch: number, land: number, to: Pt, g = G): void {
    const tau = launch - this.t
    const T = land - launch
    const S = this.p
    const k = 1 + tau / (2 * T)
    const v0: Pt = [(to[0] - S[0]) / T / k, ((to[1] - S[1]) / T - (g * T) / 2) / k]
    const F: Pt = [S[0] + (v0[0] * tau) / 2, S[1] + (v0[1] * tau) / 2]
    if (tau > 1e-6) this.add({ from: S, to: F, dur: tau, ease: 'in' })
    this.add({ from: F, to, dur: T, arc: (g * T * T) / 8 })
  }
  /** A flight from here now, with no push: a bounce, or a fling. */
  fly(land: number, to: Pt, g = G): void {
    const T = land - this.t
    this.add({ from: this.p, to, dur: T, arc: (g * T * T) / 8 })
  }
}

/** Smooth steps through keys [t, v]: eased in and out between each two, held outside them. */
function keyed(keys: [number, number][]): (t: number) => number {
  return (t: number) => {
    if (t <= keys[0][0]) return keys[0][1]
    for (let i = 1; i < keys.length; i++) {
      const [t1, v1] = keys[i]
      if (t <= t1) {
        const [t0, v0] = keys[i - 1]
        const u = (t - t0) / (t1 - t0)
        return v0 + (v1 - v0) * (0.5 - 0.5 * Math.cos(Math.PI * u))
      }
    }
    return keys[keys.length - 1][1]
  }
}

/** Looking about in the lift's pan: east at the candle it left and the cat, west where it is going. */
const liftLean = keyed([
  [BEAT.pan + 0.1, 0],
  [7.55, 0.07],
  [8.2, 0.07],
  [8.7, -0.05],
  [9.7, -0.05],
  [BEAT.out - 0.2, 0],
])
/** In the balance's pan: it settles, looks up west at the snuffer as it falls, and braces. */
const balLean = keyed([
  [BEAT.balance + 0.05, 0],
  [BEAT.trip + 0.15, -0.02],
  [BEAT.trip + 0.45, -0.07],
  [BEAT.clang - 0.25, -0.07],
  [BEAT.clang - 0.05, 0.03],
])

/** A flinch on a knock: the flame ducks at once and comes up slowly. */
const flinch = (t: number): number => {
  let v = 0
  for (const [k, a] of [
    [BEAT.knocks[0], 0.05],
    [BEAT.reknocks[0], 0.03],
    [BEAT.knocks[1], 0.05],
  ]) {
    const u = t - k
    if (u < 0 || u > 4) continue
    v += a * (1 - Math.exp(-u / 0.035)) * Math.exp(-u / 0.7)
  }
  return v
}
/** The spark standing on the pole at x, flinching. */
const onPoleF = (x: number, t: number): Pt => {
  const [px, py] = onPole(x, t)
  return [px, py + flinch(t)]
}

/** Where the spark stands on the pole between hops, key by key: small careful slides, a wobble, the glances at the cat. */
const POLE_KEYS: [number, number][][] = [
  [
    [BEAT.pole, POLE_IN],
    [17.05, -8.43],
    [17.25, -8.3],
    [17.45, -8.36],
    [17.7, -8.52],
    [HOPS[0].launch - 0.08, -8.6],
  ],
  [
    [HOPS[0].land, HOPS[0].x],
    [19.014, -9.32],
    [19.3, -9.4],
    [HOPS[1].launch - 0.08, -9.44],
  ],
  [
    [HOPS[1].land, HOPS[1].x],
    [20.385, -10.22],
    [HOPS[2].launch - 0.08, -10.26],
  ],
  [
    [HOPS[2].land, HOPS[2].x],
    [21.489, -11.14],
    [HOPS[3].launch - 0.08, -11.18],
  ],
  [
    [HOPS[3].land, HOPS[3].x],
    [22.6, -12.08],
    [HOPS[4].launch - 0.08, -12.12],
  ],
  [
    [HOPS[4].land, HOPS[4].x],
    [23.711, -13.04],
    [HOPS[5].launch - 0.08, -13.08],
  ],
  [
    [HOPS[5].land, HOPS[5].x],
    [q(2, 10), -14.3],
    [BEAT.knocks[0], -14.3],
    [BEAT.knocks[0] + 0.3, -14.24],
    [BEAT.reknocks[0], -14.24],
    [BEAT.reknocks[0] + 0.22, -14.29],
    [HOPS[6].launch - 0.08, -14.32],
  ],
  [],
  [
    [HOPS[7].land, HOPS[7].x],
    [q(2, 22), -16.16],
    [BEAT.knocks[1], -16.16],
    [BEAT.knocks[1] + 0.2, -16.14],
  ],
]
const LEAP_PUSH = 0.07

/** The whole lane, from the wick to `HANDOFF`, and the time of the part's first strike (the landing in the lift). */
export function buildLane(): { segs: Seg[]; fire: number } {
  const path = new Path(0, WICK)
  // The candle, burning. It stirs on the theme's first note, leans west, looks east at the cat, crouches, and hops.
  path.hold(BEAT.stir)
  path.move(BEAT.stir + 0.26, [WICK[0], WICK[1] - 0.035])
  path.move(BEAT.leanWest - 0.02, WICK)
  path.move(BEAT.leanWest + 0.36, [WICK[0] - 0.1, WICK[1] + 0.015])
  path.hold(BEAT.look - 0.04)
  path.move(BEAT.look + 0.28, [WICK[0] + 0.11, WICK[1] - 0.015])
  path.hold(5.9)
  path.move(BEAT.leave - LEAP_PUSH, [WICK[0] - 0.04, WICK[1] + 0.04])
  const inPan = (t: number): Pt => [LIFT.x + liftLean(t), panY(t) - R]
  path.leap(BEAT.leave, BEAT.pan, inPan(BEAT.pan))
  // Down in the lift, a notch a note.
  path.ride(BEAT.out - LEAP_PUSH, inPan, 60)
  // Out over the pan's rim onto the bench; two tiptoes; a look at the wick; over it.
  path.leap(BEAT.out, BEAT.bench, [-2.55, ON_BENCH])
  path.fly(BEAT.tiptoes[0], [-2.72, ON_BENCH])
  path.fly(BEAT.tiptoes[1], [-2.88, ON_BENCH])
  path.move(11.45, [-2.94, ON_BENCH - 0.02])
  path.move(BEAT.hankGo - LEAP_PUSH, [-2.86, ON_BENCH])
  path.leap(BEAT.hankGo, BEAT.hankLand, [-3.6, ON_BENCH])
  path.hold(BEAT.balGo - 0.09)
  // Up into the balance's east pan.
  const inBal = (t: number): Pt => {
    const [x, y] = panUnder(beamEnd(beamTilt(t), 1))
    return [x + balLean(t), y - R]
  }
  path.leap(BEAT.balGo, BEAT.balance, inBal(BEAT.balance))
  path.ride(BEAT.clang, inBal, 60)
  // Flung: over the balance and the snuffer, up onto the rack's pole.
  path.fly(BEAT.pole, onPoleF(POLE_IN, BEAT.pole))
  // The tightrope.
  for (let i = 0; i <= HOPS.length; i++) {
    const keys = POLE_KEYS[i]
    if (keys.length) {
      const x = keyed(keys)
      const end = i < HOPS.length ? HOPS[i].launch - (HOPS[i].bounce ? 0 : 0.08) : BEAT.cup - 0.552 - LEAP_PUSH
      path.ride(end, (t) => onPoleF(x(t), t))
    }
    if (i === HOPS.length) break
    const h = HOPS[i]
    const at = onPoleF(h.x, h.land)
    if (h.bounce) path.fly(h.land, at)
    else path.leap(h.launch, h.land, at)
  }
  // Off the pole's end into the candle arm's socket; the arm sinks; it crouches, and hops off onto the wheel.
  const inCup = (t: number): Pt => inSocket(armAngle(t))
  path.leap(BEAT.cup - 0.552 + 0, BEAT.cup, inCup(BEAT.cup))
  path.ride(BEAT.spring, inCup, 60)
  path.leap(BEAT.leave2, LOFT_SEAM, HANDOFF)
  return { segs: path.segs, fire: BEAT.pan }
}

/** Every strike, show seconds: the landings, the notches, the trip, the clang, the knocks. */
export const HITS: number[] = [
  BEAT.pan,
  ...BEAT.notches,
  BEAT.touch,
  BEAT.bench,
  ...BEAT.tiptoes,
  BEAT.hankLand,
  BEAT.balance,
  BEAT.trip,
  BEAT.clang,
  BEAT.pole,
  ...HOPS.map((h) => h.land),
  ...BEAT.knocks,
  BEAT.reknocks[0],
  BEAT.cup,
].sort((a, b) => a - b)

/* ------------------------------------------------------------------ the camera */

/**
 * The camera. The loft whole on the horns (the candle, the bench, the stove and the cat asleep before it), then in on
 * the candle for the theme. With the hop into the pan it takes in the windlass and the pan in one frame and holds
 * while the pan goes down a notch a note. Close along the bench; the balance and the snuffer framed whole; with the
 * fling up to the pole; along the tightrope. Close on the rack for the jostle and the first knock (25.653) and its
 * knock again (26.57): the pair swinging together and the spark ducking fill the frame. Then, the spark frozen, the
 * camera draws back and down the room to find the cat by the stove (a look over its shoulder), and settles on the
 * two-shot as the spark tiptoes on to the pole's end, so the second knock (28.961) and the ear's flick are in one
 * frame. The cat is 21 cells east and 11 down, and the spark must stay inside the middle two thirds (Zoom), so that
 * two-shot can be no tighter than about 16 cells. From it, in again to the arm and the hop onto the wheel, the whole
 * wheel in view (LOFT-B's first framing, 9.6 cells, follows on from it without a bounce).
 */
export const SHOTS: PartShot[] = [
  { t: 0.001, cells: 15.6, hold: [-3.0, 4.4], w: 1 },
  { t: 2.0, cells: 14.8, hold: [-2.6, 4.1], w: 1 },
  { t: 4.25, cells: 4.3, hold: [-0.75, 0.55], w: 1 },
  { t: 5.9, cells: 4.1, hold: [-0.9, 0.5], w: 0.85 },
  { t: 7.15, cells: 6.7, hold: [-1.6, -0.05], w: 0.95 },
  { t: 9.45, cells: 6.5, hold: [-1.7, 0.1], w: 0.95 },
  { t: 10.6, cells: 4.6, hold: [-2.5, 1.3], w: 0.8 },
  { t: 12.2, cells: 4.5, hold: [-3.5, 1.4], w: 0.8 },
  { t: 13.6, cells: 5.0, hold: [-5.3, 0.65], w: 0.9 },
  { t: 15.55, cells: 5.2, hold: [-5.55, 0.5], w: 0.9 },
  { t: 16.9, cells: 5.6, off: [-0.35, 0.75], w: 0 },
  { t: 19.8, cells: 4.7, off: [-0.25, 0.55], w: 0 },
  { t: 22.7, cells: 6.0, off: [-0.3, 0.85], w: 0 },
  { t: 24.6, cells: 5.5, hold: [-14.35, -0.8], w: 1 },
  { t: 26.65, cells: 5.1, hold: [-14.6, -0.85], w: 1 },
  { t: 27.55, cells: 10.2, hold: [-11.9, 1.0], w: 1 },
  // The two-shot: the spark as far west as Zoom lets it be, so the cat's head is whole at the east edge until the
  // ear's second flick is done (29.2).
  { t: 28.35, cells: 16.9, hold: [-6.45, 3.4], w: 1 },
  { t: 29.35, cells: 16.85, hold: [-6.5, 3.45], w: 1 },
  { t: 30.4, cells: 9.2, hold: [-15.4, 2.55], w: 0.85 },
  { t: LOFT_SEAM, cells: 9.4, hold: [-17.4, 2.7], w: 0.85 },
]
