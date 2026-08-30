import { defineContraption } from '../../core/define'
import { hold, ride, roll, type Lane, type LaneCtx } from '../../core/lane'
import { GUIDE, LIP, SHOP_RIDE, landing, wellFrame } from '../../worlds/goldberg/elevator'
import { BELT_SPAN, BELT_V, BENCH, PART_Y, belt, bench, lineOf } from './shop'

/**
 * The pit of a shop elevator. The car comes in from the cell above, lands on
 * the buffers with the part's floor level with the bench, and the belt takes
 * it away. Same car, same clock as the elevator above.
 */
export const well = defineContraption({
  name: 'well',
  label: 'Well',
  tags: ['convey', 'lift'],
  role: 'relay',
  rotations: [0],
  fireAt: 0.75,
  lane: (ctx: LaneCtx): Lane => ({
    pieces: [
      ride([0, -0.5], [0, ctx.floorY], SHOP_RIDE.v),
      hold([0, ctx.floorY], SHOP_RIDE.clear),
      roll([0, ctx.floorY], [0.5, ctx.floorY], BELT_V),
    ],
  }),
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const line = lineOf(s)
    const fill = line?.color ?? s.color
    const x1 = line?.out === false ? 0.22 : 0.5

    bench(p, k, ink, weight, LIP, x1, false)
    belt(p, k, ink, weight, fill, LIP, x1, u * BELT_SPAN)
    landing(p, k, ink, weight, GUIDE, LIP, BENCH)
    wellFrame(p, k, ink, weight, PART_Y)
  },
})
