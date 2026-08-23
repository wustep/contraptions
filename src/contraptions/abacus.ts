import { defineContraption } from '../core/define'
import { outline, solid } from '../core/draw'
import { lerp, mod, stepEase } from '../core/ease'

/** Beads clicking between stops on parallel rails. */
export const abacus = defineContraption({
  name: 'abacus',
  label: 'Abacus',
  tags: ['step', 'slide'],
  rotations: [0, 1],
  setup: ({ color, rng }) => ({
    color,
    rows: rng.pick([3, 3, 4]),
    steps: [rng.pick([2, 3]), rng.pick([3, 4]), rng.pick([2, 4]), rng.pick([3, 5])],
    offsets: [0, rng.range(0.1, 0.5), rng.range(0.1, 0.9), rng.range(0.1, 0.9)],
  }),
  draw: (p, s, { size, u, ink, weight }) => {
    const stop = size * 0.4
    const bead = size * 0.16
    const spread = size * 0.62

    for (let i = 0; i < s.rows; i++) {
      const y = -spread / 2 + (spread * i) / Math.max(1, s.rows - 1)
      const dir = i % 2 === 0 ? 1 : -1
      const t = stepEase(mod(u + s.offsets[i], 1), s.steps[i], 0.45)
      const x = lerp(-stop, stop, dir > 0 ? t : 1 - t)

      outline(p, ink, weight)
      // Rails run edge to edge so the tile joins up with its neighbours.
      p.line(-size / 2, y, size / 2, y)
      p.line(-stop, y - size * 0.06, -stop, y + size * 0.06)
      p.line(stop, y - size * 0.06, stop, y + size * 0.06)
      solid(p, ink, weight, s.color)
      p.circle(x, y, bead)
    }
  },
})
