import type p5 from 'p5'
import type { Piece, PieceCtx } from '../../../../parts'
import type { Placed } from '../../../../plan'
import { graded } from './grade'

/**
 * How Maker draws. Every drawing is a standing piece told show time and drawn straight onto the canvas in world cells
 * (the context scaled by the cell size), inside a save and a restore, so p5's own note of the fill and stroke it last
 * set stays true for the balls the stage draws after it.
 *
 * The look is the desert's: big flat shapes, few lines, depth from layers that pale into the haze, light only from
 * where it comes from (the sun, an eclipse's rim, a fire) as flat shapes on what it falls on, never as a glow. Every
 * colour goes through the grade (`grade.ts`), which is how the film's light goes from the orange desert through the
 * eclipse's infrared to Giedi Prime's black and white and back.
 */

export type Pt = [number, number]

export interface View {
  x0: number
  y0: number
  x1: number
  y1: number
  cx: number
  cy: number
  /** The frame's width and height in cells (wider or taller than 16:9 where the stage is). */
  w: number
  h: number
}

export interface Brush {
  ctx: CanvasRenderingContext2D
  /** Pixels per cell. */
  k: number
  /** Show time. */
  t: number
  /** The frame, in world cells. */
  view: View
  /** One CSS pixel, in cells. */
  px: number
  /** `hex` through the grade at this frame's time, as a canvas colour. */
  c(hex: string): string
  /** `hex` through the grade at alpha `a`. */
  ca(hex: string, a: number): string
}

/** The frame in world cells, read back through the canvas's transform. */
function viewOf(ctx: CanvasRenderingContext2D, p: p5, k: number): View {
  const m = ctx.getTransform().inverse()
  const d = p.pixelDensity()
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (const [px, py] of [[0, 0], [p.width * d, 0], [0, p.height * d], [p.width * d, p.height * d]]) {
    const x = (m.a * px + m.c * py + m.e) / k
    const y = (m.b * px + m.d * py + m.f) / k
    x0 = Math.min(x0, x)
    x1 = Math.max(x1, x)
    y0 = Math.min(y0, y)
    y1 = Math.max(y1, y)
  }
  return { x0, y0, x1, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0 }
}

/**
 * In a stage taller than 16:9 (a phone held upright), the share of the extra picture that lies above the composed frame
 * (`Performance.tall`): more sky over the desert than sand under it.
 */
export const TALL = 0.7

/**
 * The composed 16:9 frame inside the view: its middle and its height in cells. A stage wider than 16:9 shows more round
 * it, a taller one more above and below it (by `TALL`); the composition, the horizon and the depth of far things go by
 * this frame, not the stage, so a phone sees the same picture with more sky.
 */
export function composed(view: View): { cx: number; cy: number; h: number } {
  const h = Math.min(view.h, (view.w * 9) / 16)
  return { cx: view.cx, cy: view.cy + (TALL - 0.5) * (view.h - h), h }
}

export type Drawer = (b: Brush) => void

/**
 * Every drawing claims every cell: the stage asks a piece whether any of its cells is in view before drawing it, and a
 * drawing here knows better, from its own window of show time and the frame it is handed. So each one is asked every
 * frame and returns at once when it has nothing to draw.
 */
const EVERYWHERE = Object.assign([[0, 0]] as Pt[], { some: () => true })

/** A drawing that stands for the whole show at the world's origin: drawn under the balls (`draw`) and over them (`over`). */
export function drawing(name: string, duration: number, draw: Drawer | null, over: Drawer | null = null): Placed {
  const wrap = (fn: Drawer) => (p: p5, _s: null, c: PieceCtx) => {
    const ctx = p.drawingContext as CanvasRenderingContext2D
    ctx.save()
    ctx.scale(c.k, c.k)
    try {
      const t = c.t
      fn({ ctx, k: c.k, t, view: viewOf(ctx, p, 1), px: 1 / c.k, c: (hex) => graded(hex, t), ca: (hex, a) => rgba(graded(hex, t), a) })
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
    cells: EVERYWHERE,
    lane: { segs: [{ from: [0, 0], to: [0, 0], dur: duration }], fire: 0 },
    start: 0,
    span: duration,
    ballIn: { color: '#000000', ghost: false, id: 0 },
    changes: [],
    points: 0,
  }
}

/**
 * A layer `f` times the size of the action's plane, behind it: what is drawn in it shrinks toward the horizon point
 * under the frame's middle, so it moves by `f` of what the near plane moves as the camera pans or rises, and the
 * horizon (`hy`, world y) stays where it is. `f` 1 is the action's own plane.
 */
export function layer(b: Brush, f: number, hy: number, draw: (b: Brush) => void): void {
  if (f >= 0.999) {
    draw(b)
    return
  }
  const { ctx, view } = b
  ctx.save()
  ctx.translate(view.cx, hy)
  ctx.scale(f, f)
  ctx.translate(-view.cx, -hy)
  const v: View = {
    x0: view.cx + (view.x0 - view.cx) / f,
    x1: view.cx + (view.x1 - view.cx) / f,
    y0: hy + (view.y0 - hy) / f,
    y1: hy + (view.y1 - hy) / f,
    cx: view.cx,
    cy: hy + (view.cy - hy) / f,
    w: view.w / f,
    h: view.h / f,
  }
  try {
    draw({ ...b, view: v, px: b.px / f, k: b.k * f })
  } finally {
    ctx.restore()
  }
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
export const hexOf = (r: number, g: number, b: number): string => `#${hex2(r)}${hex2(g)}${hex2(b)}`

/**
 * `hex` at alpha `a` (0 to 1), as a canvas colour string. The alpha is printed to three places: a tiny alpha printed as
 * 5e-7 is a colour p5 cannot read, and paints opaque white.
 */
export function rgba(hex: string, a: number): string {
  const [r, g, b] = rgbOf(hex)
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a)).toFixed(3)})`
}

/** `a` mixed `f` of the way to `b`. */
export function mix(a: string, b: string, f: number): string {
  const A = rgbOf(a)
  const B = rgbOf(b)
  const u = Math.max(0, Math.min(1, f))
  return hexOf(A[0] + (B[0] - A[0]) * u, A[1] + (B[1] - A[1]) * u, A[2] + (B[2] - A[2]) * u)
}

/* ------------------------------------------------------------------ shapes */

export function poly(ctx: CanvasRenderingContext2D, pts: Pt[], close = true): void {
  ctx.beginPath()
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
  if (close) ctx.closePath()
}

/** An open line through `pts` with its corners rounded off (quadratics through the edges' midpoints). */
export function curve(ctx: CanvasRenderingContext2D, pts: Pt[], begin = true): void {
  if (begin) ctx.beginPath()
  ctx.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length - 1; i++) {
    const m: Pt = [(pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2]
    ctx.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1])
  }
  const last = pts[pts.length - 1]
  ctx.lineTo(last[0], last[1])
}

/** A closed shape through `pts` with its corners rounded off. */
export function blob(ctx: CanvasRenderingContext2D, pts: Pt[]): void {
  const n = pts.length
  ctx.beginPath()
  const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  const m0 = mid(pts[n - 1], pts[0])
  ctx.moveTo(m0[0], m0[1])
  for (let i = 0; i < n; i++) {
    const m = mid(pts[i], pts[(i + 1) % n])
    ctx.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1])
  }
  ctx.closePath()
}

export function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath()
  ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2)
}

export function ellipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot = 0): void {
  ctx.beginPath()
  ctx.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), rot, 0, Math.PI * 2)
}

export function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.beginPath()
  ctx.rect(x, y, w, h)
}

export function fill(b: Brush, hex: string, a = 1): void {
  b.ctx.fillStyle = a >= 1 ? b.c(hex) : b.ca(hex, a)
  b.ctx.fill()
}

/**
 * Stroke the current path `w` cells wide, through the grade; never under 1.25 CSS pixels, so no line ever lands on
 * exactly one device pixel, where the rasterizer flips between its hairline and its ordinary stroke frame to frame.
 */
export function stroke(b: Brush, hex: string, w: number, a = 1): void {
  b.ctx.strokeStyle = a >= 1 ? b.c(hex) : b.ca(hex, a)
  b.ctx.lineWidth = Math.max(1.25 * b.px, w)
  b.ctx.stroke()
}

/** A line from `a` to `b`, `w` cells wide (never under 1.25 CSS pixels). */
export function line(b: Brush, p: Pt, q: Pt, hex: string, w: number, a = 1): void {
  b.ctx.beginPath()
  b.ctx.moveTo(p[0], p[1])
  b.ctx.lineTo(q[0], q[1])
  stroke(b, hex, w, a)
}

/** A vertical gradient from `y0` to `y1` through the grade: stops are [share, colour]. */
export function vgrad(b: Brush, y0: number, y1: number, stops: [number, string][]): CanvasGradient {
  const gr = b.ctx.createLinearGradient(0, y0, 0, y1)
  for (const [s, c] of stops) gr.addColorStop(Math.max(0, Math.min(1, s)), b.c(c))
  return gr
}

/** Whether the box [x0, x1] × [y0, y1] is in the frame at all. */
export const inView = (v: View, x0: number, y0: number, x1: number, y1: number): boolean =>
  x1 >= v.x0 && x0 <= v.x1 && y1 >= v.y0 && y0 <= v.y1

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
export const lerp = (a: number, b: number, u: number) => a + (b - a) * u
export const lerpPt = (a: Pt, b: Pt, u: number): Pt => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]

/**
 * A struck thing's answer: nothing before `at`, then a swing that rings down like a damped spring (`f` cycles a
 * second, dying with `tau`). 0 at the strike, so it never jumps.
 */
export function ring(t: number, at: number, f = 2.2, tau = 0.45): number {
  const s = t - at
  if (s <= 0) return 0
  return Math.sin(2 * Math.PI * f * s) * Math.exp(-s / tau)
}

/** A blow's push: 0 before `at`, up to 1 in `rise` seconds, and back to 0 with `tau`. Smooth at both ends. */
export function pulse(t: number, at: number, rise = 0.08, tau = 0.5): number {
  const s = t - at
  if (s <= 0) return 0
  if (s < rise) return smooth(s, 0, rise)
  return Math.exp(-(s - rise) / tau)
}

/** A stable hash in [0, 1) for scattering things by index. */
export const hash = (a: number, b = 0, s = 0): number => {
  let h = (a * 374761393 + b * 668265263 + s * 1013904223) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

/** Smooth value noise in [-1, 1] along one axis: the same for the same `x` and `seed`. */
export function noise1(x: number, seed = 0): number {
  const i = Math.floor(x)
  const f = x - i
  const u = f * f * (3 - 2 * f)
  const a = hash(i, seed) * 2 - 1
  const c = hash(i + 1, seed) * 2 - 1
  return a + (c - a) * u
}
