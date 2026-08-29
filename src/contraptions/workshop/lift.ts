import { defineContraption } from '../../core/define'
import { outline, solid } from '../../core/draw'
import { easeInOutCubic, lerp, seg } from '../../core/ease'
import { hold, roll, type Lane, type LaneCtx } from '../../core/lane'
import { BELT_SPAN, BELT_V, BENCH, HIGH_Y, PART, SHELF, bench, rollers } from './shop'

/**
 * The car takes a part off the rollers at bench height, hauls it up the shaft
 * on a cable, and lets it run east along the high shelf and drop off the end
 * onto the bench again. The car then comes back down empty for the next one.
 *
 * The car's deck is the part's own height plus half a part, so the two come
 * off one schedule: the lane rises linearly and so does the car.
 */
const CAR_X = -0.1
const GUIDE = 0.2
const SHELF_W = CAR_X + GUIDE
const SHELF_E = 0.22
const OFF = 0.3
const RIDE_V = 8
const FALL_V = 8
/** The car's clock, in the bench's own units. */
const IN = (0.5 + CAR_X) / BELT_V
const RISE = (0.22 - HIGH_Y) / RIDE_V
const UP0 = 0.5 - 2 * RISE
const UP1 = 0.5
const DOWN0 = 0.6
const DOWN1 = 0.82

export const lift = defineContraption({
  name: 'lift',
  label: 'Lift',
  tags: ['convey', 'lift'],
  role: 'relay',
  rotations: [0],
  // The car arriving at the shelf.
  fireAt: 0.5,
  lane: (ctx: LaneCtx): Lane => {
    const y = ctx.floorY
    const pieces = [
      ctx.in === null ? hold([CAR_X, y], ctx.emit) : roll([-0.5, y], [CAR_X, y], BELT_V),
      roll([CAR_X, y], [CAR_X, HIGH_Y], RIDE_V),
      roll([CAR_X, HIGH_Y], [SHELF_E, HIGH_Y], BELT_V),
      roll([SHELF_E, HIGH_Y], [OFF, y], FALL_V),
      ctx.out === null ? hold([OFF, y], ctx.emit) : roll([OFF, y], [0.5, y], BELT_V),
    ]
    return { pieces, fire: (ctx.in === null ? ctx.emit : IN) + (y - HIGH_Y) / RIDE_V }
  },
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    // Linear on the way up, with the part on it; eased coming back empty.
    const deck =
      u < UP0 ? BENCH
      : u < UP1 ? lerp(BENCH, SHELF, seg(u, UP0, UP1))
      : u < DOWN0 ? SHELF
      : lerp(SHELF, BENCH, easeInOutCubic(seg(u, DOWN0, DOWN1)))

    bench(p, k, ink, weight)
    rollers(p, k, ink, weight, s.color, -0.5, CAR_X - GUIDE, u * BELT_SPAN)
    rollers(p, k, ink, weight, s.color, OFF, 0.5, u * BELT_SPAN)

    // The shelf it delivers to, and the guide the part drops down.
    outline(p, ink, weight)
    p.line(SHELF_W * k, SHELF * k, (SHELF_E + 0.12) * k, SHELF * k)
    p.line(0.42 * k, SHELF * k, 0.42 * k, BENCH * k)

    // The shaft: a guide each side, open on the east where the part runs out.
    p.line((CAR_X - GUIDE) * k, -0.46 * k, (CAR_X - GUIDE) * k, BENCH * k)
    p.line(SHELF_W * k, -0.46 * k, SHELF_W * k, (HIGH_Y - PART / 2 - 0.02) * k)
    p.line(SHELF_W * k, SHELF * k, SHELF_W * k, BENCH * k)
    p.line((CAR_X - GUIDE - 0.06) * k, -0.46 * k, (SHELF_W + 0.06) * k, -0.46 * k)
    p.line(CAR_X * k, -0.46 * k, CAR_X * k, (deck - 0.3) * k)
    p.push()
    p.translate(CAR_X * k, -0.46 * k)
    p.rotate((BENCH - deck) / 0.06)
    outline(p, ink, weight)
    p.circle(0, 0, 0.12 * k)
    p.line(-0.06 * k, 0, 0.06 * k, 0)
    p.pop()

    // The car: an open cage on a deck the part stands on.
    outline(p, ink, weight)
    for (const x of [CAR_X - 0.18, CAR_X + 0.18]) p.line(x * k, deck * k, x * k, (deck - 0.3) * k)
    p.line((CAR_X - 0.18) * k, (deck - 0.3) * k, (CAR_X + 0.18) * k, (deck - 0.3) * k)
    solid(p, ink, weight, s.color)
    p.rect(CAR_X * k, (deck + 0.025) * k, 0.36 * k, 0.05 * k)
  },
})
