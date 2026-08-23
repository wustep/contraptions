import { defineContraption } from '../core/define'
import { outline, solid } from '../core/draw'

/** Five balls on threads; the outer two trade the swing between them. */
export const newtonsCradle = defineContraption({
  name: 'newtons-cradle',
  label: "Newton's Cradle",
  tags: ['swing', 'strike'],
  span: [2, 1],
  mirror: false,
  rotations: [0],
  fireAt: 0,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { w, h, size, u, ink, weight }) => {
    const top = -h / 2
    const count = 5
    const d = size * 0.26
    const len = h * 0.62
    const swing = Math.sin(u * Math.PI * 2)
    const lift = 0.4

    outline(p, ink, weight)
    p.line(-w / 2, top, w / 2, top)

    for (let i = 0; i < count; i++) {
      const x = (i - (count - 1) / 2) * d
      let theta = 0
      if (i === 0) theta = -lift * Math.max(0, swing)
      if (i === count - 1) theta = lift * Math.max(0, -swing)
      const bx = x + len * Math.sin(theta)
      const by = top + len * Math.cos(theta)

      outline(p, ink, weight)
      p.line(x, top, bx, by)
      solid(p, ink, weight, s.color)
      p.circle(bx, by, d)
    }
  },
})
