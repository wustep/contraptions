import { defineContraption } from '../../core/define'
import { hold, ride, roll, type Lane, type LaneCtx } from '../../core/lane'
import { CASCADE_RIDE, liftFrame } from '../../worlds/goldberg/elevator'
import { SHEAVE_Y, SPEED, floor, type Beat } from './parts'

/**
 * The top of an elevator. The rail runs to the cage, the ball waits while the
 * doors are open, and the car takes it out the bottom of the cell.
 *
 * This cell draws only the frame that never moves. The car, its cable, the
 * counterweight and the sheave's spin belong to the stack, not to either of
 * its two cells, so the world draws them once from the run's clock — which is
 * why the car can straddle the seam and the ball can ride it as one object.
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
  lane: (ctx: LaneCtx): Lane => ({
    pieces: [
      roll([-0.5, ctx.floorY], [0, ctx.floorY], SPEED),
      hold([0, ctx.floorY], CASCADE_RIDE.board),
      ride([0, ctx.floorY], [0, 0.5], CASCADE_RIDE.v),
    ],
  }),
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, ink, weight }) => {
    floor(p, k, ink, weight, s, 0.18)
    liftFrame(p, k, ink, weight, SHEAVE_Y)
  },
})
