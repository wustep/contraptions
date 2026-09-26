import type p5 from 'p5'
import { alpha } from '../kit'
import { INK } from '../worlds'
import { drawFalls } from './falls'

/**
 * Ellie's adventure book (canonical; the home builder owns this file and may refine it, keeping the signature and
 * `BOOK`). Her childhood scrapbook: a thick, worn book with a soft leather cover and a strap, no title on it (no
 * words, ever: the cover carries a small pasted picture instead). Carl brings it to her in the yard; it opens on
 * the waltz's return, and the falls stand up out of it, a pop-up.
 *
 * `x, y` is the middle of the book's bottom edge, resting on something at y, in cells of the caller's frame.
 */
export const BOOK = {
  /** Closed: its width and thickness lying flat. */
  w: 0.7,
  thick: 0.16,
  cover: '#8A5A3C',
  page: '#F6EEDC',
  strap: '#5A3A28',
}

export interface BookState {
  /** 0 shut .. 1 open flat, its pop-up standing. */
  open: number
  /** 0 new .. 1 worn. */
  age?: number
  light?: number
}

export function drawBook(p: p5, k: number, weight: number, x: number, y: number, s: BookState): void {
  const { w, thick } = BOOK
  const light = s.light ?? 1
  const o = Math.max(0, Math.min(1, s.open))
  p.push()
  p.translate(x * k, y * k)
  p.rectMode(p.CORNER)
  p.stroke(alpha(p, INK, light))
  p.strokeWeight(weight * 0.8)
  if (o < 0.02) {
    // Shut, lying flat: the cover, the pages' edge, the strap round it.
    p.fill(alpha(p, BOOK.cover, light))
    p.rect((-w / 2) * k, -thick * k, w * k, thick * k, 0.03 * k)
    p.fill(alpha(p, BOOK.page, light))
    p.noStroke()
    p.rect((-w / 2 + 0.05) * k, (-thick + 0.035) * k, (w - 0.08) * k, (thick - 0.07) * k)
    p.fill(alpha(p, BOOK.strap, light))
    p.rect(0.1 * k, (-thick - 0.005) * k, 0.07 * k, (thick + 0.01) * k)
  } else {
    // Opening: the front cover swings over from the right to lie flat on the left; the pages under it.
    const a = o * Math.PI
    p.fill(alpha(p, BOOK.page, light))
    p.rect(0, -0.06 * k, (w / 2) * k, 0.06 * k)
    p.fill(alpha(p, BOOK.cover, light))
    p.rect(0, -0.02 * k, (w / 2 + 0.02) * k, 0.03 * k)
    // The cover, turning about the spine at x = 0.
    const cx = Math.cos(a) * (w / 2)
    const cy = -Math.sin(a) * (w / 2)
    p.strokeWeight(weight * 1.1)
    p.line(0, -0.06 * k, cx * k, (cy - 0.06) * k)
    if (o > 0.6) {
      p.noStroke()
      p.fill(alpha(p, BOOK.page, light))
      p.rect((-w / 2) * k, -0.06 * k, (w / 2) * k, 0.06 * k)
    }
    // The pop-up: the falls stand up out of the gutter as the book lies open.
    const up = Math.max(0, (o - 0.55) / 0.45)
    if (up > 0.01) {
      const ph = 0.55 * up
      drawFalls(p, k, weight, -w * 0.42, -0.06 - ph, w * 0.84, ph, light)
    }
  }
  p.pop()
}
