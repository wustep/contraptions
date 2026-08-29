import { defineContraption } from '../../core/define'
import { clipCell, outline, solid } from '../../core/draw'
import { easeInQuad, easeOutCubic, seg } from '../../core/ease'
import { belt, BELT_V, BENCH, HIT, lineOf, part, PART_Y, partColor } from './shop'

/**
 * The belt runs on under a queue held back by the stop; when the stop lifts,
 * the front part rides off east, the queue closes up behind it, and the stop
 * drops back in its way.
 */
const STOP_X = 0.12
const FRONT = STOP_X - 0.03 - 0.12
const GAP = 0.36

export const latch = defineContraption({
  name: 'latch',
  label: 'Stop Gate',
  tags: ['convey', 'signal'],
  role: 'sink',
  rotations: [0],
  fireAt: HIT,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const travel = u * BELT_V
    const lift = 0.3 * (easeOutCubic(seg(u, HIT - 0.02, HIT + 0.03)) - easeInQuad(seg(u, 0.56, 0.6)))
    const gone = lineOf(s)?.out === false || u < HIT ? FRONT : FRONT + (u - HIT) * BELT_V
    const close = Math.min(GAP, Math.max(0, u - HIT) * BELT_V)

    clipCell(p, k, () => {
      belt(p, k, ink, weight, s.color, -0.5, 0.5, travel)
      if (gone < 0.52) part(p, k, ink, weight, partColor(s), gone, PART_Y)
      part(p, k, ink, weight, partColor(s), FRONT - GAP + close, PART_Y)
      part(p, k, ink, weight, partColor(s), FRONT - GAP * 2 + close, PART_Y)

      // The solenoid on its bracket, and the stop pin it lifts.
      outline(p, ink, weight)
      p.line(STOP_X * k, -0.28 * k, STOP_X * k, -0.2 * k)
      p.rect(STOP_X * k, -0.14 * k, 0.16 * k, 0.14 * k)
      p.line(STOP_X * k, -0.07 * k, STOP_X * k, (BENCH - 0.26 - lift) * k)
      solid(p, ink, weight, s.color)
      p.rect(STOP_X * k, (BENCH - 0.13 - lift) * k, 0.06 * k, 0.26 * k)
    })
  },
})
