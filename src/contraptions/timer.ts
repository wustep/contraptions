import { defineContraption } from '../core/define'
import { coil, outline, solid, teeth } from '../core/draw'
import { clamp } from '../core/ease'
import { BENCH, HIT, bench } from './shop'

/**
 * A peg on a slowly turning dial comes round under the follower and shoves
 * the plunger out through the east edge, where the spring snaps it back the
 * moment the peg has passed.
 */
const CX = -0.1
const CY = -0.06
const R = 0.24

export const timer = defineContraption({
  name: 'timer',
  label: 'Cam Timer',
  tags: ['feed'],
  role: 'source',
  rotations: [0],
  fireAt: HIT,
  setup: ({ color, rng }) => ({ color, dir: rng.sign() }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const peg = s.dir * Math.PI * 2 * (u - HIT)
    let delta = peg % (Math.PI * 2)
    if (delta > Math.PI) delta -= Math.PI * 2
    if (delta < -Math.PI) delta += Math.PI * 2
    const near = clamp(1 - Math.abs(delta) / 0.5)
    const ext = 0.1 * near * near * (3 - 2 * near)
    const tipX = CX + R + 0.02 + ext

    bench(p, k, ink, weight)

    // The dial on its post.
    outline(p, ink, weight)
    p.line(CX * k, BENCH * k, CX * k, CY * k)
    p.circle(CX * k, CY * k, R * 2 * k)
    p.push()
    p.translate(CX * k, CY * k)
    teeth(p, (R - 0.05) * k, 12, 0.05 * k, peg)
    p.pop()
    solid(p, ink, weight, s.color)
    p.circle(CX * k, CY * k, 0.09 * k)
    p.circle((CX + Math.cos(peg) * (R - 0.01)) * k, (CY + Math.sin(peg) * (R - 0.01)) * k, 0.08 * k)

    // The plunger in its sleeve, sprung back against the dial's rim.
    outline(p, ink, weight)
    p.rect(0.4 * k, CY * k, 0.08 * k, 0.14 * k)
    p.line(0.4 * k, (CY + 0.07) * k, 0.4 * k, BENCH * k)
    p.line(tipX * k, CY * k, (0.58 + ext) * k, CY * k)
    coil(p, (tipX + 0.06) * k, CY * k, 0.36 * k, CY * k, 4, 0.035 * k)
    solid(p, ink, weight, s.color)
    p.rect((tipX + 0.03) * k, CY * k, 0.06 * k, 0.1 * k)
    p.rect((0.56 + ext) * k, CY * k, 0.04 * k, 0.1 * k)
  },
})
