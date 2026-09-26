import type p5 from 'p5'
import { mixHex } from '../../../../../parts'
import { alpha } from '../kit'
import { HOME, INK } from '../worlds'

/**
 * The picnic basket (canonical; the ties builder owns this file and may refine it, keeping the signature and
 * `BASKET`). A wicker hamper with two lids hinged along the middle under its handle; Carl hides the tickets in it and
 * carries it to the hill on his top, and it goes down with her fall.
 *
 * `x, y` is the middle of its bottom, in cells of the caller's frame; `tilt` turns it about that point.
 */
export const BASKET = {
  w: 0.44,
  h: 0.26,
  handle: 0.16,
  wicker: '#C99A5B',
  weave: '#A77C43',
  cloth: '#C9574B',
}

export interface BasketState {
  /** 0 shut .. 1 the right lid flipped up on its hinge. */
  open?: number
  tilt?: number
  light?: number
}

export function drawBasket(p: p5, k: number, weight: number, x: number, y: number, s: BasketState = {}): void {
  const { w, h, handle } = BASKET
  const light = s.light ?? 1
  const ink = alpha(p, INK, light)
  const dark = mixHex(BASKET.weave, INK, 0.25)
  const half = w / 2
  const foot = half - 0.035
  p.push()
  p.translate(x * k, y * k)
  p.rotate(s.tilt ?? 0)
  p.rectMode(p.CORNER)
  // The handle: a thick wicker hoop from the body's shoulders over the lids.
  p.noFill()
  p.stroke(ink)
  p.strokeWeight(0.05 * k)
  p.arc(0, -h * k, w * 0.66 * k, handle * 2 * k, Math.PI, Math.PI * 2)
  p.stroke(alpha(p, BASKET.wicker, light))
  p.strokeWeight(0.028 * k)
  p.arc(0, -h * k, w * 0.66 * k, handle * 2 * k, Math.PI, Math.PI * 2)
  // The body: a little wider at the top, its bottom corners rounded.
  p.stroke(ink)
  p.strokeWeight(weight * 0.75)
  p.fill(alpha(p, BASKET.wicker, light))
  p.beginShape()
  p.vertex(-half * k, -h * k)
  p.vertex(half * k, -h * k)
  p.vertex(foot * k, -0.03 * k)
  p.quadraticVertex(foot * k, 0, (foot - 0.03) * k, 0)
  p.vertex(-(foot - 0.03) * k, 0)
  p.quadraticVertex(-foot * k, 0, -foot * k, -0.03 * k)
  p.endShape(p.CLOSE)
  // The weave: bands across, and short uprights staggered between them.
  p.stroke(alpha(p, BASKET.weave, light))
  p.strokeWeight(weight * 0.45)
  const bands = 3
  for (let i = 1; i < bands; i++) {
    const yy = -h + (h * i) / bands
    const inset = ((half - foot) * i) / bands
    p.line((-half + inset + 0.015) * k, yy * k, (half - inset - 0.015) * k, yy * k)
  }
  for (let i = 0; i < bands; i++) {
    const y0 = -h + (h * i) / bands + 0.012
    const y1 = -h + (h * (i + 1)) / bands - 0.012
    for (let j = -3; j <= 3; j++) {
      const xx = (j + (i % 2 ? 0.5 : 0)) * 0.058
      if (Math.abs(xx) > foot - 0.03) continue
      p.line(xx * k, y0 * k, xx * k, y1 * k)
    }
  }
  // The rim: a darker rolled band round the top.
  p.stroke(ink)
  p.strokeWeight(weight * 0.6)
  p.fill(alpha(p, dark, light))
  p.rect((-half - 0.01) * k, (-h - 0.012) * k, (w + 0.02) * k, 0.03 * k, 0.012 * k)
  // A corner of the gingham cloth peeping out under the left lid.
  p.noStroke()
  p.fill(alpha(p, BASKET.cloth, light))
  p.triangle((-half + 0.03) * k, (-h + 0.018) * k, (-half + 0.14) * k, (-h + 0.018) * k, (-half + 0.05) * k, (-h + 0.085) * k)
  p.stroke(alpha(p, HOME.trim, light))
  p.strokeWeight(weight * 0.35)
  p.line((-half + 0.07) * k, (-h + 0.02) * k, (-half + 0.055) * k, (-h + 0.06) * k)
  // The lids: two boards meeting at the hinge in the middle; the right one flips up on it.
  const o = Math.max(0, s.open ?? 0)
  p.stroke(ink)
  p.strokeWeight(weight * 0.7)
  p.fill(alpha(p, BASKET.weave, light))
  p.rect(-half * k, (-h - 0.05) * k, (half - 0.01) * k, 0.04 * k, 0.01 * k)
  p.push()
  p.translate(0.005 * k, (-h - 0.03) * k)
  p.rotate(-o * 1.35)
  p.rect(0, -0.02 * k, (half - 0.005) * k, 0.04 * k, 0.01 * k)
  p.pop()
  // The hinge's bar along the middle.
  p.fill(alpha(p, dark, light))
  p.rect(-0.02 * k, (-h - 0.055) * k, 0.04 * k, 0.03 * k, 0.008 * k)
  p.pop()
}
