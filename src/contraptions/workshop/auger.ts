import { defineContraption } from '../../core/define'
import { clipBox, outline } from '../../core/draw'
import { mod } from '../../core/ease'
import { hold, roll, type Lane, type LaneCtx } from '../../core/lane'
import { BELT_SPAN, BELT_V, BENCH, HIGH_Y, PART, SHELF, bench, rollers } from './shop'

/**
 * A part rolls in under the screw, the turning flights walk it up the tube
 * and set it out on the high shelf, and it runs east and drops off the end
 * onto the bench again — the line leaves a cell the way it entered it.
 */
const W = 0.15
/** Five pitches a bench clock, so the flights close the loop. */
const PITCH = 0.16
const V = PITCH * 5 * 2
const SHELF_E = 0.3
const OFF = 0.36
const FALL_V = 8
const IN = 0.5 / BELT_V

export const auger = defineContraption({
  name: 'auger',
  label: 'Screw Lift',
  tags: ['convey', 'lift'],
  role: 'relay',
  rotations: [0],
  // Set out on the shelf.
  fireAt: 0.5,
  lane: (ctx: LaneCtx): Lane => {
    const y = ctx.floorY
    const rise = (y - HIGH_Y) / V
    const pieces = [
      ctx.in === null ? hold([0, y], ctx.emit) : roll([-0.5, y], [0, y], BELT_V),
      roll([0, y], [0, HIGH_Y], V),
      roll([0, HIGH_Y], [SHELF_E, HIGH_Y], BELT_V),
      roll([SHELF_E, HIGH_Y], [OFF, y], FALL_V),
      ctx.out === null ? hold([OFF, y], ctx.emit) : roll([OFF, y], [0.5, y], BELT_V),
    ]
    return { pieces, fire: (ctx.in === null ? ctx.emit : IN) + rise }
  },
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    bench(p, k, ink, weight)
    rollers(p, k, ink, weight, s.color, -0.5, -W, u * BELT_SPAN)
    rollers(p, k, ink, weight, s.color, SHELF_E, 0.5, u * BELT_SPAN)

    // The tube: open low on the west to take a part, open high on the east
    // to let it out onto the shelf.
    outline(p, ink, weight)
    p.line(-W * k, -0.5 * k, -W * k, (BENCH - PART - 0.06) * k)
    p.line(W * k, -0.5 * k, W * k, (HIGH_Y - PART / 2 - 0.02) * k)
    p.line(W * k, SHELF * k, W * k, BENCH * k)
    p.line(W * k, SHELF * k, (SHELF_E + 0.04) * k, SHELF * k)
    p.line(0.44 * k, SHELF * k, 0.44 * k, BENCH * k)
    p.rect(0, -0.47 * k, 0.22 * k, 0.06 * k)

    // The flights, scrolling up the tube.
    clipBox(p, W * 2 * k, k, () => {
      outline(p, ink, weight)
      p.line(0, -0.5 * k, 0, BENCH * k)
      const off = mod(u * V * 0.5, PITCH)
      for (let y = BENCH + PITCH - off; y > -0.6; y -= PITCH) {
        p.line(-W * k, y * k, W * k, (y - 0.1) * k)
      }
    })
  },
})
