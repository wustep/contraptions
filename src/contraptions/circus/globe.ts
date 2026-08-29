import { defineContraption } from '../../core/define'
import { outline, solid } from '../../core/draw'
import { pingPong } from '../../core/ease'
import { block, ground, performer } from './circus'

/**
 * The acrobat walks on top of a big ball, which rolls under them to one end
 * of the stage and back, turning exactly as far as it travels, so by the end
 * of the loop its stripe is back where it began.
 */
const R = 0.2
const TRAVEL = 0.26
const RIDER = 0.15

export const globe = defineContraption({
  name: 'globe',
  label: 'Rolling Globe',
  tags: ['parade'],
  role: 'relay',
  rotations: [0],
  fireAt: 0,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const x = -TRAVEL + 2 * TRAVEL * pingPong(u)
    const cy = 0.5 - R
    const roll = x / R
    // The walker leans into the direction the ball is being pushed.
    const lean = 0.03 * Math.sin(Math.PI * 2 * u)

    outline(p, ink, weight)
    ground(p, k, 1)
    block(p, k, ink, weight, s.color, -0.46, 0.46, 0.06, 0.08)
    block(p, k, ink, weight, s.color, 0.46, 0.46, 0.06, 0.08)

    p.push()
    p.translate(x * k, cy * k)
    p.rotate(roll)
    solid(p, ink, weight, s.color)
    p.circle(0, 0, R * 2 * k)
    outline(p, ink, weight)
    p.line(-R * k, 0, R * k, 0)
    p.line(0, -R * k, 0, R * k)
    p.fill(ink)
    p.circle(R * 0.62 * k, 0, 0.06 * k)
    p.pop()

    performer(p, k, ink, weight, s.color, x + lean, cy - R - RIDER / 2, RIDER)
  },
})
