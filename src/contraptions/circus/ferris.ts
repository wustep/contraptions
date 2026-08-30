import { defineContraption } from '../../core/define'
import { outline, solid } from '../../core/draw'
import { ground, knob, performer, second, stroke } from './circus'

/**
 * The wheel turns once a loop with a gondola on every spoke, each hanging
 * level whatever the spoke is doing, and the riders in them go up over the
 * top and back down to where they got on.
 */
const HUB: [number, number] = [0, -0.1]
const R = 0.7
const GONDOLAS = 8

export const ferris = defineContraption({
  name: 'ferris',
  label: 'Ferris Wheel',
  tags: ['parade'],
  role: 'relay',
  span: [2, 2],
  rotations: [0],
  fireAt: 0,
  setup: ({ color, rng, theme }) => ({ color, alt: second(rng, theme, color), dir: rng.sign() }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    outline(p, ink, weight)
    ground(p, k, 2, 1)
    // The A-frame and the rim.
    stroke(p, k, HUB[0] - 0.5, 1, HUB[0], HUB[1])
    stroke(p, k, HUB[0] + 0.5, 1, HUB[0], HUB[1])
    stroke(p, k, HUB[0] - 0.28, 0.56, HUB[0] + 0.28, 0.56)
    p.circle(HUB[0] * k, HUB[1] * k, R * 2 * k)

    const at = (i: number): [number, number] => {
      const a = Math.PI * 2 * (u * s.dir + i / GONDOLAS)
      return [HUB[0] + R * Math.cos(a), HUB[1] + R * Math.sin(a)]
    }
    for (let i = 0; i < GONDOLAS; i++) {
      const [x, y] = at(i)
      stroke(p, k, HUB[0], HUB[1], x, y)
    }
    knob(p, k, ink, weight, s.color, HUB[0], HUB[1], 0.16)

    // Gondolas hang level from the rim, riders sitting in them.
    for (let i = 0; i < GONDOLAS; i++) {
      const [x, y] = at(i)
      const fill = i % 2 === 0 ? s.color : s.alt
      outline(p, ink, weight)
      stroke(p, k, x, y, x, y + 0.06)
      if (i % 2 === 0) performer(p, k, ink, weight, fill, x, y + 0.12, 0.15)
      solid(p, ink, weight, fill)
      p.quad((x - 0.11) * k, (y + 0.12) * k, (x + 0.11) * k, (y + 0.12) * k, (x + 0.08) * k, (y + 0.24) * k, (x - 0.08) * k, (y + 0.24) * k)
      knob(p, k, ink, weight, fill, x, y, 0.05)
    }
  },
})
