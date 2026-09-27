/**
 * The small arithmetic the machine is built of: points, easing, a cubic between two moments that meets both in place
 * and in speed, and a flight under gravity that lands where and when it is asked to.
 */

export type Pt = [number, number]

/** Cells a second a second: a slow world, in which things fall as if through a little water. */
export const G = 6

export const clamp = (v: number, lo = 0, hi = 1): number => Math.max(lo, Math.min(hi, v))
export const lerp = (a: number, b: number, f: number): number => a + (b - a) * f
export const mix = (a: Pt, b: Pt, f: number): Pt => [lerp(a[0], b[0], f), lerp(a[1], b[1], f)]
export const add = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]]
export const sub = (a: Pt, b: Pt): Pt => [a[0] - b[0], a[1] - b[1]]
export const scale = (a: Pt, s: number): Pt => [a[0] * s, a[1] * s]
export const len = (a: Pt): number => Math.hypot(a[0], a[1])
export const dist = (a: Pt, b: Pt): number => Math.hypot(b[0] - a[0], b[1] - a[1])
/** The unit vector at `a` radians, clockwise on the screen from pointing right (y is down). */
export const dir = (a: number): Pt => [Math.cos(a), Math.sin(a)]

/** 0 until `a`, 1 from `b`, smooth between (zero slope at both ends). */
export function smooth(t: number, a: number, b: number): number {
  const u = clamp((t - a) / (b - a))
  return u * u * (3 - 2 * u)
}

/** As `smooth`, with zero curvature at both ends too: for a start that must not be felt. */
export function smoother(t: number, a: number, b: number): number {
  const u = clamp((t - a) / (b - a))
  return u * u * u * (u * (u * 6 - 15) + 10)
}

/** A moment of a moving point: where it is and how fast it is going there. */
export interface Knot {
  t: number
  p: Pt
  v: Pt
}

/** The cubic from one knot to the next: in place and in speed at both ends. */
export function hermite(a: Knot, b: Knot, t: number): Pt {
  const H = b.t - a.t
  const u = clamp((t - a.t) / H)
  const u2 = u * u
  const u3 = u2 * u
  const h00 = 2 * u3 - 3 * u2 + 1
  const h10 = u3 - 2 * u2 + u
  const h01 = -2 * u3 + 3 * u2
  const h11 = u3 - u2
  return [
    h00 * a.p[0] + h10 * H * a.v[0] + h01 * b.p[0] + h11 * H * b.v[0],
    h00 * a.p[1] + h10 * H * a.v[1] + h01 * b.p[1] + h11 * H * b.v[1],
  ]
}

/** A scalar cubic from (t0, x0, v0) to (t1, x1, v1). */
export function hermite1(t0: number, x0: number, v0: number, t1: number, x1: number, v1: number, t: number): number {
  const H = t1 - t0
  const u = clamp((t - t0) / H)
  const u2 = u * u
  const u3 = u2 * u
  return (2 * u3 - 3 * u2 + 1) * x0 + (u3 - 2 * u2 + u) * H * v0 + (-2 * u3 + 3 * u2) * x1 + (u3 - u2) * H * v1
}

/** A flight under G from `from` to `to` taking `T` seconds: the speed it must leave with. */
export const launch = (from: Pt, to: Pt, T: number): Pt => [(to[0] - from[0]) / T, (to[1] - from[1] - 0.5 * G * T * T) / T]

/** Where a flight that left `from` at `v` is `s` seconds later. */
export const fly = (from: Pt, v: Pt, s: number): Pt => [from[0] + v[0] * s, from[1] + v[1] * s + 0.5 * G * s * s]

/**
 * A monotone cubic (Fritsch-Carlson) through `(ts[i], xs[i])`: never overshoots, never runs backwards, so speed
 * carries through every knot. End slopes may be given.
 */
export function monotone(ts: number[], xs: number[], v0?: number, v1?: number): (t: number) => number {
  const n = ts.length
  const d = (i: number) => (xs[i + 1] - xs[i]) / (ts[i + 1] - ts[i])
  const m = new Array(n).fill(0)
  for (let i = 1; i < n - 1; i++) {
    const a = d(i - 1)
    const b = d(i)
    if (a * b <= 0) continue
    const h0 = ts[i] - ts[i - 1]
    const h1 = ts[i + 1] - ts[i]
    const w1 = 2 * h1 + h0
    const w2 = h1 + 2 * h0
    m[i] = (w1 + w2) / (w1 / a + w2 / b)
  }
  m[0] = v0 ?? d(0)
  m[n - 1] = v1 ?? d(n - 2)
  return (t: number) => {
    if (t <= ts[0]) return xs[0] + m[0] * (t - ts[0])
    if (t >= ts[n - 1]) return xs[n - 1] + m[n - 1] * (t - ts[n - 1])
    let lo = 0
    let hi = n - 2
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (ts[mid] <= t) lo = mid
      else hi = mid - 1
    }
    return hermite1(ts[lo], xs[lo], m[lo], ts[lo + 1], xs[lo + 1], m[lo + 1], t)
  }
}

/** A damped ring that starts at zero, with zero slope, and dies: what a struck thing does. */
export function ring(s: number, period: number, decay: number): number {
  if (s <= 0) return 0
  return (1 - Math.exp(-s / 0.015)) * Math.exp(-s / decay) * Math.sin((2 * Math.PI * s) / period)
}

/**
 * A damped return from 1 to 0 with no kick at the start (zero slope at s = 0): a counterweighted arm let go at the
 * end of its travel, overshooting a little and settling.
 */
export function settle(s: number, period: number, decay: number): number {
  if (s <= 0) return 1
  const w = (2 * Math.PI) / period
  return Math.exp(-s / decay) * (Math.cos(w * s) + Math.sin(w * s) / (w * decay))
}

export const hash = (a: number, b = 0, s = 0): number => {
  let h = (a * 374761393 + b * 668265263 + s * 1013904223) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}
