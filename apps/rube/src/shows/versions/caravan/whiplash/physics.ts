import type { Pt } from '../../../../parts'
import type { Way } from './kit'

/**
 * Gravity, in cells a second a second. A cell is about a foot here (a snare is 14 inches across, a cell and a
 * bit), so real gravity would be 32; the show's is a stage's, slower, so a flight reads. `G_LOW` is for a thing that
 * should hang: a stick flipped high, a cymbal thrown.
 */
export const G_EARTH = 12
export const G_LOW = 2.6
/** A bounce off a drumhead: quick and low, so a stroke every fifth of a second still reads as a bounce. */
export const G_SNAP = 30

/**
 * A flight from where the ball is to `to`, landing at `at`: the parabola
 * gravity `g` draws between the two in that time. A segment's `arc` is the
 * lift at its middle over the straight chord, which for a real throw is
 * g·T²/8, whatever the two heights.
 */
export const hop = (from: Way, to: Pt, at: number, g = G_EARTH): Way => {
  const T = at - from.at
  return { at, p: to, arc: (g * T * T) / 8 }
}

/** Seconds to fall `h` cells from rest. */
export const dropTime = (h: number, g = G_EARTH): number => Math.sqrt((2 * Math.max(0, h)) / g)

/** Where a thing dropped from rest has got to after `t` seconds, and how fast it is going. */
export const fallen = (t: number, g = G_EARTH): number => 0.5 * g * t * t
