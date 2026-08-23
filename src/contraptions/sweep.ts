import { defineContraption } from '../core/define'
import { outline, solid, teeth } from '../core/draw'

/** A radar hand with a fading wedge behind it. */
export const sweep = defineContraption({
  name: 'sweep',
  label: 'Sweep',
  tags: ['spin', 'sequence'],
  role: 'relay',
  rotations: [0],
  setup: ({ color, rng }) => ({ color, dir: rng.sign(), trail: rng.range(0.5, 1.1) }),
  draw: (p, s, { size, u, ink, weight }) => {
    const r = size * 0.36
    const a = u * Math.PI * 2 * s.dir

    p.push()
    p.noStroke()
    p.fill(s.color)
    p.arc(0, 0, r * 2, r * 2, a - s.trail, a, p.PIE)
    p.pop()

    outline(p, ink, weight)
    p.circle(0, 0, r * 2)
    teeth(p, r, 12, -size * 0.05)
    p.line(0, 0, r * Math.cos(a), r * Math.sin(a))

    solid(p, ink, weight, s.color)
    p.circle(0, 0, size * 0.09)
  },
})
