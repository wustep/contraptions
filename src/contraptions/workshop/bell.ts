import { defineContraption } from '../../core/define'
import { clipCell, outline, solid } from '../../core/draw'
import { easeInOutCubic, easeOutCubic, seg } from '../../core/ease'
import { BELT_V, BENCH, HIT, belt, bench, lineOf, pulse } from './shop'

/**
 * A bell at the east end of the bench. The belt runs in and stops at the
 * post; the bell hangs over that end from a hanger on the post. Nothing
 * continues past it.
 */
const BELL_X = 0.16
const BW = 0.34
const BH = 0.26
const HANGER = BENCH - 0.38
const STOP = 0.08

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
    const ext = 0.1 * (easeOutCubic(seg(u, HIT - 0.02, HIT)) - easeInOutCubic(seg(u, HIT + 0.04, HIT + 0.14)))
    const lip = HANGER + 0.08 + BH
    const x0 = line?.in ? -0.5 : -0.36

    clipCell(p, k, () => {
    bench(p, k, ink, weight, x0, STOP)
    belt(p, k, ink, weight, s.color, x0, STOP, u * BELT_V)

    if (ring > 0.02) {
      p.push()
      p.stroke(s.color)
      p.strokeWeight(weight)
      p.noFill()
      for (let i = 1; i <= 2; i++) {
        const r = BW * (0.9 + i * 0.3 + ring * 0.3) * k
        p.arc((BELL_X - BW * 0.35) * k, (lip - BH * 0.5) * k, r, r, Math.PI - 0.6, Math.PI + 0.6)
      }
      p.pop()
    }

    outline(p, ink, weight)
    p.line(0.36 * k, BENCH * k, 0.36 * k, HANGER * k)
    p.line(BELL_X * k, HANGER * k, 0.36 * k, HANGER * k)

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
    p.line(0.42 * k, lip * k, 0.42 * k, BENCH * k)
    p.rect(0.42 * k, lip * k, 0.12 * k, 0.12 * k)
    p.line((0.34 - ext) * k, lip * k, 0.34 * k, lip * k)
    solid(p, ink, weight, s.color)
    p.circle((0.32 - ext) * k, lip * k, 0.07 * k)
    })
  },
})
