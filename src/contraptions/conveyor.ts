import { defineContraption } from '../core/define'
import { clipCell, outline, solid, tiles } from '../core/draw'
import { mod } from '../core/ease'

/** Crates riding a belt between two rollers. */
export const conveyor = defineContraption({
  name: 'conveyor',
  label: 'Conveyor',
  tags: ['slide', 'square'],
  role: 'relay',
  fireAt: 0.0,
  rotations: [0, 1, 2, 3],
  setup: ({ color, rng }) => ({ color, dir: rng.sign() }),
  draw: (p, s, { size, unit, u, ink, weight }) => {
    const roller = size * 0.15
    const span = size * 0.3
    // A longer belt carries more crates, not bigger ones.
    const count = 3 * tiles(size, unit)
    const spacing = size / count
    const crate = spacing * 0.6
    const travel = mod(u * s.dir, 1) * spacing

    clipCell(p, size, () => {
      outline(p, ink, weight)
      p.line(-span, -roller, span, -roller)
      p.line(-span, roller, span, roller)
      p.arc(-span, 0, roller * 2, roller * 2, Math.PI / 2, Math.PI * 1.5)
      p.arc(span, 0, roller * 2, roller * 2, Math.PI * 1.5, Math.PI / 2)
      p.line(-span, 0, span, 0)
      for (let i = 0; i < count; i++) {
        const x = mod(i * spacing + travel, size) - size / 2
        solid(p, ink, weight, s.color)
        p.rect(x, -roller - crate / 2, crate, crate)
      }
    })
  },
})
