import type { Framing } from '../../../registry'
import { PERIOD, STARTS, osc, wrap } from './music'
import { leaderAt } from './path'
import { pulse, smooth } from './world'

/**
 * The camera. It looks at the whole colonnade from a little above and stays there, and moves for four things only:
 * out over the whole room for the title, and again for the credits, where it is the same in both so the loop closes;
 * a little farther out for the French overture, which opens the second half; and, for the Adagio, close in and
 * turning after the ball, which goes round so slowly there that the frame can go with it. Over that it breathes, a
 * whole number of breaths to the period.
 */

/** Cells top to bottom of a 16:9 frame: the colonnade fills it, and the whole room with air round it. */
export const BASE = 10.4
export const WIDE = 13.4
/** The frame's middle, and how much higher it looks at the ends of the period, where the title and the credits are. */
const CY = -1.5
const RISE = -0.9

const wideAt = (t: number): number => Math.max(1 - smooth(t, 3, 30), smooth(t, PERIOD - 112, PERIOD - 68))
const followAt = (t: number): number => pulse(t, STARTS[25] + 6, STARTS[25] + 44, STARTS[26] - 44, STARTS[26] - 6)

export function cellsAt(time: number): number {
  const t = wrap(time)
  const w = wideAt(t)
  const overture = pulse(t, STARTS[16], STARTS[16] + 12, STARTS[16] + 50, STARTS[16] + 90)
  const pearl = followAt(t)
  const cells = BASE + (WIDE - BASE) * w + 0.7 * overture - 1.9 * pearl
  return cells * (1 + 0.012 * osc(t, 37))
}

export function camera(time: number): Framing {
  const t = wrap(time)
  const f = followAt(t)
  const lead = leaderAt(t)
  return {
    x: f * 0.55 * lead.x,
    y: CY + RISE * wideAt(t) + f * 0.3 * (lead.y - CY),
    cells: cellsAt(t),
  }
}
