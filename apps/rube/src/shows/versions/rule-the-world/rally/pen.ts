import type p5 from 'p5'
import type { Pt } from '../../../../parts'

/**
 * The drawing hand every place of Rally shares (Quintessence's): flat fills in a few values, soft gradients only for
 * light, smoke and fire. Everything takes cells and draws in pixels (`k` a cell), in the
 * frame the stage has translated to. A `Pen` also carries a `tone`, which every colour passes through on its way to
 * the canvas: how a place can drain or warm its colour without each drawing knowing.
 */
export interface Pen {
  p: p5
  k: number
  ink: string
  w: number
  tone: (hex: string) => string
}

export const ctxOf = (p: p5): CanvasRenderingContext2D => p.drawingContext as CanvasRenderingContext2D

const hex2 = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
export function rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}
export const toHex = (r: number, g: number, b: number): string => `#${hex2(r)}${hex2(g)}${hex2(b)}`
export function mix(a: string, b: string, f: number): string {
  const [r1, g1, b1] = rgb(a)
  const [r2, g2, b2] = rgb(b)
  const u = Math.max(0, Math.min(1, f))
  return toHex(r1 + (r2 - r1) * u, g1 + (g2 - g1) * u, b1 + (b2 - b1) * u)
}
/** The colour with its saturation taken out by `f` (0 none, 1 all) and its value scaled by `dim`. */
export function drain(hex: string, f: number, dim = 1): string {
  const [r, g, b] = rgb(hex)
  const y = 0.3 * r + 0.59 * g + 0.11 * b
  const u = Math.max(0, Math.min(1, f))
  return toHex((r + (y - r) * u) * dim, (g + (y - g) * u) * dim, (b + (y - b) * u) * dim)
}
/** A CSS colour with alpha, through the pen's tone. */
export function rgba(pen: Pen, hex: string, a: number): string {
  const [r, g, b] = rgb(pen.tone(hex))
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a))})`
}

function paint(pen: Pen, fill: string | null, lw: number, ink: string): void {
  const { p } = pen
  if (fill) p.fill(pen.tone(fill))
  else p.noFill()
  if (lw > 0) {
    p.stroke(pen.tone(ink))
    p.strokeWeight(pen.w * lw)
  } else p.noStroke()
}

/** A closed shape. `lw` is a share of the stage's line weight (0 for none). */
export function shape(pen: Pen, pts: Pt[], fill: string | null, lw = 0, ink = pen.ink): void {
  const { p, k } = pen
  paint(pen, fill, lw, ink)
  p.beginShape()
  for (const [x, y] of pts) p.vertex(x * k, y * k)
  p.endShape(p.CLOSE)
}

export const rect = (pen: Pen, x0: number, y0: number, x1: number, y1: number, fill: string | null, lw = 0, ink = pen.ink): void =>
  shape(pen, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], fill, lw, ink)

export function ellipse(pen: Pen, c: Pt, rx: number, ry: number, fill: string | null, lw = 0, ink = pen.ink): void {
  const { p, k } = pen
  paint(pen, fill, lw, ink)
  p.ellipse(c[0] * k, c[1] * k, 2 * rx * k, 2 * ry * k)
}

export function line(pen: Pen, a: Pt, b: Pt, col: string, lw = 0.8): void {
  const { p, k } = pen
  p.stroke(pen.tone(col))
  p.strokeWeight(pen.w * lw)
  p.line(a[0] * k, a[1] * k, b[0] * k, b[1] * k)
}

/** An open polyline. */
export function path(pen: Pen, pts: Pt[], col: string, lw = 0.8): void {
  const { p, k } = pen
  p.noFill()
  p.stroke(pen.tone(col))
  p.strokeWeight(pen.w * lw)
  p.beginShape()
  for (const [x, y] of pts) p.vertex(x * k, y * k)
  p.endShape()
}

/** A soft round light: `col` at `a` in the middle, nothing at radius `r`. */
export function glow(pen: Pen, c: Pt, r: number, col: string, a: number): void {
  if (a <= 0.003 || r <= 0) return
  const { k } = pen
  const ctx = ctxOf(pen.p)
  const g = ctx.createRadialGradient(c[0] * k, c[1] * k, 0, c[0] * k, c[1] * k, r * k)
  g.addColorStop(0, rgba(pen, col, a))
  g.addColorStop(0.45, rgba(pen, col, a * 0.42))
  g.addColorStop(1, rgba(pen, col, 0))
  ctx.save()
  ctx.fillStyle = g
  ctx.fillRect((c[0] - r) * k, (c[1] - r) * k, 2 * r * k, 2 * r * k)
  ctx.restore()
}

/** A box filled with a vertical gradient through `stops` ([at 0..1, colour, alpha]). */
export function vgrad(pen: Pen, x0: number, y0: number, x1: number, y1: number, stops: [number, string, number][]): void {
  const { k } = pen
  const ctx = ctxOf(pen.p)
  const g = ctx.createLinearGradient(0, y0 * k, 0, y1 * k)
  for (const [at, col, a] of stops) g.addColorStop(at, rgba(pen, col, a))
  ctx.save()
  ctx.fillStyle = g
  ctx.fillRect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k)
  ctx.restore()
}

/** A closed shape filled through a canvas fill (a gradient), in cells. */
export function fillWith(pen: Pen, pts: Pt[], style: string | CanvasGradient): void {
  const { k } = pen
  const ctx = ctxOf(pen.p)
  ctx.save()
  ctx.beginPath()
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * k, y * k) : ctx.moveTo(x * k, y * k)))
  ctx.closePath()
  ctx.fillStyle = style
  ctx.fill()
  ctx.restore()
}

/** A smooth closed blob through `pts` (a Catmull-Rom loop), filled. */
export function blob(pen: Pen, pts: Pt[], fill: string, a = 1): void {
  const { k } = pen
  const ctx = ctxOf(pen.p)
  const n = pts.length
  if (n < 3) return
  ctx.save()
  ctx.beginPath()
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n]
    const p1 = pts[i]
    const p2 = pts[(i + 1) % n]
    const p3 = pts[(i + 2) % n]
    if (i === 0) ctx.moveTo(p1[0] * k, p1[1] * k)
    ctx.bezierCurveTo(
      (p1[0] + (p2[0] - p0[0]) / 6) * k,
      (p1[1] + (p2[1] - p0[1]) / 6) * k,
      (p2[0] - (p3[0] - p1[0]) / 6) * k,
      (p2[1] - (p3[1] - p1[1]) / 6) * k,
      p2[0] * k,
      p2[1] * k,
    )
  }
  ctx.closePath()
  ctx.fillStyle = rgba(pen, fill, a)
  ctx.fill()
  ctx.restore()
}

/** A small four-pointed glint: the light catching something. */
export function glint(pen: Pen, c: Pt, r: number, col: string, a: number): void {
  if (a <= 0.01) return
  glow(pen, c, r * 1.6, col, a * 0.5)
  const s = r * 0.16
  const { k } = pen
  const ctx = ctxOf(pen.p)
  ctx.save()
  ctx.fillStyle = rgba(pen, col, a)
  ctx.beginPath()
  const q: Pt[] = [[c[0], c[1] - r], [c[0] + s, c[1] - s], [c[0] + r, c[1]], [c[0] + s, c[1] + s], [c[0], c[1] + r], [c[0] - s, c[1] + s], [c[0] - r, c[1]], [c[0] - s, c[1] - s]]
  q.forEach(([x, y], i) => (i ? ctx.lineTo(x * k, y * k) : ctx.moveTo(x * k, y * k)))
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

/** A damped wobble: 0 before `since` is 0, a ring that dies away (`f` hertz, `tau` seconds). */
export const ring = (since: number, f = 6, tau = 0.25): number => (since < 0 ? 0 : Math.exp(-since / tau) * Math.sin(since * f * Math.PI * 2))
/** 1 at the moment, decaying. */
export const flash = (since: number, tau = 0.2): number => (since < 0 ? 0 : Math.exp(-since / tau))
export const clamp01 = (u: number): number => Math.max(0, Math.min(1, u))
export const ease = (u: number): number => {
  const v = clamp01(u)
  return v * v * (3 - 2 * v)
}
