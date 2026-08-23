import { defineContraption } from '../core/define'
import { outline, solid, teeth } from '../core/draw'

/** Two toothed wheels in mesh on a common shaft line. */
export const gear = defineContraption({
  name: 'gear',
  label: 'Gear Pair',
  tags: ['spin', 'mesh'],
  rotations: [0, 1],
  setup: ({ color, rng }) => ({ color, dir: rng.sign(), n: rng.pick([6, 7, 8]) }),
  draw: (p, s, { size, u, ink, weight }) => {
    const r = size * 0.2
    const tooth = size * 0.075
    const gap = r + tooth * 0.5
    // A gear looks unchanged after turning by one tooth pitch, so any whole
    // number of pitches per loop closes the cycle.
    const rot = (u * (Math.PI * 2 / s.n) * 2) * s.dir

    outline(p, ink, weight)
    // The shaft runs edge to edge, so neighbouring cells line up.
    p.line(-size / 2, 0, size / 2, 0)

    for (const [cx, spin] of [[-gap, rot], [gap, -rot + Math.PI / s.n]] as const) {
      p.push()
      p.translate(cx, 0)
      p.rotate(spin)
      outline(p, ink, weight)
      p.circle(0, 0, r * 2)
      teeth(p, r, s.n, tooth)
      p.pop()
      solid(p, ink, weight, s.color)
      p.circle(cx, 0, size * 0.13)
    }
  },
})
