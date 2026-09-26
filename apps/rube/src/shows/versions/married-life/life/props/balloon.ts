import type p5 from 'p5'
import { alpha } from '../kit'
import { BALLOON, INK } from '../worlds'

/**
 * The balloon (canonical; the director's). Carl sold balloons when they were young; at the end he brings her one in
 * the hospital, holds it alone in the church, and takes it home. It is his young blue: the one saturated thing left
 * in a greying frame.
 *
 * It is never ball-sized and never loose near him without its string: it is bigger than either of them, a little
 * taller than wide, with a knot, a shine and a string down to where it is tied, so it cannot be read as a third
 * ball. Drawn in cells (the caller has translated to the world or the part's frame); `k` is pixels a cell.
 *
 * `at` is the balloon's centre, `anchor` where its string is tied, `sway` a small lean (radians) from the air.
 */
export const BALLOON_SIZE = { rx: 0.27, ry: 0.32, string: 1.3 }

export function drawBalloon(p: p5, k: number, weight: number, at: [number, number], anchor: [number, number], sway = 0, light = 1): void {
  const [bx, by] = at
  const [ax, ay] = anchor
  const { rx, ry } = BALLOON_SIZE
  // The knot: the bottom of the balloon, turned with its lean.
  const kx = bx + Math.sin(sway) * ry
  const ky = by + Math.cos(sway) * ry
  p.push()
  // The string: a soft curve from the knot down to where it is tied, sagging away from the straight line a little.
  p.noFill()
  p.stroke(alpha(p, INK, 0.75 * light))
  p.strokeWeight(Math.max(1, weight * 0.45))
  const mx = (kx + ax) / 2 + (ay - ky) * 0.08 + Math.sin(sway * 2) * 0.05
  const my = (ky + ay) / 2
  p.bezier(kx * k, ky * k, mx * k, (my - 0.1) * k, mx * k, (my + 0.1) * k, ax * k, ay * k)
  // The body.
  p.translate(bx * k, by * k)
  p.rotate(sway)
  p.stroke(alpha(p, INK, light))
  p.strokeWeight(weight * 0.9)
  p.fill(alpha(p, BALLOON, light))
  p.beginShape()
  // A little fuller at the top than the bottom: a balloon, not an egg or a ball.
  for (let i = 0; i <= 40; i++) {
    const a = (i / 40) * Math.PI * 2
    const s = Math.sin(a)
    const c = Math.cos(a)
    const taper = c > 0 ? 1 - 0.12 * c * c : 1
    p.vertex(s * rx * taper * k, -c * ry * k)
  }
  p.endShape(p.CLOSE)
  // The knot.
  p.fill(alpha(p, BALLOON, light))
  p.triangle(-0.045 * k, (ry + 0.055) * k, 0.045 * k, (ry + 0.055) * k, 0, (ry - 0.01) * k)
  // The shine: a soft crescent high on its left.
  p.noStroke()
  p.fill(alpha(p, '#FFFFFF', 0.45 * light))
  p.push()
  p.rotate(-0.5)
  p.ellipse(-rx * 0.42 * k, -ry * 0.38 * k, rx * 0.34 * k, ry * 0.62 * k)
  p.pop()
  p.pop()
}
