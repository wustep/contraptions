import { defineContraption } from '../../core/define'
import { outline, solid } from '../../core/draw'
import { easeInOutCubic, easeOutCubic, seg } from '../../core/ease'
import { BENCH, HIT, bench, lineOf, pulse } from './shop'

/**
 * A bell over the end of the bench: the part trips the striker, the bell
 * rings and rocks on a post that stands on the bench. It does not hang from
 * the cell ceiling — that read as a floating ornament between rows.
 */
const BELL_X = -0.06
const BW = 0.36
const BH = 0.26
const HANGER = BENCH - 0.38

export const bell = defineContraption({
  name: 'bell',
  label: 'Bell',
  tags: ['signal'],
  role: 'sink',
  rotations: [0],
  fireAt: HIT,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const line = lineOf(s)
    const ring = pulse(u, HIT, 40)
    const swing = ring * 0.3 * Math.sin(ring * Math.PI * 5)
    const ext = 0.12 * (easeOutCubic(seg(u, HIT - 0.02, HIT)) - easeInOutCubic(seg(u, HIT + 0.04, HIT + 0.14)))
    const lip = HANGER + 0.08 + BH
    const x0 = line?.in ? -0.5 : -0.36
    const x1 = 0.1

    bench(p, k, ink, weight, x0, x1)

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

    // Post on the bench, hanger, bell.
    outline(p, ink, weight)
    p.line(0.22 * k, BENCH * k, 0.22 * k, HANGER * k)
    p.line(BELL_X * k, HANGER * k, 0.22 * k, HANGER * k)

    p.push()
    p.translate(BELL_X * k, HANGER * k)
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

    outline(p, ink, weight)
    p.line(0.34 * k, (lip - 0.02) * k, 0.34 * k, BENCH * k)
    p.rect(0.34 * k, (lip - 0.02) * k, 0.14 * k, 0.12 * k)
    p.line((0.26 - ext) * k, (lip - 0.02) * k, 0.26 * k, (lip - 0.02) * k)
    solid(p, ink, weight, s.color)
    p.circle((0.23 - ext) * k, (lip - 0.02) * k, 0.08 * k)
  },
})
