import { FINAL } from './geo'

/**
 * Iceland's far planes. Everything past the fjord is drawn in the frame's own measure: a point is given in frame
 * heights from the frame's centre as seen from the camera's resting place at the end (`sx` right, `sy` down), and
 * slides a little as the camera goes elsewhere, each plane by its own amount. So the sky hardly moves, the far range
 * a little, the glacier's range more, the mountains across the fjord more again, and the near water most: depth by
 * parallax. The planes keep their size on the screen when the camera pulls back, as things a day's walk off do.
 *
 * A plane's drawing is the same shape at every frame, only moved and scaled, so its paths are made once (`cached`)
 * and drawn under one transform.
 */

export type Frame = { x0: number; y0: number; x1: number; y1: number; cx: number; cy: number }

/** Where the camera rests at the end: what the far planes are drawn true from. */
export const CX0 = FINAL[0] + 0.4
export const CY0 = FINAL[1] - 0.4

/** How far each plane slides, frame heights for every cell the camera moves (x, y). */
export const PLANE = {
  sky: [0.004, 0.001],
  cloud: [0.001, 0.0005],
  far: [0.012, 0.003],
  glacier: [0.016, 0.007],
  mid: [0.02, 0.012],
  water: [0.05, 0.04],
} as const satisfies Record<string, readonly [number, number]>
export type Plane = readonly [number, number]

/** A plane's origin (cells) and its measure (cells a frame height) at this frame. */
export function origin(f: Frame, p: Plane): { ox: number; oy: number; H: number } {
  const H = f.y1 - f.y0
  return { ox: f.cx - p[0] * (f.cx - CX0) * H, oy: f.cy - p[1] * (f.cy - CY0) * H, H }
}

/** The part of a plane in the frame, in its own measure. */
export function seen(f: Frame, p: Plane): { x0: number; x1: number; y0: number; y1: number } {
  const { ox, oy, H } = origin(f, p)
  return { x0: (f.x0 - ox) / H, x1: (f.x1 - ox) / H, y0: (f.y0 - oy) / H, y1: (f.y1 - oy) / H }
}

/**
 * Draw on a plane in its own measure: one unit is a frame height. `px` is a pixel in that measure, for line widths.
 */
export function onPlane(ctx: CanvasRenderingContext2D, f: Frame, k: number, p: Plane, draw: (px: number) => void): void {
  const { ox, oy, H } = origin(f, p)
  ctx.save()
  ctx.translate(ox * k, oy * k)
  ctx.scale(H * k, H * k)
  draw(1 / (H * k))
  ctx.restore()
}

/** A path made once, the first time it is asked for (there is no Path2D where the checks run, and none is needed). */
export function cached<T>(make: () => T): () => T {
  let made: T | null = null
  return () => (made ??= make())
}

/** A path of ellipses: one fill draws them all. */
export function ellipses(path: Path2D, list: readonly (readonly [number, number, number, number])[]): Path2D {
  for (const [x, y, rx, ry] of list) {
    path.moveTo(x + rx, y)
    path.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
  }
  return path
}

/** A closed outline as a path. */
export function outline(pts: readonly (readonly [number, number])[], path = new Path2D()): Path2D {
  pts.forEach(([x, y], i) => (i ? path.lineTo(x, y) : path.moveTo(x, y)))
  path.closePath()
  return path
}

/** An open line as a path. */
export function polyline(pts: readonly (readonly [number, number])[], path = new Path2D()): Path2D {
  pts.forEach(([x, y], i) => (i ? path.lineTo(x, y) : path.moveTo(x, y)))
  return path
}

/**
 * A band of a plane painted once into a picture of its own, for things a plane has too many of to draw shape by
 * shape every frame (a sky of clouds). A far plane keeps its size on the screen, so the picture is made at the
 * frame's own scale (pixels a frame height, capped) and laid on moved, never stretched much. `paint` draws in the
 * plane's measure, the band running from x 0 to `span` and coming round: it must draw what crosses either end twice.
 */
export interface Baked {
  canvas: HTMLCanvasElement
  ppu: number
  span: number
  y0: number
  y1: number
}
const bakes = new Map<string, Baked>()
export function bake(key: string, ppu: number, span: number, y0: number, y1: number, paint: (ctx: CanvasRenderingContext2D) => void): Baked | null {
  if (typeof document === 'undefined') return null
  // At the frame's own scale where it can be (so laying it on is a plain copy), and never past a thousand pixels.
  const scale = Math.min(1000, Math.max(100, Math.round(ppu)))
  const id = `${key}@${scale}`
  const had = bakes.get(id)
  if (had) return had
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(span * scale)
  canvas.height = Math.ceil((y1 - y0) * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.scale(canvas.width / span, scale)
  ctx.translate(0, -y0)
  paint(ctx)
  // Its pixels a unit, exactly, along the band: so its copies end to end meet without a seam.
  const made = { canvas, ppu: canvas.width / span, span, y0, y1 }
  // A few sizes at most (a still, the stage, a resized window): the oldest goes.
  if (bakes.size > 12) bakes.delete(bakes.keys().next().value as string)
  bakes.set(id, made)
  return made
}

/**
 * Lay a baked band on its plane (inside `onPlane`), moved `drift` along it, where the plane's frame runs `x0` to `x1`.
 * Where the band was painted at the frame's own scale it is laid on whole pixels, as a plain copy.
 */
export function layBaked(ctx: CanvasRenderingContext2D, b: Baked, drift: number, x0: number, x1: number): void {
  const m = ctx.getTransform()
  const exact = Math.abs(m.a - b.ppu) < 0.5 && Math.abs(m.b) < 1e-6 && Math.abs(m.c) < 1e-6
  // The first copy's left edge in the device's pixels, snapped; every other copy a whole band's width on from it.
  const ox0 = Math.round(m.a * drift + m.e)
  const oy = Math.round(m.d * b.y0 + m.f)
  const lo = Math.floor((x0 - drift) / b.span)
  const hi = Math.floor((x1 - drift) / b.span)
  for (let n = lo; n <= hi; n++) {
    const a = Math.max(x0, n * b.span + drift)
    const z = Math.min(x1, (n + 1) * b.span + drift)
    if (z <= a) continue
    const sx = (a - n * b.span - drift) * b.ppu
    const sw = Math.min(b.canvas.width - sx, (z - a) * b.ppu)
    if (sw <= 0) continue
    if (exact) {
      const ox = ox0 + n * b.canvas.width
      const s0 = Math.floor(sx)
      const s1 = Math.min(b.canvas.width, Math.ceil(sx + sw))
      ctx.save()
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.drawImage(b.canvas, s0, 0, s1 - s0, b.canvas.height, ox + s0, oy, s1 - s0, b.canvas.height)
      ctx.restore()
    } else ctx.drawImage(b.canvas, sx, 0, sw, b.canvas.height, a, b.y0, sw / b.ppu, b.y1 - b.y0)
  }
}
