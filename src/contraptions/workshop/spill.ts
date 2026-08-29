import { defineContraption } from '../../core/define'
import { outline } from '../../core/draw'
import { seg } from '../../core/ease'
import { BELT_SPAN, BENCH, bench, rollers, sparks, workLane } from './shop'

/**
 * A grate set into the bench over a swarf tray. The part stops on it, the
 * chips and coolant it carried spill through into the tray, and it rolls on
 * clean. What falls is the machine's; the part is the world's.
 */
const HALF = 0.17
const HOLD = 0.14
const SPILL = 0.5
/** The tray under the grate: mouth, floor, and walls. */
const TRAY = 0.46

export const spill = defineContraption({
  name: 'spill',
  label: 'Swarf Grate',
  tags: ['convey'],
  role: 'relay',
  rotations: [0],
  fireAt: SPILL,
  lane: (ctx) => workLane(ctx, { time: HOLD }),
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const on = seg(u, SPILL - 0.16, SPILL - 0.06) * (1 - seg(u, SPILL + 0.1, SPILL + 0.22))

    bench(p, k, ink, weight, -0.5, -HALF)
    bench(p, k, ink, weight, HALF, 0.5)
    rollers(p, k, ink, weight, s.color, -0.5, -HALF, u * BELT_SPAN)
    rollers(p, k, ink, weight, s.color, HALF, 0.5, u * BELT_SPAN)

    // The wash pipe over the grate, and its spray.
    outline(p, ink, weight)
    p.line(0, -0.5 * k, 0, -0.08 * k)
    p.rect(0, -0.02 * k, 0.16 * k, 0.09 * k)
    for (const dir of [-1, 1]) {
      sparks(p, k, s.color, dir * 0.03, 0.04, u, dir * 0.5, on, 3, 4, -0.04)
    }

    // The grate: the bench line carried across on slotted bars.
    outline(p, ink, weight)
    p.line(-HALF * k, BENCH * k, HALF * k, BENCH * k)
    for (let x = -HALF + 0.04; x < HALF; x += 0.055) {
      p.line(x * k, BENCH * k, x * k, (BENCH + 0.06) * k)
    }
    // The funnel it drains into, and its spout.
    for (const side of [-1, 1]) {
      p.line(side * HALF * k, (BENCH + 0.06) * k, side * 0.07 * k, TRAY * k)
      p.line(side * 0.07 * k, TRAY * k, side * 0.07 * k, 0.5 * k)
    }

    for (const dir of [-1, 1]) {
      sparks(p, k, s.color, dir * 0.05, BENCH + 0.08, u, dir * 0.3, on, 3, 4, 0.05)
    }
  },
})
