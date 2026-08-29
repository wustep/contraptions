import { defineContraption } from '../../core/define'
import { clipCell, outline, solid } from '../../core/draw'
import { easeInOutCubic, easeInQuad, seg } from '../../core/ease'
import { BELT_V, BENCH, PART, PART_Y, bench, part, rollers } from './shop'

/**
 * Every other part rolls straight through; the trapdoor drops under the one
 * between and it falls out the bottom into the bay below.
 */
const HALF = 0.15
const OPEN = 0.8

export const divert = defineContraption({
  name: 'divert',
  label: 'Trapdoor',
  tags: ['convey'],
  role: 'relay',
  rotations: [0],
  fireAt: OPEN,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const flap = 1.3 * (easeInQuad(seg(u, OPEN, OPEN + 0.05)) - easeInOutCubic(seg(u, 0.93, 1)))
    // The one that goes through, and the one that goes down.
    const ax = -0.5 - PART / 2 + u * BELT_V
    const bx = Math.min(0, -0.5 - PART / 2 + (u - 0.5) * BELT_V)
    const fall = easeInQuad(seg(u, OPEN + 0.02, 0.96))
    const by = PART_Y + fall * 0.6

    clipCell(p, k, () => {
      bench(p, k, ink, weight, -0.5, -HALF)
      bench(p, k, ink, weight, HALF, 0.5)
      rollers(p, k, ink, weight, s.color, -0.5, -HALF, u * BELT_V)
      rollers(p, k, ink, weight, s.color, HALF, 0.5, u * BELT_V)
      // The bay under the door.
      outline(p, ink, weight)
      p.line(-HALF * k, (BENCH + 0.04) * k, -HALF * k, 0.5 * k)
      p.line(HALF * k, (BENCH + 0.04) * k, HALF * k, 0.5 * k)

      if (ax < 0.62) part(p, k, ink, weight, s.color, ax, PART_Y)
      if (u >= 0.5 && by < 0.65) part(p, k, ink, weight, s.color, bx, by, { angle: Math.min(flap, 0.35) * seg(u, OPEN, OPEN + 0.05) })

      // The door, hinged on the west.
      p.push()
      p.translate(-HALF * k, BENCH * k)
      p.rotate(flap)
      solid(p, ink, weight, s.color)
      p.rect(HALF * k, 0.02 * k, HALF * 2 * k, 0.04 * k)
      p.pop()
      solid(p, ink, weight, s.color)
      p.circle(-HALF * k, BENCH * k, 0.05 * k)
    })
  },
})
