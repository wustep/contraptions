import type { Pt } from '../../../../../parts'
import { R } from '../../../../../parts'
import { logogramAt } from '../cast'
import { G_LOW } from '../physics'

/**
 * The fog's machine, as numbers (no drawing here): the rings of ink the heptapods write, how each forms, turns and
 * closes, and where Louise is at every moment of the four stretches. Everything is in the fog's own cells and in show
 * seconds, and everything the drawing shows is read from here, so she never slides off the ink she rides.
 *
 * Physics. Gravity is `G_LOW`. In flight she draws the parabola it gives. On a ring she is a bead on the ring's
 * actual inner edge (the canonical ink's own thick and thin, `logogramAt`), under gravity and whatever the ring's
 * turn gives her: a push on a pulse (the ring whips round), or its drag. A ring is written where she needs it: its
 * ink begins exactly where she touches down, tangent to her flight, and ends exactly where she leaves, so she never
 * passes through ink; it closes behind her after.
 */

const TAU = Math.PI * 2
export const g = G_LOW

/* ------------------------------------------------------------------ small tools */

export const clamp01 = (u: number): number => Math.max(0, Math.min(1, u))
export const sstep = (u: number): number => {
  const v = clamp01(u)
  return v * v * (3 - 2 * v)
}
/** The inverse of smoothstep on [0, 1]. */
export const unsmooth = (y: number): number => 0.5 - Math.sin(Math.asin(1 - 2 * clamp01(y)) / 3)

/** A monotone cubic (Fritsch-Carlson) through `(t, v)` keys: a hold stays a hold, a run never overshoots. Clamped outside. */
export function mono(keys: [number, number][]): (t: number) => number {
  const n = keys.length
  const ts = keys.map((k) => k[0])
  const vs = keys.map((k) => k[1])
  const d: number[] = []
  for (let i = 0; i < n - 1; i++) d.push((vs[i + 1] - vs[i]) / Math.max(1e-9, ts[i + 1] - ts[i]))
  const m: number[] = new Array(n).fill(0)
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) continue
    const h0 = ts[i] - ts[i - 1]
    const h1 = ts[i + 1] - ts[i]
    const w1 = 2 * h1 + h0
    const w2 = h1 + 2 * h0
    m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i])
  }
  return (t: number) => {
    if (t <= ts[0]) return vs[0]
    if (t >= ts[n - 1]) return vs[n - 1]
    let i = 0
    while (i < n - 2 && t > ts[i + 1]) i++
    const h = ts[i + 1] - ts[i]
    const u = (t - ts[i]) / h
    const u2 = u * u
    const u3 = u2 * u
    return (2 * u3 - 3 * u2 + 1) * vs[i] + (u3 - 2 * u2 + u) * h * m[i] + (-2 * u3 + 3 * u2) * vs[i + 1] + (u3 - u2) * h * m[i + 1]
  }
}

/** The integral of a turn rate from `t0` (where the angle is `s0`), tabled: a ring's turn by show time. */
export function integrate(omega: (t: number) => number, t0: number, t1: number, s0 = 0, dt = 1 / 240): (t: number) => number {
  const n = Math.max(1, Math.ceil((t1 - t0) / dt))
  const h = (t1 - t0) / n
  const tab = new Float64Array(n + 1)
  tab[0] = s0
  for (let i = 0; i < n; i++) {
    const a = t0 + i * h
    tab[i + 1] = tab[i] + (h / 6) * (omega(a) + 4 * omega(a + h / 2) + omega(a + h))
  }
  const w0 = omega(t0)
  const w1 = omega(t1)
  return (t: number) => {
    if (t <= t0) return s0 + w0 * (t - t0)
    if (t >= t1) return tab[n] + w1 * (t - t1)
    const f = (t - t0) / h
    const i = Math.min(n - 1, Math.floor(f))
    return tab[i] + (tab[i + 1] - tab[i]) * (f - i)
  }
}

/** A hit and its long recovery: 0 before, up to 1 at `tau` seconds after, decaying after (its area is `tau·e`). */
export const kick = (since: number, tau = 0.12): number => (since <= 0 ? 0 : (since / tau) * Math.exp(1 - since / tau))

/* ------------------------------------------------------------------ rings */

/** A blot a writer pressed into a ring: where (its own turn), how big, and when. */
export interface Mark {
  a: number
  size: number
  width: number
  at: number
}

export interface Ring {
  key: string
  seed: number
  r: number
  c: Pt
  /** The first ink (show time), and the angle it began at (the ring's own turn). */
  born: number
  /** When its two ends meet, and when its tendrils have all come out. */
  closed: number
  whole: number
  /** The formed arc's two ends by show time, in its own turn (lo <= hi; closed once hi - lo reaches 2π). */
  lo: (t: number) => number
  hi: (t: number) => number
  /** Its turn by show time. */
  spin: (t: number) => number
  marks: Mark[]
  /** Radians over which a forming end tapers. */
  taper: number
  /** 1 in her plane; less is further back (paler, and moving less with the camera). */
  depth: number
  light: number
  /** When it begins to fade, and over how long (`FADE` if unset). */
  fade: number
  fadeFor?: number
  /** Its form once closed (0.7 .. 1: its tendrils coming out), by show time, where it has its own timing. */
  grow?: (t: number) => number
  /** Who wrote it, with which limb, and the spray's flight (show times; it lands at `born`). */
  by?: { who: 'costello' | 'abbott'; limb: number; t0: number }
}

/** How long a written ring takes to fade to nothing, once it begins to. */
export const FADE = 38

/** The ring's breath (the canonical drawing's): the radius swells by a hundredth, slowly. */
export const breathe = (ring: Ring, t: number): number => 1 + 0.01 * Math.sin(t * 0.9 + ring.seed)

/** The marks as they are at `t` (each swelling in over a tenth of a second from when it was laid). */
export function marksAt(ring: Ring, t: number): { a: number; size: number; width: number; grow: number }[] | undefined {
  if (!ring.marks.length) return undefined
  const out: { a: number; size: number; width: number; grow: number }[] = []
  // Each pressed in on its pulse with a little more ink than stays, spreading back over a quarter second.
  for (const m of ring.marks) if (t > m.at) out.push({ a: m.a, size: m.size, width: m.width, grow: sstep((t - m.at) / 0.09) * (1 + 0.35 * Math.exp(-(t - m.at) / 0.25)) })
  return out.length ? out : undefined
}

/** How far from the ring's centre the ball's centre is when she rides its inside at screen angle `a`. */
export function rideR(ring: Ring, a: number, t: number): number {
  const { mid, half } = logogramAt({ r: ring.r, seed: ring.seed, marks: marksAt(ring, t) }, a - ring.spin(t))
  return (mid - half) * breathe(ring, t) - R
}

/** Where the ball is riding the ring's inside at screen angle `a`. */
export function onRing(ring: Ring, a: number, t: number): Pt {
  const rr = rideR(ring, a, t)
  return [ring.c[0] + Math.cos(a) * rr, ring.c[1] + Math.sin(a) * rr]
}

/** The point on the ink's middle line at screen angle `a` (where a spray lands, where a limb touches). */
export function onInk(ring: Ring, a: number, t: number): Pt {
  const { mid } = logogramAt({ r: ring.r, seed: ring.seed, marks: marksAt(ring, t) }, a - ring.spin(t))
  const rr = mid * breathe(ring, t)
  return [ring.c[0] + Math.cos(a) * rr, ring.c[1] + Math.sin(a) * rr]
}

/** What the canonical drawing is given for this ring at `t`, or null before its first ink. */
export function inkAt(ring: Ring, t: number): { start: number; form: number; spin: number; fade: number; taper: number } | null {
  if (t < ring.born) return null
  const spin = ring.spin(t)
  const fade = clamp01((t - ring.fade) / (ring.fadeFor ?? FADE))
  if (t >= ring.closed) {
    const lo = ring.lo(ring.closed)
    const hi = ring.hi(ring.closed)
    const form = ring.grow ? ring.grow(t) : 0.7 + 0.3 * sstep((t - ring.closed) / Math.max(0.1, ring.whole - ring.closed))
    return { start: (lo + hi) / 2, form, spin, fade, taper: ring.taper }
  }
  const lo = ring.lo(t)
  const hi = ring.hi(t)
  const span = Math.max(0, Math.min(Math.PI, (hi - lo) / 2))
  // As the gap closes the ends blunten, so the ring closes on its strike without a thin pinch that pops.
  const gap = TAU - 2 * span
  const taper = Math.min(ring.taper, Math.max(0.015, 0.3 * gap))
  return { start: (lo + hi) / 2, form: 0.7 * unsmooth(span / Math.PI) * 0.9999, spin, fade, taper }
}

/* ------------------------------------------------------------------ her motion */

/** A stretch of her path: where she is from `t0` to `t1` (show time), world cells. */
export interface Leg {
  t0: number
  t1: number
  at: (t: number) => Pt
  /** What she is doing, for the camera and the check. */
  what: 'held' | 'fall' | 'ride' | 'fly' | 'carried' | 'pen'
  ring?: Ring
}

export class Path {
  legs: Leg[] = []
  add(leg: Leg): this {
    this.legs.push(leg)
    return this
  }
  get end(): number {
    return this.legs[this.legs.length - 1].t1
  }
  at(t: number): Pt {
    const legs = this.legs
    if (t <= legs[0].t0) return legs[0].at(legs[0].t0)
    for (const l of legs) if (t <= l.t1) return l.at(Math.max(l.t0, t))
    const last = legs[legs.length - 1]
    return last.at(last.t1)
  }
  /** Velocity at `t` (a small central difference, kept inside the leg that has `t`). */
  vel(t: number, h = 1e-4): Pt {
    const leg = this.legs.find((l) => t >= l.t0 && t <= l.t1) ?? this.legs[this.legs.length - 1]
    const a = Math.max(leg.t0, t - h)
    const b = Math.min(leg.t1, t + h)
    const p = leg.at(a)
    const q = leg.at(b)
    return [(q[0] - p[0]) / (b - a), (q[1] - p[1]) / (b - a)]
  }
  legAt(t: number): Leg {
    return this.legs.find((l) => t >= l.t0 && t <= l.t1) ?? this.legs[this.legs.length - 1]
  }
}

/** A flight from `p0` with velocity `v0` at `t0`, under gravity. */
export const flight = (p0: Pt, v0: Pt, t0: number) => (t: number): Pt => {
  const s = t - t0
  return [p0[0] + v0[0] * s, p0[1] + v0[1] * s + 0.5 * g * s * s]
}
export const flightVel = (v0: Pt, t0: number, t: number): Pt => [v0[0], v0[1] + g * (t - t0)]

/**
 * A ride on a ring's inside: a bead on the ink's actual inner edge (so the thick and thin of the ink is felt), from
 * screen angle `a0` and angular speed `w0` at `t0`, under gravity, a push along her way (`push(t)`, cells/s², toward
 * the way she is going round: decreasing angle, counter-clockwise on the screen) and the ink's drag `drag` (1/s).
 * Tabled at 480 Hz; returns her screen angle and its rate by time.
 */
export function ride(ring: Ring, t0: number, t1: number, a0: number, w0: number, push: (t: number) => number = () => 0, drag = 0): { a: (t: number) => number; w: (t: number) => number } {
  // (It runs backward in time too, when `t1` is before `t0`: what a ride must have been to end as asked.)
  const dt = 1 / 480
  const n = Math.max(1, Math.ceil(Math.abs(t1 - t0) / dt))
  const h = (t1 - t0) / n
  const A = new Float64Array(n + 1)
  const W = new Float64Array(n + 1)
  const e = 1e-3
  const acc = (t: number, a: number, w: number): number => {
    const pm = onRing(ring, a - e, t)
    const p0 = onRing(ring, a, t)
    const pp = onRing(ring, a + e, t)
    const pa: Pt = [(pp[0] - pm[0]) / (2 * e), (pp[1] - pm[1]) / (2 * e)]
    const paa: Pt = [(pp[0] - 2 * p0[0] + pm[0]) / (e * e), (pp[1] - 2 * p0[1] + pm[1]) / (e * e)]
    const L2 = pa[0] * pa[0] + pa[1] * pa[1]
    const L = Math.sqrt(L2)
    return (g * pa[1] - (pa[0] * paa[0] + pa[1] * paa[1]) * w * w) / L2 - push(t) / L - drag * w
  }
  let a = a0
  let w = w0
  A[0] = a
  W[0] = w
  for (let i = 0; i < n; i++) {
    const t = t0 + i * h
    const k1a = w
    const k1w = acc(t, a, w)
    const k2a = w + (h / 2) * k1w
    const k2w = acc(t + h / 2, a + (h / 2) * k1a, k2a)
    const k3a = w + (h / 2) * k2w
    const k3w = acc(t + h / 2, a + (h / 2) * k2a, k3a)
    const k4a = w + h * k3w
    const k4w = acc(t + h, a + h * k3a, k4a)
    a += (h / 6) * (k1a + 2 * k2a + 2 * k3a + k4a)
    w += (h / 6) * (k1w + 2 * k2w + 2 * k3w + k4w)
    A[i + 1] = a
    W[i + 1] = w
  }
  const look = (tab: Float64Array) => (t: number): number => {
    const f = Math.max(0, Math.min(n, (t - t0) / h))
    const i = Math.min(n - 1, Math.floor(f))
    return tab[i] + (tab[i + 1] - tab[i]) * (f - i)
  }
  return { a: look(A), w: look(W) }
}

/** The screen angle of the ring's inside that is tangent to a flight arriving with velocity `v` riding counter-clockwise. */
export function catchAngle(v: Pt): number {
  // Riding counter-clockwise on the screen (decreasing angle), the centre is her velocity turned a quarter back.
  const l = Math.hypot(v[0], v[1])
  const n: Pt = [v[1] / l, -v[0] / l]
  return Math.atan2(-n[1], -n[0])
}

/**
 * The screen angle on the ring's actual inner edge (its thick and thin, not a circle) where, riding it
 * counter-clockwise, she moves along `v`: where a flight arriving with `v` is exactly tangent to it. Near the
 * circle's answer; the ring's centre does not matter.
 */
export function tangentAngle(ring: Ring, v: Pt, t: number): number {
  const e = 1e-4
  const f = (a: number): number => {
    const p = onRing(ring, a - e, t)
    const q = onRing(ring, a + e, t)
    return -(q[0] - p[0]) * v[1] + (q[1] - p[1]) * v[0]
  }
  let a = catchAngle(v)
  for (let i = 0; i < 30; i++) {
    const fa = f(a)
    const d = (f(a + 1e-5) - fa) / 1e-5
    if (Math.abs(d) < 1e-12) break
    const step = Math.max(-0.2, Math.min(0.2, fa / d))
    a -= step
    if (Math.abs(step) < 1e-12) break
  }
  return a
}

/** A ring placed so that its inside is tangent to her at `p` (arriving at `t`), at screen angle `a`. */
export function placeRing(ring: Omit<Ring, 'c'> & { c?: Pt }, p: Pt, a: number, t: number): Ring {
  const probe = { ...ring, c: [0, 0] as Pt } as Ring
  const rr = rideR(probe, a, t)
  return { ...ring, c: [p[0] - Math.cos(a) * rr, p[1] - Math.sin(a) * rr] } as Ring
}
