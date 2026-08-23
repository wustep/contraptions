import { defineContraption } from '../core/define'
import { outline } from '../core/draw'
import { mod } from '../core/ease'

/** Three lamps in a housing, lighting one at a time. */
export const traffic = defineContraption({
  name: 'traffic',
  label: 'Signal',
  tags: ['sequence', 'ball'],
  rotations: [0, 1, 2, 3],
  mirror: false,
  fireAt: 0,
  setup: ({ color, rng, theme }) => ({
    color,
    alt: rng.pick(theme.colors.filter((c) => c !== color)) ?? color,
    dir: rng.sign(),
  }),
  draw: (p, s, { size, u, ink, weight }) => {
    const d = size * 0.22
    const gap = size * 0.26
    const lit = Math.floor(mod(u * s.dir, 1) * 3)

    outline(p, ink, weight)
    p.rect(0, 0, d * 1.7, gap * 2 + d * 1.4, size * 0.04)
    p.line(0, gap + d * 0.9, 0, size / 2)

    for (let i = 0; i < 3; i++) {
      const y = -gap + gap * i
      outline(p, ink, weight)
      if (i === lit) p.fill(i === 1 ? s.alt : s.color)
      p.circle(0, y, d)
    }
  },
})
