import type p5 from 'p5'
import { alpha } from '../kit'
import { INK } from '../worlds'

/**
 * The picnic basket (canonical; the ties builder owns this file and may refine it, keeping the signature and
 * `BASKET`). A wicker basket with two lids and a handle; Carl hides the tickets in it and carries it to the hill on
 * his top, and it goes down with her fall.
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
  /** 0 shut .. 1 a lid lifted. */
  open?: number
  tilt?: number
  light?: number
}

export function drawBasket(p: p5, k: number, weight: number, x: number, y: number, s: BasketState = {}): void {
  const { w, h, handle } = BASKET
  const light = s.light ?? 1
  p.push()
  p.translate(x * k, y * k)
  p.rotate(s.tilt ?? 0)
  p.rectMode(p.CORNER)
  p.stroke(alpha(p, INK, light))
  p.strokeWeight(weight * 0.75)
  // The handle, an arch over the lids.
  p.noFill()
  p.arc(0, -h * k, w * 0.7 * k, handle * 2 * k, Math.PI, Math.PI * 2)
  // The body: a little wider at the top, woven.
  p.fill(alpha(p, BASKET.wicker, light))
  p.quad((-w / 2) * k, -h * k, (w / 2) * k, -h * k, (w / 2 - 0.04) * k, 0, (-w / 2 + 0.04) * k, 0)
  p.stroke(alpha(p, BASKET.weave, light))
  p.strokeWeight(weight * 0.45)
  for (let i = 1; i < 3; i++) p.line((-w / 2 + 0.02) * k, (-h + (h * i) / 3) * k, (w / 2 - 0.02) * k, (-h + (h * i) / 3) * k)
  // A corner of the gingham cloth under the lid.
  p.noStroke()
  p.fill(alpha(p, BASKET.cloth, light))
  p.triangle((-w / 2 + 0.03) * k, -h * k, (-w / 2 + 0.13) * k, -h * k, (-w / 2 + 0.05) * k, (-h + 0.07) * k)
  // The lids: two flat boards along the top; the right one lifts.
  const o = s.open ?? 0
  p.stroke(alpha(p, INK, light))
  p.strokeWeight(weight * 0.75)
  p.fill(alpha(p, BASKET.weave, light))
  p.rect((-w / 2) * k, (-h - 0.04) * k, (w / 2) * k, 0.04 * k)
  p.push()
  p.translate((w / 2) * k, -h * k)
  p.rotate(-o * 1.2)
  p.rect((-w / 2) * k, -0.04 * k, (w / 2) * k, 0.04 * k)
  p.pop()
  p.pop()
}
