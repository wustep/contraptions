import type { Pt } from '../../../../../parts'

/**
 * Motion helpers for the town builder's parts (the shop and the curse): channels keyed in show time, so every
 * machine moves continuously through its beats and lands on them exactly.
 */

/** A key: at time `t` the channel is `v`, moving at `d` a second (0 when left out: at rest there). */
export type Key = [t: number, v: number, d?: number]

/**
 * A channel through keys: cubic Hermite between them, with the velocity each key gives, so it is continuous in
 * value and speed everywhere (a key with a speed of 0 is a stop; a key with a speed carries the move through).
 * Before the first key and after the last it holds.
 */
export function curve(keys: Key[]): (t: number) => number {
  return (t: number): number => {
    if (t <= keys[0][0]) return keys[0][1]
    for (let i = 1; i < keys.length; i++) {
      const [t1, v1, d1 = 0] = keys[i]
      if (t <= t1) {
        const [t0, v0, d0 = 0] = keys[i - 1]
        const h = t1 - t0
        if (h <= 1e-9) return v1
        const u = (t - t0) / h
        const u2 = u * u
        const u3 = u2 * u
        return (2 * u3 - 3 * u2 + 1) * v0 + (u3 - 2 * u2 + u) * h * d0 + (-2 * u3 + 3 * u2) * v1 + (u3 - u2) * h * d1
      }
    }
    return keys[keys.length - 1][1]
  }
}

/** A damped ring after a knock at `s` = 0: 0 before, then `a`·e^(−s/τ)·sin(ωs). */
export const ring = (s: number, a: number, w: number, tau: number): number => (s <= 0 ? 0 : a * Math.exp(-s / tau) * Math.sin(w * s))

/** A crisp step from 0 to 1 as `s` crosses zero: critically damped, no overshoot, done in a few `tau`. */
export const step = (s: number, tau = 0.05): number => (s <= 0 ? 0 : 1 - Math.exp(-s / tau) * (1 + s / tau))

/** A point on a segment from `a` along the unit direction toward `b`, `d` from `a`, lifted `up` along its upward normal. */
export function along(a: Pt, b: Pt, d: number, up: number): Pt {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
  const ux = (b[0] - a[0]) / L
  const uy = (b[1] - a[1]) / L
  // The normal that points up the screen (y down): (uy, -ux) or its opposite.
  let nx = uy
  let ny = -ux
  if (ny > 0) {
    nx = -nx
    ny = -ny
  }
  return [a[0] + ux * d + nx * up, a[1] + uy * d + ny * up]
}

/** Points a thing at angle `a` from a pivot, `r` away. */
export const polar = (o: Pt, r: number, a: number): Pt => [o[0] + r * Math.cos(a), o[1] + r * Math.sin(a)]
