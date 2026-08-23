import { defineContraption } from '../core/define'
import { ceilRail, outline, solid, teeth } from '../core/draw'
import { stepEase } from '../core/ease'

/** A toothed wheel advancing one click at a time under its pawl. */
export const ratchet = defineContraption({
  name: 'ratchet',
  label: 'Ratchet',
  tags: ['step', 'spin'],
  role: 'source',
  fireAt: 0,
  setup: ({ color, rng }) => ({ color, n: rng.pick([6, 8]), dir: rng.sign() }),
  draw: (p, s, { size, u, ink, weight }) => {
    const r = size * 0.25
    const tooth = size * 0.09
    const rim = r + tooth
    const rot = stepEase(u, s.n, 0.55) * Math.PI * 2 * s.dir
    const pawlX = size * 0.2

    outline(p, ink, weight)
    ceilRail(p, size)
    // Pawl: hinged at the ceiling, resting on the rim.
    p.line(pawlX, -size / 2, size * 0.04, -rim * 0.86)
    p.circle(pawlX, -size / 2, size * 0.09)

    p.push()
    p.rotate(rot)
    outline(p, ink, weight)
    p.circle(0, 0, r * 2)
    teeth(p, r, s.n, tooth)
    p.pop()

    solid(p, ink, weight, s.color)
    p.circle(0, 0, size * 0.16)
  },
})
