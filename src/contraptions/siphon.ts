import { defineContraption } from '../core/define'
import { clipBox, outline } from '../core/draw'
import { easeInQuad, easeOutQuad, lerp, seg } from '../core/ease'

/**
 * A vessel that fills slowly and then empties all at once. Once the level tops
 * the bend, the tube primes and dumps the lot — which is why this one is worth
 * wiring into a chain: it sits still for most of the loop, then acts.
 */
export const siphon = defineContraption({
  name: 'siphon',
  label: 'Siphon',
  tags: ['fall', 'fill'],
  span: [1, 2],
  rotations: [0],
  mirror: false,
  fireAt: 0.82,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { w, h, size, u, ink, weight }) => {
    const wall = w * 0.3
    const rim = -h / 2 + size * 0.4
    const floor = h / 2 - size * 0.1
    const bend = rim + size * 0.12
    const inner = -wall * 0.4
    const outer = wall * 1.5
    const draining = u >= 0.82 && u < 0.99

    const level =
      u < 0.82
        ? lerp(floor, bend, easeOutQuad(seg(u, 0, 0.82)))
        : lerp(bend, floor, easeInQuad(seg(u, 0.82, 0.99)))

    clipBox(p, w, h, () => {
      p.push()
      p.noStroke()
      p.fill(s.color)
      p.rect(0, (level + floor) / 2, wall * 2 - weight, floor - level)
      if (draining) {
        // The stream leaving the outer leg.
        p.rect(outer, (floor + h / 2) / 2, size * 0.12, h / 2 - floor)
      }
      p.pop()

      outline(p, ink, weight)
      p.line(-wall, rim, -wall, floor)
      p.line(wall, rim, wall, floor)
      p.line(-wall, floor, wall, floor)

      // The bend: down inside the vessel, up and over the wall, down the outside.
      p.line(inner, floor - size * 0.16, inner, bend)
      p.arc(
        (inner + outer) / 2,
        bend,
        outer - inner,
        size * 0.34,
        Math.PI,
        Math.PI * 2,
      )
      p.line(outer, bend, outer, floor + size * 0.1)
    })
  },
})
