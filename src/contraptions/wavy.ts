import { defineContraption } from '../core/define'
import { outline, rails, solid } from '../core/draw'
import { lerp } from '../core/ease'

/** A standing wave running down a cord, anchored by a block. */
export const wavy = defineContraption({
  name: 'wavy',
  label: 'Wavy',
  tags: ['wave'],
  setup: ({ color, rng }) => ({ color, cycles: rng.pick([1, 1, 2]), dir: rng.sign() }),
  draw: (p, s, { size, u, ink, weight }) => {
    const blockH = size * 0.2
    const blockW = size * 0.5
    const phase = u * Math.PI * 2 * s.dir

    outline(p, ink, weight)
    p.beginShape()
    for (let i = 0; i < 80; i++) {
      const n = i / 79
      const y = lerp(-size / 2, size / 2 - blockH, n)
      const x = (size / 4) * Math.sin(n * Math.PI * 2 * s.cycles + phase)
      p.vertex(x, y)
    }
    p.endShape()

    solid(p, ink, weight, s.color)
    p.rect(0, (size - blockH) / 2, blockW, blockH)
    outline(p, ink, weight)
    rails(p, size)
  },
})
