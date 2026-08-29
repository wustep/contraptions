import { defineContraption } from '../../core/define'
import { drawElevator, floor, heading, rideOf, rideToken, since, token, tokenColor, type Beat } from './parts'
import { BOARD } from '../../worlds/goldberg/elevator'

/**
 * The top of an elevator. The rail runs to the cage; the car takes the
 * ball from the lip and carries it out the bottom of the cell. The well
 * below shares this clock so the same car is one motion, not two dumps.
 */
const FIRE = 0

export const lift = defineContraption<Beat>({
  name: 'lift',
  label: 'Lift',
  tags: ['ball', 'lift'],
  role: 'relay',
  inlets: ['E', 'W', 'N'],
  outlets: ['E', 'W', 'S'],
  rotations: [0],
  fireAt: FIRE,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const h = heading(s.flow)
    const ride = rideOf(s) ?? { index: 0, floors: 1, at: FIRE }
    const shown = { ...s, ride }
    const through = s.flow?.in === 'N' && s.flow.out === 'S'

    if (!through) {
      p.push()
      p.scale(h, 1)
      floor(p, k, ink, weight, s, 0.18)
      p.pop()
    }

    drawElevator(p, k, ink, weight, shown, u)
    const t = since(u, ride.at)
    const pos = rideToken(shown, u, FIRE)
    if (pos && (t >= BOARD || !through)) token(p, k, ink, weight, tokenColor(s), pos)
  },
})
