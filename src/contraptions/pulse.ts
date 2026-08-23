import { defineContraption } from '../core/define'
import { clipCell, outline } from '../core/draw'
import { mod } from '../core/ease'

/** Rings expanding out of the center, clipped to the cell. */
export const pulse = defineContraption({
  name: 'pulse',
  label: 'Pulse',
  tags: ['grow'],
  rotations: [0],
  mirror: false,
  setup: ({ color, rng }) => ({ color, rings: rng.pick([3, 4, 5]) }),
  draw: (p, s, { size, u, ink, weight }) => {
    const max = size * 0.78

    clipCell(p, size, () => {
      for (let i = 0; i < s.rings; i++) {
        const phase = mod(u + i / s.rings, 1)
        const r = phase * max
        // The leading ring carries the color; the rest are ink.
        outline(p, ink, weight)
        if (i === 0) p.stroke(s.color)
        p.strokeWeight(weight * (i === 0 ? 1.8 : 1))
        p.circle(0, 0, r)
      }
      outline(p, ink, weight)
      p.fill(s.color)
      p.circle(0, 0, size * 0.12)
    })
  },
})
