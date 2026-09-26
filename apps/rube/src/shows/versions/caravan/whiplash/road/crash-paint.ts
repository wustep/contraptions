import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../../parts'
import type { Ctx } from '../kit'

/**
 * The road builder's brushes, shared by `folder.ts` (the competition's backstage and stage) and `crash.ts` (the
 * drive and the crash): light as additive gradients, a colour dimmed toward the paper by how lit it is, and flat
 * polygons in cells. Nothing here knows a story.
 */

/** `#rrggbb` with an alpha, as a CSS colour. */
export function hexA(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.max(0, Math.min(1, a)).toFixed(3)})`
}

/** A colour as it looks in `light` (0 the paper, 1 itself): how every set here goes dark and wakes. */
export const lit = (c: Ctx, hex: string, light: number): string => (light >= 0.999 ? hex : mixHex(c.bg, hex, Math.max(0, light)))

/** A soft disc of light round (x, y), radius `r`, added to what is there. */
export function glow(p: p5, c: Ctx, x: number, y: number, r: number, a: number, colour: string): void {
  if (a <= 0.004 || r <= 0) return
  const { k } = c
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const g = ctx.createRadialGradient(x * k, y * k, 0, x * k, y * k, r * k)
  g.addColorStop(0, hexA(colour, a))
  g.addColorStop(0.45, hexA(colour, a * 0.38))
  g.addColorStop(1, hexA(colour, 0))
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.fillStyle = g
  ctx.fillRect((x - r) * k, (y - r) * k, 2 * r * k, 2 * r * k)
  ctx.restore()
}

/** A flat ellipse of light (a pool on a floor): `rx` across, `ry` deep. */
export function pool(p: p5, c: Ctx, x: number, y: number, rx: number, ry: number, a: number, colour: string): void {
  if (a <= 0.004) return
  const { k } = c
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.translate(x * k, y * k)
  ctx.scale(1, ry / rx)
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx * k)
  g.addColorStop(0, hexA(colour, a))
  g.addColorStop(0.6, hexA(colour, a * 0.35))
  g.addColorStop(1, hexA(colour, 0))
  ctx.globalCompositeOperation = 'lighter'
  ctx.fillStyle = g
  ctx.fillRect(-rx * k, -rx * k, 2 * rx * k, 2 * rx * k)
  ctx.restore()
}

/**
 * A cone of light from `from` toward `to`, `w0` wide at its source and `w1` at its far end, fading along its
 * length: a lamp's throw, a headlight's beam.
 */
export function cone(p: p5, c: Ctx, from: Pt, to: Pt, w0: number, w1: number, a: number, colour: string): void {
  if (a <= 0.004) return
  const { k } = c
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const dx = to[0] - from[0]
  const dy = to[1] - from[1]
  const L = Math.hypot(dx, dy) || 1
  const nx = -dy / L
  const ny = dx / L
  const g = ctx.createLinearGradient(from[0] * k, from[1] * k, to[0] * k, to[1] * k)
  g.addColorStop(0, hexA(colour, a))
  g.addColorStop(0.55, hexA(colour, a * 0.4))
  g.addColorStop(1, hexA(colour, 0))
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo((from[0] + (nx * w0) / 2) * k, (from[1] + (ny * w0) / 2) * k)
  ctx.lineTo((to[0] + (nx * w1) / 2) * k, (to[1] + (ny * w1) / 2) * k)
  ctx.lineTo((to[0] - (nx * w1) / 2) * k, (to[1] - (ny * w1) / 2) * k)
  ctx.lineTo((from[0] - (nx * w0) / 2) * k, (from[1] - (ny * w0) / 2) * k)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

/** A vertical wash, `top` to `bottom`, over a box: a sky, a wall in a lamp's spill. Not additive. */
export function wash(p: p5, c: Ctx, x0: number, y0: number, x1: number, y1: number, top: string, bottom: string): void {
  const { k } = c
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const g = ctx.createLinearGradient(0, y0 * k, 0, y1 * k)
  g.addColorStop(0, top)
  g.addColorStop(1, bottom)
  ctx.save()
  ctx.fillStyle = g
  ctx.fillRect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k)
  ctx.restore()
}

/** A closed polygon through `pts` (cells), in the current fill and stroke. */
export function poly(p: p5, k: number, pts: Pt[]): void {
  p.beginShape()
  for (const [x, y] of pts) p.vertex(x * k, y * k)
  p.endShape(p.CLOSE)
}

/** A box from its corners (cells), in the current fill and stroke; `r` rounds its corners. */
export function rect(p: p5, k: number, x0: number, y0: number, x1: number, y1: number, r = 0): void {
  p.rect(((x0 + x1) / 2) * k, ((y0 + y1) / 2) * k, Math.abs(x1 - x0) * k, Math.abs(y1 - y0) * k, r * k)
}

/** A line between two points (cells). */
export function seg(p: p5, k: number, a: Pt, b: Pt): void {
  p.line(a[0] * k, a[1] * k, b[0] * k, b[1] * k)
}

/** 0 before `a`, 1 after `b`, eased between (sine). */
export const ease = (t: number, a: number, b: number): number => {
  const u = Math.max(0, Math.min(1, (t - a) / (b - a)))
  return 0.5 - 0.5 * Math.cos(Math.PI * u)
}

/** A sharp hit that rings down: 0 before, 1 at the hit, a damped cosine after. */
export const ring = (since: number, tau = 0.3, w = 9): number => (since < 0 ? 0 : Math.exp(-since / tau) * Math.cos(w * since) * Math.min(1, since / 0.02 + 0.3))

/** A kick that rises in a few frames and decays: 0 before, peak 1. */
export const kick = (since: number, tau = 0.35): number => (since < 0 ? 0 : Math.min(1, since / 0.03) * Math.exp(-Math.max(0, since - 0.03) / tau))

/** Monotone cubic through (xs, ys) (Fritsch–Carlson): a smooth path through timed points that never overshoots. */
export function monotone(xs: number[], ys: number[]): (x: number) => number {
  const n = xs.length
  const d: number[] = []
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]))
  const m: number[] = new Array(n).fill(0)
  m[0] = d[0]
  m[n - 1] = d[n - 2]
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) m[i] = 0
    else {
      const w1 = 2 * (xs[i + 1] - xs[i]) + (xs[i] - xs[i - 1])
      const w2 = (xs[i + 1] - xs[i]) + 2 * (xs[i] - xs[i - 1])
      m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i])
    }
  }
  return (x: number) => {
    if (x <= xs[0]) return ys[0] + m[0] * (x - xs[0])
    if (x >= xs[n - 1]) return ys[n - 1] + m[n - 1] * (x - xs[n - 1])
    let i = 0
    while (i < n - 2 && x > xs[i + 1]) i++
    const h = xs[i + 1] - xs[i]
    const u = (x - xs[i]) / h
    const u2 = u * u
    const u3 = u2 * u
    return (2 * u3 - 3 * u2 + 1) * ys[i] + (u3 - 2 * u2 + u) * h * m[i] + (-2 * u3 + 3 * u2) * ys[i + 1] + (u3 - u2) * h * m[i + 1]
  }
}
