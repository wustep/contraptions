import { defineContraption } from '../../core/define'
import { outline } from '../../core/draw'
import { easeInOutSine, easeOutCubic, lerp, seg } from '../../core/ease'
import { P, block, ground, knob, pedestal, performer, stroke } from './circus'

/**
 * The curtains fly open on the signal, the act on the pedestal takes a bow,
 * and the curtains draw slowly shut again over the rest of the loop, ready
 * to be flung open next time.
 */
const ROD_Y = -0.42
const HEM = 0.42

export const curtain = defineContraption({
  name: 'curtain',
  label: 'Curtain',
  tags: ['sideshow'],
  role: 'sink',
  rotations: [0],
  fireAt: 0,
  weight: 0.8,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const open = u < 0.06 ? easeOutCubic(seg(u, 0, 0.06)) : u < 0.36 ? 1 : 1 - easeInOutSine(seg(u, 0.36, 0.94))
    const w = lerp(0.5, 0.1, open)
    const bow = Math.sin(Math.PI * seg(u, 0.08, 0.32))

    outline(p, ink, weight)
    ground(p, k, 1)
    pedestal(p, k, ink, weight, s.color, 0, 0.3, 0.5, 0.3)
    performer(p, k, ink, weight, s.color, 0, 0.3 - P / 2 + 0.06 * bow)

    for (const side of [-1, 1]) {
      const x = side * (0.5 - w / 2)
      block(p, k, ink, weight, s.color, x, (ROD_Y + HEM) / 2, w, HEM - ROD_Y)
      // Folds gather as the panel is drawn back.
      outline(p, ink, weight)
      const folds = 1 + Math.round((1 - open) * 2)
      for (let i = 1; i <= folds; i++) {
        const fx = x - (side * w) / 2 + (side * w * i) / (folds + 1)
        stroke(p, k, fx, ROD_Y + 0.05, fx, HEM - 0.03)
      }
    }

    outline(p, ink, weight)
    stroke(p, k, -0.5, ROD_Y, 0.5, ROD_Y)
    knob(p, k, ink, weight, s.color, -0.47, ROD_Y, 0.06)
    knob(p, k, ink, weight, s.color, 0.47, ROD_Y, 0.06)
  },
})
