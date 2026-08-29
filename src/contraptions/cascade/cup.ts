import { defineContraption } from '../../core/define'
import { clipCell, outline, solid } from '../../core/draw'
import { FLOOR, THROAT, TOKEN, drawElevator, heading, rideOf, rideToken, rollIn, since, token, tokenColor, type Beat } from './parts'

/**
 * A sitting cup on the rail. On a run that drops south it is the catalog
 * stand-in for a lift — the snake itself uses the lift / well pair.
 */
const FIRE = 0

export const cup = defineContraption<Beat>({
  name: 'cup',
  label: 'Cup',
  tags: ['ball'],
  role: 'relay',
  inlets: ['E', 'W', 'N'],
  outlets: ['E', 'W', 'S'],
  rotations: [0],
  fireAt: FIRE,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const h = heading(s.flow)
    const t = since(u, FIRE)
    const ride = rideOf(s)
    const dumping = !!ride || s.flow?.out === 'S'

    if (dumping) {
      p.push()
      p.scale(h, 1)
      const from = s.flow?.in === 'E' ? 0.5 : -0.5
      outline(p, ink, weight)
      p.line(from * k, FLOOR * k, -0.18 * k, FLOOR * k)
      p.pop()
      drawElevator(p, k, ink, weight, s, u)
      clipCell(p, k, () => {
        const pos = rideToken(s, u, FIRE)
        if (pos) token(p, k, ink, weight, tokenColor(s), pos)
      })
      return
    }

    let pos = rollIn(s, u, FIRE)
    if (!pos && t < 0.45) pos = [0, FLOOR - TOKEN / 2]

    p.push()
    p.scale(h, 1)
    outline(p, ink, weight)
    const from = s.flow?.in === 'E' ? 0.5 : -0.5
    p.line(from * k, FLOOR * k, THROAT * k, FLOOR * k)
    solid(p, ink, weight, s.color)
    p.arc(0, FLOOR * k, 0.28 * k, 0.22 * k, 0, Math.PI)
    p.pop()

    clipCell(p, k, () => {
      if (pos) token(p, k, ink, weight, tokenColor(s), pos)
    })
  },
})
