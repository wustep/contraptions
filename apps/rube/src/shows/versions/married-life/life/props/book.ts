import type p5 from 'p5'
import { mixHex } from '../../../../../parts'
import { alpha } from '../kit'
import { HOME, INK } from '../worlds'
import { FALLS } from './falls'

/**
 * Ellie's adventure book (canonical; the director's since the first director pass, from the home builder's). Her
 * childhood scrapbook: a thick, worn book with soft leather boards, a rounded spine and a strap, no title on it (no
 * words, ever). Carl brings it to her in the yard; it opens on the waltz's return, and Paradise Falls stands up out of
 * it, a pop-up.
 *
 * Shut, it lies flat and is seen from its head: the two boards, the page block between them with its fine edges, the
 * rounded spine at its left end, the strap round it. It opens as a book does: the top board and its half of the
 * pages swing up and over on the spine and come down flat on the other side, the whole book easing across as it
 * goes so that the gutter ends where the middle of the shut book was; the pages curl up at the gutter. Then the
 * falls rise out of the gutter, a cut-paper cliff with its falls and their house on top (no sky: it is paper, not a
 * picture), and cut-paper jungle folds up either side.
 *
 * `x, y` is the middle of the shut book's bottom edge, resting on something at y, in cells of the caller's frame.
 */
export const BOOK = {
  /** Its width across (shut; open, twice this), and its thickness lying shut. */
  w: 0.8,
  thick: 0.24,
  cover: '#8A5A3C',
  page: '#F6EEDC',
  strap: '#5A3A28',
  /** How tall the pop-up stands out of the gutter, open. */
  depth: 0.5,
}

export interface BookState {
  /** 0 shut .. 1 open flat. */
  open: number
  /** 0 flat .. 1 standing: the falls out of the gutter (by default it follows `open` once the book is nearly flat). */
  pop?: number
  /** 0 flat .. 1 standing: the cut-paper jungle either side (it stands only once the falls are up). */
  flap?: number
  /** Turned about the middle of its bottom edge, radians clockwise (a book tipping off a shelf). */
  tilt?: number
  /** 0 new .. 1 worn. */
  age?: number
  light?: number
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const inout = (u: number) => { const v = clamp01(u); return v * v * (3 - 2 * v) }

export function drawBook(p: p5, k: number, weight: number, x: number, y: number, s: BookState): void {
  const { w, thick, depth } = BOOK
  const light = s.light ?? 1
  const age = clamp01(s.age ?? 0)
  const o = clamp01(s.open)
  const pop = clamp01(s.pop ?? (o - 0.7) / 0.3)
  const flap = clamp01(s.flap ?? 0) * pop
  const cover = alpha(p, mixHex(BOOK.cover, '#6E5A4E', age * 0.5), light)
  const coverDark = alpha(p, mixHex(mixHex(BOOK.cover, INK, 0.3), '#5E4E44', age * 0.5), light)
  const page = alpha(p, mixHex(BOOK.page, '#E3D6BC', age * 0.6), light)
  const pageLine = alpha(p, mixHex(mixHex(BOOK.page, INK, 0.3), '#E3D6BC', age * 0.3), light)
  const ink = alpha(p, INK, light)
  const board = 0.034
  const half = thick / 2
  const K = (v: number) => v * k
  // The top half swings over on the spine; the whole book eases across so the gutter ends at the middle.
  const turn = Math.PI * inout(o)
  const shift = (w / 2) * inout(o)
  // How much the pages curl up at the gutter: only once it is open.
  const curl = inout((o - 0.5) / 0.5)

  p.push()
  p.translate(K(x + shift), K(y))
  if (s.tilt) p.rotate(s.tilt)
  p.rectMode(p.CORNER)
  p.strokeJoin(p.ROUND)

  /** One half, in its own frame: the board along y = 0 .. -board, the pages above it, the gutter at x = -w/2. */
  const halfBook = (outerStrap: boolean) => {
    p.stroke(ink)
    p.strokeWeight(weight * 0.8)
    // The pages: their top edge rises off the gutter in a curl and runs out flat to the fore-edge.
    const top = -half
    const low = -board - (half - board) * (1 - 0.8 * curl)
    const hump = top - 0.075 * curl
    p.fill(page)
    p.beginShape()
    p.vertex(K(-w / 2 + 0.02), K(-board))
    p.vertex(K(-w / 2 + 0.02), K(low))
    p.bezierVertex(K(-w / 2 + 0.03), K(low - 0.1 * curl), K(-w / 2 + 0.08), K(hump), K(-w / 2 + 0.2), K(hump))
    p.bezierVertex(K(-w / 2 + 0.36), K(hump), K(w / 2 - 0.2), K(top + 0.01 * curl), K(w / 2 - 0.03), K(top + 0.025 * curl))
    p.vertex(K(w / 2 - 0.03), K(-board))
    p.endShape(p.CLOSE)
    // The top leaf's edge, a fine line along the curl, so the pages read as pages.
    if (curl > 0.05) {
      p.noFill()
      p.stroke(pageLine)
      p.strokeWeight(weight * 0.45)
      p.beginShape()
      p.vertex(K(-w / 2 + 0.05), K(low - 0.02 * curl))
      p.bezierVertex(K(-w / 2 + 0.07), K(low - 0.1 * curl), K(-w / 2 + 0.11), K(hump + 0.04), K(-w / 2 + 0.22), K(hump + 0.035))
      p.bezierVertex(K(-w / 2 + 0.36), K(hump + 0.035), K(w / 2 - 0.2), K(top + 0.04), K(w / 2 - 0.05), K(top + 0.05))
      p.endShape()
    }
    // The pages' edges: fine lines along the fore-edge, and where they curl.
    p.stroke(pageLine)
    p.strokeWeight(weight * 0.4)
    for (let i = 1; i < 4; i++) {
      const ly = -board - ((half - board) * i) / 4
      p.line(K(-w / 2 + 0.2), K(ly), K(w / 2 - 0.05), K(ly))
    }
    // The board, a little proud of the pages at the fore-edge.
    p.stroke(ink)
    p.strokeWeight(weight * 0.8)
    p.fill(cover)
    p.rect(K(-w / 2), K(-board), K(w + 0.01), K(board), K(0.012))
    if (outerStrap) {
      p.fill(alpha(p, BOOK.strap, light))
      p.rect(K(w / 2 - 0.2), K(-board - 0.004), K(0.075), K(board + 0.01), K(0.01))
    }
  }

  // The bottom half, where it lies.
  halfBook(false)
  // The top half: over on the spine (the spine's axis is the book's left end, halfway up).
  p.push()
  p.translate(K(-w / 2), K(-half))
  p.rotate(-turn)
  p.scale(1, -1)
  p.translate(K(w / 2), K(half))
  halfBook(o < 0.5)
  p.pop()
  // The spine: a rounded leather cap on the left end while it is shut, turning under the gutter as it opens.
  p.stroke(ink)
  p.strokeWeight(weight * 0.8)
  p.fill(coverDark)
  const sw = 0.07 * (1 - inout(o * 1.4))
  if (sw > 0.004) {
    p.beginShape()
    p.vertex(K(-w / 2 + 0.01), K(0))
    p.bezierVertex(K(-w / 2 - sw), K(-0.01), K(-w / 2 - sw), K(-thick + 0.01), K(-w / 2 + 0.01), K(-thick))
    p.endShape()
    // Two raised bands across it.
    p.strokeWeight(weight * 0.5)
    for (const f of [0.33, 0.67]) p.line(K(-w / 2 - sw * 0.75), K(-thick * f), K(-w / 2 + 0.01), K(-thick * f))
  }
  // Shut, the strap round it, buckled on the front; open, it hangs from the bottom board.
  if (o <= 0.02) {
    p.strokeWeight(weight * 0.8)
    p.fill(alpha(p, BOOK.strap, light))
    p.rect(K(0.12), K(-thick - 0.006), K(0.08), K(thick + 0.012), K(0.01))
    p.noStroke()
    p.fill(alpha(p, mixHex(HOME.brass, INK, 0.2), light))
    p.rect(K(0.137), K(-half - 0.022), K(0.046), K(0.044), K(0.006))
  } else {
    p.strokeWeight(weight * 0.8)
    p.fill(alpha(p, BOOK.strap, light))
    p.beginShape()
    p.vertex(K(w / 2 - 0.2), K(-0.01))
    p.vertex(K(w / 2 - 0.125), K(-0.01))
    p.vertex(K(w / 2 - 0.12 + 0.02 * o), K(0.08 * o))
    p.vertex(K(w / 2 - 0.19 + 0.02 * o), K(0.085 * o))
    p.endShape(p.CLOSE)
  }

  // The pop-up out of the gutter (the gutter is at x = -w/2 here): the falls, then the jungle either side.
  if (pop > 0.01) popFalls(p, k, weight, -w / 2, -half + 0.01, depth, pop, light)
  if (flap > 0.01) {
    const fh = 0.24 * Math.sin((flap * Math.PI) / 2)
    const base = -half + 0.01
    p.stroke(alpha(p, INK, 0.85 * light))
    p.strokeWeight(weight * 0.6)
    const frond = (cx: number, lean: number, size: number, col: string) => {
      const tip = base - fh * size
      p.fill(alpha(p, col, light))
      p.beginShape()
      p.vertex(K(cx - 0.08 * size), K(base))
      p.bezierVertex(K(cx - 0.1 * size), K(base - fh * size * 0.5), K(cx + lean - 0.07), K(tip + 0.02), K(cx + lean), K(tip))
      p.bezierVertex(K(cx + lean + 0.03), K(tip + 0.06), K(cx + 0.1 * size), K(base - fh * size * 0.45), K(cx + 0.08 * size), K(base))
      p.endShape(p.CLOSE)
    }
    const g = -w / 2
    frond(g - 0.42, -0.05, 1.0, FALLS.jungle)
    frond(g - 0.28, 0.04, 0.78, mixHex(FALLS.jungle, FALLS.jungleFar, 0.5))
    frond(g + 0.28, -0.04, 0.82, mixHex(FALLS.jungle, FALLS.jungleFar, 0.5))
    frond(g + 0.42, 0.05, 1.05, FALLS.jungle)
  }
  p.pop()
}

/**
 * The falls as cut paper, standing up out of the gutter at (gx, base): a flat-topped cliff with its falls pouring off
 * the lip, mist at its foot, and their house on top. It rises as a pop-up does, from lying flat to standing (seen
 * foreshortened while it rises), with a small paper overshoot at the top of its rise.
 */
function popFalls(p: p5, k: number, weight: number, gx: number, base: number, h: number, rise: number, light: number): void {
  const K = (v: number) => v * k
  const stand = Math.sin((Math.PI / 2) * Math.min(1, rise * 1.08)) * (rise > 0.93 ? 1 + 0.03 * Math.sin((rise - 0.93) * 45) : 1)
  const H = h * stand
  const W = 0.78
  const X = (u: number) => K(gx + (u - 0.5) * W)
  const Y = (v: number) => K(base - H * (1 - v))
  p.push()
  p.stroke(alpha(p, INK, 0.9 * light))
  p.strokeWeight(weight * 0.7)
  p.strokeJoin(p.ROUND)
  // The cliff: a tepui, a wide flat-topped mesa, its sides steep and a little ragged.
  p.fill(alpha(p, FALLS.cliff, light))
  p.beginShape()
  p.vertex(X(0.04), Y(1))
  p.vertex(X(0.1), Y(0.62))
  p.vertex(X(0.13), Y(0.4))
  p.vertex(X(0.17), Y(0.26))
  p.vertex(X(0.84), Y(0.24))
  p.vertex(X(0.88), Y(0.42))
  p.vertex(X(0.92), Y(0.66))
  p.vertex(X(0.97), Y(1))
  p.endShape(p.CLOSE)
  p.noStroke()
  p.fill(alpha(p, FALLS.cliffShade, light))
  p.beginShape()
  p.vertex(X(0.74), Y(0.245))
  p.vertex(X(0.84), Y(0.24))
  p.vertex(X(0.88), Y(0.42))
  p.vertex(X(0.92), Y(0.66))
  p.vertex(X(0.95), Y(0.98))
  p.vertex(X(0.78), Y(0.98))
  p.endShape(p.CLOSE)
  // The falls: a pale ribbon off the lip, widening to the jungle.
  p.stroke(alpha(p, INK, 0.6 * light))
  p.strokeWeight(weight * 0.5)
  p.fill(alpha(p, FALLS.water, light))
  p.beginShape()
  p.vertex(X(0.4), Y(0.25))
  p.vertex(X(0.49), Y(0.25))
  p.vertex(X(0.55), Y(0.86))
  p.vertex(X(0.35), Y(0.86))
  p.endShape(p.CLOSE)
  // The jungle at its foot, over the falls' mist: a cut-paper band of treetops.
  p.stroke(alpha(p, INK, 0.8 * light))
  p.fill(alpha(p, FALLS.jungleFar, light))
  p.beginShape()
  p.vertex(X(0.0), Y(1))
  for (let i = 0; i <= 10; i++) {
    const u = i / 10
    p.vertex(X(u), Y(0.83 - 0.05 * Math.abs(Math.sin(i * 1.9 + 0.4))))
  }
  p.vertex(X(1.0), Y(1))
  p.endShape(p.CLOSE)
  // Their house on the top: a gable and a chimney, big enough to be a house.
  p.stroke(alpha(p, INK, 0.85 * light))
  p.fill(alpha(p, HOME.siding, light))
  p.rect(X(0.6), Y(0.125), K(W * 0.11), K(H * 0.125), K(0.004))
  p.fill(alpha(p, HOME.roof, light))
  p.triangle(X(0.58), Y(0.13), X(0.73), Y(0.13), X(0.655), Y(0.03))
  p.pop()
}
