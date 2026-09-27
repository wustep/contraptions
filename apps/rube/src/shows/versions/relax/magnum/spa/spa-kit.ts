import type p5 from 'p5'
import type { Pt } from '../../../../../parts'
import { rgba } from '../cast'

/**
 * The spa's drawing hand: flat fills and one ink for what is made, soft gradients only for light, water and steam.
 * Everything takes cells and draws in pixels (`k` a cell), in the frame the stage has translated to.
 */
export interface Pen {
  p: p5
  k: number
  ink: string
  /** The stage's line weight for this zoom. */
  w: number
}

export const ctxOf = (p: p5): CanvasRenderingContext2D => p.drawingContext as CanvasRenderingContext2D

/** A closed shape: filled, and inked (`lw` of the stage's weight; 0 for none). */
export function shape(pen: Pen, pts: Pt[], fill: string | null, lw = 0.8, ink = pen.ink): void {
  const { p, k } = pen
  if (fill) p.fill(fill)
  else p.noFill()
  if (lw > 0) {
    p.stroke(ink)
    p.strokeWeight(pen.w * lw)
  } else p.noStroke()
  p.beginShape()
  for (const [x, y] of pts) p.vertex(x * k, y * k)
  p.endShape(p.CLOSE)
}

/** A box from its corners. */
export const box = (pen: Pen, x0: number, y0: number, x1: number, y1: number, fill: string | null, lw = 0.8, ink = pen.ink): void =>
  shape(pen, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], fill, lw, ink)

/** A box with its corners rounded by `r` cells. */
export function rbox(pen: Pen, x0: number, y0: number, x1: number, y1: number, r: number, fill: string | null, lw = 0.8, ink = pen.ink): void {
  const { p, k } = pen
  if (fill) p.fill(fill)
  else p.noFill()
  if (lw > 0) {
    p.stroke(ink)
    p.strokeWeight(pen.w * lw)
  } else p.noStroke()
  p.push()
  p.rectMode(p.CORNER)
  p.rect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k, r * k)
  p.pop()
}

export function disc(pen: Pen, c: Pt, rx: number, ry: number, fill: string | null, lw = 0.8, ink = pen.ink): void {
  const { p, k } = pen
  if (fill) p.fill(fill)
  else p.noFill()
  if (lw > 0) {
    p.stroke(ink)
    p.strokeWeight(pen.w * lw)
  } else p.noStroke()
  p.ellipse(c[0] * k, c[1] * k, 2 * rx * k, 2 * ry * k)
}

/** A round thing of radius `r`. */
export const dot = (pen: Pen, c: Pt, r: number, fill: string | null, lw = 0.8, ink = pen.ink): void => disc(pen, c, r, r, fill, lw, ink)

/** A stroke from a to b in a colour, `lw` of the stage's weight. */
export function line(pen: Pen, a: Pt, b: Pt, col: string, lw = 0.8): void {
  const { p, k } = pen
  p.stroke(col)
  p.strokeWeight(pen.w * lw)
  p.line(a[0] * k, a[1] * k, b[0] * k, b[1] * k)
}

/** An arc of a circle about `c` from angle a0 to a1 (radians, y down), stroked. */
export function circleArc(pen: Pen, c: Pt, r: number, a0: number, a1: number, col: string, lw = 0.8): void {
  const pts: Pt[] = []
  const n = Math.max(3, Math.ceil(Math.abs(a1 - a0) / 0.15))
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n
    pts.push([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r])
  }
  polyline(pen, pts, col, lw)
}

/** A stroke through points, not closed. */
export function polyline(pen: Pen, pts: Pt[], col: string, lw = 0.8): void {
  const { p, k } = pen
  p.noFill()
  p.stroke(col)
  p.strokeWeight(pen.w * lw)
  p.beginShape()
  for (const [x, y] of pts) p.vertex(x * k, y * k)
  p.endShape()
}

/** A vertical wash of light or water between two heights, colour stops by fraction. Never inked. */
export function vwash(pen: Pen, x0: number, x1: number, y0: number, y1: number, stops: [number, string, number][]): void {
  const ctx = ctxOf(pen.p)
  const { k } = pen
  const g = ctx.createLinearGradient(0, y0 * k, 0, y1 * k)
  for (const [f, col, a] of stops) g.addColorStop(Math.max(0, Math.min(1, f)), rgba(col, a))
  ctx.save()
  ctx.fillStyle = g
  ctx.fillRect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k)
  ctx.restore()
}

/** A horizontal wash between two x's. */
export function hwash(pen: Pen, x0: number, x1: number, y0: number, y1: number, stops: [number, string, number][]): void {
  const ctx = ctxOf(pen.p)
  const { k } = pen
  const g = ctx.createLinearGradient(x0 * k, 0, x1 * k, 0)
  for (const [f, col, a] of stops) g.addColorStop(Math.max(0, Math.min(1, f)), rgba(col, a))
  ctx.save()
  ctx.fillStyle = g
  ctx.fillRect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k)
  ctx.restore()
}

/** A soft puff of steam or air: a round soft body, `a` at its middle. */
export function puff(pen: Pen, c: Pt, r: number, col: string, a: number): void {
  if (a <= 0.004 || r <= 0) return
  const ctx = ctxOf(pen.p)
  const { k } = pen
  const g = ctx.createRadialGradient(c[0] * k, c[1] * k, 0, c[0] * k, c[1] * k, r * k)
  g.addColorStop(0, rgba(col, a))
  g.addColorStop(0.5, rgba(col, a * 0.55))
  g.addColorStop(1, rgba(col, 0))
  ctx.save()
  ctx.fillStyle = g
  ctx.fillRect((c[0] - r) * k, (c[1] - r) * k, 2 * r * k, 2 * r * k)
  ctx.restore()
}

/** A soft column (steam rising, water falling): a vertical band soft at its sides and ends. */
export function column(pen: Pen, x: number, y0: number, y1: number, w: number, col: string, a: number, fade = 0.25): void {
  if (a <= 0.004) return
  const ctx = ctxOf(pen.p)
  const { k } = pen
  const top = Math.min(y0, y1)
  const bot = Math.max(y0, y1)
  const h = bot - top
  if (h <= 0) return
  const gx = ctx.createLinearGradient((x - w / 2) * k, 0, (x + w / 2) * k, 0)
  gx.addColorStop(0, rgba(col, 0))
  gx.addColorStop(0.3, rgba(col, a))
  gx.addColorStop(0.7, rgba(col, a))
  gx.addColorStop(1, rgba(col, 0))
  ctx.save()
  // The ends soft too: clip to the band and fade with a mask of alpha along it.
  ctx.beginPath()
  ctx.rect((x - w / 2) * k, top * k, w * k, h * k)
  ctx.clip()
  ctx.fillStyle = gx
  const f = Math.min(0.49, fade / Math.max(h, 1e-6))
  ctx.globalAlpha = 1
  // Three bands: faded top, full middle, faded bottom, each its own wash over the side-soft fill.
  const steps = 10
  for (let i = 0; i < steps; i++) {
    const u0 = i / steps
    const u1 = (i + 1) / steps
    const mid = (u0 + u1) / 2
    const e = mid < f ? mid / f : mid > 1 - f ? (1 - mid) / f : 1
    ctx.globalAlpha = Math.max(0, Math.min(1, e))
    ctx.fillRect((x - w / 2) * k, (top + h * u0) * k, w * k, h * (u1 - u0) * k + 1)
  }
  ctx.restore()
}
