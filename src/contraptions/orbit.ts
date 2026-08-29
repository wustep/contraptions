import { defineContraption } from '../core/define'
import { dashed, outline, solid, tiles } from '../core/draw'

/** A body on a marked orbit, with its own small moon. */
export const orbit = defineContraption({
  name: 'orbit',
  label: 'Orbit',
  tags: ['spin', 'ball'],
  role: 'relay',
  rotations: [0],
  setup: ({ color, rng }) => ({ color, dir: rng.sign(), moons: rng.pick([2, 3, 4]) }),
  draw: (p, s, { size, unit, u, ink, weight }) => {
    const r = size * 0.31
    // A wider orbit is marked with more ticks, not longer ones.
    const marks = 14 * tiles(size, unit)
    const a = u * Math.PI * 2 * s.dir
    const x = r * Math.cos(a)
    const y = r * Math.sin(a)
    const ma = a * s.moons

    outline(p, ink, weight)
    for (let i = 0; i < marks; i++) {
      const a0 = (i / marks) * Math.PI * 2
      const a1 = a0 + Math.PI / marks
      p.line(r * Math.cos(a0), r * Math.sin(a0), r * Math.cos(a1), r * Math.sin(a1))
    }
    dashed(p, 0, 0, x, y, unit * 0.05)
    p.circle(0, 0, size * 0.1)

    solid(p, ink, weight, s.color)
    p.circle(x, y, size * 0.19)
    outline(p, ink, weight)
    p.circle(x + size * 0.16 * Math.cos(ma), y + size * 0.16 * Math.sin(ma), size * 0.07)
  },
})
