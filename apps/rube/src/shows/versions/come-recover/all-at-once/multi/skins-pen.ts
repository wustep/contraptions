/**
 * A pen for the multi worlds: straight onto the canvas, in cells, with none of p5's bookkeeping. The surf and the
 * mosaic paint a great many small things a frame (sixty-four worlds at once, and more), so they talk to the 2D
 * context themselves. A pen is a context whose transform already maps a scene's cells to the device's pixels, the
 * width of one ink line in those cells, and how much detail the scene can take at its size.
 *
 * Detail: 0 is a full picture, 1 drops the fine lines, 2 keeps only the big shapes, 3 is a colour and a dot.
 */

export type Pt = [number, number]

export interface Pen {
  ctx: CanvasRenderingContext2D
  /** Device pixels a cell (for picking detail and hairlines). */
  q: number
  /** One ink line, in cells. */
  lw: number
  lod: 0 | 1 | 2 | 3
  ink: string
}

/** The detail a scene of `q` device pixels a cell can take. */
export const lodFor = (q: number): Pen['lod'] => (q >= 34 ? 0 : q >= 17 ? 1 : q >= 6 ? 2 : 3)

/** A colour with an alpha, as a CSS string. */
export function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.max(0, Math.min(1, a))})`
}

/** Two `#rrggbb` colours mixed. */
export function mix(a: string, b: string, f: number): string {
  const g = Math.max(0, Math.min(1, f))
  const x = parseInt(a.slice(1), 16)
  const y = parseInt(b.slice(1), 16)
  const ch = (s: number) => Math.round(((x >> s) & 255) * (1 - g) + ((y >> s) & 255) * g)
  return `#${((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1)}`
}

/** Fill (and, from `lod` 1 down, ink) the current path. `ink` 0 draws no line; otherwise it is the line's weight. */
function finish(pen: Pen, fill: string | null, ink = 1): void {
  const { ctx } = pen
  if (fill) {
    ctx.fillStyle = fill
    ctx.fill()
  }
  if (ink > 0 && pen.lod <= 1) {
    ctx.strokeStyle = pen.ink
    ctx.lineWidth = pen.lw * ink
    ctx.stroke()
  }
}

export function rect(pen: Pen, x: number, y: number, w: number, h: number, fill: string | null, ink = 1): void {
  const { ctx } = pen
  if (ink <= 0 || pen.lod > 1) {
    if (fill) {
      ctx.fillStyle = fill
      ctx.fillRect(x, y, w, h)
    }
    return
  }
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  finish(pen, fill, ink)
}

export function round(pen: Pen, x: number, y: number, w: number, h: number, r: number, fill: string | null, ink = 1): void {
  const { ctx } = pen
  ctx.beginPath()
  const rr = Math.max(0, Math.min(r, w / 2, h / 2))
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
  finish(pen, fill, ink)
}

export function poly(pen: Pen, pts: readonly Pt[], fill: string | null, ink = 1, closed = true): void {
  const { ctx } = pen
  ctx.beginPath()
  ctx.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1])
  if (closed) ctx.closePath()
  finish(pen, closed ? fill : null, ink)
}

export function circle(pen: Pen, x: number, y: number, r: number, fill: string | null, ink = 1): void {
  const { ctx } = pen
  ctx.beginPath()
  ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2)
  finish(pen, fill, ink)
}

export function ellipse(pen: Pen, x: number, y: number, rx: number, ry: number, fill: string | null, ink = 1, rot = 0): void {
  const { ctx } = pen
  ctx.beginPath()
  ctx.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), rot, 0, Math.PI * 2)
  finish(pen, fill, ink)
}

/** A stroke of `colour`, `w` cells wide. */
export function line(pen: Pen, x0: number, y0: number, x1: number, y1: number, colour: string, w: number): void {
  const { ctx } = pen
  ctx.beginPath()
  ctx.moveTo(x0, y0)
  ctx.lineTo(x1, y1)
  ctx.strokeStyle = colour
  ctx.lineWidth = w
  ctx.stroke()
}

/** A light: a radial glow of `hex` (the one kind of gradient the style allows). */
export function glow(pen: Pen, x: number, y: number, r: number, hex: string, a: number): void {
  if (a <= 0.004 || r <= 0) return
  const { ctx } = pen
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, rgba(hex, a))
  g.addColorStop(0.4, rgba(hex, a * 0.4))
  g.addColorStop(1, rgba(hex, 0))
  ctx.fillStyle = g
  ctx.fillRect(x - r, y - r, 2 * r, 2 * r)
}

/** A beam of light from (x0, y0) spreading to `w1` wide at (x1, y1), fading along its length. */
export function beam(pen: Pen, x0: number, y0: number, x1: number, y1: number, w0: number, w1: number, hex: string, a: number): void {
  if (a <= 0.004) return
  const { ctx } = pen
  const dx = x1 - x0
  const dy = y1 - y0
  const L = Math.hypot(dx, dy) || 1
  const nx = -dy / L
  const ny = dx / L
  const g = ctx.createLinearGradient(x0, y0, x1, y1)
  g.addColorStop(0, rgba(hex, a))
  g.addColorStop(1, rgba(hex, 0))
  ctx.beginPath()
  ctx.moveTo(x0 + (nx * w0) / 2, y0 + (ny * w0) / 2)
  ctx.lineTo(x1 + (nx * w1) / 2, y1 + (ny * w1) / 2)
  ctx.lineTo(x1 - (nx * w1) / 2, y1 - (ny * w1) / 2)
  ctx.lineTo(x0 - (nx * w0) / 2, y0 - (ny * w0) / 2)
  ctx.closePath()
  ctx.fillStyle = g
  ctx.fill()
}

/** Run `fn` with the pen moved to (x, y), turned by `a` and scaled by `s`. */
export function at(pen: Pen, x: number, y: number, a: number, s: number, fn: () => void): void {
  const { ctx } = pen
  ctx.save()
  ctx.translate(x, y)
  if (a) ctx.rotate(a)
  if (s !== 1) ctx.scale(s, s)
  fn()
  ctx.restore()
}

/** A stable hash in [0, 1). */
export const hash = (a: number, b = 0, s = 0): number => {
  let h = (a * 374761393 + b * 668265263 + s * 1013904223) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

export const clamp01 = (v: number): number => Math.max(0, Math.min(1, v))
export const smooth = (t: number, a: number, b: number): number => {
  const u = clamp01((t - a) / (b - a))
  return u * u * (3 - 2 * u)
}
/** A knock: 1 as `since` crosses zero, decaying; 0 before. */
export const knock = (since: number, decay = 0.18): number => (since < 0 ? 0 : Math.exp(-since / decay))
