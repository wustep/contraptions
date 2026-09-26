import type { Pt } from '../../../../parts'
import type { Way } from './kit'

/**
 * Gravity, in cells a second a second. A cell is about half a metre here (a
 * grand piano is four cells long), so a real fall is about 20; the machines
 * use a little less, which makes a hop sit on its note instead of snapping
 * to it. The dance among the stars has almost none.
 */
export const G = 16
export const G_FLOAT = 1.2

/**
 * A flight from where the ball is to `to`, landing at `at`: the parabola
 * gravity `g` draws between the two in that time. A segment's `arc` is the
 * lift at its middle over the straight chord, which for a real throw is
 * g·T²/8, whatever the two heights.
 */
export const hop = (from: Way, to: Pt, at: number, g = G): Way => {
  const T = at - from.at
  return { at, p: to, arc: (g * T * T) / 8 }
}

/** Seconds to fall `h` cells from rest. */
export const dropTime = (h: number, g = G): number => Math.sqrt((2 * Math.max(0, h)) / g)

/** How far a thing dropped from rest has fallen after `t` seconds. */
export const fallen = (t: number, g = G): number => 0.5 * g * t * t
