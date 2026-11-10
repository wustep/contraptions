import type { Framing } from '../../../registry'
import { BOW_T, CHORD_T, LANES, VX, ballAt, balls, lineY, timeOf } from './layout'

/**
 * The camera goes down the machine with the balls, at their one speed, and opens as the voices come in: close on the
 * tines while there is one ball, down to the hammers and their strings when the second is let go, up to the pipes for
 * the third, and wide for the cellos. After the chord it runs on a little and comes to rest with the bow.
 *
 * It composes for the stage it is given. Across the machine is time, so a frame's width is how much music is in view,
 * and its height is how many lanes. A 16:9 frame takes its height from the lanes. A phone held upright has height to
 * spare, so there the frame is set by a width instead: a bar's worth of machine, with every lane in it, and the balls
 * four times the size they would be as a 16:9 band across the middle.
 */

/** What is in the frame, from when: its top and bottom against the top lane's line, in cells. */
const BANDS: { from: number; to: number; top: number; bottom: number }[] = [
  { from: -10, to: -10, top: LANES.tine - 4.1, bottom: LANES.tine + 2.5 },
  { from: timeOf(46), to: timeOf(62), top: LANES.tine - 4.1, bottom: LANES.bass + 6.4 },
  { from: timeOf(158), to: timeOf(180), top: LANES.pipe - 5.4, bottom: LANES.bass + 6.4 },
  { from: BOW_T - 5, to: BOW_T + 1.5, top: LANES.pipe - 5.4, bottom: LANES.bass + 8.4 },
]
/** The least a frame shows across: wide, and upright. */
const ACROSS = 19
const ACROSS_UPRIGHT = 11.5
/** How long the camera takes to stop after the chord. */
const SETTLE = 3.2

const ease = (v: number): number => {
  const x = Math.max(0, Math.min(1, v))
  return x * x * (3 - 2 * x)
}

export function camera(t: number, aspect = 16 / 9): Framing {
  let top = BANDS[0].top
  let bottom = BANDS[0].bottom
  for (const b of BANDS) {
    const f = ease((t - b.from) / Math.max(1e-6, b.to - b.from))
    top += (b.top - top) * f
    bottom += (b.bottom - bottom) * f
  }
  const high = bottom - top
  const wide = aspect >= 16 / 9
  const cells = wide ? Math.max(high, ACROSS / aspect) : Math.max((high * aspect * 9) / 16, (ACROSS_UPRIGHT * 9) / 16)
  const across = wide ? cells * aspect : (cells * 16) / 9
  // With the first ball until the chord; then on a little, slowing, to hold the chord and the last cello.
  const u = Math.min(SETTLE, Math.max(0, t - CHORD_T))
  const x = (t < CHORD_T ? ballAt(balls[0], Math.max(0, t)).x : VX * (CHORD_T + u - (u * u) / (2 * SETTLE))) + across * 0.07
  return { x, y: lineY(0, x) + (top + bottom) / 2, cells }
}
