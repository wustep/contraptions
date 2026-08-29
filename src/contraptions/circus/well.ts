import { defineContraption } from '../../core/define'
import { CLEAR, buffers, cable, car, carLocalY, counterweight, guides, landing, rideTravel } from '../../worlds/goldberg/elevator'
import { P, ground, performer, since } from './circus'

type State = { color: string; ride?: { index: number; floors: number; at: number } }

/**
 * The pit of a circus elevator. The cage comes in from the cell above,
 * lands, and the performer rolls out onto the next act.
 */
const FIRE = 0

export const well = defineContraption<State>({
  name: 'well',
  label: 'Well',
  tags: ['aerial'],
  role: 'relay',
  rotations: [0],
  fireAt: FIRE,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const ride = s.ride ?? { index: 1, floors: 1, at: FIRE }
    const t = since(u, ride.at)
    const travel = rideTravel(t, ride.floors)
    const y = carLocalY(travel, ride.index)
    guides(p, k, ink, weight, -0.55, 0.5)
    ground(p, k, 1)
    buffers(p, k, ink, weight, 0.2)
    landing(p, k, ink, weight, 0.17, 0.5, 0.12)
    if (y !== null) {
      cable(p, k, ink, weight, -0.5, y - 0.12)
      car(p, k, ink, weight, s.color, y, P / 2)
    }
    const cwY = carLocalY(ride.floors - travel, ride.index)
    if (cwY !== null) counterweight(p, k, ink, weight, s.color, cwY)
    let pos: [number, number] | null = null
    // Rolls out of the cage and waits tangent to the east wall for the next
    // act, instead of rolling on into its cell.
    if (t > CLEAR) pos = [Math.min(((t - CLEAR) / 0.15) * 0.5, 0.5 - P / 2), 0.12]
    else if (y !== null) pos = [0, y]
    if (pos) performer(p, k, ink, weight, s.color, pos[0], pos[1])
  },
})
