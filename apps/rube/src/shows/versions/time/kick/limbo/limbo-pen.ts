import type p5 from 'p5'
import type { Pt } from '../../../../../parts'
import { rgba } from '../cast'

/**
 * Limbo's drawing hand (the LIMBO builder's): flat fills and one ink for what was built, soft gradients only for light,
 * water, spray and air. Everything takes cells and draws in pixels (`k` a cell) in the frame the stage has set.
 */
export interface Pen {
  p: p5
  k: number
  ink: string
  /** The stage's line weight at this zoom. */
  w: number
}

export const ctxOf = (p: p5): CanvasRenderingContext2D => p.drawingContext as CanvasRenderingContext2D

/** A closed shape, filled, and inked with `lw` of the stage's weight (0: no ink). */
export function shape(pen: Pen, pts: Pt[], fill: string | null, lw = 0.8, ink = pen.ink): void {
  const { p, k } = pen
  if (fill) p.fill(fill)
  else p.noFill()
  if (lw > 0) {
    p.stroke(ink)
    p.strokeWeight(pen.w * lw)
    p.strokeJoin(p.ROUND)
  } else p.noStroke()
  p.beginShape()
  for (const [x, y] of pts) p.vertex(x * k, y * k)
  p.endShape(p.CLOSE)
}

/** A box by its corners. */
export const box = (pen: Pen, x0: number, y0: number, x1: number, y1: number, fill: string | null, lw = 0.8, ink = pen.ink): void =>
  shape(pen, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], fill, lw, ink)

/** A stroke from a to b. */
export function line(pen: Pen, a: Pt, b: Pt, col: string, lw = 0.8): void {
  const { p, k } = pen
  p.stroke(col)
  p.strokeWeight(pen.w * lw)
  p.line(a[0] * k, a[1] * k, b[0] * k, b[1] * k)
}

/** A stroke through points, open. */
export function polyline(pen: Pen, pts: Pt[], col: string, lw = 0.8): void {
  const { p, k } = pen
  p.noFill()
  p.stroke(col)
  p.strokeWeight(pen.w * lw)
  p.beginShape()
  for (const [x, y] of pts) p.vertex(x * k, y * k)
  p.endShape()
}

/** A disc (a wheel, a hub), filled and inked. */
export function disc(pen: Pen, c: Pt, r: number, fill: string | null, lw = 0.8, ink = pen.ink): void {
  const { p, k } = pen
  if (fill) p.fill(fill)
  else p.noFill()
  if (lw > 0) {
    p.stroke(ink)
    p.strokeWeight(pen.w * lw)
  } else p.noStroke()
  p.circle(c[0] * k, c[1] * k, 2 * r * k)
}

/** A vertical wash between two heights: light, water or air. Never inked. Stops are [fraction, colour, alpha]. */
export function vwash(pen: Pen, x0: number, x1: number, y0: number, y1: number, stops: [number, string, number][]): void {
  if (y1 <= y0 || x1 <= x0) return
  const ctx = ctxOf(pen.p)
  const { k } = pen
  const g = ctx.createLinearGradient(0, y0 * k, 0, y1 * k)
  for (const [f, col, a] of stops) g.addColorStop(Math.max(0, Math.min(1, f)), rgba(col, a))
  ctx.save()
  ctx.fillStyle = g
  ctx.fillRect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k)
  ctx.restore()
}

/** A soft round volume (spray, mist, a glow): an ellipse fading from its middle to nothing. Never inked. */
export function soft(pen: Pen, x: number, y: number, rx: number, ry: number, color: string, a: number): void {
  if (a <= 0.003 || rx <= 0.001 || ry <= 0.001) return
  const ctx = ctxOf(pen.p)
  const { k } = pen
  ctx.save()
  ctx.translate(x * k, y * k)
  ctx.scale(rx / ry, 1)
  const R = ry * k
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R)
  g.addColorStop(0, rgba(color, a))
  g.addColorStop(0.45, rgba(color, a * 0.62))
  g.addColorStop(1, rgba(color, 0))
  ctx.fillStyle = g
  ctx.fillRect(-R, -R, 2 * R, 2 * R)
  ctx.restore()
}

/** A filled region under a gradient: a path of points, filled with a vertical gradient between y0 and y1. Never inked. */
export function gradFill(pen: Pen, pts: Pt[], y0: number, y1: number, stops: [number, string, number][]): void {
  if (pts.length < 3) return
  const ctx = ctxOf(pen.p)
  const { k } = pen
  const g = ctx.createLinearGradient(0, y0 * k, 0, y1 * k)
  for (const [f, col, a] of stops) g.addColorStop(Math.max(0, Math.min(1, f)), rgba(col, a))
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(pts[0][0] * k, pts[0][1] * k)
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0] * k, pts[i][1] * k)
  ctx.closePath()
  ctx.fillStyle = g
  ctx.fill()
  ctx.restore()
}

/** A region filled with a horizontal gradient between x0 and x1. Never inked. */
export function hgradFill(pen: Pen, pts: Pt[], x0: number, x1: number, stops: [number, string, number][]): void {
  if (pts.length < 3) return
  const ctx = ctxOf(pen.p)
  const { k } = pen
  const g = ctx.createLinearGradient(x0 * k, 0, x1 * k, 0)
  for (const [f, col, a] of stops) g.addColorStop(Math.max(0, Math.min(1, f)), rgba(col, a))
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(pts[0][0] * k, pts[0][1] * k)
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0] * k, pts[i][1] * k)
  ctx.closePath()
  ctx.fillStyle = g
  ctx.fill()
  ctx.restore()
}

/** A flat fill of a path in a colour and alpha, never inked (for shade, water's body, a shadow). */
export function wash(pen: Pen, pts: Pt[], color: string, a: number): void {
  if (pts.length < 3 || a <= 0.003) return
  const ctx = ctxOf(pen.p)
  const { k } = pen
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(pts[0][0] * k, pts[0][1] * k)
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0] * k, pts[i][1] * k)
  ctx.closePath()
  ctx.fillStyle = rgba(color, a)
  ctx.fill()
  ctx.restore()
}

/** Run `fn` with the canvas clipped to a box (cells). */
export function clipped(pen: Pen, x0: number, y0: number, x1: number, y1: number, fn: () => void): void {
  const ctx = ctxOf(pen.p)
  const { k } = pen
  ctx.save()
  ctx.beginPath()
  ctx.rect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k)
  ctx.clip()
  pen.p.push()
  fn()
  pen.p.pop()
  ctx.restore()
}

/** Run `fn` with the canvas's global alpha scaled by `a` (for what fades as a whole: the tower's front). */
export function faded(pen: Pen, a: number, fn: () => void): void {
  if (a <= 0.003) return
  const ctx = ctxOf(pen.p)
  ctx.save()
  ctx.globalAlpha *= Math.min(1, a)
  pen.p.push()
  fn()
  pen.p.pop()
  ctx.restore()
}
