import { defineContraption } from '../../core/define'
import { BOARD, cable, car, carLocalY, counterweight, guides, landing, rideTravel, sheave } from '../../worlds/goldberg/elevator'
import { P, performer, since } from './circus'

type State = { color: string; ride?: { index: number; floors: number; at: number } }

/**
 * The top of a circus elevator. A performer rolls in, boards the cage,
 * and rides out the bottom of the cell onto the act below.
 */
const FIRE = 0

export const lift = defineContraption<State>({
  name: 'lift',
  label: 'Lift',
  tags: ['aerial'],
  role: 'relay',
  rotations: [0],
  fireAt: FIRE,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const ride = s.ride ?? { index: 0, floors: 1, at: FIRE }
    const t = since(u, ride.at)
    const travel = rideTravel(t, ride.floors)
    const y = carLocalY(travel, ride.index)
    guides(p, k, ink, weight, -0.16, 0.55)
    sheave(p, k, ink, weight, -0.16, travel * 6)
    landing(p, k, ink, weight, -0.5, -0.17, 0.12)
    if (y !== null) {
      cable(p, k, ink, weight, -0.16, y - 0.12)
      car(p, k, ink, weight, s.color, y, P / 2)
    }
    const cwY = carLocalY(ride.floors - travel, ride.index)
    if (cwY !== null) {
      cable(p, k, ink, weight, -0.16, cwY, 0.28)
      counterweight(p, k, ink, weight, s.color, cwY)
    }
    let pos: [number, number] | null = null
    if (ride.index === 0 && t < BOARD) pos = [-0.5 + t / BOARD * 0.5, 0.12]
    else if (y !== null) pos = [0, y]
    if (pos) performer(p, k, ink, weight, s.color, pos[0], pos[1])
  },
})
