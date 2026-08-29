import { defineContraption } from '../../core/define'
import { outline, solid } from '../../core/draw'
import { easeInOutCubic, easeInQuad, seg } from '../../core/ease'
import { hold, roll, type Lane, type LaneCtx } from '../../core/lane'
import { BELT_SPAN, BELT_V, BENCH, bench, rollers } from './shop'

/**
 * Two leaves of the bench top fold away under the part, it settles into the
 * hole while they are open, and they come back up under it and carry it on.
 *
 * The cell floor is only a part's height below the bench, so the drop is a
 * part sunk in the hole rather than a part gone through it — which is what a
 * trapdoor on a shop line does anyway: it holds the line, it does not lose it.
 */
const HALF = 0.15
const WALL = 0.21
const PIT = 0.48
/** Where the part sits in the hole, and how fast it settles. */
const SUNK = 0.36
const LEDGE = 0.14
const DROP_V = 8
const HOLD = 0.09
const OPEN = 0.5
const LEAD = (0.5 - LEDGE) / BELT_V
const DIP = Math.hypot(LEDGE, SUNK - 0.22) / DROP_V

export const divert = defineContraption({
  name: 'divert',
  label: 'Trapdoor',
  tags: ['convey'],
  role: 'relay',
  rotations: [0],
  fireAt: OPEN,
  lane: (ctx: LaneCtx): Lane => {
    const y = ctx.floorY
    const pieces = [
      ctx.in === null ? hold([-LEDGE, y], ctx.emit) : roll([-0.5, y], [-LEDGE, y], BELT_V),
      roll([-LEDGE, y], [0, SUNK], DROP_V),
      hold([0, SUNK], HOLD),
      roll([0, SUNK], [LEDGE, y], DROP_V),
      ctx.out === null ? hold([LEDGE, y], ctx.emit) : roll([LEDGE, y], [0.5, y], BELT_V),
    ]
    return { pieces, fire: (ctx.in === null ? ctx.emit : LEAD) + DIP + HOLD / 2 }
  },
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const flap = 1.4 * (easeInQuad(seg(u, 0.28, 0.36)) - easeInOutCubic(seg(u, 0.64, 0.74)))

    bench(p, k, ink, weight, -0.5, -HALF)
    bench(p, k, ink, weight, HALF, 0.5)
    rollers(p, k, ink, weight, s.color, -0.5, -WALL, u * BELT_SPAN)
    rollers(p, k, ink, weight, s.color, WALL, 0.5, u * BELT_SPAN)

    // The bay under the doors.
    outline(p, ink, weight)
    for (const x of [-WALL, WALL]) p.line(x * k, BENCH * k, x * k, PIT * k)
    p.line(-WALL * k, PIT * k, WALL * k, PIT * k)

    // The two leaves, hinged on the lips of the hole.
    for (const side of [-1, 1]) {
      p.push()
      p.translate(side * HALF * k, BENCH * k)
      p.rotate(-side * flap)
      solid(p, ink, weight, s.color)
      p.rect((-side * HALF * k) / 2, 0.02 * k, HALF * k, 0.04 * k)
      p.pop()
      solid(p, ink, weight, s.color)
      p.circle(side * HALF * k, BENCH * k, 0.05 * k)
    }
  },
})
