import type p5 from 'p5'
import { outline, solid } from '../../../../../../../../src/core/draw'
import type { Pt } from '../../../../../parts'
import { alpha } from '../kit'
import { DUST } from '../worlds'

/**
 * Cooper's watch: the one he gives Murph, the one that keeps time on her
 * shelf and, in the tesseract, carries the message in its second hand.
 *
 * Drawn to read at a glance as a wristwatch, even small: a round tin case
 * with a crown, a bone face with twelve ticks and three hands, and a
 * leather strap with its holes and buckle. Two ways to show it:
 *
 * - `stand`: stood up on a shelf, face out, the strap curled under it so it
 *   stands: the way a watch is left on a shelf.
 * - `hang`: hung by its strap from a nail, the strap looped over the nail
 *   and the case below.
 *
 * The second hand ticks once a second of show time unless `seconds` is
 * given.
 */

/** Where it stands on Murph's bookcase: the left end of the top shelf, in the shelf's own cells (the top board's surface at -0.82). */
export const WATCH_ON_SHELF: Pt = [-0.25, -0.82]
/** Its case's radius, in cells: small, as a watch is, but big enough to read. */
export const WATCH_R = 0.085

const LEATHER = '#7A4A2C'
const LEATHER_DARK = '#5C3620'

export interface WatchStyle {
  /** How it is shown. */
  mode: 'stand' | 'hang'
  /** The case's radius, in cells. */
  r?: number
  /** The second hand's angle, in seconds (0..60); by default it ticks with show time. */
  seconds?: number
  /** A glint on the glass, 0..1. */
  glint?: number
  /** How it swings on its nail (radians), for `hang`. */
  swing?: number
}

/**
 * Draw the watch with its foot (stand) or its nail (hang) at (x, y), in the caller's cells. `t` is show time,
 * for the second hand.
 */
export function drawWatch(p: p5, k: number, ink: string, weight: number, x: number, y: number, t: number, style: WatchStyle): void {
  const r = style.r ?? WATCH_R
  const X = (v: number) => v * k
  const sec = style.seconds ?? Math.floor(t) % 60
  p.push()
  p.translate(X(x), X(y))
  if (style.mode === 'hang') p.rotate(style.swing ?? 0)
  // The case's centre, from the foot or the nail.
  const cy = style.mode === 'stand' ? -(r + r * 0.72) : r * 2.35
  const strapW = r * 0.9

  // The strap.
  if (style.mode === 'stand') {
    // Curled under the case into a loop it stands on, the tail end lying on the shelf.
    solid(p, ink, weight * 0.7, LEATHER)
    p.beginShape()
    p.vertex(X(-strapW / 2), X(cy + r * 0.6))
    p.bezierVertex(X(-strapW / 2 - r * 0.15), X(0), X(-r * 1.25), X(0), X(-r * 1.55), X(0))
    p.vertex(X(-r * 1.55), X(-r * 0.22))
    p.bezierVertex(X(-r * 1.05), X(-r * 0.22), X(-strapW / 2 + r * 0.25), X(-r * 0.3), X(strapW / 2), X(cy + r * 0.6))
    p.endShape(p.CLOSE)
    // The other end, standing up behind the case and bent back over it: the part you see above the case.
    p.beginShape()
    p.vertex(X(-strapW / 2), X(cy - r * 0.6))
    p.bezierVertex(X(-strapW / 2), X(cy - r * 1.9), X(r * 0.9), X(cy - r * 2.05), X(r * 1.25), X(cy - r * 1.45))
    p.vertex(X(r * 1.02), X(cy - r * 1.3))
    p.bezierVertex(X(r * 0.7), X(cy - r * 1.7), X(strapW / 2), X(cy - r * 1.55), X(strapW / 2), X(cy - r * 0.6))
    p.endShape(p.CLOSE)
    // Its holes, and the buckle on the tail.
    p.noStroke()
    p.fill(LEATHER_DARK)
    for (const u of [0.35, 0.62, 0.88]) p.circle(X(-strapW / 2 + (r * 0.25) * u + u * r * 0.1), X(cy - r * (1.05 + 0.55 * u)), Math.max(1, X(r * 0.16)))
    outline(p, ink, weight * 0.6)
    p.stroke(alpha(p, DUST.tin, 1))
    p.strokeWeight(Math.max(1, X(r * 0.14)))
    p.noFill()
    p.rect(X(-r * 1.25), X(-r * 0.12), X(r * 0.34), X(r * 0.3), X(r * 0.05))
  } else {
    // Looped over the nail: the two ends of the strap come down to the case from either side of it.
    solid(p, ink, weight * 0.7, LEATHER)
    for (const side of [-1, 1]) {
      p.beginShape()
      p.vertex(X(side * strapW * 0.15), X(0))
      p.vertex(X(side * strapW * 0.15 + side * strapW * 0.55), X(r * 0.15))
      p.vertex(X(side * strapW / 2), X(cy - r * 0.55))
      p.vertex(X(-side * strapW / 2 + side * strapW * 0.1), X(cy - r * 0.55))
      p.endShape(p.CLOSE)
    }
    p.noStroke()
    p.fill(LEATHER_DARK)
    for (const u of [0.35, 0.65]) p.circle(X(0), X(cy - r * 0.55 - (cy - r * 0.55) * u), Math.max(1, X(r * 0.15)))
    // And hanging below the case, the buckle end.
    solid(p, ink, weight * 0.7, LEATHER)
    p.rect(X(0), X(cy + r * 1.35), X(strapW), X(r * 1.1), X(r * 0.2))
    p.noFill()
    p.stroke(DUST.tin)
    p.strokeWeight(Math.max(1, X(r * 0.14)))
    p.rect(X(0), X(cy + r * 0.95), X(strapW * 1.05), X(r * 0.28), X(r * 0.05))
    // The nail.
    solid(p, ink, weight * 0.6, DUST.tin)
    p.circle(0, 0, X(r * 0.35))
  }

  // The crown, at three o'clock.
  solid(p, ink, weight * 0.6, DUST.tin)
  p.rect(X(r * 1.08), X(cy), X(r * 0.26), X(r * 0.34), X(r * 0.05))
  // The case: tin, with its bezel.
  solid(p, ink, weight * 0.9, DUST.tin)
  p.circle(0, X(cy), X(2 * r))
  // The face.
  solid(p, ink, weight * 0.5, DUST.bone)
  p.circle(0, X(cy), X(2 * r * 0.78))
  // Twelve ticks, the quarters longer.
  p.stroke(ink)
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    const r0 = r * (i % 3 === 0 ? 0.52 : 0.62)
    p.strokeWeight(Math.max(0.6, weight * (i % 3 === 0 ? 0.55 : 0.35)))
    p.line(X(Math.sin(a) * r0), X(cy - Math.cos(a) * r0), X(Math.sin(a) * r * 0.72), X(cy - Math.cos(a) * r * 0.72))
  }
  // The hands: hour and minute set at ten to two, as watches are shown; the second hand keeping time.
  p.strokeWeight(Math.max(1, weight * 0.8))
  const hand = (a: number, len: number) => p.line(0, X(cy), X(Math.sin(a) * len), X(cy - Math.cos(a) * len))
  hand((-50 / 360) * Math.PI * 2, r * 0.42)
  hand((60 / 360) * Math.PI * 2, r * 0.6)
  p.stroke(DUST.rust)
  p.strokeWeight(Math.max(0.6, weight * 0.45))
  hand((sec / 60) * Math.PI * 2, r * 0.66)
  p.noStroke()
  p.fill(ink)
  p.circle(0, X(cy), Math.max(1.5, X(r * 0.12)))
  // The glass's glint.
  const g = style.glint ?? 0.35
  if (g > 0.01) {
    p.noFill()
    p.stroke(alpha(p, '#FFFFFF', 0.75 * g))
    p.strokeWeight(Math.max(0.8, X(r * 0.1)))
    p.arc(0, X(cy), X(2 * r * 0.62), X(2 * r * 0.62), Math.PI * 1.1, Math.PI * 1.45)
  }
  p.pop()
}
