import { defineContraption } from '../../core/define'
import { outline, solid } from '../../core/draw'
import { easeInQuad, easeOutCubic, seg } from '../../core/ease'
import { BELT_SPAN, BENCH, HIT, belt, workLane } from './shop'

/**
 * The belt runs on under a part held back by the stop; when the stop lifts,
 * the part rides off east and the stop drops back in the way of the next.
 *
 * The belt never stops, so the queue behind the pin is just the line backing
 * up — the world's parts, held by the lane's pause.
 */
const STOP_X = 0.12
const FRONT = STOP_X - 0.03 - 0.12
const HOLD = 0.16

export const latch = defineContraption({
  name: 'latch',
  label: 'Stop Gate',
  tags: ['convey', 'signal'],
  role: 'sink',
  rotations: [0],
  fireAt: HIT,
  lane: (ctx) => workLane(ctx, { at: FRONT, time: HOLD, when: 'out' }),
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const lift = 0.3 * (easeOutCubic(seg(u, HIT - 0.02, HIT + 0.03)) - easeInQuad(seg(u, 0.56, 0.6)))

    belt(p, k, ink, weight, s.color, -0.5, 0.5, u * BELT_SPAN)

    // The solenoid on its bracket, and the stop pin it lifts.
    outline(p, ink, weight)
    p.line(STOP_X * k, -0.28 * k, STOP_X * k, -0.2 * k)
    p.rect(STOP_X * k, -0.14 * k, 0.16 * k, 0.14 * k)
    p.line(STOP_X * k, -0.07 * k, STOP_X * k, (BENCH - 0.26 - lift) * k)
    solid(p, ink, weight, s.color)
    p.rect(STOP_X * k, (BENCH - 0.13 - lift) * k, 0.06 * k, 0.26 * k)
  },
})
