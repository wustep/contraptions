import { solid } from '../../../../../../src/core/draw'
import { clamp } from '../../../../../../src/core/ease'
import { FLOOR, ROLL, definePiece, laneAt, post, trace, type Lane, type Pt } from '../../../parts'
import { stage } from './hall'
import { ivoryFor, partColor } from './parts-a'

/**
 * An octave of piano keys, seen from in front of the keyboard, is the rail.
 * Eight white keys stand side by side on a keybed, their tops level with
 * the stage, and the five black keys stand behind them over the joints, two
 * and then three. The ball rolls along the white keys' tops, and each one
 * goes down under it and comes back up behind it: a key is as far down as
 * the ball is over it, so the ball is always in the hollow of a ripple that
 * travels along the octave with it. The black keys do not move, and the
 * ball goes by in front of them.
 *
 * The ball rides the keys: its lane is the height of the key it is on, the
 * same number the key is drawn from.
 */
/** The octave: where it starts, how wide a white key is, and how many. */
const X0 = -0.36
const W = 0.215
const N = 8
const X1 = X0 + W * N
/** How far a key goes down with the ball square on it. */
const DIP = 0.05
/** A white key's front, from its top to the keybed's rail; the black keys' size. */
const FRONT = 0.19
const BLACK_W = 0.12
const BLACK_H = 0.13
/** The white keys a black key stands after: C sharp, D sharp, F sharp, G sharp, A sharp. */
const BLACKS = [0, 1, 3, 4, 5]

const centre = (i: number) => X0 + W * (i + 0.5)
/**
 * How far down key `i` is with the ball at `x`: all the way when the ball
 * is square on it, half when the ball is on the joint, since the next key
 * has the other half of its weight. The octave's two end keys come up to
 * level at their outer edges, where the ball is half on the stage.
 */
function dipOf(i: number, x: number): number {
  const f = clamp(1 - Math.abs(x - centre(i)) / W)
  if (i === 0 && x < centre(0)) return DIP * clamp((x - X0) / (W / 2))
  if (i === N - 1 && x > centre(N - 1)) return DIP * clamp((X1 - x) / (W / 2))
  return DIP * f
}
/** The height of the ball's line at `x`: the dip of the key under its middle. */
function under(x: number): number {
  if (x <= X0 || x >= X1) return 0
  return dipOf(Math.min(N - 1, Math.floor((x - X0) / W)), x)
}

const SPAN = 2 / ROLL
const at = (t: number): Pt => {
  const x = -0.5 + ROLL * t
  return [x, under(x)]
}
const LANE: Lane = { segs: trace(at, 0, SPAN, 64), fire: (X0 + W / 2 + 0.5) / ROLL }

export const keys = definePiece<{ color: string; white: string }>({
  name: 'keys',
  weight: 1,
  place: ({ color, fits, theme, ball }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
    ]
    if (!fits(cells, [2, 0])) return null
    const white = ivoryFor(theme, ball.color)
    return { cells, exit: { at: [2, 0], dir: 1 }, lane: LANE, state: { color: partColor(theme, color, ball.color, white), white } }
  },
  draw: (p, s, { k, t, ink, weight }) => {
    const x = laneAt(LANE, t).x

    // The stage either side of the keyboard.
    stage(p, k, ink, weight, -0.5, X0)
    stage(p, k, ink, weight, X1, 1.5)

    // The black keys, behind: they stand over the joints and never move.
    p.noStroke()
    p.fill(ink)
    for (const i of BLACKS) p.rect((X0 + W * (i + 1)) * k, (FLOOR - BLACK_H / 2) * k, BLACK_W * k, BLACK_H * k, 0.012 * k)

    // The white keys, each as far down as the ball is over it.
    for (let i = 0; i < N; i++) {
      const top = FLOOR + dipOf(i, x)
      const foot = FLOOR + FRONT + 0.04
      solid(p, ink, weight, s.white)
      p.rect(centre(i) * k, ((top + foot) / 2) * k, W * k, (foot - top) * k, 0.012 * k)
    }

    // The keybed: a rail across the keys' fronts, which hides how far down they go, on a leg at each end.
    post(p, k, ink, weight, X0 + 0.1, FLOOR + FRONT + 0.06, 0.5)
    post(p, k, ink, weight, X1 - 0.1, FLOOR + FRONT + 0.06, 0.5)
    solid(p, ink, weight, s.color)
    p.rect(((X0 + X1) / 2) * k, (FLOOR + FRONT + 0.04) * k, (X1 - X0 + 0.07) * k, 0.08 * k, 0.02 * k)
  },
})
