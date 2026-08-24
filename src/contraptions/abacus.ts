import { defineContraption } from '../core/define'
import { outline, solid } from '../core/draw'
import { lerp, mod, pingPong } from '../core/ease'

/**
 * Beads gliding between stops on parallel rails.
 *
 * Each bead makes a whole number of round trips per loop, so the cycle closes
 * with matching position and velocity — an earlier stepped version snapped
 * back to the start when the loop wrapped, and the jump was all you saw.
 */
export const abacus = defineContraption({
  name: 'abacus',
  label: 'Abacus',
  tags: ['step', 'slide'],
  role: 'relay',
  rotations: [0, 1],
  setup: ({ color, rng }) => ({
    color,
    rows: rng.pick([3, 3, 4]),
    trips: [rng.pick([1, 2]), rng.pick([1, 2]), rng.pick([2, 3]), rng.pick([1, 3])],
    offsets: [0, rng.range(0.1, 0.5), rng.range(0.1, 0.9), rng.range(0.1, 0.9)],
  }),
  draw: (p, s, { size, u, ink, weight }) => {
    const stop = size * 0.4
    const bead = size * 0.16
    const spread = size * 0.62

    for (let i = 0; i < s.rows; i++) {
      const y = -spread / 2 + (spread * i) / Math.max(1, s.rows - 1)
      const dir = i % 2 === 0 ? 1 : -1
      const t = pingPong(mod(u * s.trips[i] + s.offsets[i], 1))
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
