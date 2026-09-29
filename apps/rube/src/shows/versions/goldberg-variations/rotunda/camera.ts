import type { Framing } from '../../../registry'
import { PERIOD, STARTS, osc, wrap } from './music'
import { RING, SEAT, lapAt, project, viewAt } from './path'
import { pulse, smooth } from './world'

/**
 * The camera. It frames the whole colonnade from wherever the view has risen to (`tiltAt`: it rises as the floor is
 * written), and leans a little after the ball as it goes round, so the frame goes with the lap and never stops. It moves
 * for four things besides: out over the whole room for the title, and again for the credits, where it is the same in
 * both so the loop closes; a little farther out for the French overture, which opens the second half; and, for the
 * Adagio, low and close on the pearl, which the room turns to hold in front of it. Over that it breathes, a whole number
 * of breaths to the period.
 */

/** How much of the frame, top to bottom, the room fills. */
const FILL = 0.745
/** How much farther out the frame is for the title and the credits. */
const WIDE = 1.2
/** How much higher it looks at the ends of the period, where the title and the credits are, in frames. */
const RISE = -0.087
/** How far the frame leans after the ball, as a share of how far the ball is from the middle. */
const LEAN_X = 0.12
const LEAN_Y = 0.1

const wideAt = (t: number): number => Math.max(1 - smooth(t, 3, 30), smooth(t, PERIOD - 112, PERIOD - 68))
const pearlAt = (t: number): number => pulse(t, STARTS[25] + 4, STARTS[25] + 50, STARTS[26] - 50, STARTS[26] - 4)

/** The room's top (the ball over the far rail) and bottom (the step in front) at a tilt, cells. */
function extent(sin: number, cos: number): [number, number] {
  return [-RING * sin - (SEAT + 0.35) * cos, RING * 1.14 * sin]
}

export function cellsAt(time: number): number {
  const t = wrap(time)
  const { sin, cos } = viewAt(t)
  const [top, bottom] = extent(sin, cos)
  const room = (bottom - top) / FILL
  const overture = pulse(t, STARTS[16], STARTS[16] + 12, STARTS[16] + 50, STARTS[16] + 90)
  const cells = room * (1 + (WIDE - 1) * wideAt(t)) * (1 + 0.07 * overture) * (1 - 0.24 * pearlAt(t))
  return cells * (1 + 0.012 * osc(t, 37))
}

export function camera(time: number): Framing {
  const t = wrap(time)
  const view = viewAt(t)
  const [top, bottom] = extent(view.sin, view.cos)
  const mid = (top + bottom) / 2
  const cells = cellsAt(t)
  // Where the ball is on its lap, without the hands' braid or the canon's follower: the lean is after the lap, not the ball's detours.
  const { p } = lapAt(t)
  const [bx, by] = project(2 * Math.PI * p, RING, SEAT, view)
  const f = pearlAt(t)
  const lx = LEAN_X + (0.55 - LEAN_X) * f
  const ly = LEAN_Y + (0.3 - LEAN_Y) * f
  return {
    x: lx * bx,
    y: mid + ly * (by - mid) + RISE * cells * wideAt(t),
    cells,
  }
}
