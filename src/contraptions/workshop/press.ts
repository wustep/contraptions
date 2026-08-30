import { defineContraption } from '../../core/define'
import { outline, solid } from '../../core/draw'
import { easeInQuad, easeOutCubic, lerp, seg } from '../../core/ease'
import { BELT_SPAN, BENCH, HIT, PART_Y, SHOP_PERIOD, bench, burst, pulse, rollers, workLane } from './shop'

/**
 * A blank rolls in and waits under the ram, the ram slams down and leaves its
 * mark, and the part rolls on. The pause is the lane's, so the ram comes down
 * on a part that is really there.
 */
const REST = -0.16
const STRIKE = PART_Y - 0.12 - 0.06
/** Loop fraction the part is held under the ram. */
const HOLD = 0.16

export const press = defineContraption({
  name: 'press',
  label: 'Press',
  tags: ['work'],
  role: 'sink',
  rotations: [0],
  weight: 1.3,
  fireAt: HIT,
  lane: (ctx) => workLane(ctx, { time: HOLD }),
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const head =
      u < HIT - 0.06 ? REST
      : u < HIT ? lerp(REST, STRIKE, easeInQuad(seg(u, HIT - 0.06, HIT)))
      : u < HIT + 0.06 ? STRIKE
      : lerp(STRIKE, REST, easeOutCubic(seg(u, HIT + 0.06, HIT + 0.18)))

    bench(p, k, ink, weight)
    rollers(p, k, ink, weight, s.color, -0.5, -0.18, u * BELT_SPAN)
    rollers(p, k, ink, weight, s.color, 0.18, 0.5, u * BELT_SPAN)

    // The frame: two posts, a crossbar with the cylinder on top.
    outline(p, ink, weight)
    for (const px of [-0.28, 0.28]) p.line(px * k, BENCH * k, px * k, -0.38 * k)
    p.rect(0, -0.46 * k, 0.18 * k, 0.08 * k)
    p.push()
    p.fill(ink)
    p.rect(0, -0.38 * k, 0.68 * k, 0.08 * k)
    p.pop()

    // The ram, stopping on the part's face.
    outline(p, ink, weight)
    p.line(0, -0.34 * k, 0, (head - 0.06) * k)
    solid(p, ink, weight, s.color)
    p.rect(0, head * k, 0.3 * k, 0.12 * k)

    burst(p, k, s.color, weight, 0, PART_Y - 0.1, pulse(u, HIT, 16, SHOP_PERIOD), 0.2, 0.32, 4, Math.PI / 4)
  },
})
