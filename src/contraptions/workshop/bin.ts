import { defineContraption } from '../../core/define'
import { outline, solid } from '../../core/draw'
import { hold, roll, type Lane, type LaneCtx } from '../../core/lane'
import { BELT_SPAN, BELT_V, BENCH, SHOP_PERIOD, belt, bench, burst, lineOf, part, pulse } from './shop'

/**
 * The part rolls in on the bench, drops off the lip into the tote, lands on
 * the pile with a puff, and stays there. The tote sits on the bench so a belt
 * in the cell to the west meets the mouth — no raised shelf, no gap.
 *
 * It rests for exactly `emit`, so the tote is never empty: the next part lands
 * on the frame this one is taken away. The tote's front wall is drawn in
 * `over`, after the world's parts, so what is in the tote is inside it.
 */
const LIP = 0.08
/** Where a part comes to rest on the pile. */
const REST_X = 0.22
const REST_Y = BENCH + 0.02
/** Cells per loop it falls off the lip at. */
const FALL_V = 6

export const bin = defineContraption({
  name: 'bin',
  label: 'Bin',
  tags: ['convey'],
  role: 'sink',
  rotations: [0],
  weight: 1.2,
  fireAt: 0.5,
  lane: (ctx: LaneCtx): Lane => {
    const run = [
      roll([-0.5, ctx.floorY], [LIP, ctx.floorY], BELT_V),
      roll([LIP, ctx.floorY], [REST_X, REST_Y], FALL_V),
    ]
    if (ctx.out === null) return { pieces: [...run, hold([REST_X, REST_Y], ctx.emit)] }
    return { pieces: [...run, roll([REST_X, REST_Y], [0.5, ctx.floorY], BELT_V)] }
  },
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const line = lineOf(s)
    const fill = line?.color ?? s.color
    const x0 = line?.in === false ? -0.4 : -0.5

    bench(p, k, ink, weight, x0, LIP + 0.06)
    belt(p, k, ink, weight, fill, x0, LIP, u * BELT_SPAN)

    // Tote on the bench, mouth at the lip, bottom on the cell floor.
    outline(p, ink, weight)
    p.rect(0.24 * k, ((BENCH - 0.02 + 0.5) / 2) * k, 0.44 * k, (0.5 - (BENCH - 0.02)) * k)
    // The pile already in the tote, either side of where the next one lands
    // and high enough to stand above the front wall.
    part(p, k, ink, weight, s.color, 0.1, REST_Y + 0.01, { angle: 0.3 })
    part(p, k, ink, weight, s.color, 0.34, REST_Y + 0.02, { angle: -0.4 })
  },
  over: (p, s, { size: k, u, ink, weight }) => {
    // The front wall of the tote, and the puff as the part hits the pile.
    const front = BENCH + 0.04
    solid(p, ink, weight, s.color)
    p.rect(0.24 * k, ((front + 0.5) / 2) * k, 0.44 * k, (0.5 - front) * k)
    burst(p, k, s.color, weight, REST_X, BENCH - 0.04, pulse(u, 0.5, 14, SHOP_PERIOD), 0.12, 0.22, 5, -Math.PI / 2 - (Math.PI * 2) / 10)
  },
})
