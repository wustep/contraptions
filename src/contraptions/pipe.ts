import { defineContraption } from '../core/define'
import { clipCell, outline, rails, solid } from '../core/draw'
import { lerp, seg } from '../core/ease'

/** A ball drops in, threads an S-bend, and drops back out the bottom. */
export const pipe = defineContraption({
  name: 'pipe',
  label: 'Pipe',
  tags: ['track', 'ball'],
  period: 120,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size, u, ink, weight }) => {
    const r = size / 6
    const d = size / 6

    // Ball position, in four stages: fall in, first arc, second arc, fall out.
    let bx = -2 * r
    let by = 0
    if (u < 0.25) {
      by = lerp(-size / 2 - d, 0, seg(u, 0, 0.25))
    } else if (u < 0.5) {
      const a = Math.PI * (1 - seg(u, 0.25, 0.5))
      bx = -r + r * Math.cos(a)
      by = r * Math.sin(a)
    } else if (u < 0.75) {
      const a = Math.PI + Math.PI * seg(u, 0.5, 0.75)
      bx = r + r * Math.cos(a)
      by = r * Math.sin(a)
    } else {
      bx = 2 * r
      by = lerp(0, size / 2 + d, seg(u, 0.75, 1))
    }

    clipCell(p, size, () => {
      outline(p, ink, weight)
      p.beginShape()
      p.vertex(-2 * r, -size / 2)
      for (let a = Math.PI; a > 0; a -= Math.PI / 60) {
        p.vertex(-r + r * Math.cos(a), r * Math.sin(a))
      }
      for (let a = Math.PI; a < Math.PI * 2; a += Math.PI / 60) {
        p.vertex(r + r * Math.cos(a), r * Math.sin(a))
      }
      p.vertex(2 * r, size / 2)
      p.endShape()

      solid(p, ink, weight, s.color)
      p.circle(bx, by, d)
    })

    outline(p, ink, weight)
    rails(p, size)
  },
})
