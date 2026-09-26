import type { Framing } from '../../../registry'
import { MELODY, PERIOD, PIECES, wrap } from './music'
import { RADIUS, along } from './path'
import { polar, smooth } from './world'

/**
 * The camera. It goes round with the ball and keeps the planet's up at the
 * top of the frame, so the sea is always under the ball and the world turns
 * beneath it; the ball flies at a steady height in the frame, a little left
 * of the middle, the stones coming to it.
 *
 * It breathes: close on the stones through a phrase, out on the long notes and
 * between the pieces, and at the end of the period all the way out, until the
 * planet is a small world in the dark with its day going round it. That is
 * where the circle closes. From there, as the Gymnopédie's first bars come
 * round again, it goes down to the ball.
 *
 * How far out is keyed by show time (`KEYS`, cells top to bottom of a 16:9
 * frame), eased in even steps of scale, and taken round the circle. Once the
 * frame is much wider than the stones, it drifts from the ball to the planet's
 * middle, so the whole planet is framed and not its top.
 */

const [G1, GN1, GN3] = PIECES
/** The whole planet, with its sky round it. */
const WHOLE = RADIUS * 2.75
/** The Gymnopédie's first melody note: the camera is down on the ball by then. */
export const FIRST_NOTE = MELODY[0].t

const KEYS: [number, number][] = [
  [0, WHOLE],
  [2.6, WHOLE],
  [FIRST_NOTE + 0.4, 6.2],
  [52, 5.6],
  [64, 8.5],
  [78, 5.8],
  [96, 6.2],
  // The second half of the Gymnopédie: out along the colonnade, and back in.
  [G1.bars[39] - 4, 7],
  [G1.bars[39] + 9, 15],
  [G1.bars[44], 6],
  [G1.last - 10, 6.4],
  // The piece's last chord, the sun going down, and the first Gnossienne.
  [G1.end + 1, 24],
  [GN1.from + 3.4, 5.2],
  [GN1.bars[16], 5],
  [GN1.bars[20], 9.5],
  [GN1.bars[26], 5.2],
  [GN1.bars[52], 5.2],
  [GN1.bars[60], 11],
  [GN1.bars[68], 6],
  [GN1.last - 6, 8],
  // Between the Gnossiennes: out over the lamps.
  [GN1.end + 1.6, 26],
  [GN3.from + 3.2, 5.6],
  [GN3.bars[20], 5.6],
  [GN3.bars[26], 10],
  [GN3.bars[32], 5.8],
  [GN3.bars[46], 6.6],
  // The last phrase, and then out: the whole planet as the resonance goes.
  [GN3.last - 7, 7.5],
  [PERIOD, WHOLE],
]

/** Cells top to bottom of the 16:9 frame at show time `t`. */
export function cellsAt(t: number): number {
  const u = wrap(t)
  let i = 0
  while (i + 2 < KEYS.length && KEYS[i + 1][0] <= u) i++
  const [t0, c0] = KEYS[i]
  const [t1, c1] = KEYS[i + 1]
  const f = smooth(u, t0, t1)
  return Math.exp(Math.log(c0) + (Math.log(c1) - Math.log(c0)) * f)
}

/** How much of the frame is the whole planet: 0 close on the ball, 1 at the whole. */
export const wideAt = (cells: number): number => smooth(Math.log(cells), Math.log(34), Math.log(WHOLE * 0.85))

/** Where the frame's middle is over the sea when close: a little over the stones' middle height. */
const LOOK = 1.75
/** Ahead of the ball, cells: it has room to go. */
const LEAD = 0.55

export function camera(t: number): Framing {
  const cells = cellsAt(t)
  const w = wideAt(cells)
  const u = along(t) + LEAD
  // Close, the frame's middle is over the ball's way; wide, it slides to the planet's middle.
  const [fx, fy] = polar(u, LOOK)
  const x = fx * (1 - w)
  const y = fy * (1 - w)
  return { x, y, cells, angle: -u / RADIUS }
}
