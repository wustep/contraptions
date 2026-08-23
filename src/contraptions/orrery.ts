import { defineContraption } from '../core/define'
import { outline, solid } from '../core/draw'

/** Nested arms carrying bodies around a common centre. */
export const orrery = defineContraption({
  name: 'orrery',
  label: 'Orrery',
  tags: ['spin', 'ball'],
  span: [2, 2],
  rotations: [0],
  mirror: false,
  setup: ({ color, rng, theme }) => ({
    color,
    alt: rng.pick(theme.colors.filter((c) => c !== color)) ?? color,
    inner: rng.pick([2, 3]),
    outer: rng.pick([1, 1, 2]),
    dir: rng.sign(),
  }),
  draw: (p, s, { w, h, size, u, ink, weight }) => {
    const unit = Math.min(w, h)
    const r1 = unit * 0.19
    const r2 = unit * 0.36
    const a1 = u * Math.PI * 2 * s.inner * s.dir
    const a2 = u * Math.PI * 2 * s.outer * s.dir
    const dots = (r: number) => {
      for (let i = 0; i < 40; i += 2) {
        const b0 = (i / 40) * Math.PI * 2
        p.line(r * Math.cos(b0), r * Math.sin(b0), r * Math.cos(b0 + Math.PI / 40), r * Math.sin(b0 + Math.PI / 40))
      }
    }

    outline(p, ink, weight)
    dots(r1)
    dots(r2)

    const x1 = r1 * Math.cos(a1)
    const y1 = r1 * Math.sin(a1)
    const x2 = r2 * Math.cos(a2)
    const y2 = r2 * Math.sin(a2)
    const mx = x2 + unit * 0.13 * Math.cos(a2 * 4)
    const my = y2 + unit * 0.13 * Math.sin(a2 * 4)

    outline(p, ink, weight)
    p.line(0, 0, x1, y1)
    p.line(0, 0, x2, y2)
    p.line(x2, y2, mx, my)

    solid(p, ink, weight, s.color)
    p.circle(0, 0, size * 0.34)
    solid(p, ink, weight, s.alt)
    p.circle(x1, y1, size * 0.19)
    solid(p, ink, weight, s.color)
    p.circle(x2, y2, size * 0.24)
    outline(p, ink, weight)
    p.circle(mx, my, size * 0.1)
  },
})
