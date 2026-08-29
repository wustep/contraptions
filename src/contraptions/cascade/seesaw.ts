import { defineContraption } from '../../core/define'
import { clipCell, outline, solid } from '../../core/draw'
import { easeInOutCubic, easeOutCubic, seg } from '../../core/ease'
import { floor, heading, rollIn, rollOut, since, token, tokenColor, type Beat } from './parts'

/**
 * A plank on a pivot resting with its near end down: the ball rolls up it,
 * crosses the pivot, and its weight slams the far end down and sends it off
 * faster than it came, while a counterweight hauls the plank back before the
 * next one.
 */
const FIRE = 0.4
const PIVOT = 0.17
const HALF_LEN = 0.42
const THICK = 0.07
const TILT = 0.2

export const seesaw = defineContraption<Beat>({
  name: 'seesaw',
  label: 'Seesaw',
  tags: ['ball', 'swing'],
  role: 'relay',
  inlets: ['E', 'W'],
  outlets: ['E', 'W', 'S'],
  rotations: [0],
  fireAt: FIRE,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const h = heading(s.flow)
    const t = since(u, FIRE)
    const tip = easeOutCubic(seg(t, 0, 0.06)) - easeInOutCubic(seg(t, 0.5, 0.85))
    const angle = h * TILT * (2 * tip - 1)

    floor(p, k, ink, weight, s)
    outline(p, ink, weight)
    // The stand, and the stops each end of the plank comes down onto.
    p.line(-0.14 * k, 0.5 * k, 0, PIVOT * k)
    p.line(0.14 * k, 0.5 * k, 0, PIVOT * k)
    for (const x of [-0.38, 0.38]) p.line(x * k, 0.5 * k, x * k, 0.3 * k)

    p.push()
    p.translate(0, PIVOT * k)
    p.rotate(angle)
    solid(p, ink, weight, s.color)
    p.rect(0, 0, HALF_LEN * 2 * k, THICK * k)
    p.pop()
    solid(p, ink, weight, s.color)
    p.circle(0, PIVOT * k, 0.09 * k)

    clipCell(p, k, () => {
      const at = rollIn(s, u, FIRE) ?? rollOut(s, u, FIRE)
      if (at) token(p, k, ink, weight, tokenColor(s), at)
    })
  },
})
