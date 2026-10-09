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
  // Still until her first push (24.131), from the bottom.
  [24.131, 0],
  [25.397, 9],
  [27.196, -8.5],
  [28.706, 13],
  [30.273, -12.5],
  [32.311, 17],
  [34.453, -16.5],
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
  [59.362, -32.5],
  // The top of the last big arc: she lets go and leaps (61.365).
  [61.365, 35],
  // The empty seat comes back to Louise, who catches it (63.286), and it swings on only a little.
  [63.286, -23],
  [65.707, 10],
  // Hannah back on it, Louise steadying it (68.011); it settles, still, as the light goes.
  [68.011, -6],
  [69.927, 2.6],
  [71.953, 0],
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

/** The swing's angle at show time `t`, radians: the pendulum, and the empty seat kicked back as she leaps off it. */
export function theta(t: number): number {
  const s = t - 61.365
  const kick = s > 0 && s < 1.6 ? -KICK * (s / KICK_T) * Math.exp(1 - s / KICK_T) : 0
  return swingAngle(t) + kick
}
const KICK = 6 * DEG
const KICK_T = 0.16
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

/** Her size: a child at the swing's start, a girl by the second voice; a young woman in what Louise sees. */
export const hannahScale = (t: number): number =>
  t < 150 ? HANNAH_AGE.child + (HANNAH_AGE.girl - HANNAH_AGE.child) * smooth(t, 26.5, 61) : HANNAH_AGE.young

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
 * Her leap from the top of the last big arc (61.365): off the seat, up out through the leaves, down on the grass on
 * the beat (62.357); she rolls on, turns, comes back, and hops back onto the seat as Louise steadies it (68.011).
 */
export const LEAP = 61.365
export const LANDS = 62.357
export const BACK_ON = 68.011
const LAND_X = 65.3
const ROLL_OUT = 0.62
const HOP_FROM_X = 60.78
const HOP_T = 0.42
const groundH = (t: number) => R - R * hannahScale(t)

const leapFrom = (): Pt => seatedAt(LEAP)
const leapV = (): Pt => launch(leapFrom(), [LAND_X, groundH(LANDS)], LANDS - LEAP).out

/**
 * Where her mark looks (radians, y down): a head, not a wheel. Out toward the lake as she swings; round to the way she
 * runs when she comes back for the seat, and out again once she is on it.
 */
const LOOK_OUT = -0.4
const LOOK_BACK = -Math.PI + 0.4
export function hannahLook(t: number): number {
  if (t > 150 || t < LANDS) return LOOK_OUT
  const round = smooth(t, LANDS + ROLL_OUT + 0.05, LANDS + ROLL_OUT + 0.6) - smooth(t, BACK_ON + 0.1, BACK_ON + 0.8)
  return LOOK_OUT + (LOOK_BACK - LOOK_OUT) * round
}

/** Hannah at show time `t` (world cells), and her size; null outside the lawn's two legs. */
export function hannahAt(t: number): { x: number; y: number; scale: number } | null {
  const scale = hannahScale(t)
  if (t < LEAP || t >= BACK_ON || t > 150) {
    const [x, y] = seatedAt(t)
    return { x, y, scale }
  }
  if (t < LANDS) {
    const s = t - LEAP
    const [x0, y0] = leapFrom()
    const [vx, vy] = leapV()
    return { x: x0 + vx * s, y: y0 + vy * s + 0.5 * G * s * s, scale }
  }
  const y = groundH(t)
  const vx = leapV()[0]
  const xStop = LAND_X + (vx * ROLL_OUT) / 2
  if (t < LANDS + ROLL_OUT) {
    // She lands bouncing, a child's landing: a small hop up off the grass as she runs on. (Rolled flat to a stop and
    // left there, she read as thrown off the swing, lying still.) Low, about her own height: four times it, caught in
    // the air she hung against the lake, afloat on it.
    const s = t - LANDS
    const u = s / ROLL_OUT
    return { x: LAND_X + vx * s - (vx * s * s) / (2 * ROLL_OUT), y: y - 0.15 * 4 * u * (1 - u), scale }
  }
  const hop = BACK_ON - HOP_T
  // And straight back for the seat, running, there with a beat in hand to wait for it.
  const back0 = LANDS + ROLL_OUT + 0.12
  const back1 = hop - 1.3
  if (t < hop) {
    const u = smooth(t, back0, back1)
    return { x: xStop + (HOP_FROM_X - xStop) * u, y, scale }
  }
  // The hop onto the seat: a parabola from the grass in front of it onto it, landing on the chord.
  const [x1, y1] = seatedAt(BACK_ON)
  const s = (t - hop) / HOP_T
  const arc = (G * HOP_T * HOP_T) / 8
  return { x: HOP_FROM_X + (x1 - HOP_FROM_X) * s, y: y + (y1 - y) * s - arc * 4 * s * (1 - s), scale }
}

/* ------------------------------------------------------------------ Louise */

/** Every time Louise's front meets the seat: her pushes (at the back of the arc, on the chords), the catch, the steadying. */
export interface Touch {
  t: number
  /** How long she stays with the seat, pushing, before it outruns her. */
  carry: number
}
export const SWING_TOUCHES: Touch[] = [
  { t: 24.131, carry: 0.26 },
  ...[27.196, 30.273, 34.453, 38.609, 43.207, 46.353, 50.486, 55.449, 59.362].map((t) => ({ t, carry: 0.18 })),
  // The empty seat, caught.
  { t: 63.286, carry: 0.2 },
  // Steadying it as Hannah climbs back on.
  { t: 68.011, carry: 0.3 },
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
    swing: louiseLane(HERE, SEAM.swing, SWING_TOUCHES, HERE, SEAM.bed, SEAM.bed - 0.75),
    sees: louiseLane(SEES_FROM, SEAM.sees, SEES_TOUCHES, SEES_TO, SEAM.fog2, SEAM.fog2 - 0.35),
  }
  return lanes
}
/** Where Louise is at show time `t` on the lawn (world cells), or null when she is elsewhere. */
export function louiseAt(t: number): Pt | null {
  const L = louiseLanes()
  if (t >= SEAM.swing && t <= SEAM.bed) {
    const p = laneAt({ segs: L.swing, fire: 0 }, t - SEAM.swing)
    return [p.x, p.y]
  }
  if (t >= SEAM.sees && t <= SEAM.fog2) {
    const p = laneAt({ segs: L.sees, fire: 0 }, t - SEAM.sees)
    return [p.x, p.y]
  }
  return null
}
