import type p5 from 'p5'
import type { Pt } from '../../../../../parts'

/**
 * Small tools the home movie and the drive share: a filled shape from cell
 * points, a rounded box, and a track for the company (where Mia and the boy
 * are over show time), keyed like a lane but free of it.
 */

/** A closed shape through `pts` (cells), filled, with an ink edge unless `ink` is null. */
export function shape(p: p5, k: number, pts: Pt[], fill: string | p5.Color | null, ink: string | p5.Color | null = null, w = 1): void {
  if (fill === null) p.noFill()
  else p.fill(fill as string)
  if (ink === null) p.noStroke()
  else {
    p.stroke(ink as string)
    p.strokeWeight(w)
  }
  p.beginShape()
  for (const [x, y] of pts) p.vertex(x * k, y * k)
  p.endShape(p.CLOSE)
}

/** A box from (x0, y0) to (x1, y1), cells, its corners rounded by `r`. */
export function box2(p: p5, k: number, x0: number, y0: number, x1: number, y1: number, fill: string | p5.Color | null, ink: string | p5.Color | null = null, w = 1, r = 0): void {
  if (fill === null) p.noFill()
  else p.fill(fill as string)
  if (ink === null) p.noStroke()
  else {
    p.stroke(ink as string)
    p.strokeWeight(w)
  }
  p.rect(((x0 + x1) / 2) * k, ((y0 + y1) / 2) * k, Math.abs(x1 - x0) * k, Math.abs(y1 - y0) * k, r * k)
}

/** A line between two cell points. */
export function seg(p: p5, k: number, a: Pt, b: Pt, ink: string | p5.Color, w: number): void {
  p.stroke(ink as string)
  p.strokeWeight(w)
  p.line(a[0] * k, a[1] * k, b[0] * k, b[1] * k)
}

/** A soft vertical gradient over a box: `top` to `bottom`, each `#rrggbb` at an alpha. */
export function vgrad(p: p5, k: number, x0: number, y0: number, x1: number, y1: number, stops: [number, string][]): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const g = ctx.createLinearGradient(0, y0 * k, 0, y1 * k)
  for (const [at, c] of stops) g.addColorStop(Math.max(0, Math.min(1, at)), c)
  ctx.fillStyle = g
  ctx.fillRect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k)
}

/** How a keyed move gets from the key before to this one. */
export type Move = 'ease' | 'in' | 'out' | 'lin' | 'hop'

/** A key of a track: where one of them is at show time `t`, and how they got there. `g` is a hop's gravity. */
export interface Key {
  t: number
  p: Pt
  how?: Move
  g?: number
}

const easeOf = (how: Move, u: number): number => {
  if (how === 'in') return u * u
  if (how === 'out') return 1 - (1 - u) * (1 - u)
  if (how === 'lin' || how === 'hop') return u
  return 0.5 - 0.5 * Math.cos(Math.PI * u)
}

/**
 * Where a track is at `t`: before its first key at the first, after its last at the last, and between two keys
 * moved as the later one says (eased to rest, falling in, gliding out, or hopped on a parabola under `g`).
 */
export function trackAt(keys: Key[], t: number): Pt {
  if (t <= keys[0].t) return [keys[0].p[0], keys[0].p[1]]
  for (let i = 1; i < keys.length; i++) {
    const b = keys[i]
    if (t > b.t) continue
    const a = keys[i - 1]
    const T = b.t - a.t
    const u = T <= 0 ? 1 : (t - a.t) / T
    const how = b.how ?? 'ease'
    const s = easeOf(how, u)
    const x = a.p[0] + (b.p[0] - a.p[0]) * s
    let y = a.p[1] + (b.p[1] - a.p[1]) * s
    if (how === 'hop') y -= ((b.g ?? 16) * T * T) / 2 * u * (1 - u)
    return [x, y]
  }
  const last = keys[keys.length - 1]
  return [last.p[0], last.p[1]]
}

/** 0..1 → 0..1, smooth at both ends (quintic). */
export const soft = (u: number): number => {
  const v = Math.max(0, Math.min(1, u))
  return v * v * v * (10 - 15 * v + 6 * v * v)
}

/** Linear between a and b by f. */
export const lerp = (a: number, b: number, f: number): number => a + (b - a) * f
