import type p5 from 'p5'
import { ROLL, definePiece, rail, roll, type Piece, type PieceCtx } from '../parts'

/**
 * A plain cell of rail between beats. The planner caps runs of these at
 * three, so the ball is never long between events, and each one carries a
 * small variation so a run of rail is still drawn rather than ruled. What
 * the variations are is the world's: a workshop rail stands on posts and
 * brackets, a pier on pilings over water, a garden path between stakes and
 * tufts, an arcade lane on lit strips. Every world makes its own rail from
 * this, with the same name, weight and lane, and its own decor.
 */
export interface RailState<D extends string = string> {
  color: string
  decor: D
}

export function makeRail<D extends string>(
  decors: readonly D[],
  drawDecor: (p: p5, s: RailState<D>, c: PieceCtx) => void,
  over?: (p: p5, s: RailState<D>, c: PieceCtx) => void,
): Piece<RailState<D>> {
  return definePiece<RailState<D>>({
    name: 'rail',
    weight: 1.4,
    place: ({ rng, color, fits }) => {
      if (!fits([[0, 0]], [1, 0])) return null
      return {
        cells: [[0, 0]],
        exit: { at: [1, 0], dir: 1 },
        lane: { segs: [roll([-0.5, 0], [0.5, 0], ROLL)], fire: 0.5 / ROLL },
        state: { color, decor: rng.pick(decors) },
      }
    },
    draw: (p, s, c) => {
      rail(p, c.k, c.ink, c.weight, -0.5, 0.5)
      drawDecor(p, s, c)
    },
    over,
  })
}
