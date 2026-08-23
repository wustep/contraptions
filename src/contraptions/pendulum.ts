import { defineContraption } from '../core/define'
import { ceilRail, outline, solid } from '../core/draw'

/** A weight swinging from the ceiling rail. */
export const pendulum = defineContraption({
  name: 'pendulum',
  label: 'Pendulum',
  tags: ['swing'],
  period: 120,
  mirror: false,
  setup: ({ color, rng }) => ({ color, swing: rng.range(0.11, 0.18) }),
  draw: (p, s, { size, u, ink, weight }) => {
    const arm = size * 0.58
    const bob = size / 3
    const theta = Math.PI / 2 + Math.PI * s.swing * Math.sin(u * Math.PI * 2)
    const bx = arm * Math.cos(theta)
    const by = -size / 2 + arm * Math.sin(theta)

    outline(p, ink, weight)
    ceilRail(p, size)
    p.line(0, -size / 2, bx, by)
    solid(p, ink, weight, s.color)
    p.circle(bx, by, bob)
  },
})
