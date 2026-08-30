import { defineContraption } from '../../core/define'
import { outline, solid } from '../../core/draw'
import { clamp, easeInOutCubic, easeOutBack, lerp, seg } from '../../core/ease'
import { FLOOR, TOKEN, flick, floor, rollLane, since, type Beat } from './parts'

/**
 * A flag at the foot of its pole, held by a catch in the line: the ball rolls
 * into the cradle under the catch, trips it, the flag shoots to the top, and
 * it eases back down while the next one is on its way.
 *
 * The ball stays in the cradle for exactly `emit` — the next one takes its
 * place at the same instant and the same point, so the end of the line is
 * never empty.
 */
const FIRE = 0
const DOWN = 0.0
const UP = -0.36
/** Where the ball comes to rest, against the catch at the foot of the pole. */
const SEAT = -0.17

export const flag = defineContraption<Beat>({
  name: 'flag',
  label: 'Flag',
  tags: ['signal', 'swing'],
  role: 'sink',
  inlets: ['E', 'W', 'N'],
  rotations: [0],
  fireAt: FIRE,
  lane: (ctx) => rollLane(ctx, { at: SEAT }),
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const t = since(u, FIRE)
    const y = lerp(DOWN, UP, clamp(easeOutBack(seg(t, 0, 0.09)) - easeInOutCubic(seg(t, 0.55, 0.9))))

    floor(p, k, ink, weight, s)
    outline(p, ink, weight)
    p.line(0, FLOOR * k, 0, -0.46 * k)
    solid(p, ink, weight, s.color)
    p.circle(0, -0.46 * k, 0.07 * k)

    // The cradle the ball comes to rest in: a dish under the rail and two
    // horns just wider than it, so the seat reads without anything standing
    // in the lane.
    const dish = TOKEN + 0.1
    outline(p, ink, weight)
    p.arc(SEAT * k, FLOOR * k, dish * k, 0.16 * k, 0, Math.PI)
    for (const side of [-1, 1]) {
      p.line((SEAT + (side * dish) / 2) * k, FLOOR * k, (SEAT + (side * dish) / 2) * k, (FLOOR - 0.07) * k)
    }

    // The flag, a pennant on the far side of the pole from the ball.
    solid(p, ink, weight, s.color)
    p.beginShape()
    p.vertex(0, (y - 0.09) * k)
    p.vertex(0.34 * k, (y - 0.09) * k)
    p.vertex(0.26 * k, y * k)
    p.vertex(0.34 * k, (y + 0.09) * k)
    p.vertex(0, (y + 0.09) * k)
    p.endShape(p.CLOSE)
  },
  // The catch reaches down in front of the ball that trips it.
  over: (p, _s, { size: k, u, ink, weight }) => {
    const t = since(u, FIRE)
    p.push()
    p.translate(0.02 * k, 0.06 * k)
    p.rotate(flick(t) * 1.1)
    outline(p, ink, weight)
    p.line(0, 0, -0.06 * k, -0.11 * k)
    p.pop()
  },
})
