import { defineContraption } from '../../core/define'
import { clipCell, outline, solid } from '../../core/draw'
import { easeInQuad, easeInOutCubic, lerp, seg } from '../../core/ease'
import { BELT_V, BENCH, HIGH_Y, PART, SHELF, bench, burst, part, pulse, rollers } from './shop'

/**
 * The part rolls off the end of the shelf, tumbles into the bin, lands on the
 * pile with a puff, and settles down out of sight.
 */
const EDGE = -0.06
const LAND = 0.5

export const bin = defineContraption({
  name: 'bin',
  label: 'Bin',
  tags: ['convey'],
  role: 'sink',
  rotations: [0],
  weight: 1.2,
  fireAt: LAND,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const inX = -0.5 - PART / 2 + u * BELT_V
    const fall = easeInQuad(seg(u, 0.31, LAND))
    const sink = easeInOutCubic(seg(u, LAND + 0.06, 0.8))
    let pos: [number, number] | null = null
    let angle = 0
    if (u < 0.31) pos = [Math.min(0, inX), HIGH_Y]
    else if (u < LAND) {
      pos = [lerp(0, 0.22, seg(u, 0.31, LAND)), lerp(HIGH_Y, 0.02, fall)]
      angle = 1.1 * seg(u, 0.31, LAND)
    } else pos = [0.22, lerp(0.02, 0.3, sink)]
    if (u >= LAND) angle = 1.1

    clipCell(p, k, () => {
      bench(p, k, ink, weight)
      // The shelf, and the rollers that carry the part off its end.
      outline(p, ink, weight)
      p.line(-0.42 * k, SHELF * k, -0.42 * k, BENCH * k)
      p.line(-0.12 * k, SHELF * k, -0.12 * k, BENCH * k)
      rollers(p, k, ink, weight, s.color, -0.5, EDGE, u * BELT_V, SHELF)

      // The bin stands on the floor in front of the bench: its back, the
      // pile in it, the part, then its front, which hides what has settled.
      outline(p, ink, weight)
      p.rect(0.22 * k, ((-0.02 + 0.5) / 2) * k, 0.48 * k, 0.52 * k)
      part(p, k, ink, weight, s.color, 0.12, 0.14, { angle: 0.4 })
      part(p, k, ink, weight, s.color, 0.33, 0.17, { angle: -0.5 })
      if (pos) part(p, k, ink, weight, s.color, pos[0], pos[1], { angle })
      solid(p, ink, weight, s.color)
      p.rect(0.22 * k, ((0.1 + 0.5) / 2) * k, 0.48 * k, 0.4 * k)

      burst(p, k, s.color, weight, 0.22, 0.0, pulse(u, LAND, 14), 0.16, 0.26, 5, -Math.PI / 2 - (Math.PI * 2) / 10)
    })
  },
})
