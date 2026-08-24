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
        // Two droplets thrown out sideways, arcing up and shrinking — the
        // splash stays the same substance as the pool instead of a loose wire.
        p.push()
        p.noStroke()
        p.fill(s.color)
        const throwX = full * lerp(0.4, 1.7, splash)
        const throwY = full * 1.1 * 4 * splash * (1 - splash)
        const dd = full * lerp(0.5, 0.22, splash)
        p.circle(-throwX, surface - throwY, dd)
        p.circle(throwX, surface - throwY, dd)
        p.pop()
      }

      outline(p, ink, weight)
      p.line(-size / 2, size / 2, size / 2, size / 2)
    })
  },
})
