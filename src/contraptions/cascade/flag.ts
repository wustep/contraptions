import { defineContraption } from '../../core/define'
import { outline, solid } from '../../core/draw'
import { clamp, easeInOutCubic, easeOutBack, lerp, seg } from '../../core/ease'
import { FLOOR, flick, floor, heading, since, type Beat } from './parts'

/**
 * A flag at the foot of its pole, held by a catch in the line: the ball trips
 * the catch, the flag shoots to the top, and it eases back down while the
 * next one is on its way.
 */
const FIRE = 0
const DOWN = 0.0
const UP = -0.36

export const flag = defineContraption<Beat>({
  name: 'flag',
  label: 'Flag',
  tags: ['signal', 'swing'],
  role: 'sink',
  inlets: ['E', 'W'],
  rotations: [0],
  fireAt: FIRE,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const h = heading(s.flow)
    const t = since(u, FIRE)
    const y = lerp(DOWN, UP, clamp(easeOutBack(seg(t, 0, 0.09)) - easeInOutCubic(seg(t, 0.55, 0.9))))

    floor(p, k, ink, weight, s)
    outline(p, ink, weight)
    p.line(0, FLOOR * k, 0, -0.46 * k)
    solid(p, ink, weight, s.color)
    p.circle(0, -0.46 * k, 0.07 * k)

    // The catch, flicked over by the ball.
    p.push()
    p.translate(0, 0.1 * k)
    p.rotate(h * flick(t) * 0.9)
    outline(p, ink, weight)
    p.line(0, 0, -h * 0.14 * k, -0.08 * k)
    p.pop()

    // The flag, a pennant on the run's side of the pole.
    solid(p, ink, weight, s.color)
    p.beginShape()
    p.vertex(0, (y - 0.09) * k)
    p.vertex(h * 0.34 * k, (y - 0.09) * k)
    p.vertex(h * 0.26 * k, y * k)
    p.vertex(h * 0.34 * k, (y + 0.09) * k)
    p.vertex(0, (y + 0.09) * k)
    p.endShape(p.CLOSE)
  },
})
