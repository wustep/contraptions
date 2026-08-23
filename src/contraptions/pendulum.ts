import { defineContraption } from '../core/define'
import { ceilRail, outline, solid } from '../core/draw'
import { pendulum as pendulumTable, swing } from '../core/physics'

/** A weight swinging from the ceiling rail, under real pendulum motion. */
export const pendulum = defineContraption({
  name: 'pendulum',
  label: 'Pendulum',
  tags: ['swing'],
  period: 120,
  mirror: false,
  fireAt: 0.25,
  setup: ({ color, rng }) => ({
    color,
    table: pendulumTable(rng.range(0.45, 0.85)),
  }),
  draw: (p, s, { size, u, ink, weight }) => {
    const arm = size * 0.58
    const bob = size / 3
    // Hang from the ceiling: 0 rad is straight down.
    const theta = swing(s.table, u)
    const bx = arm * Math.sin(theta)
    const by = -size / 2 + arm * Math.cos(theta)

    outline(p, ink, weight)
    ceilRail(p, size)
    p.line(0, -size / 2, bx, by)
    solid(p, ink, weight, s.color)
    p.circle(bx, by, bob)
  },
})
