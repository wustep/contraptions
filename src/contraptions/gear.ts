import { defineContraption } from '../core/define'
import { outline, solid, teeth } from '../core/draw'

/** Two toothed wheels in mesh, turning against each other. */
export const gear = defineContraption({
  name: 'gear',
  label: 'Gear Pair',
  tags: ['spin', 'mesh'],
  rotations: [0, 1],
  setup: ({ color, rng }) => ({ color, dir: rng.sign(), n: rng.pick([8, 10, 12]) }),
  draw: (p, s, { size, u, ink, weight }) => {
    const r = size * 0.19
    const tooth = size * 0.05
    // A gear is unchanged by a rotation of TAU/n, so any whole number of tooth
    // pitches per loop closes the cycle.
    const rot = u * (Math.PI * 2 / s.n) * 3 * s.dir

    outline(p, ink, weight)
    for (const [cx, spin] of [
      [-r - tooth * 0.5, rot],
      [r + tooth * 0.5, -rot + Math.PI / s.n],
    ] as const) {
      p.push()
      p.translate(cx, 0)
      p.rotate(spin)
      outline(p, ink, weight)
      p.circle(0, 0, r * 2)
      teeth(p, r, s.n, tooth)
      p.line(0, 0, r * 0.72, 0)
      p.pop()
    }

    solid(p, ink, weight, s.color)
    p.circle(-r - tooth * 0.5, 0, size * 0.11)
    p.circle(r + tooth * 0.5, 0, size * 0.11)
  },
})
