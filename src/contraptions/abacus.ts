import { defineContraption } from '../core/define'
import { outline, solid } from '../core/draw'
import { lerp, stepEase } from '../core/ease'

/** Beads clicking between stops on parallel rails. */
export const abacus = defineContraption({
  name: 'abacus',
  label: 'Abacus',
  tags: ['step', 'slide'],
  rotations: [0, 1],
  setup: ({ color, rng }) => ({
    color,
    rows: rng.pick([3, 3, 4]),
    steps: [rng.pick([3, 4]), rng.pick([2, 4]), rng.pick([3, 5]), rng.pick([2, 3])],
  }),
  draw: (p, s, { size, u, ink, weight }) => {
    const span = size * 0.4
    const bead = size * 0.15

    for (let i = 0; i < s.rows; i++) {
      const y = -size * 0.3 + (size * 0.6 * i) / Math.max(1, s.rows - 1)
      const steps = s.steps[i]
      const dir = i % 2 === 0 ? 1 : -1
      const t = stepEase((u * dir + 1) % 1, steps, 0.45)
      const x = lerp(-span, span, dir > 0 ? t : 1 - t)

      outline(p, ink, weight)
      p.line(-span, y, span, y)
      for (let k = 0; k <= steps; k++) {
        const tick = lerp(-span, span, k / steps)
        p.line(tick, y - size * 0.04, tick, y + size * 0.04)
      }
      solid(p, ink, weight, s.color)
      p.circle(x, y, bead)
    }
  },
})
