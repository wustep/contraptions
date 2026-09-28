import type p5 from 'p5'
import type { Pt } from '../../../../../parts'
import { rgba } from '../cast'

/**
 * Paris's drawing hand: flat fills and one ink for what is made (stone, slate, iron), soft gradients only for light,
 * air and water. Everything takes cells and draws in pixels (`k` a cell), in whatever frame the stage (or the leaf's
 * turn) has set up.
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
  } else p.noStroke()
  p.beginShape()
  for (const [x, y] of pts) p.vertex(x * k, y * k)
  p.endShape(p.CLOSE)
}

/** A box from its corners. */
export const rect = (pen: Pen, x0: number, y0: number, x1: number, y1: number, fill: string | null, lw = 0.8, ink = pen.ink): void =>
  shape(pen, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], fill, lw, ink)

/** A stroke from a to b, `lw` of the stage's weight. */
export function line(pen: Pen, a: Pt, b: Pt, col: string, lw = 0.8): void {
  const { p, k } = pen
  p.stroke(col)
  p.strokeWeight(pen.w * lw)
  p.line(a[0] * k, a[1] * k, b[0] * k, b[1] * k)
}

/** A stroke through points, open. */
export function poly(pen: Pen, pts: Pt[], col: string, lw = 0.8): void {
  const { p, k } = pen
  p.noFill()
  p.stroke(col)
  p.strokeWeight(pen.w * lw)
  p.beginShape()
  for (const [x, y] of pts) p.vertex(x * k, y * k)
  p.endShape()
}

/** An ellipse. */
export function oval(pen: Pen, c: Pt, rx: number, ry: number, fill: string | null, lw = 0.8, ink = pen.ink): void {
  const { p, k } = pen
  if (fill) p.fill(fill)
  else p.noFill()
  if (lw > 0) {
    p.stroke(ink)
    p.strokeWeight(pen.w * lw)
  } else p.noStroke()
  p.ellipse(c[0] * k, c[1] * k, 2 * rx * k, 2 * ry * k)
}

/** Points round an arc about `c` (radians, y down). */
export function arc(c: Pt, r: number, a0: number, a1: number, n = 0): Pt[] {
  const m = n || Math.max(4, Math.ceil(Math.abs(a1 - a0) / 0.12))
  const out: Pt[] = []
  for (let i = 0; i <= m; i++) {
    const a = a0 + ((a1 - a0) * i) / m
    out.push([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r])
  }
  return out
}

/** A vertical wash between two heights (colour stops by fraction, with alphas). Never inked. */
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

/** A soft round body of air, dust or light, `a` at its middle. */
export function puff(pen: Pen, c: Pt, r: number, col: string, a: number): void {
  if (a <= 0.004 || r <= 0) return
  const ctx = ctxOf(pen.p)
  const { k } = pen
  const g = ctx.createRadialGradient(c[0] * k, c[1] * k, 0, c[0] * k, c[1] * k, r * k)
  g.addColorStop(0, rgba(col, a))
  g.addColorStop(0.5, rgba(col, a * 0.5))
  g.addColorStop(1, rgba(col, 0))
  ctx.save()
  ctx.fillStyle = g
  ctx.fillRect((c[0] - r) * k, (c[1] - r) * k, 2 * r * k, 2 * r * k)
  ctx.restore()
}

/** Fill a path of points with a raw canvas colour (for many small things at once: one path, one fill). */
export function fillPaths(pen: Pen, paths: Pt[][], col: string, a = 1): void {
  if (!paths.length) return
  const ctx = ctxOf(pen.p)
  const { k } = pen
  ctx.save()
  ctx.fillStyle = rgba(col, a)
  ctx.beginPath()
  for (const pts of paths) {
    if (pts.length < 2) continue
    ctx.moveTo(pts[0][0] * k, pts[0][1] * k)
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0] * k, pts[i][1] * k)
    ctx.closePath()
  }
  ctx.fill()
  ctx.restore()
}

/** Stroke many open paths in one colour. */
export function strokePaths(pen: Pen, paths: Pt[][], col: string, lw: number, a = 1): void {
  if (!paths.length) return
  const ctx = ctxOf(pen.p)
  const { k } = pen
  ctx.save()
  ctx.strokeStyle = rgba(col, a)
  ctx.lineWidth = pen.w * lw
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  for (const pts of paths) {
    if (pts.length < 2) continue
    ctx.moveTo(pts[0][0] * k, pts[0][1] * k)
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0] * k, pts[i][1] * k)
  }
  ctx.stroke()
  ctx.restore()
}

/** A rotated rectangle's corners: centre, half sizes, angle. */
export function quad(c: Pt, hw: number, hh: number, a: number): Pt[] {
  const cs = Math.cos(a)
  const sn = Math.sin(a)
  return [
    [-hw, -hh],
    [hw, -hh],
    [hw, hh],
    [-hw, hh],
  ].map(([x, y]) => [c[0] + x * cs - y * sn, c[1] + x * sn + y * cs] as Pt)
}

/** Is any of the box [x0, x1] x [y0, y1] inside the frame (with a margin)? */
export const seen = (f: { x0: number; y0: number; x1: number; y1: number }, x0: number, y0: number, x1: number, y1: number, m = 0.5): boolean =>
  x1 > f.x0 - m && x0 < f.x1 + m && y1 > f.y0 - m && y0 < f.y1 + m
