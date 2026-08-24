import { defineContraption } from '../core/define'
import { floorRail, outline } from '../core/draw'

/**
 * A bulb that lights when its machine fires. Wired into a chain, a row of these
 * reads as a signal running across the piece.
 */
export const lamp = defineContraption({
  name: 'lamp',
  label: 'Lamp',
  tags: ['signal'],
  // Gravity gives this one an up.
  rotations: [0],
  role: 'sink',
  fireAt: 0,
  mirror: false,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size, u, ink, weight, fired }) => {
    void u
    const d = size * 0.36
    const y = -size * 0.08

    outline(p, ink, weight)
    floorRail(p, size)
    p.line(0, size / 2, 0, y + d / 2)
    p.line(-size * 0.11, y + d / 2, size * 0.11, y + d / 2)

    if (fired > 0.02) {
      p.push()
      p.stroke(s.color)
      p.strokeWeight(weight)
      const reach = d * (0.62 + fired * 0.35)
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8
        p.line(Math.cos(a) * d * 0.6, y + Math.sin(a) * d * 0.6, Math.cos(a) * reach, y + Math.sin(a) * reach)
      }
      p.pop()
    }

    outline(p, ink, weight)
    if (fired > 0.02) p.fill(s.color)
    p.circle(0, y, d)
  },
})
