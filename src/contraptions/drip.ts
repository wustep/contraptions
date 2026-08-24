import { defineContraption } from '../core/define'
import { clipCell, outline, solid } from '../core/draw'
import { easeInQuad, easeOutQuad, lerp, seg } from '../core/ease'

/**
 * A drop swells at the nozzle until its own weight takes it, falls, and breaks
 * on the pool below.
 *
 * The pool is the machine's flat colour mass, which is what lets the cell hold
 * its own next to the solid-filled machines around it; the drop is the same
 * colour so you read it as the same substance arriving.
 */
export const drip = defineContraption({
  name: 'drip',
  label: 'Drip',
  tags: ['fall', 'ball'],
  role: 'source',
  rotations: [0],
  mirror: false,
  // The break on the surface.
  fireAt: 0.7,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size, u, ink, weight }) => {
    const bore = size * 0.13
    const nozzleY = -size * 0.16
    const surface = size * 0.18
    const full = size * 0.19

    const swelling = easeOutQuad(seg(u, 0, 0.38))
    const falling = easeInQuad(seg(u, 0.38, 0.7))
    const splash = easeOutQuad(seg(u, 0.7, 0.94))

    const d = u < 0.38 ? full * lerp(0.3, 1, swelling) : full
    const y = u < 0.38 ? nozzleY + d * 0.4 : lerp(nozzleY + d * 0.4, surface - d * 0.3, falling)

    clipCell(p, size, () => {
      // The pool, and the dip the impact puts in it.
      const dip = u >= 0.7 ? size * 0.07 * (1 - splash) : 0
      p.push()
      p.noStroke()
      p.fill(s.color)
      p.beginShape()
      p.vertex(-size / 2, surface)
      p.bezierVertex(-size * 0.2, surface, -size * 0.12, surface + dip, 0, surface + dip)
      p.bezierVertex(size * 0.12, surface + dip, size * 0.2, surface, size / 2, surface)
      p.vertex(size / 2, size / 2)
      p.vertex(-size / 2, size / 2)
      p.endShape(p.CLOSE)
      p.pop()

      outline(p, ink, weight)
      p.beginShape()
      p.vertex(-size / 2, surface)
      p.bezierVertex(-size * 0.2, surface, -size * 0.12, surface + dip, 0, surface + dip)
      p.bezierVertex(size * 0.12, surface + dip, size * 0.2, surface, size / 2, surface)
      p.endShape()

      // Supply pipe down from the top edge, necking into the nozzle.
      p.line(-bore, -size / 2, -bore, nozzleY - size * 0.1)
      p.line(bore, -size / 2, bore, nozzleY - size * 0.1)
      p.line(-bore, nozzleY - size * 0.1, -bore * 0.42, nozzleY)
      p.line(bore, nozzleY - size * 0.1, bore * 0.42, nozzleY)
      p.line(-bore * 0.42, nozzleY, bore * 0.42, nozzleY)

      if (u < 0.7) {
        solid(p, ink, weight, s.color)
        p.circle(0, y, d)
        // Still necked onto the nozzle while it hangs.
        if (u < 0.38) {
          outline(p, ink, weight)
          p.line(-bore * 0.2, nozzleY, -bore * 0.2, y - d * 0.3)
          p.line(bore * 0.2, nozzleY, bore * 0.2, y - d * 0.3)
        }
      } else {
        // Two sheets thrown out sideways, opening and thinning as they go.
        p.push()
        p.stroke(s.color)
        p.strokeWeight(weight * lerp(1.8, 0.5, splash))
        p.noFill()
        const r = full * lerp(0.5, 2.4, splash)
        p.arc(0, surface, r * 2, r * 1.5, Math.PI * 1.12, Math.PI * 1.88)
        p.pop()
      }

      outline(p, ink, weight)
      p.line(-size / 2, size / 2, size / 2, size / 2)
    })
  },
})
