import { defineContraption } from '../core/define'
import { clipBox, outline } from '../core/draw'
import { easeOutBack, easeOutQuad, lerp, seg } from '../core/ease'

/**
 * A trough fills from a spout until it overbalances, tips, empties, and snaps
 * back up against its stop.
 *
 * It sits almost still for three quarters of the loop and then does everything
 * at once, which is exactly the shape of a trigger — the snap back is the
 * moment worth chaining off.
 */
export const tippingBucket = defineContraption({
  name: 'tipping-bucket',
  label: 'Tipping Bucket',
  tags: ['fill', 'strike'],
  span: [1, 2],
  rotations: [0],
  fireAt: 0.88,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { w, h, size, u, ink, weight }) => {
    const pivotY = -h * 0.06
    const bw = w * 0.68
    const bh = size * 0.42
    const spoutY = -h / 2 + size * 0.16

    // fill, tip and empty, snap back
    const filling = seg(u, 0, 0.72)
    const tipping = seg(u, 0.72, 0.88)
    const returning = seg(u, 0.88, 1)
    const tilt =
      u < 0.88
        ? lerp(0, 1.15, easeOutQuad(tipping))
        : lerp(1.15, 0, easeOutBack(returning))
    const level = u < 0.72 ? filling : 1 - seg(u, 0.72, 0.82)

    clipBox(p, w, h, () => {
      outline(p, ink, weight)
      p.line(-w / 2, spoutY, -w * 0.14, spoutY)
      p.line(-w * 0.14, spoutY, -w * 0.14, spoutY + size * 0.12)

      // The stream only runs while the trough is under it.
      if (u < 0.72) {
        p.push()
        p.stroke(s.color)
        p.strokeWeight(weight * 1.4)
        p.line(-w * 0.14, spoutY + size * 0.12, -w * 0.14, pivotY - bh * 0.3)
        p.pop()
      }

      p.push()
      p.translate(0, pivotY)
      p.rotate(tilt)
      // Contents ride with the trough, so they pour out as it goes over.
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

      // The falling load, between the trough going over and it hitting bottom.
      if (u >= 0.76 && u < 0.94) {
        const drop = seg(u, 0.76, 0.94)
        p.push()
        p.noStroke()
        p.fill(s.color)
        p.rect(bw * 0.36, lerp(pivotY + bh, h / 2 - size * 0.1, drop), bw * 0.34, bh * 0.7)
        p.pop()
      }

      outline(p, ink, weight)
      p.circle(0, pivotY, size * 0.14)
      p.line(0, pivotY, 0, h / 2 - size * 0.08)
      // The stop the trough clacks back against.
      p.line(-bw * 0.5, pivotY + bh * 0.9, -bw * 0.16, pivotY + bh * 0.9)
      p.line(-w / 2, h / 2 - size * 0.08, w / 2, h / 2 - size * 0.08)
      p.line(-w / 2, h / 2, w / 2, h / 2)
    })
  },
})
