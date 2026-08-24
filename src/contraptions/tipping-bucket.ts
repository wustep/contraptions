import { defineContraption } from '../core/define'
import { clipBox, outline } from '../core/draw'
import { easeOutBack, easeOutQuad, lerp, seg } from '../core/ease'

/**
 * A trough fills from a spout until it overbalances, tips, empties, and snaps
 * back against its stop.
 *
 * It sits almost still for three quarters of the loop and then does everything
 * at once, which is the shape of a trigger — the snap back is the moment worth
 * chaining off.
 */
export const tippingBucket = defineContraption({
  name: 'tipping-bucket',
  label: 'Tipping Bucket',
  tags: ['fill', 'strike'],
  role: 'source',
  span: [1, 2],
  rotations: [0],
  mirror: false,
  fireAt: 0.88,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { w, h, size, u, ink, weight }) => {
    // The trough carries the machine, so it takes most of the footprint.
    const bw = w * 0.82
    const bh = size * 0.5
    const pivotY = h * 0.02
    const spoutY = -h / 2 + size * 0.22
    const floorY = h / 2 - size * 0.1
    const post = size * 0.1

    const filling = seg(u, 0, 0.72)
    const tipping = seg(u, 0.72, 0.88)
    const returning = seg(u, 0.88, 1)
    const tilt =
      u < 0.88 ? lerp(0, 1.2, easeOutQuad(tipping)) : lerp(1.2, 0, easeOutBack(returning))
    const level = u < 0.72 ? filling : 1 - seg(u, 0.72, 0.82)

    clipBox(p, w, h, () => {
      outline(p, ink, weight)
      // Supply pipe in from the top edge.
      p.line(-w * 0.16, -h / 2, -w * 0.16, spoutY)
      p.line(w * 0.02, -h / 2, w * 0.02, spoutY)
      p.line(-w * 0.16, spoutY, w * 0.02, spoutY)

      if (u < 0.72) {
        p.push()
        p.stroke(s.color)
        p.strokeWeight(weight * 2.2)
        p.line(-w * 0.07, spoutY, -w * 0.07, pivotY - bh * 0.4)
        p.pop()
      }

      p.push()
      p.translate(0, pivotY)
      p.rotate(tilt)
      if (level > 0.01) {
        p.push()
        p.noStroke()
        p.fill(s.color)
        p.rect(0, bh / 2 - (bh * level) / 2, bw - weight * 2, bh * level)
        p.pop()
      }
      outline(p, ink, weight)
      p.line(-bw / 2, -bh / 2, -bw / 2, bh / 2)
      p.line(bw / 2, -bh / 2, bw / 2, bh / 2)
      p.line(-bw / 2, bh / 2, bw / 2, bh / 2)
      p.pop()

      // The load on its way to the floor, once the trough is over.
      if (u >= 0.76 && u < 0.96) {
        const drop = seg(u, 0.76, 0.96)
        p.push()
        p.noStroke()
        p.fill(s.color)
        p.rect(bw * 0.4, lerp(pivotY + bh * 0.6, floorY - size * 0.06, drop), bw * 0.3, bh * 0.6)
        p.pop()
      }

      outline(p, ink, weight)
      // Box column under the pivot, so the trough is visibly carried.
      p.line(-post / 2, pivotY, -post / 2, floorY)
      p.line(post / 2, pivotY, post / 2, floorY)
      p.circle(0, pivotY, size * 0.16)
      // The stop it clacks back against.
      p.line(-bw * 0.48, pivotY + bh * 0.72, -bw * 0.12, pivotY + bh * 0.72)
      p.line(-bw * 0.48, pivotY + bh * 0.72, -bw * 0.48, pivotY + bh * 0.46)
      p.line(-w / 2, floorY, w / 2, floorY)
      p.line(-w / 2, h / 2, w / 2, h / 2)
    })
  },
})
