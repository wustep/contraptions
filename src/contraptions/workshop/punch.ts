import { defineContraption } from '../../core/define'
import { clipCell, outline, solid } from '../../core/draw'
import { easeInQuad, easeOutCubic, lerp, seg } from '../../core/ease'
import { BELT_V, BENCH, HIT, PART_Y, bench, burst, part, pulse, rollers, shuttle } from './shop'

/**
 * The pin comes down through the blank and out the other side, the slug it
 * cut drops into the tray under the bench, and the part rolls on with a hole
 * in it.
 */
const REST = -0.14
const THROUGH = BENCH + 0.03

export const punch = defineContraption({
  name: 'punch',
  label: 'Punch',
  tags: ['work'],
  role: 'sink',
  rotations: [0],
  fireAt: HIT,
  setup: ({ color, theme }) => ({ color, bg: theme.bg }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    // The pin's tip.
    const tip =
      u < HIT - 0.06 ? REST
      : u < HIT ? lerp(REST, THROUGH, easeInQuad(seg(u, HIT - 0.06, HIT)))
      : u < HIT + 0.04 ? THROUGH
      : lerp(THROUGH, REST, easeOutCubic(seg(u, HIT + 0.04, HIT + 0.16)))
    const x = shuttle(u)
    const slug = u >= HIT && u < 0.62 ? lerp(BENCH, 0.46, easeInQuad(seg(u, HIT, HIT + 0.08))) : null

    clipCell(p, k, () => {
      bench(p, k, ink, weight, -0.5, -0.06)
      bench(p, k, ink, weight, 0.06, 0.5)
      rollers(p, k, ink, weight, s.color, -0.5, -0.16, u * BELT_V)
      rollers(p, k, ink, weight, s.color, 0.16, 0.5, u * BELT_V)

      // The slug falls into the tray, which hides it once it lands.
      if (slug !== null) {
        solid(p, ink, weight, s.color)
        p.circle(0, slug * k, 0.1 * k)
      }
      solid(p, ink, weight, s.color)
      p.rect(0, 0.45 * k, 0.28 * k, 0.08 * k)

      if (x !== null) part(p, k, ink, weight, s.color, x, PART_Y, { mark: u >= HIT ? 'hole' : 'blank', bg: s.bg })

      // The C-frame, the sleeve, and the pin.
      outline(p, ink, weight)
      p.line(0.3 * k, BENCH * k, 0.3 * k, -0.44 * k)
      p.line(0.34 * k, -0.44 * k, -0.06 * k, -0.44 * k)
      p.rect(0, -0.36 * k, 0.14 * k, 0.12 * k)
      p.line(0, -0.42 * k, 0, (tip - 0.26) * k)
      solid(p, ink, weight, s.color)
      p.rect(0, (tip - 0.13) * k, 0.07 * k, 0.26 * k)

      burst(p, k, s.color, weight, 0, PART_Y - 0.1, pulse(u, HIT), 0.16, 0.26, 4, Math.PI / 4)
    })
  },
})
