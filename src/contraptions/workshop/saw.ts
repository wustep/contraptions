import { defineContraption } from '../../core/define'
import { outline, solid, teeth } from '../../core/draw'
import { easeInQuad, easeOutCubic, lerp, seg } from '../../core/ease'
import { BELT_SPAN, BENCH, HIT, PART_Y, bench, rollers, sparks, workLane } from './shop'

/**
 * The blank rolls in under the blade, the spinning blade drops through it,
 * and the part rolls on. Blade and sparks are drawn in `over`, so the cut
 * happens in front of the part rather than behind it.
 */
const R = 0.14
const UP = -0.08
const DOWN = BENCH + 0.01 - R
const HOLD = 0.16

/** The blade's centre through the machine's own clock. */
const bladeAt = (u: number) =>
  u < HIT - 0.06 ? UP
  : u < HIT + 0.02 ? lerp(UP, DOWN, easeInQuad(seg(u, HIT - 0.06, HIT + 0.02)))
  : u < HIT + 0.08 ? DOWN
  : lerp(DOWN, UP, easeOutCubic(seg(u, HIT + 0.08, HIT + 0.2)))

export const saw = defineContraption({
  name: 'saw',
  label: 'Chop Saw',
  tags: ['work'],
  role: 'sink',
  rotations: [0],
  fireAt: HIT,
  lane: (ctx) => workLane(ctx, { time: HOLD }),
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    bench(p, k, ink, weight)
    rollers(p, k, ink, weight, s.color, -0.5, -0.18, u * BELT_SPAN)
    rollers(p, k, ink, weight, s.color, 0.18, 0.5, u * BELT_SPAN)

    // The C-frame and the slide the blade rides on.
    outline(p, ink, weight)
    p.line(0.3 * k, BENCH * k, 0.3 * k, -0.26 * k)
    p.line(0.34 * k, -0.26 * k, -0.04 * k, -0.26 * k)
    p.line(0, -0.26 * k, 0, bladeAt(u) * k)
  },
  over: (p, s, { size: k, u, ink, weight }) => {
    const cy = bladeAt(u)
    const cutting = seg(u, HIT - 0.03, HIT) * (1 - seg(u, HIT + 0.02, HIT + 0.1))

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
  },
})
