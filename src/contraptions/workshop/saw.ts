import { defineContraption } from '../../core/define'
import { clipCell, outline, solid, teeth } from '../../core/draw'
import { easeInQuad, easeOutCubic, lerp, seg } from '../../core/ease'
import { ARRIVE, BELT_V, BENCH, DEPART, HIT, PART, PART_Y, bench, lineOf, part, rollers, shuttle, sparks } from './shop'

/**
 * The blank rolls in under the blade, the spinning blade drops through it,
 * and two halves roll on with a kerf of daylight opening between them.
 */
const R = 0.18
const UP = -0.24
const DOWN = BENCH + 0.01 - R

export const saw = defineContraption({
  name: 'saw',
  label: 'Chop Saw',
  tags: ['work'],
  role: 'sink',
  rotations: [0],
  fireAt: HIT,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const cy =
      u < HIT - 0.06 ? UP
      : u < HIT + 0.02 ? lerp(UP, DOWN, easeInQuad(seg(u, HIT - 0.06, HIT + 0.02)))
      : u < HIT + 0.08 ? DOWN
      : lerp(DOWN, UP, easeOutCubic(seg(u, HIT + 0.08, HIT + 0.2)))
    const x = shuttle(u, ARRIVE, DEPART, lineOf(s))
    const cutting = seg(u, HIT - 0.03, HIT) * (1 - seg(u, HIT + 0.02, HIT + 0.1))

    clipCell(p, k, () => {
      bench(p, k, ink, weight)
      rollers(p, k, ink, weight, s.color, -0.5, -0.18, u * BELT_V)
      rollers(p, k, ink, weight, s.color, 0.18, 0.5, u * BELT_V)

      if (x !== null) {
        if (u < HIT) part(p, k, ink, weight, s.color, x, PART_Y)
        else {
          const gap = 0.05 * seg(u, DEPART, DEPART + 0.15)
          const half = PART / 2 - 0.01
          for (const side of [-1, 1]) {
            part(p, k, ink, weight, s.color, x + side * (half / 2 + 0.01 + gap / 2), PART_Y, { w: half })
          }
        }
      }

      // The C-frame and the slide the blade rides on.
      outline(p, ink, weight)
      p.line(0.3 * k, BENCH * k, 0.3 * k, -0.46 * k)
      p.line(0.34 * k, -0.46 * k, -0.04 * k, -0.46 * k)
      p.line(0, -0.46 * k, 0, cy * k)

      // The blade, and the guard over its top half.
      p.push()
      p.translate(0, cy * k)
      p.rotate(u * Math.PI * 2 * 3)
      outline(p, ink, weight)
      p.circle(0, 0, R * 2 * k)
      teeth(p, R * k, 12, 0.035 * k)
      p.line(-R * 0.6 * k, 0, R * 0.6 * k, 0)
      p.line(0, -R * 0.6 * k, 0, R * 0.6 * k)
      p.pop()
      solid(p, ink, weight, s.color)
      p.arc(0, cy * k, (R + 0.06) * 2 * k, (R + 0.06) * 2 * k, Math.PI, Math.PI * 2, p.CHORD)
      p.circle(0, cy * k, 0.07 * k)

      sparks(p, k, s.color, 0.05, PART_Y - 0.06, u, 1, cutting, 3, 6, 0.22)
      sparks(p, k, s.color, -0.05, PART_Y - 0.06, u, -1, cutting, 3, 6, 0.22)
    })
  },
})
