import { defineContraption } from '../core/define'
import { clipCell, outline, solid } from '../core/draw'

/** A ball running the inside of a quarter-arc chute. */
export const slopeBall = defineContraption({
  name: 'slope-ball',
  label: 'Slope Ball',
  tags: ['track', 'ball'],
  role: 'source',
  fireAt: 0.92,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size, u, ink, weight }) => {
    const d = size * 0.3
    const r = size - d / 2
    // Overshoot the visible quarter at both ends so the ball enters and leaves
    // under the clip rather than popping into existence.
    const a = (-0.08 + u * 1.16) * (Math.PI / 2)
    const bx = -size / 2 + r * Math.cos(a)
    const by = -size / 2 + r * Math.sin(a)

    clipCell(p, size, () => {
      solid(p, ink, weight, s.color)
      p.circle(bx, by, d)
    })

    outline(p, ink, weight)
    p.arc(-size / 2, -size / 2, size * 2, size * 2, 0, Math.PI / 2)
    p.line(-size / 2, size / 2, -size / 2, -size / 2)
    p.line(-size / 2, -size / 2, size / 2, -size / 2)
  },
})
