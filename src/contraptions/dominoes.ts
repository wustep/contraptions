import { defineContraption } from '../core/define'
import { floorRail, outline } from '../core/draw'
import { easeInOutCubic, easeOutQuad, seg } from '../core/ease'

/** A row of bars toppling in sequence, then standing back up together. */
export const dominoes = defineContraption({
  name: 'dominoes',
  label: 'Dominoes',
  tags: ['sequence', 'step'],
  rotations: [0, 2],
  setup: ({ color, rng }) => ({ color, count: rng.pick([4, 5, 5, 6]) }),
  draw: (p, s, { size, u, ink, weight }) => {
    const floorY = size * 0.44
    const h = size * 0.46
    const w = size * 0.09
    const span = size * 0.76
    const fallen = 1.05
    const stand = easeInOutCubic(seg(u, 0.78, 1))

    outline(p, ink, weight)
    floorRail(p, size)

    for (let i = 0; i < s.count; i++) {
      const x = -span / 2 + (span * i) / Math.max(1, s.count - 1)
      const start = (i / s.count) * 0.6
      const drop = easeOutQuad(seg(u, start, start + 0.16))
      const angle = fallen * drop * (1 - stand)
      p.push()
      p.translate(x, floorY)
      p.rotate(angle)
      outline(p, ink, weight)
      if (i % 2 === 0) p.fill(s.color)
      p.rect(0, -h / 2, w, h)
      p.pop()
    }
  },
})
