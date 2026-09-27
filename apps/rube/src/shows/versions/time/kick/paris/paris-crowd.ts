import { mixHex } from '../../../../../parts'
import { hash } from '../kit'
import { PARIS } from '../worlds'
import { ctxOf, type Pen } from './paris-pen'

/**
 * The dreamer's projections: silhouettes, never balls, never faces. A crowd is one dark mass (every figure in one
 * path, one fill, heads and shoulders merged), rimmed on its sunny side where the light catches it. A figure's
 * facing is where its head's profile points (-1 left, 1 right, 0 straight at us); turning a head is moving that.
 */

export interface Figure {
  /** Where its feet are (the frame's cells: the street, or the bridge's own). */
  x: number
  y: number
  /** How tall (about 0.9), and how broad at the shoulder. */
  h: number
  wd: number
  /** Which way its head looks, -1..1. */
  facing: number
  /** Its stride's phase (radians) while walking; NaN standing. */
  walk: number
  hat: 0 | 1 | 2
  skirt: boolean
}

const RIM = mixHex(PARIS.crowd, PARIS.lamp, 0.62)

/** A stable figure from an index: its build, its hat, its coat. */
export function figure(i: number, x: number, y: number, facing: number, walk = NaN, scale = 1): Figure {
  const h = (0.84 + 0.14 * hash(i, 31)) * scale
  return {
    x,
    y,
    h,
    wd: (0.26 + 0.07 * hash(i, 32)) * scale,
    facing,
    walk,
    hat: hash(i, 33) > 0.62 ? 1 : hash(i, 33) > 0.45 ? 2 : 0,
    skirt: hash(i, 34) > 0.6,
  }
}

function trace(ctx: CanvasRenderingContext2D, k: number, g: Figure, dx: number, dy: number): void {
  const X = (u: number) => (g.x + u + dx) * k
  const Y = (v: number) => (g.y - v + dy) * k
  const { h } = g
  // Turned into profile, a figure is narrower across the shoulder than facing us.
  const wd = g.wd * (1 - 0.2 * Math.min(1, Math.abs(g.facing)))
  const walking = Number.isFinite(g.walk)
  const stride = walking ? 0.09 * h * Math.sin(g.walk) : 0
  const hip = 0.45 * h
  // Legs.
  if (g.skirt) {
    ctx.moveTo(X(-wd * 0.34), Y(hip + 0.06 * h))
    ctx.lineTo(X(wd * 0.34), Y(hip + 0.06 * h))
    ctx.lineTo(X(wd * 0.46 + stride * 0.3), Y(0.16 * h))
    ctx.lineTo(X(-wd * 0.46 + stride * 0.3), Y(0.16 * h))
    ctx.closePath()
    for (const s of [-1, 1]) {
      const fx = s * 0.05 * h + s * stride * 0.6
      ctx.moveTo(X(fx - 0.022 * h), Y(0.17 * h))
      ctx.lineTo(X(fx + 0.022 * h), Y(0.17 * h))
      ctx.lineTo(X(fx + 0.02 * h), Y(0))
      ctx.lineTo(X(fx - 0.03 * h), Y(0))
      ctx.closePath()
    }
  } else {
    for (const s of [-1, 1]) {
      const fx = s * 0.06 * h + s * stride
      ctx.moveTo(X(s * 0.02 * h - 0.045 * h), Y(hip + 0.04 * h))
      ctx.lineTo(X(s * 0.02 * h + 0.045 * h), Y(hip + 0.04 * h))
      ctx.lineTo(X(fx + 0.032 * h), Y(0))
      ctx.lineTo(X(fx - 0.04 * h), Y(0))
      ctx.closePath()
    }
  }
  // The coat: rounded shoulders, a little waist, a hem that flares.
  const sh = 0.73 * h
  ctx.moveTo(X(-wd / 2), Y(sh - 0.05 * h))
  ctx.quadraticCurveTo(X(-wd / 2), Y(sh + 0.01 * h), X(-wd * 0.3), Y(sh + 0.02 * h))
  ctx.lineTo(X(wd * 0.3), Y(sh + 0.02 * h))
  ctx.quadraticCurveTo(X(wd / 2), Y(sh + 0.01 * h), X(wd / 2), Y(sh - 0.05 * h))
  ctx.lineTo(X(wd * 0.4), Y(hip + 0.02 * h))
  ctx.lineTo(X(wd * 0.44 + stride * 0.2), Y(hip - 0.08 * h))
  ctx.lineTo(X(-wd * 0.44 + stride * 0.2), Y(hip - 0.08 * h))
  ctx.lineTo(X(-wd * 0.4), Y(hip + 0.02 * h))
  ctx.closePath()
  // Neck and head; the profile's nose on the side it looks.
  const r = 0.074 * h
  const hx = 0.012 * h * g.facing
  const hy = sh + 0.11 * h
  ctx.moveTo(X(-0.03 * h), Y(sh + 0.03 * h))
  ctx.lineTo(X(-0.028 * h + hx * 0.5), Y(hy - r * 0.6))
  ctx.lineTo(X(0.028 * h + hx * 0.5), Y(hy - r * 0.6))
  ctx.lineTo(X(0.03 * h), Y(sh + 0.03 * h))
  ctx.closePath()
  ctx.moveTo(X(hx + r), Y(hy))
  ctx.arc(X(hx), Y(hy), r * k, 0, Math.PI * 2)
  const f = g.facing
  if (Math.abs(f) > 0.05) {
    const s = Math.sign(f)
    const a = Math.min(1, Math.abs(f))
    ctx.moveTo(X(hx + s * r * 0.55), Y(hy + r * 0.45))
    ctx.lineTo(X(hx + s * (r + 0.045 * h * a)), Y(hy - r * 0.1))
    ctx.lineTo(X(hx + s * r * 0.5), Y(hy - r * 0.65))
    ctx.closePath()
  }
  if (g.hat === 1) {
    // A fedora: its crown, and its brim, a little forward where it looks.
    const bx = hx + 0.02 * h * f
    ctx.moveTo(X(hx - r * 0.9), Y(hy + r * 0.55))
    ctx.lineTo(X(hx - r * 0.75), Y(hy + r * 1.35))
    ctx.lineTo(X(hx + r * 0.75), Y(hy + r * 1.35))
    ctx.lineTo(X(hx + r * 0.9), Y(hy + r * 0.55))
    ctx.closePath()
    ctx.moveTo(X(bx - r * 1.55), Y(hy + r * 0.62))
    ctx.lineTo(X(bx + r * 1.55), Y(hy + r * 0.62))
    ctx.lineTo(X(bx + r * 1.45), Y(hy + r * 0.42))
    ctx.lineTo(X(bx - r * 1.45), Y(hy + r * 0.42))
    ctx.closePath()
  } else if (g.hat === 2) {
    // A beret, tipped.
    ctx.moveTo(X(hx - r * 1.1), Y(hy + r * 0.55))
    ctx.quadraticCurveTo(X(hx - r * 0.4), Y(hy + r * 1.45), X(hx + r * 1.2), Y(hy + r * 0.75))
    ctx.closePath()
  }
}

/** A crowd: every figure in one mass, rimmed on its sunny side. `a` fades the whole (for figures far off in the haze). */
export function crowd(pen: Pen, figures: Figure[], a = 1, color = PARIS.crowd): void {
  if (!figures.length || a <= 0.01) return
  const ctx = ctxOf(pen.p)
  const { k } = pen
  ctx.save()
  if (a < 1) ctx.globalAlpha = a
  // The rim first, then the mass over it a hair down and back from the sun, so only the lit edge shows.
  ctx.beginPath()
  for (const g of figures) trace(ctx, k, g, 0, 0)
  ctx.fillStyle = RIM
  ctx.fill('nonzero')
  ctx.beginPath()
  for (const g of figures) trace(ctx, k, g, -0.03, 0.022)
  ctx.fillStyle = color
  ctx.fill('nonzero')
  ctx.restore()
}

/** A head turning from `from` to `to` over `dur` seconds from `at`, eased. */
export function turned(t: number, at: number, from: number, to: number, dur = 0.32): number {
  const u = Math.max(0, Math.min(1, (t - at) / dur))
  const e = u * u * (3 - 2 * u)
  return from + (to - from) * e
}
