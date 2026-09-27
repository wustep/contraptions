import type p5 from 'p5'
import type { Pt } from '../../../../../parts'
import { rgba } from '../cast'
import { PLANE } from '../worlds'

/**
 * The plane's drawing hand (the PLANE builder's): flat fills and one ink for what is made, soft gradients only for
 * light and air. Everything takes the world's cells and draws in pixels (`k` a cell) straight onto the canvas, and
 * leaves the canvas as it found it.
 */
export interface Pen {
  ctx: CanvasRenderingContext2D
  k: number
  /** The stage's line weight at this zoom. */
  w: number
  ink: string
}

/** The one ink of the cabin, the airframe and the hall: the night's own dark. */
export const INK = PLANE.night

/** The pen as the stage's p5, for the canonical drawings (`cast.ts`), which only want its canvas. */
export const asP5 = (pen: Pen): p5 => ({ drawingContext: pen.ctx }) as unknown as p5

export const penFor = (p: p5, k: number, w: number): Pen => ({ ctx: p.drawingContext as CanvasRenderingContext2D, k, w, ink: INK })

function finish(pen: Pen, fill: string | null, lw: number, ink: string): void {
  const { ctx } = pen
  if (fill) {
    ctx.fillStyle = fill
    ctx.fill()
  }
  if (lw > 0) {
    ctx.lineWidth = pen.w * lw
    ctx.strokeStyle = ink
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.stroke()
  }
}

/** A closed shape through points: filled, and inked (`lw` of the stage's weight; 0 for none). */
export function shape(pen: Pen, pts: Pt[], fill: string | null, lw = 0.7, ink = pen.ink): void {
  const { ctx, k } = pen
  ctx.beginPath()
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * k, y * k) : ctx.moveTo(x * k, y * k)))
  ctx.closePath()
  finish(pen, fill, lw, ink)
}

/** A box from its corners. */
export const box = (pen: Pen, x0: number, y0: number, x1: number, y1: number, fill: string | null, lw = 0.7, ink = pen.ink): void =>
  shape(pen, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], fill, lw, ink)

/** A box with its corners rounded by `r` cells (or each corner its own: top-left, top-right, bottom-right, bottom-left). */
export function rbox(pen: Pen, x0: number, y0: number, x1: number, y1: number, r: number | [number, number, number, number], fill: string | null, lw = 0.7, ink = pen.ink): void {
  const { ctx, k } = pen
  const [a, b, c, d] = (typeof r === 'number' ? [r, r, r, r] : r).map((v) => Math.max(0, Math.min(v, (x1 - x0) / 2, (y1 - y0) / 2)) * k)
  const X0 = x0 * k
  const Y0 = y0 * k
  const X1 = x1 * k
  const Y1 = y1 * k
  ctx.beginPath()
  ctx.moveTo(X0 + a, Y0)
  ctx.lineTo(X1 - b, Y0)
  ctx.arcTo(X1, Y0, X1, Y0 + b, b)
  ctx.lineTo(X1, Y1 - c)
  ctx.arcTo(X1, Y1, X1 - c, Y1, c)
  ctx.lineTo(X0 + d, Y1)
  ctx.arcTo(X0, Y1, X0, Y1 - d, d)
  ctx.lineTo(X0, Y0 + a)
  ctx.arcTo(X0, Y0, X0 + a, Y0, a)
  ctx.closePath()
  finish(pen, fill, lw, ink)
}

/** An ellipse. */
export function oval(pen: Pen, cx: number, cy: number, rx: number, ry: number, fill: string | null, lw = 0.7, ink = pen.ink): void {
  const { ctx, k } = pen
  ctx.beginPath()
  ctx.ellipse(cx * k, cy * k, Math.max(0, rx * k), Math.max(0, ry * k), 0, 0, Math.PI * 2)
  finish(pen, fill, lw, ink)
}

/** A ring between two circles about one centre (a fuselage's skin, a nacelle's lip). */
export function ring(pen: Pen, cx: number, cy: number, r0: number, r1: number, fill: string, lw = 0.7, ink = pen.ink): void {
  const { ctx, k } = pen
  ctx.beginPath()
  ctx.arc(cx * k, cy * k, r1 * k, 0, Math.PI * 2)
  ctx.moveTo((cx + r0) * k, cy * k)
  ctx.arc(cx * k, cy * k, r0 * k, 0, Math.PI * 2, true)
  ctx.fillStyle = fill
  ctx.fill('evenodd')
  if (lw > 0) {
    ctx.lineWidth = pen.w * lw
    ctx.strokeStyle = ink
    ctx.beginPath()
    ctx.arc(cx * k, cy * k, r1 * k, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(cx * k, cy * k, r0 * k, 0, Math.PI * 2)
    ctx.stroke()
  }
}

/** A stroke from a to b. */
export function line(pen: Pen, a: Pt, b: Pt, col: string, lw = 0.7): void {
  const { ctx, k } = pen
  ctx.beginPath()
  ctx.moveTo(a[0] * k, a[1] * k)
  ctx.lineTo(b[0] * k, b[1] * k)
  ctx.lineWidth = pen.w * lw
  ctx.strokeStyle = col
  ctx.lineCap = 'round'
  ctx.stroke()
}

/** A stroke through points, not closed. */
export function polyline(pen: Pen, pts: Pt[], col: string, lw = 0.7): void {
  if (pts.length < 2) return
  const { ctx, k } = pen
  ctx.beginPath()
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * k, y * k) : ctx.moveTo(x * k, y * k)))
  ctx.lineWidth = pen.w * lw
  ctx.strokeStyle = col
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.stroke()
}

/** A soft round light or haze: `a` at its middle, nothing at `r`. Air, never a disc. */
export function glow(pen: Pen, c: Pt, r: number, col: string, a: number): void {
  if (a <= 0.003 || r <= 0) return
  const { ctx, k } = pen
  const x = c[0] * k
  const y = c[1] * k
  const R = r * k
  const g = ctx.createRadialGradient(x, y, 0, x, y, R)
  g.addColorStop(0, rgba(col, a))
  g.addColorStop(0.4, rgba(col, a * 0.5))
  g.addColorStop(1, rgba(col, 0))
  ctx.fillStyle = g
  ctx.fillRect(x - R, y - R, 2 * R, 2 * R)
}

/** A soft flattened glow (a puff of cloud or smoke, a pool of light): `rx` by `ry`. */
export function puff(pen: Pen, c: Pt, rx: number, ry: number, col: string, a: number): void {
  if (a <= 0.003 || rx <= 0 || ry <= 0) return
  const { ctx, k } = pen
  ctx.save()
  ctx.translate(c[0] * k, c[1] * k)
  ctx.scale(1, ry / rx)
  const R = rx * k
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R)
  g.addColorStop(0, rgba(col, a))
  g.addColorStop(0.5, rgba(col, a * 0.62))
  g.addColorStop(1, rgba(col, 0))
  ctx.fillStyle = g
  ctx.fillRect(-R, -R, 2 * R, 2 * R)
  ctx.restore()
}

/** A vertical wash between two heights: colour stops by fraction, each with its alpha. Never inked. */
export function vwash(pen: Pen, x0: number, x1: number, y0: number, y1: number, stops: [number, string, number][]): void {
  const { ctx, k } = pen
  if (y1 <= y0 || x1 <= x0) return
  const g = ctx.createLinearGradient(0, y0 * k, 0, y1 * k)
  for (const [f, col, a] of stops) g.addColorStop(Math.max(0, Math.min(1, f)), rgba(col, a))
  ctx.fillStyle = g
  ctx.fillRect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k)
}

/** A horizontal wash between two x's. */
export function hwash(pen: Pen, x0: number, x1: number, y0: number, y1: number, stops: [number, string, number][]): void {
  const { ctx, k } = pen
  if (y1 <= y0 || x1 <= x0) return
  const g = ctx.createLinearGradient(x0 * k, 0, x1 * k, 0)
  for (const [f, col, a] of stops) g.addColorStop(Math.max(0, Math.min(1, f)), rgba(col, a))
  ctx.fillStyle = g
  ctx.fillRect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k)
}

/** Clip what `fn` draws to a closed shape. */
export function clipTo(pen: Pen, pts: Pt[], fn: () => void): void {
  const { ctx, k } = pen
  ctx.save()
  ctx.beginPath()
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * k, y * k) : ctx.moveTo(x * k, y * k)))
  ctx.closePath()
  ctx.clip()
  fn()
  ctx.restore()
}

/** Clip what `fn` draws to a circle. */
export function clipCircle(pen: Pen, cx: number, cy: number, r: number, fn: () => void): void {
  const { ctx, k } = pen
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx * k, cy * k, r * k, 0, Math.PI * 2)
  ctx.clip()
  fn()
  ctx.restore()
}

/** Points round an arc of a circle (radians, y down). */
export function arcPts(cx: number, cy: number, r: number, a0: number, a1: number, n = 24): Pt[] {
  const out: Pt[] = []
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n
    out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r])
  }
  return out
}
