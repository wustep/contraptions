import { defineContraption } from '../core/define'
import { outline, solid } from '../core/draw'
import { easeInOutCubic, easeOutCubic, seg } from '../core/ease'
import { BENCH, HIT, bench, pulse } from './shop'

/**
 * The striker rod shoots out of its solenoid and clips the lip of the bell,
 * and the bell rocks on its hanger and rings out.
 */
const BELL_X = -0.12
const BW = 0.4
const BH = 0.3

export const bell = defineContraption({
  name: 'bell',
  label: 'Bell',
  tags: ['signal'],
  role: 'sink',
  rotations: [0],
  fireAt: HIT,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const ring = pulse(u, HIT, 40)
    const swing = ring * 0.3 * Math.sin(ring * Math.PI * 5)
    const ext = 0.12 * (easeOutCubic(seg(u, HIT - 0.02, HIT)) - easeInOutCubic(seg(u, HIT + 0.04, HIT + 0.14)))
    const lip = -0.5 + 0.08 + BH

    bench(p, k, ink, weight)

    if (ring > 0.02) {
      p.push()
      p.stroke(s.color)
      p.strokeWeight(weight)
      p.noFill()
      for (let i = 1; i <= 2; i++) {
        const r = BW * (0.9 + i * 0.3 + ring * 0.3) * k
        p.arc((BELL_X - BW * 0.4) * k, (lip - BH * 0.5) * k, r, r, Math.PI - 0.6, Math.PI + 0.6)
      }
      p.pop()
    }

    // The bell on its hanger.
    p.push()
    p.translate(BELL_X * k, -0.5 * k)
    p.rotate(swing)
    outline(p, ink, weight)
    p.line(0, 0, 0, 0.08 * k)
    p.translate(0, 0.08 * k)
    p.fill(s.color)
    p.beginShape()
    p.vertex((-BW / 2) * k, BH * k)
    p.bezierVertex((-BW / 2) * k, 0, -BW * 0.22 * k, 0, 0, 0)
    p.bezierVertex(BW * 0.22 * k, 0, (BW / 2) * k, 0, (BW / 2) * k, BH * k)
    p.endShape(p.CLOSE)
    p.line((-BW / 2) * k, BH * k, (BW / 2) * k, BH * k)
    p.circle(0, (BH + 0.05) * k, 0.1 * k)
    p.pop()

    // The solenoid on its post, and the striker it fires at the lip.
    outline(p, ink, weight)
    p.line(0.34 * k, (lip - 0.02) * k, 0.34 * k, BENCH * k)
    p.rect(0.34 * k, (lip - 0.02) * k, 0.16 * k, 0.14 * k)
    p.line((0.26 - ext) * k, (lip - 0.02) * k, 0.26 * k, (lip - 0.02) * k)
    solid(p, ink, weight, s.color)
    p.circle((0.23 - ext) * k, (lip - 0.02) * k, 0.08 * k)
  },
})
