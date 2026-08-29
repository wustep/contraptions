import { defineContraption } from '../../core/define'
import { outline, solid, teeth } from '../../core/draw'
import { easeInOutCubic, seg } from '../../core/ease'
import { BELT_SPAN, BENCH, bench, rollers, workLane } from './shop'

/**
 * The part settles on the trip lever and presses it down, the link pulls the
 * pawl round one tooth, and the count stands one higher until the next part.
 */
const WHEEL: [number, number] = [0, -0.04]
const R = 0.14
const CLICK = 0.28
const HOLD = 0.1

export const counter = defineContraption({
  name: 'counter',
  label: 'Counter',
  tags: ['signal'],
  role: 'sink',
  rotations: [0],
  fireAt: CLICK,
  lane: (ctx) => workLane(ctx, { time: HOLD }),
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const press = seg(u, 0.2, 0.24) - seg(u, 0.4, 0.44)
    const step = easeInOutCubic(seg(u, CLICK - 0.04, CLICK + 0.06))
    const angle = (step * Math.PI * 2) / 8
    const tabY = BENCH - 0.06 * (1 - press)

    bench(p, k, ink, weight)
    rollers(p, k, ink, weight, s.color, -0.5, -0.2, u * BELT_SPAN)
    rollers(p, k, ink, weight, s.color, 0.2, 0.5, u * BELT_SPAN)

    // The trip lever and the link up to the pawl.
    outline(p, ink, weight)
    p.line(-0.12 * k, BENCH * k, 0.08 * k, tabY * k)
    p.line(0.08 * k, tabY * k, 0.08 * k, -0.02 * k)
    p.push()
    p.translate(0.08 * k, -0.02 * k)
    p.rotate(-press * 0.5)
    outline(p, ink, weight)
    p.line(0, 0, 0.06 * k, -0.14 * k)
    solid(p, ink, weight, s.color)
    p.circle(0, 0, 0.05 * k)
    p.pop()

    // The wheel: eight teeth, so a step of one closes the loop, and a
    // fixed pointer to count them past.
    p.push()
    p.translate(WHEEL[0] * k, WHEEL[1] * k)
    p.rotate(angle)
    outline(p, ink, weight)
    p.circle(0, 0, R * 2 * k)
    teeth(p, R * k, 8, 0.05 * k)
    p.pop()
    solid(p, ink, weight, s.color)
    p.circle(WHEEL[0] * k, WHEEL[1] * k, 0.09 * k)
    outline(p, ink, weight)
    p.line(WHEEL[0] * k, (WHEEL[1] - R - 0.12) * k, WHEEL[0] * k, (WHEEL[1] - R - 0.06) * k)
    solid(p, ink, weight, s.color)
    p.triangle(WHEEL[0] * k, (WHEEL[1] - R - 0.02) * k, (WHEEL[0] - 0.04) * k, (WHEEL[1] - R - 0.09) * k, (WHEEL[0] + 0.04) * k, (WHEEL[1] - R - 0.09) * k)
  },
})
