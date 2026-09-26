import type p5 from 'p5'
import { alpha } from '../kit'
import { HOME, INK } from '../worlds'

/**
 * Paradise Falls, as Ellie painted it (canonical; the director's). The place they always meant to go: a flat-topped
 * cliff standing out of the jungle with a long falls pouring off its lip, and on the top, small, their house. It is
 * a picture, not a view: flat paint, a few shapes, drawn inside a rectangle. It is the pop-up in her adventure book,
 * the picture on the jar, and the painting over the desk that sends him for the tickets. No words on it, ever.
 *
 * `x0, y0` is the picture's top-left corner and `w, h` its size, in cells of the caller's frame. `light` fades it.
 */
export const FALLS = {
  sky: '#F4D9A8',
  skyTop: '#E9A77F',
  cliff: '#7F6A8F',
  cliffShade: '#5F4E72',
  water: '#EAF4F6',
  jungle: '#4F8A5A',
  jungleFar: '#6FA070',
}

export function drawFalls(p: p5, k: number, weight: number, x0: number, y0: number, w: number, h: number, light = 1): void {
  const X = (u: number) => (x0 + u * w) * k
  const Y = (v: number) => (y0 + v * h) * k
  p.push()
  p.rectMode(p.CORNER)
  p.noStroke()
  // The sky, warm at the horizon, deeper at the top: two bands, flat.
  p.fill(alpha(p, FALLS.skyTop, light))
  p.rect(X(0), Y(0), w * k, h * 0.35 * k)
  p.fill(alpha(p, FALLS.sky, light))
  p.rect(X(0), Y(0.35), w * k, h * 0.65 * k)
  // The far jungle.
  p.fill(alpha(p, FALLS.jungleFar, light))
  p.beginShape()
  p.vertex(X(0), Y(0.78))
  for (let i = 0; i <= 8; i++) p.vertex(X(i / 8), Y(0.72 + 0.04 * Math.sin(i * 1.7)))
  p.vertex(X(1), Y(1))
  p.vertex(X(0), Y(1))
  p.endShape(p.CLOSE)
  // The cliff: a tepui, flat on top, its sides falling steep and a little ragged.
  p.fill(alpha(p, FALLS.cliff, light))
  p.beginShape()
  p.vertex(X(0.2), Y(0.86))
  p.vertex(X(0.26), Y(0.42))
  p.vertex(X(0.3), Y(0.3))
  p.vertex(X(0.7), Y(0.28))
  p.vertex(X(0.74), Y(0.4))
  p.vertex(X(0.8), Y(0.86))
  p.endShape(p.CLOSE)
  p.fill(alpha(p, FALLS.cliffShade, light))
  p.beginShape()
  p.vertex(X(0.62), Y(0.29))
  p.vertex(X(0.7), Y(0.28))
  p.vertex(X(0.74), Y(0.4))
  p.vertex(X(0.8), Y(0.86))
  p.vertex(X(0.66), Y(0.86))
  p.endShape(p.CLOSE)
  // The falls: a pale ribbon off the lip, widening into mist at the foot.
  p.fill(alpha(p, FALLS.water, light))
  p.beginShape()
  p.vertex(X(0.45), Y(0.3))
  p.vertex(X(0.5), Y(0.3))
  p.vertex(X(0.53), Y(0.84))
  p.vertex(X(0.41), Y(0.84))
  p.endShape(p.CLOSE)
  p.ellipse(X(0.47), Y(0.86), w * 0.22 * k, h * 0.07 * k)
  // The near jungle over the cliff's foot.
  p.fill(alpha(p, FALLS.jungle, light))
  p.beginShape()
  p.vertex(X(0), Y(0.9))
  for (let i = 0; i <= 10; i++) p.vertex(X(i / 10), Y(0.84 + 0.035 * Math.sin(i * 2.3 + 1)))
  p.vertex(X(1), Y(1))
  p.vertex(X(0), Y(1))
  p.endShape(p.CLOSE)
  // Their house on the top, small: a gable and a chimney.
  const hx = 0.6
  const hy = 0.285
  p.fill(alpha(p, HOME.siding, light))
  p.rect(X(hx - 0.035), Y(hy - 0.06), w * 0.07 * k, h * 0.06 * k)
  p.fill(alpha(p, HOME.roof, light))
  p.triangle(X(hx - 0.05), Y(hy - 0.055), X(hx + 0.05), Y(hy - 0.055), X(hx), Y(hy - 0.11))
  // The picture's edge.
  p.noFill()
  p.stroke(alpha(p, INK, 0.9 * light))
  p.strokeWeight(weight * 0.8)
  p.rect(X(0), Y(0), w * k, h * k)
  p.pop()
}
