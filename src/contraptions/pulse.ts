import { defineContraption } from '../core/define'
import { clipCell, outline, tiles } from '../core/draw'
import { mod } from '../core/ease'

/** Rings expanding out of the center, clipped to the cell. */
export const pulse = defineContraption({
  name: 'pulse',
  label: 'Pulse',
  tags: ['grow'],
  role: 'relay',
  rotations: [0],
  fireAt: 0,
  mirror: false,
  setup: ({ color, rng }) => ({ color, rings: rng.pick([3, 4, 5]) }),
  draw: (p, s, { size, unit, u, ink, weight }) => {
    const max = size * 0.78
    // A wider pond holds more rings, spaced as they always were.
    const rings = s.rings * tiles(size, unit)

    clipCell(p, size, () => {
      for (let i = 0; i < rings; i++) {
        const phase = mod(u + i / rings, 1)
        const r = phase * max
        // The leading ring carries the color; the rest are ink.
        outline(p, ink, weight)
        if (i === 0) p.stroke(s.color)
        p.strokeWeight(weight * (i === 0 ? 1.8 : 1))
        p.circle(0, 0, r)
      }
      outline(p, ink, weight)
      p.fill(s.color)
      p.circle(0, 0, unit * 0.12)
    })
  },
})
