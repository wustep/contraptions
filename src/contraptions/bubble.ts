import { defineContraption } from '../core/define'
import { clipCell, outline, rails, tiles } from '../core/draw'
import { mod } from '../core/ease'

/** Bubbles wobbling up a column of liquid. */
export const bubble = defineContraption({
  name: 'bubble',
  label: 'Bubble',
  tags: ['fall', 'ball'],
  rotations: [0, 1, 2, 3],
  setup: ({ color, rng }) => ({ color, wobble: rng.pick([1, 2]), count: rng.pick([2, 3]) }),
  draw: (p, s, { size, unit, u, ink, weight }) => {
    const wall = size * 0.19
    // A taller column holds more bubbles, all the same size.
    const count = s.count * tiles(size, unit)

    clipCell(p, size, () => {
      outline(p, ink, weight)
      p.line(-wall, -size / 2, -wall, size / 2)
      p.line(wall, -size / 2, wall, size / 2)

      for (let i = 0; i < count; i++) {
        const phase = mod(u + i / count, 1)
        const d = unit * (0.15 + 0.06 * (i % 2))
        const y = size / 2 + d - phase * (size + d * 2)
        const x = wall * 0.5 * Math.sin(phase * Math.PI * 2 * s.wobble)
        outline(p, ink, weight)
        if (i % 2 === 0) p.fill(s.color)
        p.circle(x, y, d)
      }
    })

    outline(p, ink, weight)
    rails(p, size)
  },
})
