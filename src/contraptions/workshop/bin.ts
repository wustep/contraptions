import { defineContraption } from '../../core/define'
import { clipCell, outline, solid } from '../../core/draw'
import { easeInQuad, easeInOutCubic, lerp, seg } from '../../core/ease'
import { cable, car, carLocalY, guides, shopBeat, shopTravel } from '../../worlds/goldberg/elevator'
import { belt, BELT_V, BENCH, bench, burst, lineOf, PART, part, PART_Y, partColor, pulse } from './shop'

/**
 * The part rolls in on the bench, drops off the lip into the tote, lands on
 * the pile with a puff, and settles. The tote sits on the bench so a belt
 * in the cell to the west meets the mouth — no raised shelf, no gap.
 */
const LIP = 0.08
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
    const fill = line?.color ?? s.color
    const ride = line?.ride
    const fromAbove = !!line?.catch || !!ride
    const start = line?.in && !fromAbove ? -0.5 - PART / 2 : -0.22
    const x = start + u * BELT_V
    const fall = easeInQuad(seg(u, 0.32, LAND))
    const sink = easeInOutCubic(seg(u, LAND + 0.06, 0.8))
    let pos: [number, number] | null = null
    let angle = 0
    if (fromAbove && ride) {
      const v = shopBeat(u)
      const y = carLocalY(shopTravel(v, ride.floors), ride.index)
      if (v < 0.82 && y !== null) pos = [0, y]
      else pos = [0.22, lerp(BENCH - 0.08, BENCH + 0.06, easeInOutCubic(seg(v, 0.82, 1)))]
      if (v >= 0.82) angle = 1.1
    } else if (u < 0.32) pos = [Math.min(LIP, x), PART_Y]
    else if (u < LAND) {
      pos = [lerp(LIP, 0.22, fall), lerp(PART_Y, BENCH - 0.08, fall)]
      angle = 1.1 * fall
    } else pos = [0.22, lerp(BENCH - 0.08, BENCH + 0.06, sink)]
    if (!fromAbove && u >= LAND) angle = 1.1

    clipCell(p, k, () => {
      if (fromAbove && ride) {
        guides(p, k, ink, weight, -0.5, PART_Y)
        const v = shopBeat(u)
        const y = carLocalY(shopTravel(v, ride.floors), ride.index)
        if (y !== null) {
          cable(p, k, ink, weight, -0.5, y - 0.12)
          car(p, k, ink, weight, fill, y, PART / 2)
        }
      }
      const x0 = line?.in && !fromAbove ? -0.5 : fromAbove ? 0 : -0.4
      bench(p, k, ink, weight, x0, LIP + 0.06)
      if (!fromAbove) belt(p, k, ink, weight, fill, x0, LIP, u * BELT_V)

      // Tote on the bench, mouth at the lip, bottom on the cell floor.
      outline(p, ink, weight)
      p.rect(0.24 * k, ((BENCH - 0.02 + 0.5) / 2) * k, 0.44 * k, (0.5 - (BENCH - 0.02)) * k)
      part(p, k, ink, weight, partColor(s), 0.14, BENCH + 0.02, { angle: 0.4 })
      part(p, k, ink, weight, partColor(s), 0.32, BENCH + 0.04, { angle: -0.5 })
      if (pos) part(p, k, ink, weight, fill, pos[0], pos[1], { angle })
      solid(p, ink, weight, s.color)
      p.rect(0.24 * k, ((BENCH + 0.08 + 0.5) / 2) * k, 0.44 * k, (0.5 - (BENCH + 0.08)) * k)

      burst(p, k, s.color, weight, 0.22, BENCH - 0.04, pulse(u, LAND, 14), 0.12, 0.22, 5, -Math.PI / 2 - (Math.PI * 2) / 10)
    })
  },
})
