import { defineContraption } from '../../core/define'
import { clipCell } from '../../core/draw'
import { mod } from '../../core/ease'
import { belt, BELT_V, lineOf, part, PART_Y, partColor, type Mark } from './shop'

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
      const line = lineOf(s)
      for (const j of [-1, 0, 1]) {
        const x = -0.5 + off + j
        if (line && !line.out && x > 0.15) continue
        if (line && !line.in && x < -0.15) continue
        if (x < -0.55 || x > 0.55) continue
        part(p, k, ink, weight, partColor(s), x, PART_Y, { mark: s.mark, bg: s.bg })
      }
    })
  },
})
