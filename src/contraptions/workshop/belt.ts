import { defineContraption } from '../../core/define'
import { BELT_SPAN, belt, partLane } from './shop'

/**
 * A belt carries the line across the cell at shop speed, handing each part off
 * the east edge as the next comes in from the west; its rollers sit on the
 * seams, so two belts side by side share them.
 *
 * The lane is the plain one — a straight roll along the bench — but it is
 * declared all the same: declaring a lane is how a bench says the part belongs
 * to the world, and it is what runs one across this cell on the catalog sheet.
 */
export const beltRun = defineContraption({
  name: 'belt',
  label: 'Belt',
  tags: ['convey'],
  role: 'relay',
  rotations: [0],
  weight: 2,
  // A part crossing the middle of the cell.
  fireAt: 0.5,
  lane: (ctx) => partLane(ctx),
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    belt(p, k, ink, weight, s.color, -0.5, 0.5, u * BELT_SPAN)
  },
})
