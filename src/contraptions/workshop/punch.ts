import { defineContraption } from '../../core/define'
import { outline, solid } from '../../core/draw'
import { easeInQuad, easeOutCubic, lerp, seg } from '../../core/ease'
import { BELT_SPAN, BENCH, HIT, PART_Y, SHOP_PERIOD, bench, burst, pulse, rollers, workLane } from './shop'

/**
 * The pin comes down through the blank and out the other side, the slug it
 * cut drops into the tray under the bench, and the part rolls on.
 *
 * The pin passes through where the part is, so it is drawn in `over`: the one
 * part on the line goes under the tool rather than in front of it.
 */
const REST = -0.06
const THROUGH = BENCH + 0.03
const HOLD = 0.16

/** The pin's tip through the machine's own clock. */
const pinAt = (u: number) =>
  u < HIT - 0.06 ? REST
  : u < HIT ? lerp(REST, THROUGH, easeInQuad(seg(u, HIT - 0.06, HIT)))
  : u < HIT + 0.04 ? THROUGH
  : lerp(THROUGH, REST, easeOutCubic(seg(u, HIT + 0.04, HIT + 0.16)))

export const punch = defineContraption({
  name: 'punch',
  label: 'Punch',
  tags: ['work'],
  role: 'sink',
  rotations: [0],
  fireAt: HIT,
  lane: (ctx) => workLane(ctx, { time: HOLD }),
  setup: ({ color, theme }) => ({ color, bg: theme.bg }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const slug = u >= HIT && u < 0.62 ? lerp(BENCH, 0.46, easeInQuad(seg(u, HIT, HIT + 0.08))) : null

    bench(p, k, ink, weight, -0.5, -0.06)
    bench(p, k, ink, weight, 0.06, 0.5)
    rollers(p, k, ink, weight, s.color, -0.5, -0.16, u * BELT_SPAN)
    rollers(p, k, ink, weight, s.color, 0.16, 0.5, u * BELT_SPAN)

    // The slug falls into the tray, which hides it once it lands.
    if (slug !== null) {
      solid(p, ink, weight, s.color)
      p.circle(0, slug * k, 0.1 * k)
    }
    solid(p, ink, weight, s.color)
    p.rect(0, 0.45 * k, 0.28 * k, 0.08 * k)

    // The C-frame and the sleeve.
    outline(p, ink, weight)
    p.line(0.3 * k, BENCH * k, 0.3 * k, -0.24 * k)
    p.line(0.34 * k, -0.24 * k, -0.06 * k, -0.24 * k)
    p.rect(0, -0.18 * k, 0.14 * k, 0.12 * k)
  },
  over: (p, s, { size: k, u, ink, weight }) => {
    const tip = pinAt(u)
    outline(p, ink, weight)
    p.line(0, -0.24 * k, 0, (tip - 0.26) * k)
    solid(p, ink, weight, s.color)
    p.rect(0, (tip - 0.13) * k, 0.07 * k, 0.26 * k)
    burst(p, k, s.color, weight, 0, PART_Y - 0.1, pulse(u, HIT, 16, SHOP_PERIOD), 0.16, 0.26, 4, Math.PI / 4)
  },
})
