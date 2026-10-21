import type p5 from 'p5'
import type { Piece, PieceCtx } from '../../../../parts'
import type { Placed } from '../../../../plan'

/**
 * How Sleeper draws. Every drawing is a standing piece told show time, drawn straight onto the canvas in world cells
 * (the context scaled by the cell size) inside a save and a restore, so p5's own note of the fill and stroke stays true
 * for the balls the stage draws after it. Colours are strings with their alpha written to three places: a tiny alpha
 * printed as 5e-7 is a colour p5 cannot read, and it paints white.
 *
 * The look is Villeneuve's: very large, very plain shapes against a lot of air, few lines, flat fills, and depth from
 * layers that pale toward the haze behind them. Light comes from where it comes from (the sun, a lamp, a fire) as flat
 * shapes on what it falls on, never as a glow. Nothing sparkles.
 */

export type Pt = [number, number]

export interface View {
  x0: number
  y0: number
  x1: number
  y1: number
  cx: number
  cy: number
  /** The frame's width and height in cells (wider than 16:9 where the stage is). */
  w: number
  h: number
}

export interface Paint {
  ctx: CanvasRenderingContext2D
  /** Pixels per cell. */
  k: number
  /** Show time. */
  t: number
  /** What the frame shows, in world cells. */
  view: View
  /** One CSS pixel, in cells. */
  px: number
}

export type Drawer = (g: Paint) => void

/** The frame in world cells, read back through the canvas's transform (a standing piece is drawn at the origin). */
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

/** A box in world cells. */
export interface Box {
  x0: number
  y0: number
  x1: number
  y1: number
}

/**
 * The cells a standing drawing claims: all of them. The stage asks each piece whether any of its cells is in the frame
 * (`Array.some` over them); this answers yes at once, and the drawing culls itself against its own box instead (a grid
 * of cells fine enough for a close-up would be tens of thousands for a place the size of Caladan).
 */
const EVERYWHERE: Pt[] = Object.assign([[0, 0]] as Pt[], { some: () => true })

/**
 * A drawing that stands for the whole show at the world's origin: `draw` under the balls, `over` over them, called only
 * while `box` is in the frame (always, without one).
 */
export function standing(name: string, box: Box | null, draw: Drawer | null, over: Drawer | null = null): Placed {
  const wrap = (fn: Drawer) => (p: p5, _s: null, c: PieceCtx) => {
    const ctx = p.drawingContext as CanvasRenderingContext2D
    ctx.save()
    ctx.scale(c.k, c.k)
    try {
      const view = viewOf(ctx, p, 1)
      if (!box || seen(view, box.x0, box.y0, box.x1, box.y1)) fn({ ctx, k: c.k, t: c.t, view, px: 1 / c.k })
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
    lane: { segs: [{ from: [0, 0], to: [0, 0], dur: 1e6 }], fire: 0 },
    start: 0,
    span: 1e6,
    ballIn: { color: '#000000', ghost: false, id: 0 },
    changes: [],
    points: 0,
  }
}

/** Whether a box (cells) is in the frame at all. */
export const seen = (v: View, x0: number, y0: number, x1: number, y1: number): boolean => x1 >= v.x0 && x0 <= v.x1 && y1 >= v.y0 && y0 <= v.y1

/* ------------------------------------------------------------------ colour */

const HEX = /^#([0-9a-f]{6})$/i
export function rgbOf(hex: string): [number, number, number] {
  const m = HEX.exec(hex)
  if (!m) return [0, 0, 0]
  const v = parseInt(m[1], 16)
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255]
}
const hex2 = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')

/** `hex` at alpha `a` (0 to 1). */
export function rgba(hex: string, a: number): string {
  const [r, g, b] = rgbOf(hex)
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a)).toFixed(3)})`
}

/** `a` mixed `f` of the way to `b`, as a hex colour. */
export function mix(a: string, b: string, f: number): string {
  const A = rgbOf(a)
  const B = rgbOf(b)
  const u = Math.max(0, Math.min(1, f))
  return `#${hex2(A[0] + (B[0] - A[0]) * u)}${hex2(A[1] + (B[1] - A[1]) * u)}${hex2(A[2] + (B[2] - A[2]) * u)}`
}

/** A colour taken toward the air behind it: `haze` of the way to `air`. */
export const hazed = (c: string, air: string, haze: number): string => mix(c, air, haze)

/* ------------------------------------------------------------------ shapes */

export function poly(ctx: CanvasRenderingContext2D, pts: Pt[], close = true): void {
  ctx.beginPath()
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
  if (close) ctx.closePath()
}

/** A closed shape through the midpoints of `pts`, its corners rounded off. */
export function blob(ctx: CanvasRenderingContext2D, pts: Pt[]): void {
  const n = pts.length
  const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  ctx.beginPath()
  const m0 = mid(pts[n - 1], pts[0])
  ctx.moveTo(m0[0], m0[1])
  for (let i = 0; i < n; i++) {
    const m = mid(pts[i], pts[(i + 1) % n])
    ctx.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1])
  }
  ctx.closePath()
}

/** An open line through `pts`, its corners rounded off, ending on its last point. Adds to the current path. */
export function curveTo(ctx: CanvasRenderingContext2D, pts: Pt[], move = true): void {
  if (move) ctx.moveTo(pts[0][0], pts[0][1])
  else ctx.lineTo(pts[0][0], pts[0][1])
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

export function ellipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot = 0): void {
  ctx.beginPath()
  ctx.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), rot, 0, Math.PI * 2)
}

export function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.beginPath()
  ctx.rect(x, y, w, h)
}

export function fill(ctx: CanvasRenderingContext2D, color: string | CanvasGradient): void {
  ctx.fillStyle = color
  ctx.fill()
}

/** Stroke the current path `w` cells wide, never under 1.25 CSS pixels (a one-pixel line shimmers as the camera moves). */
export function stroke(g: Paint, color: string, w: number): void {
  g.ctx.strokeStyle = color
  g.ctx.lineWidth = Math.max(1.25 * g.px, w)
  g.ctx.stroke()
}

/** A straight line `w` cells wide, never under 1.25 CSS pixels. */
export function line(g: Paint, a: Pt, b: Pt, color: string, w: number): void {
  g.ctx.beginPath()
  g.ctx.moveTo(a[0], a[1])
  g.ctx.lineTo(b[0], b[1])
  stroke(g, color, w)
}

/** A vertical gradient from `y0` to `y1` through [share, colour] stops. */
export function vgrad(ctx: CanvasRenderingContext2D, y0: number, y1: number, stops: [number, string][]): CanvasGradient {
  const gr = ctx.createLinearGradient(0, y0, 0, y1)
  for (const [s, c] of stops) gr.addColorStop(Math.max(0, Math.min(1, s)), c)
  return gr
}

/** The whole frame, filled (a sky, a wash of dark). */
export function cover(g: Paint, color: string | CanvasGradient): void {
  const v = g.view
  g.ctx.fillStyle = color
  g.ctx.fillRect(v.x0 - 1, v.y0 - 1, v.w + 2, v.h + 2)
}

/* ------------------------------------------------------------------ depth */

/**
 * A layer `d` cells behind the plane the balls are on, through a camera that dollies (its distance is the frame's
 * height): it is `s = h / (h + d)` of its size, and slides that share of the way with the camera. `x` and `y` take a
 * point given as if it stood on the near plane to where it is drawn; the horizon is at the camera's height.
 */
export interface Layer {
  s: number
  x(x: number): number
  y(y: number): number
  pt(p: Pt): Pt
}
export function layer(view: View, d: number): Layer {
  const s = view.h / (view.h + Math.max(0, d))
  const x = (v: number) => view.cx + (v - view.cx) * s
  const y = (v: number) => view.cy + (v - view.cy) * s
  return { s, x, y, pt: ([a, b]) => [x(a), y(b)] }
}

/* ------------------------------------------------------------------ time */

export const clamp01 = (v: number): number => Math.max(0, Math.min(1, v))
export const lerp = (a: number, b: number, u: number): number => a + (b - a) * u
export const lerpPt = (a: Pt, b: Pt, u: number): Pt => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]
/** 0 until `a`, 1 from `b`, smooth between. */
export const smooth = (t: number, a: number, b: number): number => {
  const u = clamp01((t - a) / (b - a))
  return u * u * (3 - 2 * u)
}
/** 0 until `a`, 1 from `b`, smoother still (no jolt at either end). */
export const smoother = (t: number, a: number, b: number): number => {
  const u = clamp01((t - a) / (b - a))
  return u * u * u * (u * (u * 6 - 15) + 10)
}
/** Up over `a` to `b`, held, and down over `c` to `d`. */
export const bell = (t: number, a: number, b: number, c: number, d: number): number => smooth(t, a, b) * (1 - smooth(t, c, d))

/**
 * A struck thing's answer: nothing before `at`, then a swing that rings down like a damped spring (`f` cycles a second,
 * dying over `tau`). 0 at the strike, so it never jumps; peaks near 1.
 */
export function ring(t: number, at: number, f = 2, tau = 0.4): number {
  const s = t - at
  if (s <= 0) return 0
  return Math.sin(2 * Math.PI * f * s) * Math.exp(-s / tau)
}

/** A blow's give: 0 before `at`, up to 1 in `rise` seconds, back to 0 over `fall`, never a jump. */
export function kick(t: number, at: number, rise = 0.06, fall = 0.5): number {
  const s = t - at
  if (s <= 0) return 0
  if (s < rise) {
    const u = s / rise
    return u * u * (3 - 2 * u)
  }
  return Math.exp(-(s - rise) / Math.max(1e-3, fall / 3))
}

/** A stable hash in [0, 1) for scattering things by index. */
export const hash = (a: number, b = 0, c = 0): number => {
  let h = (a * 374761393 + b * 668265263 + c * 1013904223) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

/** Smooth noise in [-1, 1] along one axis (two octaves of eased value noise): for slow drift, never jitter. */
export function drift(x: number, seed = 0): number {
  const one = (u: number, s: number) => {
    const i = Math.floor(u)
    const f = u - i
    const e = f * f * (3 - 2 * f)
    return lerp(hash(i, s) * 2 - 1, hash(i + 1, s) * 2 - 1, e)
  }
  return one(x, seed) * 0.7 + one(x * 2.3 + 17, seed + 1) * 0.3
}
