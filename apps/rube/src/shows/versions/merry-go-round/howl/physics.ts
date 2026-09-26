import type { Pt } from '../../../../parts'
import type { Way } from './kit'

/**
 * Gravity, in cells a second a second. A cell is a couple of feet (a door is about two and a half cells tall), so
 * this is a little under the real thing; `G_LOW` is for what floats: the sky walk, a star, a feather.
 */
export const G = 12
export const G_LOW = 2.6

/**
 * A flight from where the ball is to `to`, landing at `at`: the parabola gravity `g` draws between the two in that
 * time. A segment's `arc` is the lift at its middle over the straight chord, which for a real throw is g·T²/8,
 * whatever the two heights.
 */
export const hop = (from: Way, to: Pt, at: number, g = G): Way => {
  const T = at - from.at
  return { at, p: to, arc: (g * T * T) / 8 }
}

/**
 * A throw from `from` with velocity `v` (cells a second, y down), for `T` seconds under `g`: the way it lands at,
 * exactly on the parabola. What a part uses to carry on a flight it was handed at a jump.
 */
export const throwFor = (from: Way, v: Pt, T: number, g = G): Way => ({
  at: from.at + T,
  p: [from.p[0] + v[0] * T, from.p[1] + v[1] * T + 0.5 * g * T * T],
  arc: (g * T * T) / 8,
})

/** The velocity a flight from `a` to `b` taking `T` seconds under `g` has as it leaves `a`, and as it lands. */
export const launch = (a: Pt, b: Pt, T: number, g = G): { out: Pt; in: Pt } => {
  const vx = (b[0] - a[0]) / T
  const vy0 = (b[1] - a[1]) / T - 0.5 * g * T
  return { out: [vx, vy0], in: [vx, vy0 + g * T] }
}

/** Seconds to fall `h` cells from rest. */
export const dropTime = (h: number, g = G): number => Math.sqrt((2 * Math.max(0, h)) / g)

/** Where a thing dropped from rest has got to after `t` seconds. */
export const fallen = (t: number, g = G): number => 0.5 * g * t * t
