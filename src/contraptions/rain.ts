import { defineContraption } from '../core/define'
import { clipCell, outline, rails, solid } from '../core/draw'
import { mod } from '../core/ease'

/** Staggered drops falling through the cell. */
export const rain = defineContraption({
  name: 'rain',
  label: 'Rain',
  tags: ['fall', 'ball'],
  rotations: [0, 1, 2, 3],
  setup: ({ color, rng }) => ({
    color,
    cols: rng.pick([2, 3, 3, 4]),
    speed: rng.pick([1, 2]),
  }),
  draw: (p, s, { size, u, ink, weight }) => {
    const d = size * 0.13
    const span = size * 0.72

    clipCell(p, size, () => {
      for (let c = 0; c < s.cols; c++) {
        const x = -span / 2 + (span * c) / Math.max(1, s.cols - 1)
        for (let i = 0; i < 3; i++) {
          const phase = mod(u * s.speed + i / 3 + c * 0.37, 1)
          const y = -size / 2 - d + phase * (size + d * 2)
          outline(p, ink, weight)
          p.line(x, y - size * 0.16, x, y - d * 0.6)
          solid(p, ink, weight, s.color)
          p.circle(x, y, d)
        }
      }
    })

    outline(p, ink, weight)
    rails(p, size)
  },
})
