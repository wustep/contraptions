import type { Pt, Seg } from '../../../../../parts'
import { carried } from '../kit'

/**
 * Motion the home builder's two rooms share (the nursery and the yard): how a lane is laid from a function of show
 * time with its strikes exactly on its knots, rubato pacing through keys, and the small shapes of a push, a settle
 * and a hop. Nothing here draws.
 */

export const clamp01 = (u: number): number => Math.max(0, Math.min(1, u))
/** 0..1 eased at both ends (smoothstep). */
export const inout = (u: number): number => {
  const v = clamp01(u)
  return v * v * (3 - 2 * v)
}
/** 0..1, gentler still at both ends (smootherstep): for starts from rest that must not lurch. */
export const soft = (u: number): number => {
  const v = clamp01(u)
  return v * v * v * (v * (v * 6 - 15) + 10)
}
/** 0..1 leaving fast and settling long. */
export const settle = (u: number, p = 3): number => 1 - Math.pow(1 - clamp01(u), p)

/**
 * A monotone cubic through (t, x) anchors (Fritsch-Carlson): a move paced by phrases that never stops between
 * anchors going the same way and never overshoots one. `v0` and `v1` are the speeds at the two ends (0: at rest),
 * signed the way the move goes.
 */
export function pchip(ts: number[], xs: number[], v0 = 0, v1 = 0): (t: number) => number {
  const n = ts.length
  const h: number[] = []
  const d: number[] = []
  for (let i = 0; i < n - 1; i++) {
    h.push(ts[i + 1] - ts[i])
    d.push((xs[i + 1] - xs[i]) / (ts[i + 1] - ts[i]))
  }
  const m: number[] = new Array(n).fill(0)
  m[0] = v0
  m[n - 1] = v1
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) continue
    const w1 = 2 * h[i] + h[i - 1]
    const w2 = h[i] + 2 * h[i - 1]
    m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i])
  }
  return (t: number): number => {
    if (t <= ts[0]) return xs[0] + (t - ts[0]) * 0
    if (t >= ts[n - 1]) return xs[n - 1]
    let i = 0
    while (i < n - 2 && ts[i + 1] <= t) i++
    const H = h[i]
    const u = (t - ts[i]) / H
    const u2 = u * u
    const u3 = u2 * u
    return (2 * u3 - 3 * u2 + 1) * xs[i] + (u3 - 2 * u2 + u) * H * m[i] + (-2 * u3 + 3 * u2) * xs[i + 1] + (u3 - u2) * H * m[i + 1]
  }
}

/** A cubic from `a` leaving at speed `va` to `b` arriving at `vb`, `T` seconds apart, `u` (0..1) of the way. */
export function hermite(a: number, va: number, b: number, vb: number, T: number, u: number): number {
  const v = clamp01(u)
  const v2 = v * v
  const v3 = v2 * v
  return (2 * v3 - 3 * v2 + 1) * a + (v3 - 2 * v2 + v) * T * va + (-2 * v3 + 3 * v2) * b + (v3 - v2) * T * vb
}

/** A hop under gravity `g` from `a` to `b`, `T` seconds long, `u` (0..1) of the way: the parabola between the two. */
export function hopAt(a: Pt, b: Pt, T: number, g: number, u: number): Pt {
  const v = clamp01(u)
  return [a[0] + (b[0] - a[0]) * v, a[1] + (b[1] - a[1]) * v - ((g * T * T) / 8) * 4 * v * (1 - v)]
}

/**
 * The step response of a spring with a little damping (zeta 0.6 to 0.8): 0 before `s` = 0, rising to 1 with the
 * smallest overshoot and a long settle. What a rope does when it is hauled a notch, or a shelf when it is knocked.
 */
export function spring(s: number, period = 0.42, zeta = 0.7): number {
  if (s <= 0) return 0
  const wn = (2 * Math.PI) / period
  const wd = wn * Math.sqrt(1 - zeta * zeta)
  const e = Math.exp(-zeta * wn * s)
  return 1 - e * (Math.cos(wd * s) + ((zeta * wn) / wd) * Math.sin(wd * s))
}

/** A knock that rings down: 0 at the knock, out to about 1 and back through a few damped swings. */
export function ring(s: number, period = 0.5, tau = 0.35): number {
  if (s <= 0) return 0
  return Math.exp(-s / tau) * Math.sin((2 * Math.PI * s) / period) / Math.exp(-period / 4 / tau)
}

/**
 * A lane from a function of show time: straight pieces between knots (every strike and every change of phase is a
 * knot, so the ball is exactly where it should be on each), about `rate` pieces a second between them. The lane runs
 * from `begin` to `end` in show seconds; the knots are clipped to it.
 */
export function laneOf(at: (T: number) => Pt, begin: number, end: number, knots: number[], rate = 90): Seg[] {
  const ks = [begin, ...knots.filter((t) => t > begin + 1e-6 && t < end - 1e-6).sort((a, b) => a - b), end]
  const segs: Seg[] = []
  for (let i = 0; i + 1 < ks.length; i++) {
    const t0 = ks[i]
    const t1 = ks[i + 1]
    if (t1 - t0 < 1e-9) continue
    const n = Math.max(1, Math.round((t1 - t0) * rate))
    segs.push(...carried((t) => at(t + begin), t0 - begin, t1 - begin, n))
  }
  return segs
}
