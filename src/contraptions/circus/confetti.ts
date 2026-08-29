import { defineContraption } from '../../core/define'
import { outline } from '../../core/draw'
import { easeInOutSine, easeOutCubic, lerp, seg } from '../../core/ease'
import { block, ground, knob, second, since, stroke } from './circus'

/**
 * The lever is pulled down to cock the cannon for the whole loop; when the
 * signal arrives it snaps up, the cannon throws a burst of confetti into
 * the air, and the bits tumble down while the lever is pulled again.
 */
const MOUTH = 0.1
const PIVOT: [number, number] = [0.17, 0.36]
const UP = -1.35
const DOWN = 0.35
const BITS = 16
/** How long the bits are in the air. */
const BURST = 0.42

const hash = (i: number, salt: number) => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453
  return x - Math.floor(x)
}

export const confetti = defineContraption({
  name: 'confetti',
  label: 'Confetti',
  tags: ['sideshow'],
  role: 'sink',
  rotations: [0],
  fireAt: 0,
  weight: 0.8,
  setup: ({ color, rng, theme }) => ({ color, alt: second(rng, theme, color) }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const lever = u < 0.04 ? lerp(DOWN, UP, easeOutCubic(seg(u, 0, 0.04))) : lerp(UP, DOWN, easeInOutSine(seg(u, 0.04, 0.96)))
    const t = since(u, 0)

    outline(p, ink, weight)
    ground(p, k, 1)
    block(p, k, ink, weight, s.color, 0, 0.48, 0.36, 0.05)
    block(p, k, ink, weight, s.color, 0, (MOUTH + 0.46) / 2, 0.2, 0.46 - MOUTH)
    outline(p, ink, weight)
    stroke(p, k, -0.13, MOUTH, 0.13, MOUTH)

    // The lever on the side.
    stroke(p, k, PIVOT[0], PIVOT[1], PIVOT[0] + 0.24 * Math.cos(lever), PIVOT[1] + 0.24 * Math.sin(lever))
    knob(p, k, ink, weight, s.color, PIVOT[0] + 0.24 * Math.cos(lever), PIVOT[1] + 0.24 * Math.sin(lever), 0.08)
    knob(p, k, ink, weight, s.color, PIVOT[0], PIVOT[1], 0.05)

    // The burst. Every bit stays in the cell, settles on the floor rather than
    // falling through it, and shrinks away instead of being clipped off.
    if (t < BURST) {
      const f = t / BURST
      p.noStroke()
      for (let i = 0; i < BITS; i++) {
        const a = -Math.PI / 2 + (hash(i, 1) - 0.5) * 1.4
        const r = 0.42 * (0.7 + 0.45 * hash(i, 2)) * f
        const x = Math.cos(a) * r
        const y = Math.min(0.44, MOUTH - 0.04 + Math.sin(a) * r + 0.62 * f * f)
        p.push()
        p.translate(x * k, y * k)
        p.rotate(t * (5 + 8 * hash(i, 3)) * (hash(i, 4) > 0.5 ? 1 : -1))
        p.fill(i % 2 === 0 ? s.color : s.alt)
        const fade = Math.min(1, 3 * (1 - f))
        p.rect(0, 0, 0.075 * fade * k, 0.045 * fade * k)
        p.pop()
      }
    }
  },
})
