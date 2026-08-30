import { defineContraption } from '../../core/define'
import { hold, ride, roll, type Lane, type LaneCtx } from '../../core/lane'
import { CASCADE_RIDE, wellFrame } from '../../worlds/goldberg/elevator'
import { LANE_Y, SPEED, floor, type Beat } from './parts'

/**
 * The pit of an elevator. The car comes in from the cell above, lands on the
 * buffers, and the ball rolls out the way the snake is going. Same car, same
 * clock as the lift above — one motion, two cells, drawn by the world.
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
  lane: (ctx: LaneCtx): Lane => ({
    pieces: [
      ride([0, -0.5], [0, ctx.floorY], CASCADE_RIDE.v),
      hold([0, ctx.floorY], CASCADE_RIDE.clear),
      roll([0, ctx.floorY], [0.5, ctx.floorY], SPEED),
    ],
  }),
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, ink, weight }) => {
    floor(p, k, ink, weight, s, 0.18)
    wellFrame(p, k, ink, weight, LANE_Y)
  },
})
