import { defineContraption } from '../../core/define'
import { outline, solid } from '../../core/draw'
import { pendulum as pendulumTable, swing } from '../../core/physics'
import type { Beat } from './parts'

/**
 * A Newton's cradle: one end ball is let go, the click runs through the
 * stack, and the far one jumps out and back, and back again — momentum handed
 * along, which is the cascade at its simplest.
 */
export const cradle = defineContraption<Beat & { table: number[] }>({
  name: 'cradle',
  label: "Newton's Cradle",
  tags: ['strike', 'swing'],
  span: [2, 1],
  mirror: false,
  rotations: [0],
  setup: ({ color }) => ({ color, table: pendulumTable(0.5) }),
  draw: (p, s, { w, h, size, u, ink, weight }) => {
    const top = -h / 2
    const count = 5
    const d = size * 0.26
    const len = h * 0.62

    // One ball moves at a time and the other rests dead still, because that
    // is what the collision does: the momentum crosses the stack whole.
    // swing() runs amplitude -> 0 -> -amplitude -> 0 -> amplitude; entering
    // it a quarter in gives the half that starts and ends at the bottom,
    // which is the excursion a struck ball actually makes.
    const right = u < 0.5 ? -swing(s.table, 0.25 + u) : 0
    const left = u >= 0.5 ? swing(s.table, 0.25 + (u - 0.5)) : 0

    outline(p, ink, weight)
    p.line(-w / 2, top, w / 2, top)
    for (const x of [-w / 2 + size * 0.12, w / 2 - size * 0.12]) p.line(x, top, x, h / 2)
    p.line(-w / 2, h / 2, w / 2, h / 2)

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
