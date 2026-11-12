import { defineContraption } from '../core/define'
import { clipCell, outline } from '../core/draw'
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
  draw: (p, s, { size, u, ink, weight }) => {
    // Ring radius at the end of its life: inscribed in the cell, so a ring
    // leaves as it touches the edges rather than vanishing mid-cell.
    const max = size * 0.5

    clipCell(p, size, () => {
      for (let i = 0; i < s.rings; i++) {
        const phase = mod(u + i / s.rings, 1)
        const r = phase * max
        // The leading ring carries the color; the rest are ink.
        outline(p, ink, weight)
        if (i === 0) p.stroke(s.color)
        p.strokeWeight(weight * (i === 0 ? 1.8 : 1))
        // `r` is a radius; circle() takes a diameter. Passing `r` straight
        // in stopped every ring at 0.39 of the cell, well short of the edge.
        p.circle(0, 0, r * 2)
      }
      outline(p, ink, weight)
      p.fill(s.color)
      p.circle(0, 0, size * 0.12)
    })
  },
})
