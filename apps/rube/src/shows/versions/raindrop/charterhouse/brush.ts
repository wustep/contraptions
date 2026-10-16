import type p5 from 'p5'
import type { Pt } from '../../../../parts'

/**
 * The show's one drawing hand: straight onto the canvas, in cells. A `Brush` is the canvas with the stage's
 * transform scaled by a cell, so every coordinate is in cells and `px` is one pixel. Each drawing is wrapped in a
 * save and a restore (`paint`), so the fill and stroke p5 last set, and remembers, are the canvas's again after it.
 *
 * Flat fills in a few values; no gradient but the sky's, no glow anywhere. Light is where it lands.
 */
export interface Brush {
  g: CanvasRenderingContext2D
  /** Pixels a cell. */
  k: number
  /** One pixel, in cells. */
  px: number
}

/** Draw with `fn` in cells, the canvas left as it was found. */
export function paint(p: p5, k: number, fn: (b: Brush) => void): void {
  const g = p.drawingContext as CanvasRenderingContext2D
  g.save()
  g.scale(k, k)
  fn({ g, k, px: 1 / k })
  g.restore()
}

/** Where the frame is, in the cells of the drawing's own origin: the canvas's corners read back through its transform. */
export function frame(b: Brush): { x0: number; y0: number; x1: number; y1: number } {
  const m = b.g.getTransform().inverse()
  const c = b.g.canvas
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (const [px, py] of [[0, 0], [c.width, 0], [0, c.height], [c.width, c.height]]) {
    const x = m.a * px + m.c * py + m.e
    const y = m.b * px + m.d * py + m.f
    x0 = Math.min(x0, x)
    x1 = Math.max(x1, x)
    y0 = Math.min(y0, y)
    y1 = Math.max(y1, y)
  }
  return { x0, y0, x1, y1 }
}

/* ------------------------------------------------------------------ colour */

const cache = new Map<string, [number, number, number]>()
export function rgb(hex: string): [number, number, number] {
  let v = cache.get(hex)
  if (!v) {
    const h = hex.charAt(0) === '#' ? hex.slice(1) : hex
    v = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
    cache.set(hex, v)
  }
  return v
}
const hx = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
export const hex = (r: number, g: number, b: number): string => `#${hx(r)}${hx(g)}${hx(b)}`
/** `a` mixed `f` of the way to `b`. */
export function mix(a: string, b: string, f: number): string {
  if (f <= 0) return a
  if (f >= 1) return b
  const [r1, g1, b1] = rgb(a)
  const [r2, g2, b2] = rgb(b)
  return hex(r1 + (r2 - r1) * f, g1 + (g2 - g1) * f, b1 + (b2 - b1) * f)
}
/** A colour with alpha, for the canvas. */
export function rgba(c: string, a: number): string {
  const [r, g, b] = rgb(c)
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a)).toFixed(3)})`
}

/* ------------------------------------------------------------------ shapes */

export function poly(b: Brush, pts: readonly Pt[], fill: string): void {
  const { g } = b
  g.beginPath()
  g.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1])
  g.closePath()
  g.fillStyle = fill
  g.fill()
}

export function rect(b: Brush, x0: number, y0: number, x1: number, y1: number, fill: string): void {
  b.g.fillStyle = fill
  b.g.fillRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0))
}

export function disc(b: Brush, x: number, y: number, r: number, fill: string): void {
  const { g } = b
  g.beginPath()
  g.arc(x, y, Math.max(r, 0), 0, Math.PI * 2)
  g.fillStyle = fill
  g.fill()
}

export function oval(b: Brush, x: number, y: number, rx: number, ry: number, fill: string, rot = 0): void {
  const { g } = b
  g.beginPath()
  g.ellipse(x, y, Math.max(rx, 0), Math.max(ry, 0), rot, 0, Math.PI * 2)
  g.fillStyle = fill
  g.fill()
}

/** A line `w` pixels wide (never thinner than a pixel). */
export function line(b: Brush, x0: number, y0: number, x1: number, y1: number, color: string, w = 1, cap: CanvasLineCap = 'round'): void {
  const { g } = b
  g.beginPath()
  g.moveTo(x0, y0)
  g.lineTo(x1, y1)
  g.lineWidth = Math.max(w, 1) * b.px
  g.lineCap = cap
  g.strokeStyle = color
  g.stroke()
}

/** An open path `w` pixels wide. */
export function stroke(b: Brush, pts: readonly Pt[], color: string, w = 1, close = false): void {
  const { g } = b
  g.beginPath()
  g.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1])
  if (close) g.closePath()
  g.lineWidth = Math.max(w, 1) * b.px
  g.lineJoin = 'round'
  g.lineCap = 'round'
  g.strokeStyle = color
  g.stroke()
}

/** A line `w` cells wide (it scales with the picture): a beam, a rope, a rail. */
export function bar(b: Brush, x0: number, y0: number, x1: number, y1: number, color: string, w: number, cap: CanvasLineCap = 'butt'): void {
  const { g } = b
  g.beginPath()
  g.moveTo(x0, y0)
  g.lineTo(x1, y1)
  g.lineWidth = Math.max(w, b.px)
  g.lineCap = cap
  g.strokeStyle = color
  g.stroke()
}

/** Points round an arc, from `a0` to `a1` (radians, y down). */
export function arc(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n: number): Pt[] {
  const out: Pt[] = []
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n
    out.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry])
  }
  return out
}

/** A shape turned by `a` about `[cx, cy]` and moved by `[dx, dy]`. */
export function turn(pts: readonly Pt[], a: number, cx = 0, cy = 0, dx = 0, dy = 0): Pt[] {
  const c = Math.cos(a)
  const s = Math.sin(a)
  return pts.map(([x, y]) => [cx + dx + (x - cx) * c - (y - cy) * s, cy + dy + (x - cx) * s + (y - cy) * c])
}

/* ------------------------------------------------------------------ numbers */

export const clamp = (v: number, a = 0, b = 1): number => (v < a ? a : v > b ? b : v)
/** 0 before `a`, 1 after `b`, a smooth step between. */
export function smooth(t: number, a: number, b: number): number {
  const u = clamp((t - a) / (b - a))
  return u * u * (3 - 2 * u)
}
export const lerp = (a: number, b: number, f: number): number => a + (b - a) * f
export const easeOut = (u: number): number => 1 - (1 - u) * (1 - u)
export const easeIn = (u: number): number => u * u
export const easeInOut = (u: number): number => (u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u))

/** A stable hash, 0 to 1. */
export function hash(a: number, b = 0, s = 0): number {
  let h = (a * 374761393 + b * 668265263 + s * 1013904223) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

/** A damped swing after a blow at `t0`: 0 before it, `amp` at once, dying away at `decay` per second. */
export function ring(t: number, t0: number, amp: number, freq: number, decay: number): number {
  const u = t - t0
  if (u < 0) return 0
  return amp * Math.exp(-decay * u) * Math.sin(u * freq * Math.PI * 2)
}
