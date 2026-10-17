import type { Pt, Seg } from '../../../../../parts'
import { laneAt, R } from '../../../../../parts'
import { carried } from '../kit'
import { G, launch } from '../physics'
import { SEAM } from '../music'
import { HANNAH_AGE } from '../worlds'

/**
 * The swing, as a machine: where everything is at every show time, in the house's world cells. The drawing
 * (`set.ts`) and the parts (`lawn.ts`) both read these, so the seat never slides out from under Hannah and Louise's
 * hands (a ball has none: her front) are always on the seat when she pushes.
 *
 * A pendulum whose rope is about a bar long (ROPE = G (T / 2π)², T about 4 s), so the swing keeps the bar: its back
 * extremes are the chords, where Louise meets the seat and pushes; its front extremes are half a bar on, where, once
 * the arcs are high enough, Hannah reaches the leaves at the end of the long limb.
 */

export const DEG = Math.PI / 180
const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const smooth = (t: number, a: number, b: number) => {
  const u = clamp01((t - a) / (b - a))
  return u * u * (3 - 2 * u)
}

/* ------------------------------------------------------------------ the place */

/** Where Louise stands at the swing's seams (in from the dawn, out to the bed): the swing part's origin is half a cell on. */
export const SWING_AT: Pt = [60, 0]
export const HERE: Pt = [SWING_AT[0] - 0.5, SWING_AT[1]]
/** From the branch to Hannah's middle. */
export const ROPE = 4.7
/** Where the ropes hang from: straight over Hannah when the swing hangs still. */
export const PIVOT: Pt = [SWING_AT[0] + 0.5, -0.35 - ROPE]
/**
 * The bank behind the swing is the swing's own arc, one cell back and 0.35 down (HANNAH_BY): wherever the swing's
 * back extreme is, she can stand at rest one cell behind it as at every seam into the lake house. Its centre, for a
 * ball's middle; the turf is R further out.
 */
export const BANK: Pt = [PIVOT[0] - 1, PIVOT[1] + 0.35]
/** The bank curves up to this steepness, then eases over TERRACE_W onto the terrace the house stands on. */
const PHI1 = 36 * DEG
const TERRACE_W = 2.4

/** The height of the ground's surface at `x` (y down). */
export function surface(x: number): number {
  const dx = x - BANK[0]
  if (dx >= 0) return R
  const r = ROPE + R
  const x1 = -r * Math.sin(PHI1)
  if (dx >= x1) return BANK[1] + Math.sqrt(r * r - dx * dx)
  const y1 = BANK[1] + r * Math.cos(PHI1)
  const m = Math.tan(PHI1)
  const d = Math.min(x1 - dx, TERRACE_W)
  return y1 - m * d + (m * d * d) / (2 * TERRACE_W)
}
/** Where a ball's middle is, resting on the ground at `x` (on the bank, R along its normal). */
export function rest(x: number): number {
  const dx = x - BANK[0]
  if (dx >= 0) return 0
  if (dx >= -ROPE * Math.sin(PHI1)) return BANK[1] + Math.sqrt(ROPE * ROPE - dx * dx)
  return surface(x) - R * 1.25
}
/** The point on the bank one cell behind the swing at back angle `a` (radians, positive): her place at a seam. */
export const bankAt = (a: number): Pt => [BANK[0] - ROPE * Math.sin(a), BANK[1] + ROPE * Math.cos(a)]

/* ------------------------------------------------------------------ the pendulum */

/**
 * The swing's angle at its extremes: [show time, degrees], forward (toward the lake end, +x) positive. Between two
 * extremes it moves as a pendulum does between them (a half cosine: still at each end, fastest between), so each
 * bar's swing is the real bar, from this chord to the next, however long the bar.
 */
type Key = [number, number]
const SWING_KEYS: Key[] = [
  [22.111, 0],
  // Still while Hannah runs off along the grass and back into her mother (the run, `RUN`), until the first push, from
  // the bottom, on the chord (30.273).
  [30.273, 0],
  [32.311, 13],
  [34.453, -12.5],
  [36.473, 20.5],
  // The second voice: she is a girl now; the arcs higher; the first time she reaches the leaves (40.902).
  [38.609, -20],
  [40.902, 24.8],
  [43.207, -24],
  [44.838, 27.5],
  [46.353, -26.5],
  [48.385, 30],
  [50.486, -29],
  [52.86, 32],
  [55.449, -31],
  [57.435, 33.5],
  // The back of the last arc, still for a moment, as the picture cuts to the room years on (59.362): Hannah on the seat
  // where the stool will have her.
  [59.362, -32.5],
]
/** What she sees in the fog: the same swing on a summer evening, going already; Louise pushes (254.108). */
const SEES_KEYS: Key[] = [
  [250.12, -18],
  [251.931, 18.6],
  [254.108, -18.5],
  [255.866, 25.2],
  [257.683, -24],
]
const keysAt = (t: number): Key[] => (t < 150 ? SWING_KEYS : SEES_KEYS)

/** The swing's angle at show time `t`, radians: the pendulum; the still seat kicked back as she hops off it, and
 * nudged on as she hops back onto it, both died away before the first push. */
export function theta(t: number): number {
  return swingAngle(t) + nudge(t - RUN.off, -KICK) + nudge(t - RUN.on, 0.6 * KICK)
}
const KICK = 3 * DEG
const nudge = (s: number, a: number): number => (s > 0 && s < 1.9 ? a * Math.sin(s * 4.6) * Math.exp(-s / 0.38) : 0)
function swingAngle(t: number): number {
  const keys = keysAt(t)
  if (t <= keys[0][0]) return keys[0][1] * DEG
  for (let i = 1; i < keys.length; i++) {
    const [t1, a1] = keys[i]
    if (t <= t1) {
      const [t0, a0] = keys[i - 1]
      const u = (t - t0) / (t1 - t0)
      return (a0 + ((a1 - a0) * (1 - Math.cos(Math.PI * u))) / 2) * DEG
    }
  }
  return keys[keys.length - 1][1] * DEG
}

/** The front extremes that reach the leaves (show times), and how far into them she goes (cells). */
export const REACH = 24.2 * DEG
export const BRUSHES: { t: number; depth: number }[] = [...SWING_KEYS, ...SEES_KEYS]
  .filter(([, a]) => a * DEG > REACH)
  .map(([t, a]) => ({ t, depth: ROPE * (a * DEG - REACH) }))

/* ------------------------------------------------------------------ Hannah */

/** Her size: a small child through the run, growing on the swing to a girl by the spring; a young woman in what
 * Louise sees. */
export const hannahScale = (t: number): number =>
  t < 150 ? HANNAH_AGE.child + (HANNAH_AGE.girl - HANNAH_AGE.child) * smooth(t, 30.3, 58.6) : HANNAH_AGE.young

const dir = (a: number): Pt => [Math.sin(a), Math.cos(a)]
const tan = (a: number): Pt => [Math.cos(a), -Math.sin(a)]
export const SEAT_T = 0.085
export const SEAT_W = 0.105

/** Where a rider sits at `t`: the rope's end, whatever the swing's angle. */
export function seatedAt(t: number): Pt {
  const [dx, dy] = dir(theta(t))
  return [PIVOT[0] + ROPE * dx, PIVOT[1] + ROPE * dy]
}
/** The seat plank at `t`: its middle, its forward direction, and its angle. */
export function seatAt(t: number): { c: Pt; f: Pt; a: number } {
  const a = theta(t)
  const [dx, dy] = dir(a)
  const r = ROPE + R * hannahScale(t) + SEAT_T / 2
  return { c: [PIVOT[0] + r * dx, PIVOT[1] + r * dy], f: tan(a), a }
}
/** Where Louise's middle is when her front is on the back of the seat at `t`. */
export function contactAt(t: number): Pt {
  const { c, f } = seatAt(t)
  return [c[0] - (SEAT_W + R) * f[0], c[1] - (SEAT_W + R) * f[1]]
}

/**
 * Come back to me (22.111 → 30.273): before the swing, the child's game in the film's prologue. On the beat she hops
 * down off the front of the still seat and runs away along the grass toward the water, looking back at her mother,
 * who comes a step after her and waits; at the far end she turns with a skip (the beat), and runs back, under the seat,
 * into her (the chord). She bounces off, and hops up onto the seat (the beat); her mother goes in under it to its back,
 * for the first push. (The swing alone held one slowly opening framing for its first 16 s.)
 */
export const RUN = {
  /** Off the seat. */
  off: 23.174,
  /** The skip at the far end, turning. */
  turn: 25.136,
  /** Back into her mother. */
  into: 27.196,
  /** Onto the seat. */
  on: 28.241,
}
const HOP_T = 0.42
const groundH = (t: number) => R - R * hannahScale(t)
/** Where she lands off the seat, how far she runs, and where Louise waits for her. */
const DOWN_X = 61.15
const FAR_X = 63.1
export const WAIT_X = 59.95
const INTO_X = WAIT_X + R + R * HANNAH_AGE.child
/** Off her a little, low, still under the seat; then out in front of it, to hop up onto it from there. */
const BOUNCE_X = INTO_X + 0.25
const BOUNCE_T = 0.3
const FRONT_X = 60.95
/** Leaving the turn, and leaving the bounce for the seat. */
const BACK_T = 25.55
const UP_T = RUN.on - HOP_T

/** A flight from `a` at `t0` to `b` at `t1` under gravity, at `t`. */
function flight(a: Pt, b: Pt, t0: number, t1: number, t: number): Pt {
  const T = t1 - t0
  const s = t - t0
  const v = launch(a, b, T).out
  return [a[0] + v[0] * s, a[1] + v[1] * s + 0.5 * G * s * s]
}
/** Running along the grass from `x0` (at `v0`) to `x1` (at `v1`) between two times: a child's run, skipping. */
function run(x0: number, v0: number, x1: number, v1: number, t0: number, t1: number, t: number): Pt {
  const T = t1 - t0
  const u = clamp01((t - t0) / T)
  const h00 = 2 * u ** 3 - 3 * u ** 2 + 1
  const h10 = u ** 3 - 2 * u ** 2 + u
  const h01 = -2 * u ** 3 + 3 * u ** 2
  const h11 = u ** 3 - u ** 2
  const x = h00 * x0 + h10 * T * v0 + h01 * x1 + h11 * T * v1
  const skip = 0.05 * Math.abs(Math.sin((Math.PI * (t - t0)) / 0.3)) * Math.sin(Math.PI * u)
  return [x, groundH(t) - skip]
}

/**
 * Where her mark looks (radians, y down): a head, not a wheel. Out toward the lake on the seat; back at her mother as
 * she runs from her and to her; out again once she is on the seat.
 */
const LOOK_OUT = -0.4
const LOOK_BACK = -Math.PI + 0.4
export function hannahLook(t: number): number {
  if (t > 150) return LOOK_OUT
  const back = smooth(t, RUN.off + 0.05, RUN.off + 0.45) - smooth(t, RUN.on + 0.1, RUN.on + 0.8)
  return LOOK_OUT + (LOOK_BACK - LOOK_OUT) * back
}

/** Hannah at show time `t` (world cells), and her size; null outside the lawn's two legs. */
export function hannahAt(t: number): { x: number; y: number; scale: number } | null {
  const scale = hannahScale(t)
  const at = (p: Pt) => ({ x: p[0], y: p[1], scale })
  if (t > 150 || t < RUN.off || t >= RUN.on) return at(seatedAt(t))
  const down: Pt = [DOWN_X, groundH(RUN.off + HOP_T)]
  if (t < RUN.off + HOP_T) return at(flight(seatedAt(RUN.off), down, RUN.off, RUN.off + HOP_T, t))
  const vDown = launch(seatedAt(RUN.off), down, HOP_T).in[0]
  const skipFrom = RUN.turn - 0.28
  if (t < skipFrom) return at(run(DOWN_X, vDown, FAR_X - 0.06, 0.4, RUN.off + HOP_T, skipFrom, t))
  // The skip at the far end, turning round on it.
  if (t < RUN.turn) return at(flight([FAR_X - 0.06, groundH(skipFrom)], [FAR_X, groundH(RUN.turn)], skipFrom, RUN.turn, t))
  if (t < BACK_T) return at([FAR_X, groundH(t)])
  // Back to her, under the seat, at a run into her.
  if (t < RUN.into) return at(run(FAR_X, 0, INTO_X, -2.1, BACK_T, RUN.into, t))
  // Off her a little, a bounce, out from under the seat, and up onto it from in front.
  if (t < RUN.into + BOUNCE_T) return at(flight([INTO_X, groundH(RUN.into)], [BOUNCE_X, groundH(RUN.into + BOUNCE_T)], RUN.into, RUN.into + BOUNCE_T, t))
  if (t < UP_T) return at(run(BOUNCE_X, 0.6, FRONT_X, 0, RUN.into + BOUNCE_T, UP_T, t))
  return at(flight([FRONT_X, groundH(UP_T)], seatedAt(RUN.on), UP_T, RUN.on, t))
}

/** Louise through the run: a step after her as she goes, waiting; giving a little as she runs into her; in under the
 * seat to its back once Hannah is on it, there at rest a beat before the first push. */
function runX(t: number): number {
  const X = firstPushX()
  if (t <= RUN.off + 0.3) return HERE[0]
  if (t < RUN.off + 1.5) return HERE[0] + (WAIT_X - HERE[0]) * smooth(t, RUN.off + 0.3, RUN.off + 1.5)
  if (t < RUN.into) return WAIT_X
  const u = t - RUN.into
  if (u < 0.8) return WAIT_X - 0.07 * Math.sin((Math.PI * u) / 0.8) * Math.exp(-u / 0.5)
  if (t < RUN.on + 0.1) return WAIT_X
  if (t < RUN_END - 0.05) return WAIT_X + (X - WAIT_X) * smooth(t, RUN.on + 0.1, RUN_END - 0.05)
  return X
}
/** The run's end for Louise: under the seat's back, at rest, a beat before the first push. */
const RUN_END = 29.304
/** Where she waits under the seat's back for the first push: the spot `louiseLane` hops up from. */
const firstPushX = (): number => contactAt(SWING_TOUCHES[0].t)[0] - 0.05

/**
 * The run again, at the end (341.618 → 345.490): the film's own ending brings back its prologue's Hannah as Louise
 * chooses, so the room by the window cuts for one chord to the run, a little slower, from Hannah running off to her
 * running back into her mother, on a strong note of the tune (344.276), and up onto the seat. Show time to the run's.
 */
export const RECALL = { bump: 344.276, rate: 0.9 }
export const recallTime = (t: number): number => RUN.into + (t - RECALL.bump) * RECALL.rate
/** Louise through the run (world cells), for the remembering of it. */
export const runLouiseAt = (r: number): Pt => [runX(r), rest(runX(r))]

/* ------------------------------------------------------------------ Louise */

/** Every time Louise's front meets the seat: her pushes, at the back of the arc, on the chords. */
export interface Touch {
  t: number
  /** How long she stays with the seat, pushing, before it outruns her. */
  carry: number
}
export const SWING_TOUCHES: Touch[] = [
  // The first push, from the bottom, once Hannah is back on the seat.
  { t: 30.273, carry: 0.26 },
  ...[34.453, 38.609, 43.207, 46.353, 50.486, 55.449].map((t) => ({ t, carry: 0.18 })),
]
export const SEES_TOUCHES: Touch[] = [{ t: 254.108, carry: 0.2 }]

const EPS = 1e-9
const hermite = (x0: number, v0: number, x1: number, T: number) => (s: number) => {
  const u = clamp01(s / T)
  const h00 = 2 * u ** 3 - 3 * u ** 2 + 1
  const h10 = u ** 3 - 2 * u ** 2 + u
  const h01 = -2 * u ** 3 + 3 * u ** 2
  return h00 * x0 + h10 * T * v0 + h01 * x1
}

/** Her lane as timed segments in world cells, from `from` (at rest at `t0`) through the touches to `to` (at rest by `t1`). */
export function louiseLane(from: Pt, t0: number, touches: Touch[], to: Pt, t1: number, arriveBy: number): Seg[] {
  const segs: Seg[] = []
  let at: Pt = from
  let now = t0
  const push = (s: Seg) => {
    if (s.dur <= EPS) return
    const gap = Math.hypot(s.from[0] - at[0], s.from[1] - at[1])
    if (gap > 1e-6) console.warn(`lawn: Louise's lane breaks by ${gap.toFixed(4)} at ${now.toFixed(3)}`)
    segs.push(s)
    at = s.to
    now += s.dur
  }
  const hold = (until: number) => push({ from: at, to: at, dur: until - now })
  // Along the ground from where she is (moving at `v`, cells a second along x) to `x`, arriving at rest at `until`.
  const roll = (x: number, v: number, until: number) => {
    const T = until - now
    if (T <= EPS) return
    const f = hermite(at[0], v, x, T)
    const start = now
    const n = Math.max(2, Math.ceil(T * 14))
    for (const s of carried((tt) => {
      const xx = f(tt - start)
      return [xx, rest(xx)]
    }, start, until, n)) push(s)
  }
  let v = 0
  for (const touch of touches) {
    const K = contactAt(touch.t)
    const X: Pt = [K[0] - 0.05, rest(K[0] - 0.05)]
    const up = Math.sqrt((2 * Math.max(0.02, X[1] - K[1])) / G)
    const off = touch.t - up
    // To the spot under the seat's back, a moment's gathering there, and up.
    if (Math.abs(at[0] - X[0]) > 1e-6 || v !== 0) {
      const lead = now < t0 + 1e-6 ? Math.min(0.5, (off - now) * 0.15) : 0
      hold(now + lead)
      roll(X[0], v, off - 0.22)
    }
    hold(off)
    push({ from: at, to: K, dur: up, arc: (G * up * up) / 8 })
    // With the seat, pushing, until it outruns her.
    const end = touch.t + touch.carry
    const n = Math.max(3, Math.ceil(touch.carry * 24))
    for (const s of carried(contactAt, touch.t, end, n)) push(s)
    // Off it, and down: a fall from where the seat let her go, at its speed, onto the grass.
    const a = contactAt(end - 0.01)
    const vr: Pt = [(at[0] - a[0]) / 0.01, (at[1] - a[1]) / 0.01]
    let T = 0.02
    const yAt = (s: number) => at[1] + vr[1] * s + 0.5 * G * s * s
    const xAt = (s: number) => at[0] + vr[0] * s
    while (T < 2 && yAt(T) < rest(xAt(T))) T += 0.004
    let lo = T - 0.004
    let hi = T
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2
      if (yAt(mid) < rest(xAt(mid))) lo = mid
      else hi = mid
    }
    T = hi
    const land: Pt = [xAt(T), rest(xAt(T))]
    push({ from: at, to: land, dur: T, arc: (G * T * T) / 8 })
    v = vr[0] * 0.8
  }
  roll(to[0], v, arriveBy)
  hold(t1)
  return segs
}

/* ------------------------------------------------------------------ her two lanes, once */

/** The vision's first and last places for her: at rest a cell behind the swing's back extreme, on the bank. */
export const SEES_FROM = bankAt(18 * DEG)
export const SEES_TO = bankAt(24 * DEG)

let lanes: { swing: Seg[]; sees: Seg[] } | null = null
/** Louise's lanes for the swing and the vision, in world cells (the parts shift them into their own frames). */
export function louiseLanes(): { swing: Seg[]; sees: Seg[] } {
  lanes ??= {
    swing: [
      ...carried((t) => [runX(t), rest(runX(t))], SEAM.swing, RUN_END, Math.ceil((RUN_END - SEAM.swing) * 30)),
      ...louiseLane([firstPushX(), rest(firstPushX())], RUN_END, SWING_TOUCHES, bankAt(32.5 * DEG), SEAM.teen, SEAM.teen - 0.75),
    ],
    sees: louiseLane(SEES_FROM, SEAM.sees, SEES_TOUCHES, SEES_TO, SEAM.fog2, SEAM.fog2 - 1.6),
  }
  return lanes
}
/** Where Louise is at show time `t` on the lawn (world cells), or null when she is elsewhere. */
export function louiseAt(t: number): Pt | null {
  const L = louiseLanes()
  if (t >= SEAM.swing && t <= SEAM.teen) {
    const p = laneAt({ segs: L.swing, fire: 0 }, t - SEAM.swing)
    return [p.x, p.y]
  }
  if (t >= SEAM.sees && t <= SEAM.fog2) {
    const p = laneAt({ segs: L.sees, fire: 0 }, t - SEAM.sees)
    return [p.x, p.y]
  }
  return null
}
