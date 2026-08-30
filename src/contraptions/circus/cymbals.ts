import { defineContraption } from '../../core/define'
import { outline, solid } from '../../core/draw'
import { easeInOutSine, easeInQuad, easeOutCubic, lerp, seg } from '../../core/ease'
import { fade, ground, knob, rings, shiver, stroke } from './circus'

/**
 * Two cymbals on arms lean slowly apart for the whole loop, and when the
 * signal arrives they clash together and shudder, and the sound goes up.
 *
 * The arms lean *in* to clash: a positive angle throws the rims outward, and
 * at full stretch a rim has to still be inside the cell.
 */
const PIVOT_X = 0.3
const PIVOT_Y = 0.46
const ARM = 0.46
const DISH = 0.26
const CLASH = -0.36
const RECOIL = -0.16
const COCKED = 0.12

export const cymbals = defineContraption({
  name: 'cymbals',
  label: 'Cymbals',
  tags: ['band'],
  role: 'sink',
  rotations: [0],
  fireAt: 0,
  weight: 0.8,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const base =
      u < 0.04 ? lerp(CLASH, RECOIL, easeOutCubic(seg(u, 0, 0.04)))
      : u < 0.9 ? lerp(RECOIL, COCKED, easeInOutSine(seg(u, 0.04, 0.9)))
      : lerp(COCKED, CLASH, easeInQuad(seg(u, 0.9, 1)))
    const angle = base + 0.04 * shiver(u, 0, 0.14, 6)
    const meetY = PIVOT_Y - ARM * Math.cos(CLASH)

    outline(p, ink, weight)
    ground(p, k, 1)
    rings(p, k, s.color, weight, 0, meetY - 0.05, 0.18, fade(u, 0, 0.22), -Math.PI / 2, 2)

    for (const side of [-1, 1]) {
      const px = side * PIVOT_X
      const hx = px + side * ARM * Math.sin(angle)
      const hy = PIVOT_Y - ARM * Math.cos(angle)
      outline(p, ink, weight)
      stroke(p, k, px, 0.5, px, PIVOT_Y)
      stroke(p, k, px, PIVOT_Y, hx, hy)
      p.push()
      p.translate(hx * k, hy * k)
      p.rotate(side * angle)
      solid(p, ink, weight, s.color)
      p.ellipse(0, 0, DISH * k, 0.09 * k)
      p.pop()
      knob(p, k, ink, weight, s.color, hx, hy, 0.07)
      knob(p, k, ink, weight, s.color, px, PIVOT_Y, 0.06)
    }
  },
})
