import { rgba } from './canvas'
import { DESK, OPEN } from './desk'
import { INK, hash, lampAt, lampColor, lightAt, lit } from './world'

/**
 * What lies on the desk nearer us than the things along the wall: a book left open under the lamp, face up, and a
 * pencil by it. The desk is somebody's, mid-work. The open pages are the warmest thing on the wood, in the front of
 * the lamp's pool.
 *
 * Seen a little from above, as the desk is: the book's far edge narrower than its near one, its pages curving up into
 * the spine, its print a few grey lines on each.
 */

type Ctx = CanvasRenderingContext2D


const COVER = '#3F5E66'
const PAPER = '#E9DCC4'
const PAPER_LIT = '#FFF1D8'

export function openBook(ctx: Ctx, lw: number, t: number): void {
  const lamp = lampAt(t)
  const warm = lampColor(t)
  const { x, half, back, front } = OPEN
  // Narrower at the far edge: the desk's perspective.
  const bh = half * 0.86
  const l = Math.min(1, lightAt(x, 0.2) * lamp * 1.1)
  // Its shadow on the wood, soft, a little toward us.
  ctx.save()
  ctx.translate(x, (back + front) / 2 + 0.03)
  ctx.scale(half * 1.12, (front - back) * 0.62)
  const sg = ctx.createRadialGradient(0, 0, 0.3, 0, 0, 1)
  sg.addColorStop(0, 'rgba(14, 9, 24, 0.35)')
  sg.addColorStop(1, 'rgba(14, 9, 24, 0)')
  ctx.fillStyle = sg
  ctx.fillRect(-1, -1, 2, 2)
  ctx.restore()
  // The cover under the pages, a hair larger.
  ctx.beginPath()
  ctx.moveTo(x - bh - 0.03, back - 0.01)
  ctx.lineTo(x + bh + 0.03, back - 0.01)
  ctx.lineTo(x + half + 0.035, front + 0.02)
  ctx.lineTo(x - half - 0.035, front + 0.02)
  ctx.closePath()
  ctx.fillStyle = lit('#24323A', COVER, 0.3 + 0.7 * l)
  ctx.fill()
  ctx.lineWidth = lw * 0.8
  ctx.strokeStyle = INK
  ctx.stroke()
  // The pages: each a leaf curving up into the spine.
  // Each page its own print: how long each line runs.
  const print = (seed: number, i: number) => (i === 5 ? 0.35 + 0.5 * hash(seed, i, 71) : 0.85 + 0.15 * hash(seed, i, 72))
  const page = (side: -1 | 1, seed: number) => {
    const outerBack = x + side * bh
    const outerFront = x + side * half
    ctx.beginPath()
    ctx.moveTo(x, back + 0.01)
    ctx.quadraticCurveTo(x + side * bh * 0.5, back - 0.035, outerBack, back)
    ctx.lineTo(outerFront, front)
    ctx.quadraticCurveTo(x + side * half * 0.5, front - 0.03, x, front)
    ctx.closePath()
    const g = ctx.createLinearGradient(x, 0, outerFront, 0)
    g.addColorStop(0, lit('#8E8070', PAPER, 0.35 + 0.5 * l))
    g.addColorStop(0.25, lit('#A89A86', PAPER_LIT, 0.3 + 0.7 * l))
    g.addColorStop(1, lit('#9A8C78', PAPER, 0.3 + 0.65 * l))
    ctx.fillStyle = g
    ctx.fill()
    ctx.lineWidth = lw * 0.7
    ctx.strokeStyle = rgba(INK, 0.85)
    ctx.stroke()
    // Its print: a column of short grey lines, further apart toward us.
    ctx.strokeStyle = rgba('#5A4E58', 0.32 + 0.2 * l)
    ctx.lineWidth = 0.008
    ctx.beginPath()
    for (let i = 0; i < 6; i++) {
      const u = (i + 1) / 7.2
      const y = back + 0.02 + (front - back - 0.05) * u ** 1.15
      const w = bh + (half - bh) * u
      const a = x + side * 0.07
      const b = x + side * (w - 0.08)
      const short = print(seed, i)
      ctx.moveTo(a, y)
      ctx.lineTo(a + (b - a) * short, y)
    }
    ctx.stroke()
  }
  page(-1, 0)
  page(1, 1)
  // The lamp's warmth on the open pages, strongest nearest the pool's middle.
  if (l > 0.01) {
    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    ctx.translate(x + 0.25, (back + front) / 2)
    ctx.scale(half * 1.1, (front - back) * 0.8)
    const pg = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
    pg.addColorStop(0, rgba(warm, 0.28 * l))
    pg.addColorStop(1, rgba(warm, 0))
    ctx.fillStyle = pg
    ctx.fillRect(-1, -1, 2, 2)
    ctx.restore()
  }
  // The gutter down the spine.
  ctx.beginPath()
  ctx.moveTo(x, back + 0.012)
  ctx.lineTo(x, front)
  ctx.lineWidth = lw * 0.6
  ctx.strokeStyle = rgba(INK, 0.55)
  ctx.stroke()
  pencil(ctx, lw, t)
}

/** A pencil lying on the wood left of the book, at a slant, its point toward the pages. */
function pencil(ctx: Ctx, lw: number, t: number): void {
  const l = Math.min(1, lightAt(0.5, 0.3) * lampAt(t) * 1.1)
  const p0 = { x: 0.12, y: DESK.y + DESK.top * 0.78 }
  const p1 = { x: 0.74, y: DESK.y + DESK.top * 0.5 }
  const dx = p1.x - p0.x
  const dy = p1.y - p0.y
  const d = Math.hypot(dx, dy)
  ctx.save()
  ctx.translate(p0.x, p0.y)
  ctx.rotate(Math.atan2(dy, dx))
  // Its shadow.
  ctx.fillStyle = 'rgba(14, 9, 24, 0.3)'
  ctx.fillRect(0.01, 0.012, d, 0.03)
  const W = 0.032
  // The body, the ferrule and eraser at its end, and the sharpened wood and lead at the point.
  ctx.beginPath()
  ctx.rect(0.07, -W / 2, d - 0.16, W)
  ctx.fillStyle = lit('#7A5A28', '#E8B54A', 0.3 + 0.7 * l)
  ctx.fill()
  ctx.fillStyle = rgba('#FFF2C8', 0.35 * l)
  ctx.fillRect(0.07, -W / 2, d - 0.16, W * 0.3)
  ctx.fillStyle = lit('#5E6266', '#C8CCD0', 0.3 + 0.7 * l)
  ctx.fillRect(0.035, -W / 2, 0.035, W)
  ctx.fillStyle = lit('#6E3A44', '#E08A90', 0.3 + 0.7 * l)
  ctx.beginPath()
  ctx.moveTo(0.035, -W / 2)
  ctx.lineTo(0.008, -W / 2)
  ctx.quadraticCurveTo(-0.004, 0, 0.008, W / 2)
  ctx.lineTo(0.035, W / 2)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(d - 0.09, -W / 2)
  ctx.lineTo(d, 0)
  ctx.lineTo(d - 0.09, W / 2)
  ctx.closePath()
  ctx.fillStyle = lit('#7A6248', '#EBCB9C', 0.3 + 0.7 * l)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(d - 0.03, -W / 6)
  ctx.lineTo(d, 0)
  ctx.lineTo(d - 0.03, W / 6)
  ctx.fillStyle = '#2E2830'
  ctx.fill()
  // Its outline.
  ctx.beginPath()
  ctx.moveTo(0.008, -W / 2)
  ctx.lineTo(d - 0.09, -W / 2)
  ctx.lineTo(d, 0)
  ctx.lineTo(d - 0.09, W / 2)
  ctx.lineTo(0.008, W / 2)
  ctx.quadraticCurveTo(-0.004, 0, 0.008, -W / 2)
  ctx.lineWidth = lw * 0.6
  ctx.strokeStyle = INK
  ctx.stroke()
  ctx.restore()
}
