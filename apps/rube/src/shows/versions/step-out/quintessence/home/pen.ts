import type p5 from 'p5'
import type { Pt } from '../../../../../parts'

/**
 * Home's drawing hand: straight onto the canvas, in cells (`k` pixels a cell), so the lamp's light can be a gradient
 * and a silhouette can be soft. Every function leaves the context as it found it.
 */
export interface Pen {
  c: CanvasRenderingContext2D
  k: number
}

export const penOf = (p: p5, k: number): Pen => ({ c: p.drawingContext as CanvasRenderingContext2D, k })

/** `#rrggbb` and an alpha, as a CSS colour. */
export function rgba(hex: string, a = 1): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a)).toFixed(3)})`
}

/** Between two `#rrggbb`s. */
export function mix(a: string, b: string, f: number): string {
  const x = parseInt(a.slice(1), 16)
  const y = parseInt(b.slice(1), 16)
  const g = Math.max(0, Math.min(1, f))
  const ch = (s: number) => Math.round(((x >> s) & 255) * (1 - g) + ((y >> s) & 255) * g)
  return `#${((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1)}`
}

export function trace(pen: Pen, pts: readonly Pt[], close = true): void {
  const { c, k } = pen
  c.beginPath()
  pts.forEach(([x, y], i) => (i ? c.lineTo(x * k, y * k) : c.moveTo(x * k, y * k)))
  if (close) c.closePath()
}

/** A filled shape, and its edge if `stroke` is given. */
export function fillPoly(pen: Pen, pts: readonly Pt[], fill: string | CanvasGradient | null, stroke?: string, lw = 0.02): void {
  const { c, k } = pen
  trace(pen, pts)
  if (fill) {
    c.fillStyle = fill
    c.fill()
  }
  if (stroke) {
    c.strokeStyle = stroke
    c.lineWidth = lw * k
    c.lineJoin = 'round'
    c.stroke()
  }
}

/** An open line through points, `lw` cells wide. */
export function line(pen: Pen, pts: readonly Pt[], stroke: string, lw = 0.02, cap: CanvasLineCap = 'round'): void {
  const { c, k } = pen
  trace(pen, pts, false)
  c.strokeStyle = stroke
  c.lineWidth = lw * k
  c.lineCap = cap
  c.lineJoin = 'round'
  c.stroke()
}

export function ellipse(pen: Pen, x: number, y: number, rx: number, ry: number, fill: string | CanvasGradient | null, stroke?: string, lw = 0.02, rot = 0): void {
  const { c, k } = pen
  c.beginPath()
  c.ellipse(x * k, y * k, Math.max(0.01, rx * k), Math.max(0.01, ry * k), rot, 0, Math.PI * 2)
  if (fill) {
    c.fillStyle = fill
    c.fill()
  }
  if (stroke) {
    c.strokeStyle = stroke
    c.lineWidth = lw * k
    c.stroke()
  }
}

/** A soft round light: `stops` from its centre out to `r` cells. */
export function glow(pen: Pen, x: number, y: number, r: number, stops: [number, string][], sy = 1): void {
  const { c, k } = pen
  c.save()
  c.translate(x * k, y * k)
  c.scale(1, sy)
  const g = c.createRadialGradient(0, 0, 0, 0, 0, r * k)
  for (const [at, col] of stops) g.addColorStop(at, col)
  c.fillStyle = g
  c.fillRect(-r * k, -r * k, 2 * r * k, 2 * r * k)
  c.restore()
}

/** A vertical gradient across [y0, y1]. */
export function vgrad(pen: Pen, y0: number, y1: number, stops: [number, string][]): CanvasGradient {
  const g = pen.c.createLinearGradient(0, y0 * pen.k, 0, y1 * pen.k)
  for (const [at, col] of stops) g.addColorStop(at, col)
  return g
}

/** A cubic Bézier, sampled: `n` points after the first. */
export function bez(a: Pt, b: Pt, c: Pt, d: Pt, n = 16): Pt[] {
  const out: Pt[] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const u = 1 - t
    out.push([
      u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0],
      u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1],
    ])
  }
  return out
}

/** Where a polyline is at arc length `s`, and its direction there. */
export function along(pts: readonly Pt[], cum: readonly number[], s: number): { p: Pt; a: number } {
  const total = cum[cum.length - 1]
  const v = Math.max(0, Math.min(total, s))
  let i = 1
  while (i < cum.length - 1 && cum[i] < v) i++
  const f = (v - cum[i - 1]) / Math.max(1e-9, cum[i] - cum[i - 1])
  const [x0, y0] = pts[i - 1]
  const [x1, y1] = pts[i]
  return { p: [x0 + (x1 - x0) * f, y0 + (y1 - y0) * f], a: Math.atan2(y1 - y0, x1 - x0) }
}

/** Cumulative arc lengths of a polyline. */
export function lengths(pts: readonly Pt[]): number[] {
  const out = [0]
  for (let i = 1; i < pts.length; i++) out.push(out[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))
  return out
}
