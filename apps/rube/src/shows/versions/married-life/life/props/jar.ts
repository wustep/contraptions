import type p5 from 'p5'
import { alpha, hash } from '../kit'
import { HOME, INK } from '../worlds'
import { drawFalls } from './falls'

/**
 * The Paradise Falls jar (canonical; the jar builder owns this file and may refine it, keeping the signature and
 * `JAR`). A big glass jar with a cork lid and Ellie's painting of the falls on its front, filled coin by coin and
 * emptied three times by life. At the end it stands on the mantle, empty and dusty.
 *
 * Coins are small flat brass discs, seen nearly edge on: never round and ball-sized. `x, y` is the middle of the
 * jar's bottom (standing on a shelf at y), in cells of the caller's frame.
 */
export const JAR = {
  /** Width and height of the glass, in cells. */
  w: 0.62,
  h: 0.85,
  /** How high the coins can rise, as a share of the height. */
  full: 0.78,
}

export interface JarState {
  /** 0 empty .. 1 full. */
  fill: number
  /** 0 clean .. 1 grey with years of dust. */
  dust?: number
  /** The lid: 0 on .. 1 off (lifted and set aside for pouring). */
  lid?: number
  /** Turned about its bottom, radians (tipped to pour). */
  tilt?: number
  light?: number
}

export function drawJar(p: p5, k: number, weight: number, x: number, y: number, s: JarState): void {
  const { w, h } = JAR
  const light = s.light ?? 1
  const dust = s.dust ?? 0
  p.push()
  p.translate(x * k, y * k)
  p.rotate(s.tilt ?? 0)
  // The coins inside: stacked flat discs, the top of the pile a little uneven.
  const level = Math.max(0, Math.min(1, s.fill)) * JAR.full * h
  if (level > 0.01) {
    p.noStroke()
    p.fill(alpha(p, HOME.brass, light))
    p.beginShape()
    p.vertex((-w / 2 + 0.05) * k, -0.03 * k)
    for (let i = 0; i <= 6; i++) {
      const u = i / 6
      p.vertex((-w / 2 + 0.05 + u * (w - 0.1)) * k, -(level + 0.03 * Math.sin(u * 7 + level * 13)) * k)
    }
    p.vertex((w / 2 - 0.05) * k, -0.03 * k)
    p.endShape(p.CLOSE)
    // A few coins' edges in the pile, and a shine.
    p.stroke(alpha(p, '#9C7424', 0.7 * light))
    p.strokeWeight(weight * 0.5)
    const rows = Math.floor(level / 0.07)
    for (let r = 0; r < rows; r++) {
      const yy = -0.05 - r * 0.07
      const xx = -w / 2 + 0.1 + hash(r, 1, 3) * (w - 0.35)
      p.line(xx * k, yy * k, (xx + 0.12) * k, yy * k)
    }
  }
  // The painting on the front: Ellie's falls, a band across the glass.
  drawFalls(p, k, weight, -w / 2 + 0.06, -h * 0.62, w - 0.12, h * 0.3, 0.92 * light)
  // The glass: a pale body, a highlight, the outline with a shoulder and a neck.
  p.stroke(alpha(p, INK, light))
  p.strokeWeight(weight * 0.85)
  p.fill(alpha(p, '#E4F1F2', 0.22 * light))
  p.beginShape()
  p.vertex((-w / 2) * k, 0)
  p.vertex((-w / 2) * k, -(h - 0.12) * k)
  p.bezierVertex((-w / 2) * k, -h * k, (-w / 2 + 0.1) * k, -h * k, (-w / 2 + 0.14) * k, -h * k)
  p.vertex((w / 2 - 0.14) * k, -h * k)
  p.bezierVertex((w / 2 - 0.1) * k, -h * k, (w / 2) * k, -h * k, (w / 2) * k, -(h - 0.12) * k)
  p.vertex((w / 2) * k, 0)
  p.endShape(p.CLOSE)
  p.noStroke()
  p.fill(alpha(p, '#FFFFFF', 0.35 * light))
  p.rectMode(p.CORNER)
  p.rect((-w / 2 + 0.07) * k, -(h - 0.15) * k, 0.05 * k, (h - 0.35) * k, 0.02 * k)
  // Dust: a grey veil over the glass, thicker at the shoulder.
  if (dust > 0.01) {
    p.fill(alpha(p, '#9A948A', 0.35 * dust * light))
    p.rect((-w / 2) * k, -h * k, w * k, h * k)
  }
  // The cork lid.
  const lid = s.lid ?? 0
  p.push()
  p.translate(lid * 0.45 * k, -(h + lid * 0.12) * k)
  p.rotate(lid * 0.5)
  p.stroke(alpha(p, INK, light))
  p.strokeWeight(weight * 0.8)
  p.fill(alpha(p, '#C49A6C', light))
  p.rect((-w / 2 + 0.12) * k, -0.12 * k, (w - 0.24) * k, 0.12 * k, 0.02 * k)
  p.pop()
  p.pop()
}
