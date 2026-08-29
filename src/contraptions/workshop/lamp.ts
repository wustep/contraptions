import { defineContraption } from '../../core/define'
import { outline, solid } from '../../core/draw'
import { BENCH, HIT, bench, burst, lineOf, pulse } from './shop'

/**
 * A stack light on a post that stands on the bench. The bench stops at the
 * post — it does not run past a hanging lamp into empty air.
 */
export const lamp = defineContraption({
  name: 'lamp',
  label: 'Stack Light',
  tags: ['signal'],
  role: 'sink',
  rotations: [0],
  fireAt: HIT,
  setup: ({ color, theme }) => ({ color, bg: theme.bg }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const line = lineOf(s)
    const lit = pulse(u, HIT, 48)
    const lens = BENCH - 0.4
    const x0 = line?.in ? -0.5 : -0.36
    const x1 = 0.14

    bench(p, k, ink, weight, x0, x1)

    // Post from the bench up through the box to the stack.
    outline(p, ink, weight)
    p.line(0, BENCH * k, 0, (lens + 0.1) * k)
    p.rect(0, (BENCH - 0.08) * k, 0.22 * k, 0.14 * k)
    solid(p, ink, weight, s.color)
    p.circle(0.05 * k, (BENCH - 0.08) * k, 0.05 * k)

    burst(p, k, s.color, weight, 0, lens, lit, 0.14, 0.26, 8, Math.PI / 8)

    solid(p, ink, weight, s.bg)
    p.rect(0, (lens + 0.16) * k, 0.2 * k, 0.14 * k)
    solid(p, ink, weight, lit > 0.02 ? s.color : s.bg)
    p.rect(0, lens * k, 0.2 * k, 0.16 * k, 0.03 * k)
    outline(p, ink, weight)
    p.line(-0.12 * k, (lens - 0.1) * k, 0.12 * k, (lens - 0.1) * k)
  },
})
