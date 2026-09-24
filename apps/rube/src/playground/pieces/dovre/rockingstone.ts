import { outline } from '../../../../../../src/core/draw'
import { floor } from './look'
import { stride, timed, type Timed } from './tempo'

/** A stand-in, to be replaced: one cell of floor with a mark on it. */
export interface RockingstoneState extends Timed {}

export const rockingstone = timed<RockingstoneState, number>({
  name: 'rockingstone',
  weight: 1,
  variants: [0],
  beats: () => 1,
  hits: () => [0],
  plan: (_v, beat, { color }) => ({
    cells: [[0, 0]],
    exit: { at: [1, 0], dir: 1 },
    lane: { segs: [stride([-0.5, 0], [0.5, 0], beat)], fire: 0 },
    state: { beat, color },
  }),
  draw: (p, _s, { k, ink, weight }) => {
    floor(p, k, ink, weight, -0.5, 0.5)
    outline(p, ink, weight)
    p.rect(0, -0.1 * k, 0.3 * k, 0.3 * k)
  },
})
