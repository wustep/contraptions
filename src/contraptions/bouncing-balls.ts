import { defineContraption } from '../core/define'
import { floorRail, outline, solid } from '../core/draw'
import { easeInOutSine, lerp, seg } from '../core/ease'

/** Two weights on rods, trading places. */
export const bouncingBalls = defineContraption({
  name: 'bouncing-balls',
  label: 'Bouncing Balls',
  tags: ['swap', 'ball'],
  role: 'source',
  fireAt: 0.5,
  period: 120,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size, u, ink, weight }) => {
    const d = size / 6
    const hi = -size * 0.25
    const lo = size * 0.25
    const t = u < 0.5 ? easeInOutSine(seg(u, 0, 0.5)) : 1 - easeInOutSine(seg(u, 0.5, 1))
    const a = lerp(lo, hi, t)
    const b = lerp(hi, lo, t)

    outline(p, ink, weight)
    p.line(size / 6, size / 2, size / 6, a)
    p.line(-size / 6, size / 2, -size / 6, b)
    floorRail(p, size)
    solid(p, ink, weight, s.color)
    p.circle(size / 6, a, d)
    p.circle(-size / 6, b, d)
  },
})
