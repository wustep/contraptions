import type { Pt } from '../../../../parts'
import type { Way } from './kit'

/**
 * Gravity, in cells a second a second. Peer is a ball a quarter of a cell across and a troll stands one to three
 * cells tall, so a cell is about a man's height; real gravity would be ~6 cells/s², and a stage's is quicker so a
 * drop reads as weight. `G_LOW` is for a thing that should hang: a pebble tossed high, a leap across a gap.
 * `G_SNAP` is for a quick low bounce, so a hop every quarter second still reads as one.
 */
export const G_EARTH = 12
export const G_LOW = 2.6
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
