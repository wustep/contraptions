import type p5 from 'p5'

/**
 * Run `fn` with drawing clipped to the cell square. Used by contraptions whose
 * parts travel off the edge (balls entering pipes, rain, conveyor belts).
 *
 * p5's push/pop wrap the 2D context's save/restore, so the clip region is
 * discarded on the way out.
 */
export function clipCell(p: p5, size: number, fn: () => void): void {
  clipBox(p, size, size, fn)
}

/** Clip to a rectangular footprint. Use this for multi-cell machines. */
export function clipBox(p: p5, w: number, h: number, fn: () => void): void {
  p.push()
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.beginPath()
  ctx.rect(-w / 2, -h / 2, w, h)
  ctx.clip()
  fn()
  p.pop()
}

/** Same, but clipped to a circle of diameter `d` centered on the cell. */
export function clipCircle(p: p5, d: number, fn: () => void): void {
  p.push()
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.beginPath()
  ctx.arc(0, 0, d / 2, 0, Math.PI * 2)
  ctx.clip()
  fn()
  p.pop()
}

/**
 * How many base cells this machine was handed. Texture repeats that many
 * times rather than growing that many times bigger: a belt twice as long
 * carries twice as many crates, not crates twice the size.
 */
export const tiles = (size: number, unit: number): number => Math.max(1, Math.round(size / unit))

/** Ink outline, no fill. */
export function outline(p: p5, ink: string, weight: number): void {
  p.stroke(ink)
  p.strokeWeight(weight)
  p.noFill()
}

/** Ink outline over a solid fill. */
export function solid(p: p5, ink: string, weight: number, fill: string): void {
  p.stroke(ink)
  p.strokeWeight(weight)
  p.fill(fill)
}

/** The horizontal rail at the bottom edge of a cell. A recurring motif. */
export function floorRail(p: p5, size: number): void {
  p.line(-size / 2, size / 2, size / 2, size / 2)
}

/** The horizontal rail at the top edge of a cell. */
export function ceilRail(p: p5, size: number): void {
  p.line(-size / 2, -size / 2, size / 2, -size / 2)
}

/** Both rails. */
export function rails(p: p5, size: number): void {
  floorRail(p, size)
  ceilRail(p, size)
}

/** A dashed line from a to b, drawn as discrete segments. */
export function dashed(
  p: p5,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  dash: number,
): void {
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.hypot(dx, dy)
  const count = Math.max(1, Math.round(len / (dash * 2)))
  for (let i = 0; i < count; i++) {
    const a = i / count
    const b = a + 0.5 / count
    p.line(x1 + dx * a, y1 + dy * a, x1 + dx * b, y1 + dy * b)
  }
}

/** A zigzag spring between two points, with `coils` peaks. */
export function coil(
  p: p5,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  coils: number,
  amp: number,
): void {
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.hypot(dx, dy) || 1
  const nx = -dy / len
  const ny = dx / len
  const steps = coils * 2
  p.beginShape()
  p.vertex(x1, y1)
  for (let i = 1; i < steps; i++) {
    const a = i / steps
    const side = i % 2 === 0 ? -1 : 1
    p.vertex(x1 + dx * a + nx * amp * side, y1 + dy * a + ny * amp * side)
  }
  p.vertex(x2, y2)
  p.endShape()
}

/** Circular gear teeth as short radial ticks. */
export function teeth(p: p5, r: number, count: number, len: number, phase = 0): void {
  for (let i = 0; i < count; i++) {
    const a = phase + (i / count) * Math.PI * 2
    p.line(Math.cos(a) * r, Math.sin(a) * r, Math.cos(a) * (r + len), Math.sin(a) * (r + len))
  }
}
