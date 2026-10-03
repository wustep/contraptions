import type p5 from 'p5'
import type { Pt } from '../../../../../parts'

/**
 * Iceland's drawing hand: flat fills, one ink, gradients only for the sky, the water and the light. Everything takes
 * cells and draws in pixels (`k` a cell) in the frame the stage has translated to.
 */
export interface Pen {
  p: p5
  k: number
  ink: string
  w: number
}

export const ctxOf = (p: p5): CanvasRenderingContext2D => p.drawingContext as CanvasRenderingContext2D

export const clamp01 = (v: number): number => Math.max(0, Math.min(1, v))
export const sm = (t: number, a: number, b: number): number => {
  const u = clamp01((t - a) / (b - a))
  return u * u * (3 - 2 * u)
}
export const lerp = (a: number, b: number, u: number): number => a + (b - a) * u

/** A colour as rgba(), with alpha 0..1. */
export function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a)).toFixed(3)})`
}

/** A closed shape, filled, inked by `lw` of the stage's weight (0 for none). */
export function shape(pen: Pen, pts: Pt[], fill: string | null, lw = 0, ink = pen.ink): void {
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

/** An open line through points, `wc` cells wide (or `lw` of the stage's weight when `wc` is 0). */
export function stroke(pen: Pen, pts: Pt[], color: string, wc: number, lw = 0, cap: 'round' | 'butt' = 'round'): void {
  const ctx = ctxOf(pen.p)
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = wc > 0 ? wc * pen.k : lw * pen.w
  ctx.lineCap = cap
  ctx.lineJoin = 'round'
  ctx.beginPath()
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * pen.k, y * pen.k) : ctx.moveTo(x * pen.k, y * pen.k)))
  ctx.stroke()
  ctx.restore()
}

export function disc(pen: Pen, c: Pt, rx: number, ry: number, fill: string | null, lw = 0, ink = pen.ink): void {
  const { p, k } = pen
  if (fill) p.fill(fill)
  else p.noFill()
  if (lw > 0) {
    p.stroke(ink)
    p.strokeWeight(pen.w * lw)
  } else p.noStroke()
  p.ellipse(c[0] * k, c[1] * k, 2 * rx * k, 2 * ry * k)
}

/** A soft round light: a radial gradient from `a` at the centre to nothing at `r` cells. */
export function glow(pen: Pen, c: Pt, r: number, hex: string, a: number): void {
  if (a <= 0.003 || r <= 0) return
  const ctx = ctxOf(pen.p)
  const g = ctx.createRadialGradient(c[0] * pen.k, c[1] * pen.k, 0, c[0] * pen.k, c[1] * pen.k, r * pen.k)
  g.addColorStop(0, rgba(hex, a))
  g.addColorStop(0.4, rgba(hex, a * 0.45))
  g.addColorStop(1, rgba(hex, 0))
  ctx.save()
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(c[0] * pen.k, c[1] * pen.k, r * pen.k, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/** Turn and move the pen: draw `fn` about `at`, turned by `a` radians and scaled by `sx`, `sy`. */
export function about(pen: Pen, at: Pt, a: number, fn: () => void, sx = 1, sy = 1): void {
  const { p, k } = pen
  p.push()
  p.translate(at[0] * k, at[1] * k)
  p.rotate(a)
  p.scale(sx, sy)
  fn()
  p.pop()
}
