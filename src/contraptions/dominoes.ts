import { defineContraption } from '../core/define'
import { clipCell, floorRail, outline } from '../core/draw'
import { easeInOutCubic, easeOutQuad, seg } from '../core/ease'

/** A row of bars toppling in sequence, then standing back up together. */
export const dominoes = defineContraption({
  name: 'dominoes',
  label: 'Dominoes',
  tags: ['sequence', 'step'],
  role: 'source',
  rotations: [0, 2],
  // The first bar going over.
  fireAt: 0.02,
  setup: ({ color, rng }) => ({ color, count: rng.pick([3, 4, 4]) }),
  draw: (p, s, { size, u, ink, weight }) => {
    const floorY = size * 0.46
    const h = size * 0.36
    const w = size * 0.1
    const span = size * 0.62
    const fallen = 1.0
    const stand = easeInOutCubic(seg(u, 0.8, 1))

    clipCell(p, size, () => {
      for (let i = 0; i < s.count; i++) {
        const x = -span / 2 + (span * i) / Math.max(1, s.count - 1)
        const start = (i / s.count) * 0.62
        const drop = easeOutQuad(seg(u, start, start + 0.18))
        p.push()
        p.translate(x, floorY)
        p.rotate(fallen * drop * (1 - stand))
        outline(p, ink, weight)
        p.fill(s.color)
        p.rect(0, -h / 2, w, h)
        p.pop()
      }
    })

    outline(p, ink, weight)
    floorRail(p, size)
  },
})
