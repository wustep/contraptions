import { defineContraption } from '../../core/define'
import { clipCell, outline, solid } from '../../core/draw'
import { easeInOutCubic, lerp, seg } from '../../core/ease'
import { BELT_V, BENCH, PART, SHELF, bench, part, rollers } from './shop'

/**
 * The car takes a part off the rollers at bench height, hauls it up the
 * shaft on a cable, and lets it roll out east along the high shelf.
 */
const UP0 = 0.36
const UP1 = 0.6
const OUT = 0.64
const DOWN0 = 0.72
const DOWN1 = 0.96

export const lift = defineContraption({
  name: 'lift',
  label: 'Lift',
  tags: ['convey', 'lift'],
  role: 'relay',
  rotations: [0],
  // The car arriving at the shelf.
  fireAt: UP1,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const car =
      u < UP0 ? BENCH
      : u < UP1 ? lerp(BENCH, SHELF, easeInOutCubic(seg(u, UP0, UP1)))
      : u < DOWN0 ? SHELF
      : lerp(SHELF, BENCH, easeInOutCubic(seg(u, DOWN0, DOWN1)))
    const px = u < OUT ? Math.min(0, -0.5 - PART / 2 + u * BELT_V) : (u - OUT) * BELT_V
    const py = u < OUT ? car - PART / 2 : SHELF - PART / 2

    clipCell(p, k, () => {
      bench(p, k, ink, weight)
      rollers(p, k, ink, weight, s.color, -0.5, -0.2, u * BELT_V)

      // The shelf it delivers to, and the shaft: two guides, a head beam, a sheave.
      outline(p, ink, weight)
      p.line(0.2 * k, SHELF * k, 0.5 * k, SHELF * k)
      p.line(0.44 * k, SHELF * k, 0.44 * k, BENCH * k)
      for (const x of [-0.2, 0.2]) p.line(x * k, -0.46 * k, x * k, BENCH * k)
      p.line(-0.26 * k, -0.46 * k, 0.26 * k, -0.46 * k)
      p.line(0, -0.46 * k, 0, (car - 0.3) * k)
      p.push()
      p.translate(0, -0.46 * k)
      p.rotate((BENCH - car) / 0.06)
      outline(p, ink, weight)
      p.circle(0, 0, 0.12 * k)
      p.line(-0.06 * k, 0, 0.06 * k, 0)
      p.pop()

      // The car: a platform and an open cage.
      outline(p, ink, weight)
      p.line(-0.18 * k, car * k, -0.18 * k, (car - 0.3) * k)
      p.line(0.18 * k, car * k, 0.18 * k, (car - 0.3) * k)
      p.line(-0.18 * k, (car - 0.3) * k, 0.18 * k, (car - 0.3) * k)
      solid(p, ink, weight, s.color)
      p.rect(0, (car + 0.025) * k, 0.36 * k, 0.05 * k)

      if (px < 0.62) part(p, k, ink, weight, s.color, px, py)
    })
  },
})
