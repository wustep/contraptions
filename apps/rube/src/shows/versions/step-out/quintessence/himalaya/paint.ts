import type { Pt } from '../../../../../parts'
import { mix, rgba } from '../home/pen'

/**
 * How the Himalayas lay their big areas on: in flat colour wherever it can be, since a gradient over a large area is
 * what a software canvas is slowest at. A sky, a snowfield or the sea of cloud is laid in level bands of flat colour a
 * few pixels tall, and the sun's light is a flat area cut to the line it has come down to, with a gradient only along
 * that line.
 */

type C2 = CanvasRenderingContext2D

/**
 * Level bands of flat colour over `[y0, y1]` (cells) and `[x0, x1]`: each band a few pixels tall, on whole pixels of the
 * screen so no seam shows between them, and the colour `at` gives for its middle (so it is fixed to the world, and
 * only its edges stay put on the screen). With `shape`, each band fills only that shape (a rectangle clip on whole
 * pixels is free). Only what is in the canvas is drawn.
 */
export function bands(c: C2, x0: number, x1: number, y0: number, y1: number, at: (y: number) => string, shape?: Path2D, px = shape ? 32 : 4): void {
  const m = c.getTransform()
  if (Math.abs(m.b) > 1e-9 || Math.abs(m.c) > 1e-9 || m.d <= 0) return
  const H = c.canvas.height
  const W = c.canvas.width
  const d0 = Math.max(0, Math.floor(m.d * y0 + m.f))
  const d1 = Math.min(H, Math.ceil(m.d * y1 + m.f))
  const e0 = Math.max(0, Math.floor(m.a * x0 + m.e))
  const e1 = Math.min(W, Math.ceil(m.a * x1 + m.e))
  if (d1 <= d0 || e1 <= e0) return
  for (let d = d0; d < d1; d += px) {
    const h = Math.min(px, d1 - d)
    c.fillStyle = at((d + h / 2 - m.f) / m.d)
    c.save()
    c.setTransform(1, 0, 0, 1, 0, 0)
    if (shape) {
      c.beginPath()
      c.rect(e0, d, e1 - e0, h)
      c.clip()
      c.setTransform(m)
      c.fill(shape)
    } else c.fillRect(e0, d, e1 - e0, h)
    c.restore()
  }
}

/** The part of a polygon on the side of a line where `n · p <= d` (Sutherland–Hodgman). */
export function cut(poly: readonly Pt[], n: Pt, d: number): Pt[] {
  const out: Pt[] = []
  const side = (p: Pt) => n[0] * p[0] + n[1] * p[1] - d
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    const sa = side(a)
    const sb = side(b)
    if (sa <= 0) out.push(a)
    if (sa <= 0 !== sb <= 0) {
      const u = sa / (sa - sb)
      out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u])
    }
  }
  return out
}

const trace = (c: C2, pts: readonly Pt[]) => {
  c.beginPath()
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)))
  c.closePath()
}

/** The sun's line on the machine's plane: through (8, `ly`), falling a little to the right, the side the light comes from. */
const N: Pt = [-0.12 / Math.hypot(0.12, 1), 1 / Math.hypot(0.12, 1)]

/**
 * The sun on a shape of the machine's plane: flat light over the part of it above the line the light has come down to
 * (`ly`, at x = 8), and a soft edge along the line. `lit` is the light's colour on it.
 */
export function sunOn(c: C2, poly: readonly Pt[], ly: number, lit: string, soft = [0.6, 0.4]): void {
  const d = N[0] * 8 + N[1] * ly
  const full = cut(poly, N, d - soft[0])
  if (full.length > 2) {
    c.fillStyle = lit
    trace(c, full)
    c.fill()
  }
  const edge = cut(cut(poly, N, d + soft[1]), [-N[0], -N[1]], -(d - soft[0]))
  if (edge.length > 2) {
    const g = c.createLinearGradient(8 + N[0] * -soft[0], ly + N[1] * -soft[0], 8 + N[0] * soft[1], ly + N[1] * soft[1])
    g.addColorStop(0, rgba(lit, 1))
    g.addColorStop(1, rgba(lit, 0))
    c.fillStyle = g
    trace(c, edge)
    c.fill()
  }
}

/** A colour along a run of stops, by `u` from 0 to 1. */
export function along(stops: readonly [number, string][], u: number): string {
  if (u <= stops[0][0]) return stops[0][1]
  for (let i = 1; i < stops.length; i++) {
    if (u <= stops[i][0]) return mix(stops[i - 1][1], stops[i][1], (u - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]))
  }
  return stops[stops.length - 1][1]
}

/** How many samples across a row of billows can hold. */
export const SAMPLES = 4096
/** Scratch for a row of billows' tops and undersides, sampled across it: filled afresh for every row of every frame. */
export const ROWS = [new Float64Array(SAMPLES), new Float64Array(SAMPLES)] as const

/** One billow (an ellipse at `cx, cy`, radii `rx, ry`) into a row's samples from `x0`, `dx` apart: the highest top and lowest underside at each. */
export function billow(tops: Float64Array, lows: Float64Array, x0: number, dx: number, n: number, cx: number, cy: number, rx: number, ry: number): void {
  const k0 = Math.max(0, Math.ceil((cx - rx - x0) / dx))
  const k1 = Math.min(n - 1, Math.floor((cx + rx - x0) / dx))
  for (let k = k0; k <= k1; k++) {
    const u = (x0 + k * dx - cx) / rx
    const v = ry * Math.sqrt(Math.max(0, 1 - u * u))
    if (cy - v < tops[k]) tops[k] = cy - v
    if (cy + v > lows[k]) lows[k] = cy + v
  }
}

/**
 * The outline of a row of billows from its samples: each run of them that something covers, along its tops and back
 * along its undersides. One outline fills far faster than the billows overlapping one another.
 */
export function rowOutline(tops: Float64Array, lows: Float64Array, x0: number, dx: number, n: number): Path2D {
  const path = new Path2D()
  let k = 0
  while (k < n) {
    while (k < n && tops[k] === Infinity) k++
    const a = k
    while (k < n && tops[k] !== Infinity) k++
    if (k - a < 2) continue
    path.moveTo(x0 + a * dx, tops[a])
    for (let q = a + 1; q < k; q++) path.lineTo(x0 + q * dx, tops[q])
    for (let q = k - 1; q >= a; q--) path.lineTo(x0 + q * dx, lows[q])
    path.closePath()
  }
  return path
}

/** How many samples across a lobe of cloud. */
const LOBE = 20
const LX = new Float64Array(LOBE + 1)
const LT = new Float64Array(LOBE + 1)
const LB = new Float64Array(LOBE + 1)

/**
 * One lobe of a heap of cloud (an ellipse at `cx, cy`, radii `rx, ry`), standing in what is under it along `foot`:
 * the whole of it in shadow (`side`); the part the sun reaches, moved toward it (`body`); and its crown, up and toward
 * the sun (`crown`), lit. Each part is the lobe cut by another ellipse inside it, so none spills out of it.
 */
export function lobe(c: C2, cx: number, cy: number, rx: number, ry: number, foot: (x: number) => number, side: string, body: string, crown: string): void {
  for (let k = 0; k <= LOBE; k++) {
    const u = -1 + (2 * k) / LOBE
    const v = Math.sqrt(Math.max(0, 1 - u * u))
    LX[k] = cx + u * rx
    LT[k] = cy - ry * v
    LB[k] = Math.max(LT[k], Math.min(cy + ry * v, foot(LX[k])))
  }
  // The top of an ellipse inside the lobe, moved `ox` (of the radius) along and `oy` up, scaled `s`, at sample `k`.
  const inner = (k: number, ox: number, oy: number, sc: number) => {
    const u = (LX[k] - cx - ox * rx) / (sc * rx)
    return Math.abs(u) < 1 ? Math.min(LB[k], Math.max(LT[k], cy - oy * ry - sc * ry * Math.sqrt(1 - u * u))) : NaN
  }
  const run = (tops: (k: number) => number, lows: (k: number, y: number) => number, col: string) => {
    let a = -1
    let b = -1
    for (let k = 0; k <= LOBE; k++) {
      if (Number.isNaN(tops(k))) continue
      if (a < 0) a = k
      b = k
    }
    if (b - a < 1) return
    c.beginPath()
    for (let k = a; k <= b; k++) c.lineTo(LX[k], tops(k))
    for (let k = b; k >= a; k--) c.lineTo(LX[k], lows(k, tops(k)))
    c.fillStyle = col
    c.fill()
  }
  run((k) => LT[k], (k) => LB[k], side)
  run((k) => inner(k, 0.28, 0, 1), (k) => LB[k], body)
  run((k) => inner(k, 0.12, 0.18, 0.84), (k, y) => y + 0.45 * (LB[k] - y), crown)
}
