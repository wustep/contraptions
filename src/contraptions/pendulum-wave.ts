import { defineContraption } from '../core/define'
import { outline, solid } from '../core/draw'
import { lerp } from '../core/ease'
import { pendulum as pendulumTable, swing } from '../core/physics'

/**
 * A row of pendulums, each swinging a whole number of times per loop. The
 * frequencies differ by one step along the row, so the line of bobs shears
 * apart into a travelling wave and snaps back into rank at the top of the loop.
 *
 * Lengths are eased rather than derived from the real 1/f^2 law: over this
 * frequency range the true lengths differ by six-fold and read as a mess, while
 * the wave itself comes entirely from the frequency spread.
 */
export const pendulumWave = defineContraption({
  name: 'pendulum-wave',
  label: 'Pendulum Wave',
  tags: ['swing', 'wave'],
  span: [3, 1],
  mirror: false,
  rotations: [0],
  setup: ({ color, rng, theme }) => ({
    color,
    alt: rng.pick(theme.colors.filter((c) => c !== color)) ?? color,
    count: rng.pick([7, 9]),
    base: rng.int(4, 7),
    table: pendulumTable(0.42),
  }),
  draw: (p, s, { w, h, size, u, ink, weight }) => {
    const top = -h / 2
    const bob = size * 0.19
    const span = w * 0.9

    outline(p, ink, weight)
    p.line(-w / 2, top, w / 2, top)

    for (let i = 0; i < s.count; i++) {
      const n = i / (s.count - 1)
      const x = -span / 2 + span * n
      const len = lerp(h * 0.74, h * 0.46, n)
      const theta = swing(s.table, u * (s.base + i))
      const bx = x + len * Math.sin(theta)
      const by = top + len * Math.cos(theta)

      outline(p, ink, weight)
      p.line(x, top, bx, by)
      solid(p, ink, weight, i % 2 === 0 ? s.color : s.alt)
      p.circle(bx, by, bob)
    }
  },
})
