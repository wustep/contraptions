import type { Pt } from '../../../../parts'
import type { Way } from './kit'

/**
 * Gravity, in cells a second a second, world by world. Each world has its own feel, and its gravity is most of it:
 *
 * - `G` (12): the loft and the glassworks. A cell in the loft is about four inches (the spark is a candle's flame, an
 *   inch across), so this is slow and careful for its size: the sneak hangs a little.
 * - `G_AIR` (4.5): the balloon regatta. A spark rides hot air: its flights drift and hang, and it rises in an updraft.
 * - `G_RAIL` (16): the night express and the festival. Heavy, fast, ballistic.
 * - `G_FLAME` (-3): inside a fire's draught a spark falls up (a negative g in `hop` or `throwFor` is a rise that slows).
 */
export const G = 12
export const G_AIR = 4.5
export const G_RAIL = 16
export const G_FLAME = -3

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
 * exactly on the parabola. What a part uses to carry on a flight it was handed through a fire-door.
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
