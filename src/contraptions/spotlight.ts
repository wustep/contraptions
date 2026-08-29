import { defineContraption } from '../core/define'
import { clipCell, outline, solid } from '../core/draw'
import { pingPong } from '../core/ease'
import { fade, ground, knob, stroke } from './circus'

/**
 * The lamp pans slowly across the tent all loop, and when the signal
 * arrives the beam comes on wherever it happens to be pointing and fades
 * while the lamp keeps panning.
 */
const PIVOT: [number, number] = [0, 0.14]
const HEAD = 0.28
const PAN = 0.6

export const spotlight = defineContraption({
  name: 'spotlight',
  label: 'Spotlight',
  tags: ['lights'],
  role: 'sink',
  rotations: [0],
  fireAt: 0,
  weight: 0.8,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight, theme }) => {
    const pan = -PAN + 2 * PAN * pingPong(u)
    const reach = 0.7 * fade(u, 0, 0.3)

    outline(p, ink, weight)
    ground(p, k, 1)
    stroke(p, k, PIVOT[0], PIVOT[1], PIVOT[0], 0.5)
    stroke(p, k, PIVOT[0] - 0.16, 0.5, PIVOT[0], PIVOT[1] + 0.14)
    stroke(p, k, PIVOT[0] + 0.16, 0.5, PIVOT[0], PIVOT[1] + 0.14)

    p.push()
    p.translate(PIVOT[0] * k, PIVOT[1] * k)
    p.rotate(pan)
    if (reach > 0.02) {
      clipCell(p, k, () => {
        solid(p, ink, weight, s.color)
        p.quad(-0.1 * k, -HEAD * k, 0.1 * k, -HEAD * k, (0.1 + 0.4 * reach) * k, (-HEAD - reach) * k, (-0.1 - 0.4 * reach) * k, (-HEAD - reach) * k)
      })
    }
    solid(p, ink, weight, s.color)
    p.quad(-0.07 * k, 0, 0.07 * k, 0, 0.11 * k, -HEAD * k, -0.11 * k, -HEAD * k)
    solid(p, ink, weight, theme.bg)
    p.rect(0, -HEAD * k, 0.2 * k, 0.05 * k)
    p.pop()
    knob(p, k, ink, weight, s.color, PIVOT[0], PIVOT[1], 0.08)
  },
})
