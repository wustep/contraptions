import type { Pt } from '../../../../../parts'
import { ctxOf, rgb, type Pen } from '../pen'

/**
 * How New Jersey draws a sky of clouds, a field of grass or a barn's worth of embers: shapes gathered into one path in
 * cells and laid in one fill, never shape by shape. A path is filled under the pen's scale, so it is built in the same
 * cells as everything else here; a colour at an alpha is looked up from a table made once, so a frame makes no strings.
 */

/** A path to gather shapes into, in cells. */
export const bag = (): Path2D => new Path2D()

/** A disc. */
export function disc(path: Path2D, x: number, y: number, r: number): void {
  path.moveTo(x + r, y)
  path.arc(x, y, r, 0, Math.PI * 2)
}

/** An ellipse, turned by `rot`. */
export function oval(path: Path2D, x: number, y: number, rx: number, ry: number, rot = 0): void {
  path.moveTo(x + rx * Math.cos(rot), y + rx * Math.sin(rot))
  path.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2)
}

/** A box. */
export function box(path: Path2D, x0: number, y0: number, x1: number, y1: number): void {
  path.rect(x0, y0, x1 - x0, y1 - y0)
}

/** A closed polygon through `pts`. */
export function poly(path: Path2D, pts: readonly Pt[]): void {
  if (pts.length < 3) return
  path.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length; i++) path.lineTo(pts[i][0], pts[i][1])
  path.closePath()
}

/** A smooth closed loop through `pts` (Catmull-Rom), moved by `dx`, `dy`: the outline of a cloud or a flame. */
export function loop(path: Path2D, pts: readonly Pt[], dx = 0, dy = 0): void {
  const n = pts.length
  if (n < 3) return
  path.moveTo(pts[0][0] + dx, pts[0][1] + dy)
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n]
    const p1 = pts[i]
    const p2 = pts[(i + 1) % n]
    const p3 = pts[(i + 2) % n]
    path.bezierCurveTo(
      p1[0] + (p2[0] - p0[0]) / 6 + dx,
      p1[1] + (p2[1] - p0[1]) / 6 + dy,
      p2[0] - (p3[0] - p1[0]) / 6 + dx,
      p2[1] - (p3[1] - p1[1]) / 6 + dy,
      p2[0] + dx,
      p2[1] + dy,
    )
  }
  path.closePath()
}

/** A blade of grass or a tongue: a thin curved spike from a base `w` wide at (x, y), `h` tall, its tip leaning `lean`. */
export function blade(path: Path2D, x: number, y: number, w: number, h: number, lean: number): void {
  path.moveTo(x - w / 2, y)
  path.quadraticCurveTo(x - w * 0.3 + lean * 0.35, y - h * 0.55, x + lean, y - h)
  path.quadraticCurveTo(x + w * 0.3 + lean * 0.35, y - h * 0.55, x + w / 2, y)
  path.closePath()
}

/** A segment, for a path to be stroked. */
export function seg(path: Path2D, x0: number, y0: number, x1: number, y1: number): void {
  path.moveTo(x0, y0)
  path.lineTo(x1, y1)
}

const tables = new Map<string, string[]>()
/** `hex` at an alpha, 0 to 1, in forty steps, through the pen's tone: from a table made once. */
export function rgbaOf(pen: Pen, hex: string, a: number): string {
  const key = pen.tone(hex)
  let row = tables.get(key)
  if (!row) {
    const [r, g, b] = rgb(key)
    row = []
    for (let i = 0; i <= 40; i++) row.push(`rgba(${r},${g},${b},${i / 40})`)
    tables.set(key, row)
  }
  return row[a <= 0 ? 0 : a >= 1 ? 40 : Math.round(a * 40)]
}

/** Fill a gathered path (`op` for a light added onto what is under it). */
export function fill(pen: Pen, path: Path2D, hex: string, a: number, op: GlobalCompositeOperation = 'source-over'): void {
  if (a <= 0.004) return
  const ctx = ctxOf(pen.p)
  ctx.save()
  ctx.scale(pen.k, pen.k)
  ctx.globalCompositeOperation = op
  ctx.fillStyle = rgbaOf(pen, hex, a)
  ctx.fill(path)
  ctx.restore()
}

/** Stroke a gathered path, `lw` a share of the stage's line weight. */
export function stroke(pen: Pen, path: Path2D, hex: string, a: number, lw: number, op: GlobalCompositeOperation = 'source-over'): void {
  if (a <= 0.004) return
  const ctx = ctxOf(pen.p)
  ctx.save()
  ctx.scale(pen.k, pen.k)
  ctx.globalCompositeOperation = op
  ctx.strokeStyle = rgbaOf(pen, hex, a)
  ctx.lineWidth = Math.max(0.6, pen.w * lw) / pen.k
  ctx.lineCap = 'round'
  ctx.stroke(path)
  ctx.restore()
}

/**
 * A soft light in an ellipse: `hex` at `a` in the middle, nothing at the rim. The city's glow along the horizon, a
 * fire's glow on the far side of a field, a bank of mist. `op` 'lighter' adds it onto what is under it.
 */
export function haze(pen: Pen, c: Pt, rx: number, ry: number, hex: string, a: number, op: GlobalCompositeOperation = 'source-over'): void {
  if (a <= 0.004 || rx <= 0 || ry <= 0) return
  const ctx = ctxOf(pen.p)
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
  g.addColorStop(0, rgbaOf(pen, hex, a))
  g.addColorStop(0.4, rgbaOf(pen, hex, a * 0.5))
  g.addColorStop(1, rgbaOf(pen, hex, 0))
  ctx.save()
  ctx.translate(c[0] * pen.k, c[1] * pen.k)
  ctx.scale(rx * pen.k, ry * pen.k)
  ctx.globalCompositeOperation = op
  ctx.fillStyle = g
  ctx.fillRect(-1, -1, 2, 2)
  ctx.restore()
}

/**
 * Draw `draw` with the wind on it: whatever it draws is carried `lean` cells to the right for every cell it is above
 * `y0`, so smoke and embers going up lean off downwind.
 */
export function windy(pen: Pen, y0: number, lean: number, draw: () => void): void {
  const ctx = ctxOf(pen.p)
  ctx.save()
  ctx.transform(1, 0, -lean, 1, lean * y0 * pen.k, 0)
  draw()
  ctx.restore()
}

/** `x` brought into [lo, lo + period): a thing that goes round and comes back. */
export const wrap = (x: number, lo: number, period: number): number => lo + ((((x - lo) % period) + period) % period)
