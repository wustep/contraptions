import type p5 from 'p5'
import type { Piece, PieceCtx } from '../../../../parts'
import type { Placed } from '../../../../plan'

/**
 * How Kohaku paints. Every drawing is a standing piece told show time and drawn straight onto the canvas in world
 * cells (the context scaled by the cell size), inside a save and a restore, so p5's own note of the fill and stroke it
 * last set stays true for the balls the stage draws after. Colours with alpha are written to three places: an alpha
 * printed as 5e-7 is a colour p5 cannot read.
 *
 * The look is a painted film's, flattened: flat fills, a few gradients where light falls across a thing, ink only
 * where a made thing needs its edge (a rail, a beam, a door), none on what grows or drifts (grass, cloud, water).
 * Depth is layers paling into the air. Light is only where it comes from: a lamp's pool on the boards, a window's
 * square on the water. Nothing glows.
 */

export type Pt = [number, number]

export interface View {
  x0: number
  y0: number
  x1: number
  y1: number
  cx: number
  cy: number
  /** The frame's height and width in cells. */
  h: number
  w: number
}

export interface Paint {
  ctx: CanvasRenderingContext2D
  /** Pixels per cell. */
  k: number
  /** Show time. */
  t: number
  /** The frame, in world cells (wider than 16:9 where the stage is). */
  view: View
  /** One CSS pixel, in cells. */
  px: number
}

/** The frame in world cells, read back through the canvas's transform (a piece is drawn at the world's origin). */
function viewOf(ctx: CanvasRenderingContext2D, p: p5, k: number): View {
  const m = ctx.getTransform().inverse()
  const d = p.pixelDensity()
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  // The stage clips to its own viewport; a saved frame's canvas is the frame. Either way the canvas's corners bound it.
  for (const [px, py] of [[0, 0], [p.width * d, 0], [0, p.height * d], [p.width * d, p.height * d]]) {
    const x = (m.a * px + m.c * py + m.e) / k
    const y = (m.b * px + m.d * py + m.f) / k
    x0 = Math.min(x0, x)
    x1 = Math.max(x1, x)
    y0 = Math.min(y0, y)
    y1 = Math.max(y1, y)
  }
  return { x0, y0, x1, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, h: y1 - y0, w: x1 - x0 }
}

export type Drawer = (g: Paint) => void

/**
 * A drawing that stands for the whole show at the world's origin: `draw` under the balls, `over` over them. The stage
 * draws it whenever any of its `cells` is in view, so a drawing claims the cells it can be seen from (`region`).
 */
export function standing(name: string, cells: Pt[], duration: number, draw: Drawer | null, over: Drawer | null = null): Placed {
  const wrap = (fn: Drawer) => (p: p5, _s: null, c: PieceCtx) => {
    const ctx = p.drawingContext as CanvasRenderingContext2D
    ctx.save()
    ctx.scale(c.k, c.k)
    try {
      fn({ ctx, k: c.k, t: c.t, view: viewOf(ctx, p, 1), px: 1 / c.k })
    } finally {
      ctx.restore()
    }
  }
  const piece: Piece<null> = {
    name,
    weight: 0,
    place: () => null,
    draw: draw ? wrap(draw) : () => {},
    over: over ? wrap(over) : undefined,
  }
  return {
    piece,
    state: null,
    col: 0,
    row: 0,
    mirror: 1,
    cells,
    lane: { segs: [{ from: [0, 0], to: [0, 0], dur: duration }], fire: 0 },
    start: 0,
    span: duration,
    ballIn: { color: '#000000', ghost: false, id: 0 },
    changes: [],
    points: 0,
  }
}

/** A sparse claim of cells over a box, every `step`: the stage draws a piece whenever any of its cells is in view. */
export function region(x0: number, y0: number, x1: number, y1: number, step = 3): Pt[] {
  const out: Pt[] = []
  for (let x = x0; x <= x1 + 1e-9; x += step) for (let y = y0; y <= y1 + 1e-9; y += step) out.push([x, y])
  return out
}

/**
 * Draw `fn` in a far layer: `p` of the camera's travel across (0 stands still with the camera, as the sky does; 1 is
 * the world's own plane) and `q` of it up and down. Inside, coordinates are the layer's, which meet the world's when
 * the camera is at `at`.
 */
export function layer(g: Paint, p: number, q: number, at: Pt, fn: (v: View) => void): void {
  const dx = (g.view.cx - at[0]) * (1 - p)
  const dy = (g.view.cy - at[1]) * (1 - q)
  g.ctx.save()
  g.ctx.translate(dx, dy)
  const v = g.view
  fn({ ...v, x0: v.x0 - dx, x1: v.x1 - dx, cx: v.cx - dx, y0: v.y0 - dy, y1: v.y1 - dy, cy: v.cy - dy })
  g.ctx.restore()
}

/* ------------------------------------------------------------------ colour */

const hexRe = /^#([0-9a-f]{6})$/i
export function rgbOf(hex: string): [number, number, number] {
  const m = hexRe.exec(hex)
  if (!m) return [0, 0, 0]
  const v = parseInt(m[1], 16)
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255]
}
const hex2 = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')

/** `hex` at alpha `a` (0 to 1), as a canvas colour string. */
export function rgba(hex: string, a: number): string {
  const [r, g, b] = rgbOf(hex)
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a)).toFixed(3)})`
}

/** `a` mixed `f` of the way to `b`. */
export function mix(a: string, b: string, f: number): string {
  const A = rgbOf(a)
  const B = rgbOf(b)
  const u = Math.max(0, Math.min(1, f))
  return `#${hex2(A[0] + (B[0] - A[0]) * u)}${hex2(A[1] + (B[1] - A[1]) * u)}${hex2(A[2] + (B[2] - A[2]) * u)}`
}

/** `a` multiplied by `b` (a light falling on a surface), then `f` of the way back to `a`. */
export function lit(a: string, b: string, f = 0): string {
  const A = rgbOf(a)
  const B = rgbOf(b)
  const m = (i: number) => (A[i] * B[i]) / 255
  return mix(`#${hex2(m(0))}${hex2(m(1))}${hex2(m(2))}`, a, f)
}

/* ------------------------------------------------------------------ shapes */

export function poly(ctx: CanvasRenderingContext2D, pts: Pt[], close = true): void {
  ctx.beginPath()
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
  if (close) ctx.closePath()
}

/** A closed shape through `pts` with its corners rounded off (quadratics through the edges' midpoints). */
export function blob(ctx: CanvasRenderingContext2D, pts: Pt[]): void {
  const n = pts.length
  ctx.beginPath()
  const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  const m0 = mid(pts[n - 1], pts[0])
  ctx.moveTo(m0[0], m0[1])
  for (let i = 0; i < n; i++) {
    const p = pts[i]
    const m = mid(p, pts[(i + 1) % n])
    ctx.quadraticCurveTo(p[0], p[1], m[0], m[1])
  }
  ctx.closePath()
}

/** An open line through `pts` with its corners rounded off. */
export function curve(ctx: CanvasRenderingContext2D, pts: Pt[]): void {
  ctx.beginPath()
  ctx.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length - 1; i++) {
    const m: Pt = [(pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2]
    ctx.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1])
  }
  const last = pts[pts.length - 1]
  ctx.lineTo(last[0], last[1])
}

export function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath()
  ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2)
}

export function ellipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, a = 0): void {
  ctx.beginPath()
  ctx.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), a, 0, Math.PI * 2)
}

export function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.beginPath()
  ctx.rect(x, y, w, h)
}

export function fill(ctx: CanvasRenderingContext2D, color: string | CanvasGradient): void {
  ctx.fillStyle = color
  ctx.fill()
}

/** A rectangle filled flat. */
export function box(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string | CanvasGradient): void {
  ctx.fillStyle = color
  ctx.fillRect(x, y, w, h)
}

/**
 * Stroke the current path as an ink line `w` pixels wide at the reference framing (10 cells tall on a 1080p frame,
 * 108 pixels a cell): it scales with the camera as the balls' own outlines do, so it keeps its weight against them at
 * any distance, but never under 1.25 CSS pixels, so no hairline flickers between rasterizers.
 */
export function ink(g: Paint, color: string, w: number): void {
  g.ctx.strokeStyle = color
  g.ctx.lineWidth = Math.max(1.25 * g.px, w / 108)
  g.ctx.stroke()
}

/** A straight ink line from `a` to `b`. */
export function line(g: Paint, a: Pt, b: Pt, color: string, w: number): void {
  g.ctx.beginPath()
  g.ctx.moveTo(a[0], a[1])
  g.ctx.lineTo(b[0], b[1])
  ink(g, color, w)
}

/** A vertical gradient from `y0` to `y1` through [share, colour] stops. */
export function vgrad(ctx: CanvasRenderingContext2D, y0: number, y1: number, stops: [number, string][]): CanvasGradient {
  const gr = ctx.createLinearGradient(0, y0, 0, y1)
  for (const [s, c] of stops) gr.addColorStop(Math.max(0, Math.min(1, s)), c)
  return gr
}

/** A horizontal gradient from `x0` to `x1` through [share, colour] stops. */
export function hgrad(ctx: CanvasRenderingContext2D, x0: number, x1: number, stops: [number, string][]): CanvasGradient {
  const gr = ctx.createLinearGradient(x0, 0, x1, 0)
  for (const [s, c] of stops) gr.addColorStop(Math.max(0, Math.min(1, s)), c)
  return gr
}

/**
 * A pool of light round `x, y` as flat shapes, the way the light falls: a wide pale ellipse and a smaller, brighter
 * one at its heart (`sy` of its width tall). Hard edges, no fade: light here is a shape on what it falls on, not a glow.
 */
export function pool(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, a: number, sy = 1): void {
  if (a <= 0.003 || r <= 0) return
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(1, sy)
  ctx.fillStyle = rgba(color, a * 0.32)
  ctx.beginPath()
  ctx.arc(0, 0, r * 0.78, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = rgba(color, a * 0.3)
  ctx.beginPath()
  ctx.arc(0, 0, r * 0.42, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/* ------------------------------------------------------------------ time */

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
/** 0 until `a`, 1 from `b`, smooth between. */
export const smooth = (t: number, a: number, b: number): number => {
  const u = clamp01((t - a) / (b - a))
  return u * u * (3 - 2 * u)
}
/** 0 until `a`, 1 from `b`, smoother between (no jolt at either end). */
export const smoother = (t: number, a: number, b: number): number => {
  const u = clamp01((t - a) / (b - a))
  return u * u * u * (u * (u * 6 - 15) + 10)
}
/** Up from `a` to `b`, held, down from `c` to `d`. */
export const span = (t: number, a: number, b: number, c: number, d: number): number => smooth(t, a, b) * (1 - smooth(t, c, d))
export const lerp = (a: number, b: number, u: number) => a + (b - a) * u
export const lerpPt = (a: Pt, b: Pt, u: number): Pt => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]

/**
 * A struck thing's answer: nothing before `at`, then a swing that rings down like a damped spring (`f` cycles a
 * second, dying with `tau`). 0 at the strike, so it never jumps; peaks near ±1.
 */
export function ring(t: number, at: number, f = 2.2, tau = 0.45): number {
  const s = t - at
  if (s <= 0) return 0
  return Math.sin(2 * Math.PI * f * s) * Math.exp(-s / tau)
}

/** A knock: up at once to a peak a short while after `at`, then dying away; never negative, 0 before `at`. */
export function knock(t: number, at: number, rise = 0.06, tau = 0.35): number {
  const s = t - at
  if (s <= 0) return 0
  return (1 - Math.exp(-s / rise)) * Math.exp(-s / tau)
}

/** A stable hash in [0, 1) for scattering things by index. */
export const hash = (a: number, b = 0, s = 0): number => {
  let h = (a * 374761393 + b * 668265263 + s * 1013904223) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

/** A slow wander in [-1, 1] that never repeats visibly: two sines out of step, for grass, water and cloth. */
export const sway = (t: number, f: number, seed = 0): number =>
  0.65 * Math.sin(2 * Math.PI * f * t + seed * 2.39) + 0.35 * Math.sin(2 * Math.PI * f * 1.618 * t + seed * 5.1)
