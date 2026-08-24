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

    // One ball is moving at a time and the other rests dead still at the
    // bottom, because that is what the collision does — the momentum is handed
    // straight across the stack rather than shared with it.
    //
    // swing() runs amplitude -> 0 -> -amplitude -> 0 -> amplitude over its
    // argument. Entering it at 0.25 gives the half that starts and ends at the
    // bottom, which is the excursion a struck ball actually makes: it leaves
    // the stack, rises, and returns. Entering at 0 instead would start the ball
    // already at full height, which is what made the handover look like a jump.
    const right = u < 0.5 ? -swing(s.table, 0.25 + u) : 0
    const left = u >= 0.5 ? swing(s.table, 0.25 + (u - 0.5)) : 0

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
