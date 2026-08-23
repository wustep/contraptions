import { defineContraption } from '../core/define'
import { clipCell, outline, solid } from '../core/draw'
import { easeInQuad, easeOutQuad, lerp, seg } from '../core/ease'

/**
 * A drop swells at the nozzle until its own weight takes it, falls under
 * gravity, and breaks on the surface below.
 *
 * The whole point is the arrival — the drop accelerates all the way down and
 * the splash is the only fast thing in the cell — so this makes a good source
 * for a chain.
 */
export const drip = defineContraption({
  name: 'drip',
  label: 'Drip',
  tags: ['fall', 'ball'],
  rotations: [0],
  mirror: false,
  // The break on the surface.
  fireAt: 0.72,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size, u, ink, weight }) => {
    const spoutY = -size * 0.34
    const pool = size * 0.3
    const full = size * 0.19

    const swelling = seg(u, 0, 0.4)
    const falling = seg(u, 0.4, 0.72)
    const splash = seg(u, 0.72, 0.94)

    // The drop hangs and grows, then necks off and accelerates.
    const d = u < 0.4 ? full * lerp(0.25, 1, easeOutQuad(swelling)) : full
    const y = u < 0.4 ? spoutY + d / 2 : lerp(spoutY + d / 2, pool, easeInQuad(falling))

    clipCell(p, size, () => {
      outline(p, ink, weight)
      // Spout: a stub of pipe with a lip, so the drop has somewhere to come from.
      p.line(-size / 2, spoutY - size * 0.12, -size * 0.08, spoutY - size * 0.12)
      p.line(-size / 2, spoutY, -size * 0.1, spoutY)
      p.arc(-size * 0.09, spoutY - size * 0.06, size * 0.12, size * 0.12, -Math.PI / 2, Math.PI / 2)

      if (u < 0.72) {
        solid(p, ink, weight, s.color)
        p.circle(0, y, d)
        // The thread still connecting it to the lip, while it hangs.
        if (u < 0.4) {
          outline(p, ink, weight)
          p.line(0, spoutY, 0, y - d / 2)
        }
      } else {
        // Two arcs thrown out sideways, opening and thinning as they go.
        p.push()
        p.stroke(s.color)
        p.strokeWeight(weight * lerp(1.6, 0.6, splash))
        p.noFill()
        const r = full * lerp(0.4, 2.2, easeOutQuad(splash))
        p.arc(0, pool, r * 2, r * 1.3, Math.PI * 1.15, Math.PI * 1.85)
        p.pop()
      }

      // The surface it lands on, dipping under the impact.
      outline(p, ink, weight)
      const dip = u >= 0.72 ? full * 0.3 * (1 - easeOutQuad(splash)) : 0
      p.beginShape()
      p.vertex(-size / 2, pool)
      p.bezierVertex(-size * 0.18, pool, -size * 0.1, pool + dip, 0, pool + dip)
      p.bezierVertex(size * 0.1, pool + dip, size * 0.18, pool, size / 2, pool)
      p.endShape()
      p.line(-size / 2, size / 2, size / 2, size / 2)
      p.line(-size / 2, pool, -size / 2, size / 2)
      p.line(size / 2, pool, size / 2, size / 2)
    })
  },
})
