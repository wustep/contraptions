import { defineContraption } from '../../core/define'
import { outline, solid } from '../../core/draw'
import { BENCH, bench } from './shop'

/**
 * The driver's pin dips into a slot of the cross, walks it a quarter turn,
 * and slips out, leaving the cross locked until the pin comes round again.
 */
const RP = 0.15
const DRIVER: [number, number] = [-0.24, -0.02]
const CROSS: [number, number] = [DRIVER[0] + RP * Math.SQRT2, DRIVER[1]]
const RC = 0.15

export const geneva = defineContraption({
  name: 'geneva',
  label: 'Geneva Drive',
  tags: ['convey'],
  role: 'relay',
  rotations: [0],
  weight: 0.8,
  // The cross locking after its step.
  fireAt: 0.625,
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
