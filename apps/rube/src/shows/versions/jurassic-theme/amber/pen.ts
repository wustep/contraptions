import { mixHex } from '../../../../parts'
import type { Pt } from '../../../../parts'

/** A canvas, and the small flat shapes the places are drawn with. No bloom, no shine: a fill, an edge, a gradient for sky. */

export type C2D = CanvasRenderingContext2D

export function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

export function shape(ctx: C2D, k: number, pts: Pt[], fill: string | CanvasGradient | null, ink?: string, lw = 0): void {
  if (pts.length < 3) return
  ctx.beginPath()
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * k, y * k) : ctx.moveTo(x * k, y * k)))
  ctx.closePath()
  if (fill) {
    ctx.fillStyle = fill
    ctx.fill()
  }
  if (ink && lw > 0) {
    ctx.strokeStyle = ink
    ctx.lineWidth = lw
    ctx.stroke()
  }
}

export function fillBox(ctx: C2D, k: number, x0: number, y0: number, x1: number, y1: number, fill: string | CanvasGradient): void {
  ctx.fillStyle = fill
  ctx.fillRect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k)
}

export function line(ctx: C2D, k: number, a: Pt, b: Pt, ink: string, lw: number): void {
  ctx.beginPath()
  ctx.moveTo(a[0] * k, a[1] * k)
  ctx.lineTo(b[0] * k, b[1] * k)
  ctx.strokeStyle = ink
  ctx.lineWidth = lw
  ctx.stroke()
}

/** A vertical gradient from `y0` to `y1`. */
export function vgrad(ctx: C2D, k: number, y0: number, y1: number, stops: [number, string][]): CanvasGradient {
  const g = ctx.createLinearGradient(0, y0 * k, 0, y1 * k)
  for (const [at, c] of stops) g.addColorStop(Math.max(0, Math.min(1, at)), c)
  return g
}

export function ellipse(ctx: C2D, k: number, x: number, y: number, rx: number, ry: number, fill: string, rot = 0): void {
  ctx.save()
  ctx.translate(x * k, y * k)
  ctx.rotate(rot)
  ctx.beginPath()
  ctx.ellipse(0, 0, Math.max(0.01, rx) * k, Math.max(0.01, ry) * k, 0, 0, Math.PI * 2)
  ctx.fillStyle = fill
  ctx.fill()
  ctx.restore()
}

/** A disc seen nearly edge on: the helicopter's rotor, which never spins. */
export function disc(ctx: C2D, k: number, x: number, y: number, rx: number, ry: number, fill: string): void {
  ellipse(ctx, k, x, y, rx, ry, fill)
}

export { mixHex }
