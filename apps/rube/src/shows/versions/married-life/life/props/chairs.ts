import type p5 from 'p5'
import { mixHex } from '../../../../../parts'
import { alpha } from '../kit'
import { HOME, INK } from '../worlds'

/**
 * Their two armchairs, side by side (canonical; the house builder owns this file and may refine it, keeping the
 * signature and the geometry in `CHAIR`). The film's own shape language: Carl's is square, a box with square arms;
 * Ellie's is round, a curved back and rolled arms. They are bought when the house is fixed up, sat in for fifty
 * years, and at the end one of them is empty.
 *
 * Seen from the side of the room (the doll's house) or through the front window: each is drawn facing the viewer,
 * its seat's front edge at `x` and the floor at `y` (cells of the caller's frame; a ball resting on that floor has
 * its centre at y - 0.13). Someone sitting in it has their centre at (x, y + CHAIR.sit).
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

/** One chair. `age` 0..1 fades the cloth a little; `light` fades it all (for dusk, or out of the dark). */
export function drawChair(p: p5, k: number, weight: number, who: 'carl' | 'ellie', x: number, y: number, age = 0, light = 1): void {
  const cloth = mixHex(CHAIR_COLOR[who], who === 'carl' ? '#7A6260' : '#C8A3A0', age * 0.6)
  const shade = mixHex(cloth, INK, 0.25)
  const { w, seat, back } = CHAIR
  const floor = y
  p.push()
  p.translate(x * k, floor * k)
  p.stroke(alpha(p, INK, light))
  p.strokeWeight(weight * 0.85)
  // Legs: short and dark.
  p.fill(alpha(p, CHAIR_COLOR.wood, light))
  p.rectMode(p.CORNER)
  for (const lx of [-w / 2 + 0.06, w / 2 - 0.14]) p.rect(lx * k, -0.1 * k, 0.08 * k, 0.1 * k)
  if (who === 'carl') {
    // A box: square back, square arms, a flat seat cushion.
    p.fill(alpha(p, shade, light))
    p.rect((-w / 2 + 0.08) * k, -back * k, (w - 0.16) * k, (back - seat) * k, 0.04 * k)
    p.fill(alpha(p, cloth, light))
    p.rect((-w / 2) * k, -(seat + 0.3) * k, 0.2 * k, (seat + 0.3 - 0.1) * k, 0.03 * k)
    p.rect((w / 2 - 0.2) * k, -(seat + 0.3) * k, 0.2 * k, (seat + 0.3 - 0.1) * k, 0.03 * k)
    p.rect((-w / 2 + 0.2) * k, -seat * k, (w - 0.4) * k, (seat - 0.1) * k, 0.02 * k)
  } else {
    // Round: a curved back rising over rolled arms, a soft seat.
    p.fill(alpha(p, shade, light))
    p.beginShape()
    p.vertex((-w / 2 + 0.1) * k, -(seat + 0.05) * k)
    p.bezierVertex((-w / 2 + 0.02) * k, -(back + 0.1) * k, (w / 2 - 0.02) * k, -(back + 0.1) * k, (w / 2 - 0.1) * k, -(seat + 0.05) * k)
    p.endShape(p.CLOSE)
    p.fill(alpha(p, cloth, light))
    p.rect((-w / 2 + 0.16) * k, -seat * k, (w - 0.32) * k, (seat - 0.1) * k, 0.08 * k)
    for (const side of [-1, 1]) {
      const ax = side * (w / 2 - 0.12)
      p.beginShape()
      p.vertex((ax - 0.12) * k, -0.1 * k)
      p.vertex((ax - 0.12) * k, -(seat + 0.18) * k)
      p.bezierVertex((ax - 0.12) * k, -(seat + 0.34) * k, (ax + 0.12) * k, -(seat + 0.34) * k, (ax + 0.12) * k, -(seat + 0.18) * k)
      p.vertex((ax + 0.12) * k, -0.1 * k)
      p.endShape(p.CLOSE)
    }
  }
  p.pop()
}

/** The pair, side by side: Carl's on the left, Ellie's on the right, `CHAIR.apart` between their middles. */
export function drawChairs(p: p5, k: number, weight: number, x: number, y: number, age = 0, light = 1): void {
  drawChair(p, k, weight, 'carl', x - CHAIR.apart / 2, y, age, light)
  drawChair(p, k, weight, 'ellie', x + CHAIR.apart / 2, y, age, light)
}

void HOME
