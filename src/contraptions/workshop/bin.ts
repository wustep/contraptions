import { defineContraption } from '../../core/define'
import { clipCell, outline, solid } from '../../core/draw'
import { easeInQuad, easeInOutCubic, lerp, seg } from '../../core/ease'
import { BELT_V, BENCH, PART, PART_Y, belt, bench, burst, lineOf, part, pulse } from './shop'

/**
 * The part rolls in on the bench, drops off the lip into the tote, lands on
 * the pile with a puff, and settles. The tote sits on the bench so a belt
 * in the cell to the west meets the mouth — no raised shelf, no gap.
 */
const LIP = 0.02
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
    const line = lineOf(s)
    const start = line?.in ? -0.5 - PART / 2 : -0.22
    const x = start + u * BELT_V
    const fall = easeInQuad(seg(u, 0.32, LAND))
    const sink = easeInOutCubic(seg(u, LAND + 0.06, 0.8))
    let pos: [number, number] | null = null
    let angle = 0
    if (u < 0.32) pos = [Math.min(LIP, x), PART_Y]
    else if (u < LAND) {
      pos = [lerp(LIP, 0.22, fall), lerp(PART_Y, BENCH - 0.08, fall)]
      angle = 1.1 * fall
    } else pos = [0.22, lerp(BENCH - 0.08, BENCH + 0.06, sink)]
    if (u >= LAND) angle = 1.1

    clipCell(p, k, () => {
      const x0 = line?.in ? -0.5 : -0.4
      bench(p, k, ink, weight, x0, LIP + 0.06)
      belt(p, k, ink, weight, s.color, x0, LIP, u * BELT_V)

      // Tote on the bench, mouth at the lip, bottom on the cell floor.
      outline(p, ink, weight)
      p.rect(0.24 * k, ((BENCH - 0.02 + 0.5) / 2) * k, 0.44 * k, (0.5 - (BENCH - 0.02)) * k)
      part(p, k, ink, weight, s.color, 0.14, BENCH + 0.02, { angle: 0.4 })
      part(p, k, ink, weight, s.color, 0.32, BENCH + 0.04, { angle: -0.5 })
      if (pos) part(p, k, ink, weight, s.color, pos[0], pos[1], { angle })
      solid(p, ink, weight, s.color)
      p.rect(0.24 * k, ((BENCH + 0.08 + 0.5) / 2) * k, 0.44 * k, (0.5 - (BENCH + 0.08)) * k)

      burst(p, k, s.color, weight, 0.22, BENCH - 0.04, pulse(u, LAND, 14), 0.12, 0.22, 5, -Math.PI / 2 - (Math.PI * 2) / 10)
    })
  },
})
