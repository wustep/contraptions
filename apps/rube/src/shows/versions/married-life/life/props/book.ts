import type p5 from 'p5'
import { mixHex } from '../../../../../parts'
import { alpha } from '../kit'
import { HOME, INK } from '../worlds'
import { drawFalls, FALLS } from './falls'

/**
 * Ellie's adventure book (canonical; the home builder owns this file and may refine it, keeping the signature and
 * `BOOK`). Her childhood scrapbook: a thick, worn book with a soft leather cover and a strap, no title on it (no
 * words, ever). Carl brings it to her in the yard; it opens on the waltz's return, and the falls stand up out of it,
 * a pop-up.
 *
 * It is seen from the front, lying flat: its fore-edge to us, the leather boards above and below the page block,
 * the strap round it. It opens the way a pop-up theatre does: the top board, hinged at the back, swings up to stand
 * behind the pages, and pasted inside it is her painting of Paradise Falls (`drawFalls`), standing as the board
 * stands; then a cut-paper jungle folds up in front of it. So open or shut it stays a book's width (it sits on
 * Carl's top either way), and the picture faces whoever is watching.
 *
 * `x, y` is the middle of the book's bottom edge, resting on something at y, in cells of the caller's frame.
 */
export const BOOK = {
  /** Its width across the front, and its thickness lying flat. */
  w: 0.7,
  thick: 0.16,
  cover: '#8A5A3C',
  page: '#F6EEDC',
  strap: '#5A3A28',
  /** How tall the board stands when the book is open: the pop-up's backdrop. */
  depth: 0.5,
}

export interface BookState {
  /** 0 shut .. 1 open: the board standing upright behind the pages, the falls on it. */
  open: number
  /** 0 flat .. 1 standing: the cut-paper jungle in front (it stands only once the board is up). */
  flap?: number
  /** Turned about the middle of its bottom edge, radians clockwise (a book tipping off a shelf). */
  tilt?: number
  /** 0 new .. 1 worn. */
  age?: number
  light?: number
}

export function drawBook(p: p5, k: number, weight: number, x: number, y: number, s: BookState): void {
  const { w, thick, depth } = BOOK
  const light = s.light ?? 1
  const age = Math.max(0, Math.min(1, s.age ?? 0))
  const o = Math.max(0, Math.min(1, s.open))
  const flap = Math.max(0, Math.min(1, s.flap ?? 0)) * Math.min(1, o * 1.5)
  const cover = mixHex(BOOK.cover, '#6E5A4E', age * 0.5)
  const page = mixHex(BOOK.page, '#E3D6BC', age * 0.6)
  const board = 0.032
  const K = (v: number) => v * k
  p.push()
  p.translate(K(x), K(y))
  if (s.tilt) p.rotate(s.tilt)
  p.rectMode(p.CORNER)
  const ink = alpha(p, INK, light)

  // The board standing up behind the pages: its inside face is the backdrop, her painting of the falls, seen as
  // the board is seen (foreshortened while it rises). Hinged at the back of the page block's top.
  const hinge = -thick + board
  const rise = Math.sin((o * Math.PI) / 2)
  if (o > 0.01) {
    const h = depth * rise
    // The board's edge above the picture, and the picture pasted inside it.
    p.stroke(ink)
    p.strokeWeight(weight * 0.8)
    p.fill(alpha(p, cover, light))
    p.rect(K(-w / 2), K(hinge - h - board * 0.9 * Math.cos((o * Math.PI) / 2) - 0.012), K(w), K(h + 0.012 + board * 0.9 * Math.cos((o * Math.PI) / 2)), K(0.02))
    if (h > 0.02) drawFalls(p, k, weight * 0.8, -w / 2 + 0.035, hinge - h + 0.02, w - 0.07, h - 0.025, light)
  }

  // The book itself: the bottom board, the page block's fore-edge, the top board (while shut), the strap.
  p.stroke(ink)
  p.strokeWeight(weight * 0.8)
  p.fill(alpha(p, cover, light))
  p.rect(K(-w / 2), K(-board), K(w), K(board), K(0.012))
  p.fill(alpha(p, page, light))
  p.rect(K(-w / 2 + 0.03), K(-thick + board), K(w - 0.05), K(thick - 2 * board))
  // The pages' edges: a few fine lines along the fore-edge.
  p.stroke(alpha(p, mixHex(page, INK, 0.35), light))
  p.strokeWeight(weight * 0.4)
  for (let i = 1; i < 4; i++) {
    const ly = -board - ((thick - 2 * board) * i) / 4
    p.line(K(-w / 2 + 0.05), K(ly), K(w / 2 - 0.04), K(ly))
  }
  p.stroke(ink)
  p.strokeWeight(weight * 0.8)
  if (o <= 0.01) {
    p.fill(alpha(p, cover, light))
    p.rect(K(-w / 2), K(-thick), K(w), K(board), K(0.012))
    // The strap round it, buckled on the front.
    p.fill(alpha(p, BOOK.strap, light))
    p.rect(K(0.1), K(-thick - 0.006), K(0.075), K(thick + 0.012), K(0.01))
    p.fill(alpha(p, mixHex(HOME.brass, INK, 0.2), light))
    p.noStroke()
    p.rect(K(0.115), K(-thick / 2 - 0.02), K(0.045), K(0.04), K(0.006))
  } else {
    // Open: the strap undone, hanging from the bottom board.
    p.fill(alpha(p, BOOK.strap, light))
    p.beginShape()
    p.vertex(K(0.1), K(-board * 0.5))
    p.vertex(K(0.175), K(-board * 0.5))
    p.vertex(K(0.17 + 0.02 * o), K(0.07 * o))
    p.vertex(K(0.105 + 0.02 * o), K(0.075 * o))
    p.endShape(p.CLOSE)
  }

  // The cut-paper jungle folding up in front of the picture: fronds either side, the falls clear between them.
  if (flap > 0.01) {
    const fh = 0.2 * Math.sin((flap * Math.PI) / 2)
    const base = -thick + board
    p.stroke(alpha(p, INK, 0.8 * light))
    p.strokeWeight(weight * 0.6)
    const frond = (cx: number, lean: number, size: number, col: string) => {
      const top = base - fh * size
      p.fill(alpha(p, col, light))
      p.beginShape()
      p.vertex(K(cx - 0.07 * size), K(base))
      p.bezierVertex(K(cx - 0.09 * size), K(base - fh * size * 0.5), K(cx + lean - 0.06), K(top + 0.02), K(cx + lean), K(top))
      p.bezierVertex(K(cx + lean + 0.03), K(top + 0.05), K(cx + 0.09 * size), K(base - fh * size * 0.45), K(cx + 0.07 * size), K(base))
      p.endShape(p.CLOSE)
    }
    frond(-w / 2 + 0.07, -0.03, 1.05, FALLS.jungle)
    frond(-w / 2 + 0.16, 0.04, 0.8, mixHex(FALLS.jungle, FALLS.jungleFar, 0.5))
    frond(w / 2 - 0.16, -0.04, 0.85, mixHex(FALLS.jungle, FALLS.jungleFar, 0.5))
    frond(w / 2 - 0.07, 0.03, 1.1, FALLS.jungle)
  }
  p.pop()
}
