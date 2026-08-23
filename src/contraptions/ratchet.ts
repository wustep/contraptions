import { defineContraption } from '../core/define'
import { outline, solid, teeth } from '../core/draw'
import { stepEase } from '../core/ease'

/** A toothed wheel advancing one click at a time under its pawl. */
export const ratchet = defineContraption({
  name: 'ratchet',
  label: 'Ratchet',
  tags: ['step', 'spin'],
  setup: ({ color, rng }) => ({ color, n: rng.pick([6, 8, 10]), dir: rng.sign() }),
  draw: (p, s, { size, u, ink, weight }) => {
    const r = size * 0.28
    const tooth = size * 0.07
    const clicks = s.n
    const rot = stepEase(u, clicks, 0.5) * Math.PI * 2 * s.dir

    p.push()
    p.rotate(rot)
    outline(p, ink, weight)
    p.circle(0, 0, r * 2)
    teeth(p, r, clicks, tooth)
    p.pop()

    outline(p, ink, weight)
    // The pawl, riding the rim from above.
    p.line(-size * 0.44, -size * 0.4, -size * 0.06, -r - tooth * 0.4)
    solid(p, ink, weight, s.color)
    p.circle(0, 0, size * 0.13)
    p.circle(-size * 0.44, -size * 0.4, size * 0.08)
  },
})
