import { defineContraption } from '../../core/define'
import { clipCell, outline, solid } from '../../core/draw'
import { FLOOR, floor, heading, rollIn, rollOut, token, tokenColor, type Beat } from './parts'

/**
 * A belt in the line running the run's way: the ball rides it across and the
 * rollers turn under it, a beat that hands on without changing anything.
 */
const FIRE = 0.4
const R = 0.09
const AXLE = FLOOR + R
const SPAN = 0.3

export const belt = defineContraption<Beat>({
  name: 'belt',
  label: 'Belt',
  tags: ['ball', 'spin'],
  role: 'relay',
  inlets: ['E', 'W'],
  outlets: ['E', 'W'],
  rotations: [0],
  fireAt: FIRE,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const h = heading(s.flow)
    const turn = h * u * Math.PI * 2 * 3

    floor(p, k, ink, weight, s, SPAN)
    outline(p, ink, weight)
    p.line(-SPAN * k, FLOOR * k, SPAN * k, FLOOR * k)
    p.line(-SPAN * k, (AXLE + R) * k, SPAN * k, (AXLE + R) * k)
    p.arc(-SPAN * k, AXLE * k, R * 2 * k, R * 2 * k, Math.PI / 2, Math.PI * 1.5)
    p.arc(SPAN * k, AXLE * k, R * 2 * k, R * 2 * k, Math.PI * 1.5, Math.PI / 2)
    // Legs to the ground, so the belt is a machine on the floor and not a hover.
    for (const x of [-SPAN, SPAN]) p.line(x * k, (AXLE + R) * k, x * k, 0.5 * k)
    p.line(-SPAN * k, 0.5 * k, SPAN * k, 0.5 * k)

    for (const x of [-SPAN, SPAN]) {
      p.push()
      p.translate(x * k, AXLE * k)
      p.rotate(turn)
      solid(p, ink, weight, s.color)
      p.circle(0, 0, R * 1.5 * k)
      p.line(-R * 0.75 * k, 0, R * 0.75 * k, 0)
      p.line(0, -R * 0.75 * k, 0, R * 0.75 * k)
      p.pop()
    }

    clipCell(p, k, () => {
      const at = rollIn(s, u, FIRE) ?? rollOut(s, u, FIRE)
      if (at) token(p, k, ink, weight, tokenColor(s), at)
    })
  },
})
