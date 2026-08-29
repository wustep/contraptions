import { defineContraption } from '../core/define'
import { outline, solid } from '../core/draw'
import { lerp, seg, stepEase } from '../core/ease'
import { block, ground, knob, since, stroke } from './circus'

/**
 * The pump puffs the balloon up a stroke at a time until it reaches the pin
 * hanging over it, the balloon bursts, and the pump starts on the next one.
 */
const NOZZLE: [number, number] = [0.14, 0.4]
const R0 = 0.04
const R1 = 0.27
const PUMP_X = -0.3
const STROKES = 6
const POP = 0.86
/** The pin's tip is exactly where the balloon's top will be when it is full. */
const PIN: [number, number] = [NOZZLE[0], NOZZLE[1] - 2 * R1]

export const balloon = defineContraption({
  name: 'balloon',
  label: 'Balloon',
  tags: ['sideshow'],
  role: 'source',
  rotations: [0],
  fireAt: POP,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const filling = seg(u, 0, POP)
    const r = u < POP ? lerp(R0, R1, stepEase(filling, STROKES, 0.55)) : 0
    const puff = (filling * STROKES) % 1
    const handle = u < POP ? lerp(-0.02, 0.14, Math.sin(puff * Math.PI)) : -0.02
    const burst = since(u, POP)

    outline(p, ink, weight)
    ground(p, k, 1)
    // The pump: a cylinder, a rod, and the handle going up and down on it.
    block(p, k, ink, weight, s.color, PUMP_X, 0.34, 0.16, 0.32)
    outline(p, ink, weight)
    stroke(p, k, PUMP_X, 0.18, PUMP_X, handle)
    block(p, k, ink, weight, s.color, PUMP_X, handle, 0.2, 0.05)
    // The hose along the floor to the nozzle.
    outline(p, ink, weight)
    stroke(p, k, PUMP_X + 0.08, 0.44, NOZZLE[0], 0.44)
    stroke(p, k, NOZZLE[0], 0.44, NOZZLE[0], NOZZLE[1])
    stroke(p, k, NOZZLE[0] - 0.05, NOZZLE[1], NOZZLE[0] + 0.05, NOZZLE[1])

    // The pin, on a bracket from the ceiling.
    stroke(p, k, PIN[0] + 0.14, -0.5, PIN[0] + 0.14, PIN[1] - 0.12)
    stroke(p, k, PIN[0] + 0.14, PIN[1] - 0.12, PIN[0], PIN[1] - 0.12)
    stroke(p, k, PIN[0], PIN[1] - 0.12, PIN[0], PIN[1])
    knob(p, k, ink, weight, s.color, PIN[0], PIN[1] - 0.12, 0.05)

    if (u < POP) {
      solid(p, ink, weight, s.color)
      p.circle(NOZZLE[0] * k, (NOZZLE[1] - r) * k, r * 2 * k)
    } else if (burst < 0.12) {
      // Shreds thrown out from where it was.
      const f = burst / 0.12
      p.push()
      p.noStroke()
      p.fill(s.color)
      const cy = NOZZLE[1] - R1
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + 0.4
        const d = R1 * lerp(0.6, 1.9, f)
        const x = NOZZLE[0] + Math.cos(a) * d
        const y = cy + Math.sin(a) * d + 0.3 * f * f
        const w = 0.07 * (1 - f * 0.6)
        p.push()
        p.translate(x * k, y * k)
        p.rotate(a + f * 3)
        p.triangle(-w * k, 0, w * k, 0, 0, w * 1.6 * k)
        p.pop()
      }
      p.pop()
    }
  },
})
