import { defineContraption } from '../core/define'
import { clipCell } from '../core/draw'
import { mod } from '../core/ease'
import { BELT_V, PART_Y, belt, part, type Mark } from './shop'

/**
 * A belt carries a train of parts across the cell at shop speed, handing each
 * one off the east edge as the next comes in from the west; its rollers sit on
 * the seams, so two belts side by side share them.
 */
export const beltRun = defineContraption({
  name: 'belt',
  label: 'Belt',
  tags: ['convey'],
  role: 'relay',
  rotations: [0],
  weight: 2,
  // A part crossing the east edge.
  fireAt: 0,
  setup: ({ color, rng, theme }) => ({
    color,
    bg: theme.bg,
    mark: rng.pick(['blank', 'blank', 'dot', 'hole'] as Mark[]),
  }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const travel = u * BELT_V
    clipCell(p, k, () => {
      belt(p, k, ink, weight, s.color, -0.5, 0.5, travel)
      // Parts a cell apart: one is always on the belt, and the seams line up.
      const off = mod(travel, 1)
      for (const j of [-1, 0, 1]) part(p, k, ink, weight, s.color, -0.5 + off + j, PART_Y, { mark: s.mark, bg: s.bg })
    })
  },
})
