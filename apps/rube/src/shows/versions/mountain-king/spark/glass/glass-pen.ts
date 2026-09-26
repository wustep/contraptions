import type p5 from 'p5'
import type { Pt } from '../../../../../parts'
import type { Ctx } from '../kit'

/**
 * GLASS's drawing helpers: a pen that knows the cell size and the ink, outlines in cells, and canvas gradients for
 * light (glow, fire, daylight), which is the only thing gradients are for.
 */
export interface Pen {
  p: p5
  k: number
  ink: string
  /** The ink's weight at this zoom. */
  w: number
  ctx: CanvasRenderingContext2D
}

export const penOf = (p: p5, c: Ctx): Pen => ({ p, k: c.k, ink: c.ink, w: c.weight, ctx: p.drawingContext as CanvasRenderingContext2D })

/** A filled outline, inked (weight `lw` times the ink's; 0 for none). */
export function shape(pen: Pen, pts: Pt[], fill: string | p5.Color | null, lw = 0.8, stroke: string | p5.Color = pen.ink): void {
  const { p, k } = pen
  if (fill === null) p.noFill()
  else p.fill(fill as string)
  if (lw > 0) {
    p.stroke(stroke as string)
    p.strokeWeight(pen.w * lw)
  } else p.noStroke()
  p.beginShape()
  for (const [x, y] of pts) p.vertex(x * k, y * k)
  p.endShape(p.CLOSE)
}

/** An open line through points. */
export function strokeLine(pen: Pen, pts: Pt[], color: string | p5.Color, width: number): void {
  const { p, k } = pen
  p.noFill()
  p.stroke(color as string)
  p.strokeWeight(width)
  p.beginShape()
  for (const [x, y] of pts) p.vertex(x * k, y * k)
  p.endShape()
}

/** A rectangle by its corners (cells). */
export const box4 = (x0: number, y0: number, x1: number, y1: number): Pt[] => [
  [x0, y0],
  [x1, y0],
  [x1, y1],
  [x0, y1],
]

/** A rounded rectangle by its corners, as an outline. */
export function roundBox(x0: number, y0: number, x1: number, y1: number, r: number, n = 4): Pt[] {
  const rr = Math.min(r, (x1 - x0) / 2, (y1 - y0) / 2)
  const out: Pt[] = []
  const corner = (cx: number, cy: number, a0: number) => {
    for (let i = 0; i <= n; i++) {
      const a = a0 + (Math.PI / 2) * (i / n)
      out.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)])
    }
  }
  corner(x1 - rr, y0 + rr, -Math.PI / 2)
  corner(x1 - rr, y1 - rr, 0)
  corner(x0 + rr, y1 - rr, Math.PI / 2)
  corner(x0 + rr, y0 + rr, Math.PI)
  return out
}

/** Points round an ellipse, from angle a0 to a1. */
export function arcPts(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n: number): Pt[] {
  const out: Pt[] = []
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n
    out.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)])
  }
  return out
}

/** `#rrggbb` as `rgba(…)` with an alpha, for canvas gradients. */
export function rgba(hex: string, a: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a))})`
}

/** Fill an outline with a canvas style (a gradient), no ink. */
export function fillWith(pen: Pen, pts: Pt[], style: CanvasGradient | string): void {
  const { ctx, k } = pen
  ctx.save()
  ctx.fillStyle = style
  ctx.beginPath()
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * k, y * k) : ctx.moveTo(x * k, y * k)))
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

/** A soft round light (a glow) of colour `hex`, `a` strong at its middle, gone at radius `r` (cells). */
export function glow(pen: Pen, x: number, y: number, r: number, hex: string, a: number, inner = 0): void {
  if (a <= 0.002 || r <= 0) return
  const { ctx, k } = pen
  const g = ctx.createRadialGradient(x * k, y * k, inner * k, x * k, y * k, r * k)
  g.addColorStop(0, rgba(hex, a))
  g.addColorStop(0.5, rgba(hex, a * 0.4))
  g.addColorStop(1, rgba(hex, 0))
  ctx.save()
  ctx.fillStyle = g
  ctx.fillRect((x - r) * k, (y - r) * k, 2 * r * k, 2 * r * k)
  ctx.restore()
}

/** Clip to an outline for the rest of `fn`. */
export function clipTo(pen: Pen, pts: Pt[], fn: () => void): void {
  const { ctx, k, p } = pen
  p.push()
  ctx.beginPath()
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * k, y * k) : ctx.moveTo(x * k, y * k)))
  ctx.closePath()
  ctx.clip()
  fn()
  p.pop()
}

/** A flame's teardrop, base at (x, y), `h` tall, `w` wide at its belly, its tip swung `lean` cells sideways. */
export function tongue(x: number, y: number, w: number, h: number, lean: number): Pt[] {
  const out: Pt[] = []
  const n = 16
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2
    const u = (1 - Math.cos(a)) / 2
    const side = Math.sin(a)
    const belly = Math.sin(Math.PI * Math.pow(u, 0.7)) * (1 - 0.35 * u)
    out.push([x + side * w * 0.5 * belly + lean * u * u, y - h * u])
  }
  return out
}

/** Rotate a point about a pivot. */
export function turn(pt: Pt, pivot: Pt, a: number): Pt {
  const c = Math.cos(a)
  const s = Math.sin(a)
  const dx = pt[0] - pivot[0]
  const dy = pt[1] - pivot[1]
  return [pivot[0] + dx * c - dy * s, pivot[1] + dx * s + dy * c]
}
