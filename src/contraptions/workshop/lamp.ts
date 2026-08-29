import { defineContraption } from '../../core/define'
import { outline, solid } from '../../core/draw'
import { BELT_V, BENCH, HIT, belt, bench, burst, lineOf, pulse } from './shop'

/**
 * A stack light on a post at the east end of the bench. The belt runs in and
 * stops at the post; the post stands on the bench.
 */
const POST = 0.22
const STOP = 0.08

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

    bench(p, k, ink, weight, x0, STOP)
    belt(p, k, ink, weight, s.color, x0, STOP, u * BELT_V)

    outline(p, ink, weight)
    p.line(POST * k, BENCH * k, POST * k, (lens + 0.1) * k)
    p.rect(POST * k, (BENCH - 0.08) * k, 0.22 * k, 0.14 * k)
    solid(p, ink, weight, s.color)
    p.circle((POST + 0.05) * k, (BENCH - 0.08) * k, 0.05 * k)

    burst(p, k, s.color, weight, POST, lens, lit, 0.14, 0.26, 8, Math.PI / 8)

    solid(p, ink, weight, s.bg)
    p.rect(POST * k, (lens + 0.16) * k, 0.2 * k, 0.14 * k)
    solid(p, ink, weight, lit > 0.02 ? s.color : s.bg)
    p.rect(POST * k, lens * k, 0.2 * k, 0.16 * k, 0.03 * k)
    outline(p, ink, weight)
    p.line((POST - 0.12) * k, (lens - 0.1) * k, (POST + 0.12) * k, (lens - 0.1) * k)
  },
})
