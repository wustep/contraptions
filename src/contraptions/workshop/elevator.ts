import { defineContraption } from '../../core/define'
import { clipCell } from '../../core/draw'
import { easeInOutCubic, lerp, seg } from '../../core/ease'
import {
  GUIDE,
  LIP,
  cable,
  car,
  carLocalY,
  counterweight,
  guides,
  landing,
  sheave,
  shopBeat,
  shopTravel,
} from '../../worlds/goldberg/elevator'
import { BELT_V, PART, PART_Y, belt, bench, lineOf, part } from './shop'

/**
 * The top of a shop elevator. A part rolls in on the bench, boards the
 * car at the lip, and rides out the bottom of the cell.
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
    const x0 = line?.in && !through ? -0.5 : -0.22

    clipCell(p, k, () => {
      if (!through) {
        bench(p, k, ink, weight, x0, -LIP, false)
        belt(p, k, ink, weight, fill, x0, -LIP, u * BELT_V)
        landing(p, k, ink, weight, -LIP, -GUIDE, PART_Y)
      }
    })

    guides(p, k, ink, weight, through ? -0.5 : -0.16, 0.55)
    sheave(p, k, ink, weight, -0.16, travel * 6)
    if (y !== null) {
      cable(p, k, ink, weight, -0.16, y - 0.12)
      car(p, k, ink, weight, fill, y, PART / 2)
    }
    const cwY = carLocalY(ride.floors - travel, ride.index)
    if (cwY !== null) {
      cable(p, k, ink, weight, -0.16, cwY, 0.28)
      counterweight(p, k, ink, weight, fill, cwY)
    }

    let pos: [number, number] | null = null
    if (ride.index === 0 && v < 0.5 && !through) {
      pos = [lerp(x0 - PART / 2, 0, easeInOutCubic(seg(v, 0, 0.5))), PART_Y]
    } else if (y !== null) pos = [0, y]
    if (pos) part(p, k, ink, weight, fill, pos[0], pos[1])
  },
})
