import { defineContraption } from '../core/define'
import { outline, rails, solid } from '../core/draw'
import { easeInQuad, easeOutSine, lerp, seg } from '../core/ease'

/** A weight fired up its rail, then falling back under its own weight. */
export const hammer = defineContraption({
  name: 'hammer',
  label: 'Hammer',
  tags: ['strike'],
  role: 'source',
  mirror: false,
  // The moment the weight lands.
  fireAt: 0.86,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size, u, ink, weight }) => {
    const d = size * 0.3
    const reach = size * 0.4 - d / 2
    let y = reach
    if (u < 0.12) {
      y = lerp(reach, -reach, easeOutSine(seg(u, 0, 0.12)))
    } else if (u < 0.86) {
      y = lerp(-reach, reach, easeInQuad(seg(u, 0.12, 0.86)))
    }

    outline(p, ink, weight)
    p.line(0, -size * 0.4, 0, size * 0.4)
    rails(p, size)
    solid(p, ink, weight, s.color)
    p.circle(0, y, d)
  },
})
