import { defineContraption } from '../core/define'
import { outline, solid } from '../core/draw'
import { BENCH, HIT, bench, burst, pulse } from './shop'

/**
 * The signal reaches the stack light on its post, the top lens comes on,
 * and it fades as the moment passes.
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
    const lit = pulse(u, HIT, 48)
    const lens = -0.34

    bench(p, k, ink, weight)

    // The control box, the post, the stack.
    outline(p, ink, weight)
    p.rect(0, (BENCH - 0.07) * k, 0.24 * k, 0.14 * k)
    p.line(0, (BENCH - 0.14) * k, 0, -0.08 * k)
    p.line(-0.11 * k, -0.08 * k, 0.11 * k, -0.08 * k)
    solid(p, ink, weight, s.color)
    p.circle(0.05 * k, (BENCH - 0.07) * k, 0.05 * k)

    burst(p, k, s.color, weight, 0, lens, lit, 0.17, 0.3, 8, Math.PI / 8)

    solid(p, ink, weight, s.bg)
    p.rect(0, -0.17 * k, 0.22 * k, 0.16 * k)
    solid(p, ink, weight, lit > 0.02 ? s.color : s.bg)
    p.rect(0, lens * k, 0.22 * k, 0.18 * k, 0.03 * k)
    outline(p, ink, weight)
    p.line(-0.13 * k, -0.44 * k, 0.13 * k, -0.44 * k)
  },
})
