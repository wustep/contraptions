import type p5 from 'p5'
import { mixHex } from '../../../../../parts'
import { alpha } from '../kit'
import { INK } from '../worlds'

/**
 * Their two armchairs, side by side (canonical; the house builder owns this file). The film's own shape language:
 * Carl's is square, a club chair that is all box, with flat square arms and a tall straight back; Ellie's is round,
 * a tub back that curves over rolled arms, and a plump cushion. They come on the day the house is fixed up, are sat
 * in for fifty years, and at the end one of them is empty.
 *
 * Seen from the side of the room (the doll's house) or through the front window: each is drawn facing the viewer,
 * its middle at `x` and the floor at `y` (cells of the caller's frame; a ball resting on that floor has
 * its centre at y - 0.13). Someone sitting in it has their centre at (x, y + CHAIR.sit), between its arms.
 */
export const CHAIR = {
  /** Width across the arms, in cells. */
  w: 0.8,
  /** Seat top above the floor. */
  seat: 0.52,
  /** Back top above the floor. */
  back: 1.35,
  /** A ball or Carl sitting in it: centre offset from the floor point (y down). */
  sit: -0.52 - 0.13,
  /** Where the two stand, centre to centre, when side by side: Carl's on the left. The cut to the hill keeps them this far apart. */
  apart: 0.92,
}

export const CHAIR_COLOR = {
  /** Carl's: a deep plum-brown upholstery, square. */
  carl: '#7D4E4A',
  /** Ellie's: a soft rose, round. */
  ellie: '#D98C8A',
  wood: '#6B4A36',
}

const NIGHT = '#27304A'

/**
 * One chair. `age` 0..1 fades the cloth a little; `light` fades it all (for coming out of the dark); `shade` 0..1
 * darkens it toward the night (a room at dusk with the lamp off).
 */
export function drawChair(p: p5, k: number, weight: number, who: 'carl' | 'ellie', x: number, y: number, age = 0, light = 1, shade = 0): void {
  const night = (h: string) => mixHex(h, NIGHT, shade)
  const base = mixHex(CHAIR_COLOR[who], who === 'carl' ? '#7A6260' : '#C8A3A0', age * 0.6)
  const cloth = night(base)
  const deep = night(mixHex(base, INK, 0.22))
  const lift = mixHex(cloth, '#FFFFFF', 0.12)
  const wood = night(CHAIR_COLOR.wood)
  const ink = night(INK)
  const { w, seat, back } = CHAIR
  const K = (v: number) => v * k
  p.push()
  p.translate(K(x), K(y))
  p.rectMode(p.CORNER)
  p.stroke(alpha(p, ink, light))
  p.strokeWeight(weight * 0.8)
  if (who === 'carl') {
    // Square legs, a box of a body, a tall straight back, two flat arms, a thick cushion.
    p.fill(alpha(p, wood, light))
    for (const lx of [-w / 2 + 0.05, w / 2 - 0.12]) p.rect(K(lx), K(-0.1), K(0.07), K(0.1))
    p.fill(alpha(p, deep, light))
    p.rect(K(-w / 2 + 0.11), K(-back), K(w - 0.22), K(back - 0.3), K(0.05), K(0.05), 0, 0)
    // A seam across the back where its cushion meets the frame.
    p.stroke(alpha(p, ink, 0.3 * light))
    p.strokeWeight(weight * 0.45)
    p.line(K(-w / 2 + 0.2), K(-back + 0.14), K(w / 2 - 0.2), K(-back + 0.14))
    p.stroke(alpha(p, ink, light))
    p.strokeWeight(weight * 0.8)
    p.fill(alpha(p, deep, light))
    p.rect(K(-w / 2 + 0.02), K(-0.36), K(w - 0.04), K(0.26), K(0.02))
    p.fill(alpha(p, cloth, light))
    p.rect(K(-w / 2 + 0.17), K(-seat), K(w - 0.34), K(seat - 0.3), K(0.04), K(0.04), K(0.02), K(0.02))
    for (const side of [-1, 1]) {
      const ax = side < 0 ? -w / 2 : w / 2 - 0.19
      p.fill(alpha(p, cloth, light))
      p.rect(K(ax), K(-(seat + 0.26)), K(0.19), K(seat + 0.26 - 0.1), K(0.04), K(0.04), K(0.01), K(0.01))
      p.noStroke()
      p.fill(alpha(p, lift, light))
      p.rect(K(ax + 0.03), K(-(seat + 0.23)), K(0.13), K(0.06), K(0.02))
      p.stroke(alpha(p, ink, light))
    }
  } else {
    // Turned legs, a round tub back over rolled arms, a plump cushion.
    p.fill(alpha(p, wood, light))
    for (const side of [-1, 1]) {
      const lx = side * (w / 2 - 0.1)
      p.quad(K(lx - 0.045), K(-0.12), K(lx + 0.045), K(-0.12), K(lx + 0.02), K(0), K(lx - 0.02), K(0))
    }
    p.fill(alpha(p, deep, light))
    p.beginShape()
    p.vertex(K(-w / 2 + 0.08), K(-0.3))
    p.vertex(K(-w / 2 + 0.06), K(-seat - 0.1))
    p.bezierVertex(K(-w / 2 + 0.02), K(-back - 0.12), K(w / 2 - 0.02), K(-back - 0.12), K(w / 2 - 0.06), K(-seat - 0.1))
    p.vertex(K(w / 2 - 0.08), K(-0.3))
    p.endShape(p.CLOSE)
    // A soft seam following the back's curve.
    p.noFill()
    p.stroke(alpha(p, ink, 0.28 * light))
    p.strokeWeight(weight * 0.45)
    p.beginShape()
    p.vertex(K(-w / 2 + 0.18), K(-seat - 0.12))
    p.bezierVertex(K(-w / 2 + 0.16), K(-back + 0.02), K(w / 2 - 0.16), K(-back + 0.02), K(w / 2 - 0.18), K(-seat - 0.12))
    p.endShape()
    p.stroke(alpha(p, ink, light))
    p.strokeWeight(weight * 0.8)
    p.fill(alpha(p, deep, light))
    p.rect(K(-w / 2 + 0.05), K(-0.36), K(w - 0.1), K(0.24), K(0.08))
    p.fill(alpha(p, cloth, light))
    p.rect(K(-w / 2 + 0.15), K(-seat), K(w - 0.3), K(seat - 0.3), K(0.09), K(0.09), K(0.04), K(0.04))
    for (const side of [-1, 1]) {
      const ax = side * (w / 2 - 0.11)
      p.fill(alpha(p, cloth, light))
      p.beginShape()
      p.vertex(K(ax - 0.11), K(-0.12))
      p.vertex(K(ax - 0.11), K(-(seat + 0.12)))
      p.bezierVertex(K(ax - 0.12), K(-(seat + 0.3)), K(ax + 0.12), K(-(seat + 0.3)), K(ax + 0.11), K(-(seat + 0.12)))
      p.vertex(K(ax + 0.11), K(-0.12))
      p.endShape(p.CLOSE)
      // The roll's curl: a small arc on its front.
      p.noFill()
      p.stroke(alpha(p, ink, 0.35 * light))
      p.strokeWeight(weight * 0.45)
      p.arc(K(ax), K(-(seat + 0.13)), K(0.12), K(0.1), Math.PI * 0.9, Math.PI * 2.1)
      p.stroke(alpha(p, ink, light))
      p.strokeWeight(weight * 0.8)
    }
  }
  p.pop()
}

/** The pair, side by side: Carl's on the left, Ellie's on the right, `CHAIR.apart` between their middles. */
export function drawChairs(p: p5, k: number, weight: number, x: number, y: number, age = 0, light = 1, shade = 0): void {
  drawChair(p, k, weight, 'carl', x - CHAIR.apart / 2, y, age, light, shade)
  drawChair(p, k, weight, 'ellie', x + CHAIR.apart / 2, y, age, light, shade)
}
