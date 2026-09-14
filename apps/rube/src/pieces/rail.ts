import { outline, solid } from '../../../../src/core/draw'
import { FLOOR, ROLL, definePiece, post, rail, roll } from '../parts'

/**
 * A plain cell of rail between beats. The planner caps runs of these at two,
 * so the ball is never long between events, and each one carries a small
 * variation — a post, a bracket, a rivet plate — so a run of rail is still
 * drawn rather than ruled.
 */
export interface RailState {
  color: string
  decor: 'post' | 'bracket' | 'plate' | 'none'
}

export const plainRail = definePiece<RailState>({
  name: 'rail',
  weight: 1.4,
  place: ({ rng, color, fits }) => {
    if (!fits([[0, 0]], [1, 0])) return null
    return {
      cells: [[0, 0]],
      exit: { at: [1, 0], dir: 1 },
      lane: { segs: [roll([-0.5, 0], [0.5, 0], ROLL)], fire: 0.5 / ROLL },
      state: { color, decor: rng.pick(['post', 'bracket', 'plate', 'none', 'post']) },
    }
  },
  draw: (p, s, { k, ink, weight }) => {
    rail(p, k, ink, weight, -0.5, 0.5)
    if (s.decor === 'post') post(p, k, ink, weight, 0)
    if (s.decor === 'bracket') {
      outline(p, ink, weight)
      p.line(0, FLOOR * k, 0, 0.5 * k)
      p.line(0, 0.5 * k, 0.22 * k, FLOOR * k)
      p.line(0, 0.5 * k, -0.22 * k, FLOOR * k)
    }
    if (s.decor === 'plate') {
      solid(p, ink, weight, s.color)
      p.rect(0, (FLOOR + 0.06) * k, 0.3 * k, 0.08 * k)
      p.fill(ink)
      p.noStroke()
      p.circle(-0.09 * k, (FLOOR + 0.06) * k, 0.03 * k)
      p.circle(0.09 * k, (FLOOR + 0.06) * k, 0.03 * k)
    }
  },
})
