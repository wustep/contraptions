import { defineContraption } from '../../core/define'
import { clipCell } from '../../core/draw'
import { easeInOutCubic, lerp, seg } from '../../core/ease'
import { cable, car, carLocalY, guides, sheave, shopBeat, shopTravel } from '../../worlds/goldberg/elevator'
import { BELT_V, PART, PART_Y, belt, bench, lineOf, part } from './shop'

/**
 * The top of a shop elevator. A part rolls in on the bench, boards the
 * car at centre, and rides out the bottom of the cell. The well below
 * shares the loop so the same car is one motion.
 */
export const elevator = defineContraption({
  name: 'elevator',
  label: 'Elevator',
  tags: ['convey', 'lift'],
  role: 'relay',
  rotations: [0],
  fireAt: 0.5,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const line = lineOf(s)
    const fill = line?.color ?? s.color
    const ride = line?.ride ?? { index: 0, floors: 1 }
    const v = shopBeat(u)
    const travel = shopTravel(v, ride.floors)
    const y = carLocalY(travel, ride.index)
    const through = !!line?.catch && !!line?.drop
    const x0 = line?.in && !through ? -0.5 : -0.2

    clipCell(p, k, () => {
      if (!through) {
        bench(p, k, ink, weight, x0, -0.16, false)
        belt(p, k, ink, weight, fill, x0, -0.16, u * BELT_V)
      }
      guides(p, k, ink, weight, through ? -0.5 : -0.12, 0.5)
      sheave(p, k, ink, weight, -0.14, travel * 6)
      if (y !== null) {
        cable(p, k, ink, weight, -0.14, y - 0.12)
        car(p, k, ink, weight, fill, y, PART / 2)
      }

      let pos: [number, number] | null = null
      if (ride.index === 0 && v < 0.5 && !through) {
        const x = lerp(x0 - PART / 2, 0, easeInOutCubic(seg(v, 0, 0.5)))
        pos = [x, PART_Y]
      } else if (y !== null) pos = [0, y]
      if (pos) part(p, k, ink, weight, fill, pos[0], pos[1])
    })
  },
})
