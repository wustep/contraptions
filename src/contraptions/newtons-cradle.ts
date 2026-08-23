import { defineContraption } from '../core/define'
import { outline, solid } from '../core/draw'
import { pendulum as pendulumTable, swing } from '../core/physics'

/**
 * Five balls on threads; the outer two trade the swing between them.
 *
 * Each outer ball follows a real pendulum arc for the half-cycle it is moving
 * and sits dead still for the other half, which is what the collision does to
 * it — the momentum is handed straight across the stack.
 */
export const newtonsCradle = defineContraption({
  name: 'newtons-cradle',
  label: "Newton's Cradle",
  tags: ['swing', 'strike'],
  span: [2, 1],
  mirror: false,
  rotations: [0],
  // Both impacts land on the stack; the loop starts on one of them.
  fireAt: 0,
  setup: ({ color }) => ({ color, table: pendulumTable(0.5) }),
  draw: (p, s, { w, h, size, u, ink, weight }) => {
    const top = -h / 2
    const count = 5
    const d = size * 0.26
    const len = h * 0.62

    // The left ball owns the first half of the loop, the right ball the second.
    // swing() run over a half-window gives out-and-back with the correct dwell
    // at the top of the arc.
    const left = u < 0.5 ? -Math.abs(swing(s.table, u * 0.5)) : 0
    const right = u >= 0.5 ? Math.abs(swing(s.table, (u - 0.5) * 0.5)) : 0

    outline(p, ink, weight)
    p.line(-w / 2, top, w / 2, top)

    for (let i = 0; i < count; i++) {
      const x = (i - (count - 1) / 2) * d
      const theta = i === 0 ? left : i === count - 1 ? right : 0
      const bx = x + len * Math.sin(theta)
      const by = top + len * Math.cos(theta)

      outline(p, ink, weight)
      p.line(x, top, bx, by)
      solid(p, ink, weight, s.color)
      p.circle(bx, by, d)
    }
  },
})
