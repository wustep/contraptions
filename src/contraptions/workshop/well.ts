import { defineContraption } from '../../core/define'
import { clipCell } from '../../core/draw'
import { easeInOutCubic, lerp, seg } from '../../core/ease'
import { buffers, cable, car, carLocalY, guides, shopBeat, shopTravel } from '../../worlds/goldberg/elevator'
import { BELT_V, PART, PART_Y, belt, bench, lineOf, part } from './shop'

/**
 * The pit of a shop elevator. The car comes in from the cell above, lands
 * on the bench, and the part rolls out the way the snake is going.
 */
export const well = defineContraption({
  name: 'well',
  label: 'Well',
  tags: ['convey', 'lift'],
  role: 'relay',
  rotations: [0],
  fireAt: 0.75,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const line = lineOf(s)
    const fill = line?.color ?? s.color
    const ride = line?.ride ?? { index: 1, floors: 1 }
    const v = shopBeat(u)
    const travel = shopTravel(v, ride.floors)
    const y = carLocalY(travel, ride.index)
    const x1 = line?.out !== false ? 0.5 : 0.16

    clipCell(p, k, () => {
      bench(p, k, ink, weight, 0.16, x1, false)
      belt(p, k, ink, weight, fill, 0.16, x1, u * BELT_V)
      guides(p, k, ink, weight, -0.5, PART_Y + 0.08)
      buffers(p, k, ink, weight, PART_Y + 0.1)
      if (y !== null) {
        cable(p, k, ink, weight, -0.5, y - 0.12)
        car(p, k, ink, weight, fill, y, PART / 2)
      }

      let pos: [number, number] | null = null
      if (v > 0.75 && line?.out !== false) {
        pos = [lerp(0, 0.5 + PART / 2, easeInOutCubic(seg(v, 0.75, 1))), PART_Y]
      } else if (y !== null) pos = [0, y]
      else if (v >= 0.75) pos = [0, PART_Y]
      if (pos && pos[0] <= 0.56) part(p, k, ink, weight, fill, pos[0], pos[1])
    })
  },
})
