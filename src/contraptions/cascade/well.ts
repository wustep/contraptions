import { defineContraption } from '../../core/define'
import { clipCell } from '../../core/draw'
import { drawElevator, floor, heading, rideOf, rideToken, token, tokenColor, type Beat } from './parts'

/**
 * The pit of an elevator. The car comes in from the cell above, lands on
 * the rail, and the ball rolls out the way the snake is going. Same clock
 * as the lift above — one car, two cells.
 */
const FIRE = 0

export const well = defineContraption<Beat>({
  name: 'well',
  label: 'Well',
  tags: ['ball', 'lift'],
  role: 'relay',
  inlets: ['N', 'E', 'W'],
  outlets: ['E', 'W'],
  rotations: [0],
  fireAt: FIRE,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const h = heading(s.flow)
    p.push()
    p.scale(h, 1)
    floor(p, k, ink, weight, s, 0.18)
    p.pop()

    const shown = { ...s, ride: rideOf(s) ?? { index: 1, floors: 1, at: FIRE } }
    drawElevator(p, k, ink, weight, shown, u)
    clipCell(p, k, () => {
      const pos = rideToken(shown, u, FIRE)
      if (pos) token(p, k, ink, weight, tokenColor(s), pos)
    })
  },
})
