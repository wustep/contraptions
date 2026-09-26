import type p5 from 'p5'
import { alpha, hash } from '../kit'
import { HOME, INK } from '../worlds'
import { drawFalls } from './falls'

/**
 * The Paradise Falls jar (canonical; the jar builder owns this file). A big glass jar with a cork lid and Ellie's
 * painting of the falls on its front, filled a handful at a time and emptied three times by life. At the end it stands
 * on the mantle with a few coins in it, dusty.
 *
 * The painting is a panel on the front, narrower than the glass, so the brass shows beside it and under it as the jar
 * fills. The cork lid has a slot the coins go in by, and is hinged at the jar's right shoulder: `lid` flings it open.
 *
 * Coins are small flat brass discs, seen nearly edge on: never round and ball-sized. `x, y` is the middle of the
 * jar's bottom (standing on a shelf at y), in cells of the caller's frame; `tilt` turns it about that point.
 */
export const JAR = {
  /** Width and height of the glass, in cells. */
  w: 0.62,
  h: 0.85,
  /** How high the coins can rise, as a share of the height. */
  full: 0.8,
}

export interface JarState {
  /** 0 empty .. 1 full. */
  fill: number
  /** 0 clean .. 1 grey with years of dust. */
  dust?: number
  /** The lid: 0 on .. 1 flung open on its hinge (hanging down from it when the jar lies tipped on its side). */
  lid?: number
  /** Turned about its bottom, radians (tipped to pour). */
  tilt?: number
  light?: number
}

export function drawJar(p: p5, k: number, weight: number, x: number, y: number, s: JarState): void {
  const { w, h } = JAR
  const light = s.light ?? 1
  const dust = s.dust ?? 0
  const X = (v: number) => v * k
  p.push()
  p.translate(X(x), X(y))
  p.rotate(s.tilt ?? 0)
  p.rectMode(p.CORNER)

  // The glass's body, pale, behind everything in it.
  p.noStroke()
  p.fill(alpha(p, '#E4F1F2', 0.3 * light))
  body(p, k, w, h)

  // The coins: a pile of flat discs, its top a little uneven, a few edges showing, a glint on the top.
  const level = Math.max(0, Math.min(1, s.fill)) * JAR.full * h
  if (level > 0.004) {
    const inner = w / 2 - 0.045
    p.fill(alpha(p, HOME.brass, light))
    p.beginShape()
    p.vertex(X(-inner), X(-0.035))
    for (let i = 0; i <= 8; i++) {
      const u = i / 8
      const bump = 0.018 * Math.sin(u * 9 + level * 31) * Math.min(1, level / 0.05)
      p.vertex(X(-inner + u * 2 * inner), X(-(Math.max(0.012, level) + bump) - 0.035))
    }
    p.vertex(X(inner), X(-0.035))
    p.endShape(p.CLOSE)
    p.stroke(alpha(p, '#9C7424', 0.65 * light))
    p.strokeWeight(weight * 0.45)
    const rows = Math.floor(level / 0.055)
    for (let r = 0; r < rows; r++) {
      const yy = -0.06 - r * 0.055
      const xx = -inner + 0.03 + hash(r, 1, 3) * (2 * inner - 0.2)
      p.line(X(xx), X(yy), X(xx + 0.11), X(yy))
    }
    p.noStroke()
    p.fill(alpha(p, HOME.shine, 0.75 * light))
    p.rect(X(-inner + 0.08), X(-level - 0.05), X(0.1), X(0.018), X(0.01))
  }

  // Ellie's painting on the front: a panel, not a band, so the brass shows round it.
  const pw = w - 0.2
  const ph = h * 0.34
  drawFalls(p, k, weight * 0.8, -pw / 2, -h * 0.72, pw, ph, 0.95 * light)

  // The glass's outline with its shoulder and neck, a highlight down the left.
  p.stroke(alpha(p, INK, light))
  p.strokeWeight(weight * 0.85)
  p.noFill()
  body(p, k, w, h)
  p.noStroke()
  p.fill(alpha(p, '#FFFFFF', 0.4 * light))
  p.rect(X(-w / 2 + 0.06), X(-(h - 0.16)), X(0.045), X(h - 0.34), X(0.02))

  // Dust: a grey veil, thicker at the shoulder.
  if (dust > 0.01) {
    p.fill(alpha(p, '#9A948A', 0.32 * dust * light))
    body(p, k, w, h)
    p.fill(alpha(p, '#9A948A', 0.25 * dust * light))
    p.rect(X(-w / 2 + 0.04), X(-h + 0.01), X(w - 0.08), X(0.12))
  }

  // The cork lid, hinged at the right shoulder, with its slot.
  const lid = Math.max(0, Math.min(1, s.lid ?? 0))
  const lw = w - 0.2
  p.push()
  p.translate(X(lw / 2), X(-h))
  p.rotate(lid * 2.8)
  p.stroke(alpha(p, INK, light))
  p.strokeWeight(weight * 0.8)
  p.fill(alpha(p, '#C49A6C', light))
  p.rect(X(-lw), X(-0.12), X(lw), X(0.12), X(0.025))
  p.stroke(alpha(p, '#5B4638', light))
  p.strokeWeight(weight * 0.9)
  p.line(X(-lw / 2 - 0.07), X(-0.1), X(-lw / 2 + 0.07), X(-0.1))
  p.pop()
  p.pop()
}

/** The jar's glass: straight sides, a rounded shoulder into a short neck. */
function body(p: p5, k: number, w: number, h: number): void {
  const X = (v: number) => v * k
  p.beginShape()
  p.vertex(X(-w / 2), X(-0.02))
  p.bezierVertex(X(-w / 2), X(0), X(-w / 2 + 0.02), X(0), X(-w / 2 + 0.05), X(0))
  p.vertex(X(w / 2 - 0.05), 0)
  p.bezierVertex(X(w / 2 - 0.02), X(0), X(w / 2), X(0), X(w / 2), X(-0.02))
  p.vertex(X(w / 2), X(-(h - 0.12)))
  p.bezierVertex(X(w / 2), X(-h + 0.02), X(w / 2 - 0.06), X(-h), X(w / 2 - 0.1), X(-h))
  p.vertex(X(-w / 2 + 0.1), X(-h))
  p.bezierVertex(X(-w / 2 + 0.06), X(-h), X(-w / 2), X(-h + 0.02), X(-w / 2), X(-(h - 0.12)))
  p.endShape(p.CLOSE)
}
