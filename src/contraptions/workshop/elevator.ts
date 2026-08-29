import { defineContraption } from '../../core/define'
import { hold, ride, roll, type Lane, type LaneCtx } from '../../core/lane'
import { GUIDE, LIP, SHOP_RIDE, landing, liftFrame } from '../../worlds/goldberg/elevator'
import { BELT_SPAN, BELT_V, BENCH, SHEAVE_Y, belt, bench, lineOf } from './shop'

/**
 * The top of a shop elevator. A part rolls in along the bench, waits at the
 * lip while the doors are open, and rides the car out the bottom of the cell.
 *
 * This cell draws only the frame that never moves. The car, its cable, the
 * counterweight and the sheave's spin belong to the stack rather than to
 * either of its cells, so the world draws them once from the line's clock.
 */
export const elevator = defineContraption({
  name: 'elevator',
  label: 'Elevator',
  tags: ['convey', 'lift'],
  role: 'relay',
  rotations: [0],
  fireAt: 0.5,
  lane: (ctx: LaneCtx): Lane => ({
    pieces: [
      roll([-0.5, ctx.floorY], [0, ctx.floorY], BELT_V),
      hold([0, ctx.floorY], SHOP_RIDE.board),
      ride([0, ctx.floorY], [0, 0.5], SHOP_RIDE.v),
    ],
  }),
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const line = lineOf(s)
    const fill = line?.color ?? s.color
    const x0 = line?.in === false ? -0.22 : -0.5

    bench(p, k, ink, weight, x0, -LIP, false)
    belt(p, k, ink, weight, fill, x0, -LIP, u * BELT_SPAN)
    landing(p, k, ink, weight, -LIP, -GUIDE, BENCH)
    liftFrame(p, k, ink, weight, SHEAVE_Y)
  },
})
