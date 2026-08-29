import { defineContraption } from '../../core/define'
import { outline, solid } from '../../core/draw'
import { hold, roll, type Lane, type LaneCtx } from '../../core/lane'
import { BELT_V, BENCH, bench } from './shop'

/**
 * The driver's pin dips into a slot of the cross, walks it a quarter turn,
 * and slips out, leaving the cross locked until the pin comes round again.
 *
 * The line indexes with it: the lane stands still while the cross is locked
 * and steps one station while the pin is in a slot, so every part on the
 * bench moves at the same instant — that is what an index drive is for.
 */
const RP = 0.15
const DRIVER: [number, number] = [-0.16, -0.14]
const CROSS: [number, number] = [DRIVER[0] + RP * Math.SQRT2, DRIVER[1]]
const RC = 0.15
/** Where a part waits between steps, and how far a step takes it. */
const STATION = 1 / 3
const STEP = 2 * STATION
/** The pin is in a slot for a quarter of the driver's turn. */
const LOCK = 0.625
const STEP_T = 0.125
const WAIT = 0.3
const LEAD = (0.5 - STATION) / BELT_V

export const geneva = defineContraption({
  name: 'geneva',
  label: 'Geneva Drive',
  tags: ['convey'],
  role: 'relay',
  rotations: [0],
  weight: 0.8,
  // The cross locking after its step.
  fireAt: LOCK,
  lane: (ctx: LaneCtx): Lane => {
    const y = ctx.floorY
    const pieces = [
      ctx.in === null
        ? hold([-STATION, y], ctx.emit)
        : roll([-0.5, y], [-STATION, y], BELT_V),
      ...(ctx.in === null ? [] : [hold([-STATION, y], WAIT)]),
      roll([-STATION, y], [STATION, y], STEP / STEP_T),
      ctx.out === null ? hold([STATION, y], ctx.emit) : hold([STATION, y], WAIT),
      ...(ctx.out === null ? [] : [roll([STATION, y], [0.5, y], BELT_V)]),
    ]
    return { pieces, fire: (ctx.in === null ? ctx.emit : LEAD + WAIT) + STEP_T }
  },
  setup: ({ color, rng }) => ({ color, dir: rng.sign() }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const theta = s.dir * Math.PI * 2 * (u - 0.5)
    const px = DRIVER[0] + Math.cos(theta) * RP
    const py = DRIVER[1] + Math.sin(theta) * RP
    const engaged = Math.abs(u - 0.5) < 0.125
    // While the pin is in a slot the slot points at the pin; otherwise the
    // cross holds where the pin left it, which is the same pose mod a quarter.
    const psi = engaged ? Math.atan2(py - CROSS[1], px - CROSS[0]) : (3 * Math.PI) / 4

    bench(p, k, ink, weight)
    outline(p, ink, weight)
    p.line(DRIVER[0] * k, BENCH * k, DRIVER[0] * k, DRIVER[1] * k)
    p.line(CROSS[0] * k, BENCH * k, CROSS[0] * k, CROSS[1] * k)

    // The cross: a disc with four slots.
    p.push()
    p.translate(CROSS[0] * k, CROSS[1] * k)
    p.rotate(psi)
    outline(p, ink, weight)
    p.circle(0, 0, RC * 2 * k)
    for (let i = 0; i < 4; i++) {
      p.line(0.05 * k, -0.025 * k, RC * k, -0.025 * k)
      p.line(0.05 * k, 0.025 * k, RC * k, 0.025 * k)
      p.arc(0.05 * k, 0, 0.05 * k, 0.05 * k, Math.PI / 2, (3 * Math.PI) / 2)
      p.rotate(Math.PI / 2)
    }
    p.pop()
    solid(p, ink, weight, s.color)
    p.circle(CROSS[0] * k, CROSS[1] * k, 0.09 * k)

    // The driver: a crank with the pin on its end.
    outline(p, ink, weight)
    p.circle(DRIVER[0] * k, DRIVER[1] * k, 0.18 * k)
    p.strokeWeight(weight * 1.6)
    p.line(DRIVER[0] * k, DRIVER[1] * k, px * k, py * k)
    solid(p, ink, weight, s.color)
    p.circle(DRIVER[0] * k, DRIVER[1] * k, 0.07 * k)
    p.circle(px * k, py * k, 0.07 * k)
  },
})
