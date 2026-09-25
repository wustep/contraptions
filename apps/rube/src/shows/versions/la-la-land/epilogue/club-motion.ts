import type { Pt } from '../../../../parts'
import { smooth } from './kit'

/**
 * Motion the club's parts share: rubato pacing along the keys, and the small
 * gestures of a ball that is a person (a glance, a nod, a step back).
 */

/**
 * A monotone cubic through (t, x) anchors (Fritsch-Carlson), so a roll paced
 * by phrases never stops between anchors that keep going the same way and
 * never overshoots one; the speed is continuous, which is what rubato is.
 * `v0` and `v1` are the speeds at the ends (0: at rest).
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
  m[0] = Math.min(v0, 3 * Math.abs(d[0]))
  m[n - 1] = Math.min(v1, 3 * Math.abs(d[n - 2]))
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) continue
    const w1 = 2 * h[i] + h[i - 1]
    const w2 = h[i] + 2 * h[i - 1]
    m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i])
  }
  return (t: number): number => {
    if (t <= ts[0]) return xs[0]
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

/** A gesture: out over `out` seconds from `at`, held for `hold`, back over `back`. 0..1. */
export const gesture = (t: number, at: number, out: number, hold: number, back: number): number => smooth(t, at, at + out) * (1 - smooth(t, at + out + hold, at + out + hold + back))

/** A step from 0 to 1 that starts at rest and gathers over a few `tau`s: a spring letting go, a lurch. */
export function gather(since: number, tau: number): number {
  if (since <= 0) return 0
  const at = (s: number) => 1 - (1 + s / tau + (s * s) / (2 * tau * tau)) * Math.exp(-s / tau)
  return Math.min(1, at(since) / at(14 * tau))
}

/** A cubic from `a` leaving at velocity `va` to `b` arriving at `vb`, `T` seconds apart, at `u` (0..1) of the way. */
export function hermite(a: Pt, va: Pt, b: Pt, vb: Pt, T: number, u: number): Pt {
  const h00 = 2 * u ** 3 - 3 * u ** 2 + 1
  const h10 = u ** 3 - 2 * u ** 2 + u
  const h01 = -2 * u ** 3 + 3 * u ** 2
  const h11 = u ** 3 - u ** 2
  return [h00 * a[0] + h10 * T * va[0] + h01 * b[0] + h11 * T * vb[0], h00 * a[1] + h10 * T * va[1] + h01 * b[1] + h11 * T * vb[1]]
}

/** Slow to start, gathering, easing in to rest: 4u³ − 3u⁴, whose speed rises as u² and falls to nothing. */
export const stroll = (u: number): number => {
  const v = Math.max(0, Math.min(1, u))
  return 4 * v * v * v - 3 * v * v * v * v
}

/** A hop under gravity `g` from `a` to `b`, `T` seconds long, at `u` of the way: the parabola between the two. */
export function hopAt(a: Pt, b: Pt, T: number, g: number, u: number): Pt {
  const v = Math.max(0, Math.min(1, u))
  return [a[0] + (b[0] - a[0]) * v, a[1] + (b[1] - a[1]) * v - ((g * T * T) / 8) * 4 * v * (1 - v)]
}
