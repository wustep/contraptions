import { defineContraption } from '../core/define'
import { ceilRail, outline } from '../core/draw'

/** A bell that rocks and rings out when its machine fires. */
export const bell = defineContraption({
  name: 'bell',
  label: 'Bell',
  tags: ['signal', 'strike'],
  fireAt: 0,
  mirror: false,
  rotations: [0],
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size, u, ink, weight, fired }) => {
    void u
    const top = -size / 2
    const drop = size * 0.16
    const bw = size * 0.44
    const bh = size * 0.34
    // A damped wobble: fast at the strike, settling as the signal decays.
    const swing = fired * 0.34 * Math.sin(fired * Math.PI * 5)

    outline(p, ink, weight)
    ceilRail(p, size)

    if (fired > 0.02) {
      p.push()
      p.stroke(s.color)
      p.strokeWeight(weight)
      p.noFill()
      for (const side of [-1, 1]) {
        for (let i = 1; i <= 2; i++) {
          const r = bw * (0.8 + i * 0.3 + fired * 0.3)
          p.arc(side * bw * 0.5, top + drop + bh * 0.5, r, r, side > 0 ? -0.6 : Math.PI - 0.6, side > 0 ? 0.6 : Math.PI + 0.6)
        }
      }
      p.pop()
    }

    p.push()
    p.translate(0, top + drop)
    p.rotate(swing)
    outline(p, ink, weight)
    p.line(0, -drop, 0, 0)
    p.fill(s.color)
    p.beginShape()
    p.vertex(-bw / 2, bh)
    p.bezierVertex(-bw / 2, 0, -bw * 0.22, 0, 0, 0)
    p.bezierVertex(bw * 0.22, 0, bw / 2, 0, bw / 2, bh)
    p.endShape(p.CLOSE)
    p.line(-bw / 2, bh, bw / 2, bh)
    p.fill(s.color)
    p.circle(0, bh + size * 0.06, size * 0.12)
    p.pop()
  },
})
