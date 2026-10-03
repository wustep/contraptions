import type p5 from 'p5'
import { mixHex } from '../../../../../parts'

/**
 * A few painting words for the sky and the sea (B3's): straight onto the canvas, which is what gradients and soft
 * light need. Everything is in cells; `k` turns them into pixels.
 */

export type C2 = CanvasRenderingContext2D

export const ctxOf = (p: p5): C2 => p.drawingContext as C2

/** `#rrggbb` with an alpha, as a canvas colour. */
export function rgba(hex: string, a = 1): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a)).toFixed(3)})`
}

export const mix = mixHex

/** A closed path through points (cells), scaled by `k`. */
export function poly(g: C2, k: number, pts: [number, number][]): void {
  g.beginPath()
  pts.forEach(([x, y], i) => (i ? g.lineTo(x * k, y * k) : g.moveTo(x * k, y * k)))
  g.closePath()
}

/** A vertical gradient between two heights (cells), through the given stops. */
export function vgrad(g: C2, k: number, y0: number, y1: number, stops: [number, string][]): CanvasGradient {
  const gr = g.createLinearGradient(0, y0 * k, 0, y1 * k)
  for (const [o, c] of stops) gr.addColorStop(Math.max(0, Math.min(1, o)), c)
  return gr
}

/** A soft round glow at (x, y), radius `r` cells. */
export function glow(g: C2, k: number, x: number, y: number, r: number, hex: string, a: number): void {
  if (a <= 0.003 || r <= 0) return
  const gr = g.createRadialGradient(x * k, y * k, 0, x * k, y * k, r * k)
  gr.addColorStop(0, rgba(hex, a))
  gr.addColorStop(0.35, rgba(hex, a * 0.45))
  gr.addColorStop(1, rgba(hex, 0))
  g.fillStyle = gr
  g.beginPath()
  g.arc(x * k, y * k, r * k, 0, Math.PI * 2)
  g.fill()
}

/** A filled ellipse. */
export function oval(g: C2, k: number, x: number, y: number, rx: number, ry: number, fill: string, rot = 0): void {
  g.fillStyle = fill
  g.beginPath()
  g.ellipse(x * k, y * k, Math.max(0.0001, rx * k), Math.max(0.0001, ry * k), rot, 0, Math.PI * 2)
  g.fill()
}

/** A rounded rectangle (cells). */
export function rrect(g: C2, k: number, x0: number, y0: number, x1: number, y1: number, r: number): void {
  const rr = Math.min(r, (x1 - x0) / 2, (y1 - y0) / 2) * k
  g.beginPath()
  g.moveTo(x0 * k + rr, y0 * k)
  g.arcTo(x1 * k, y0 * k, x1 * k, y1 * k, rr)
  g.arcTo(x1 * k, y1 * k, x0 * k, y1 * k, rr)
  g.arcTo(x0 * k, y1 * k, x0 * k, y0 * k, rr)
  g.arcTo(x0 * k, y0 * k, x1 * k, y0 * k, rr)
  g.closePath()
}

/**
 * A pencil scribble: lines of handwriting with no letters in them, a wandering stroke in a box (cells), `rows` lines,
 * seeded. What Sean's notes on the wrapper are.
 */
export function scribble(g: C2, k: number, x0: number, y0: number, w: number, h: number, rows: number, seed: number, hex: string, a: number, lw: number): void {
  g.strokeStyle = rgba(hex, a)
  g.lineWidth = lw
  g.lineCap = 'round'
  g.lineJoin = 'round'
  for (let r = 0; r < rows; r++) {
    const y = y0 + (h * (r + 0.5)) / rows
    const len = w * (0.55 + 0.45 * frac(Math.sin((seed + r) * 91.7) * 4375.5))
    g.beginPath()
    const n = Math.max(6, Math.floor(len * 26))
    for (let i = 0; i <= n; i++) {
      const u = i / n
      const x = x0 + u * len
      const yy = y + (h / rows) * 0.28 * Math.sin(u * 47 + seed * 3.1 + r * 1.7) * (0.6 + 0.4 * Math.sin(u * 13 + r))
      if (i) g.lineTo(x * k, yy * k)
      else g.moveTo(x * k, yy * k)
    }
    g.stroke()
  }
}
const frac = (v: number): number => v - Math.floor(v)
