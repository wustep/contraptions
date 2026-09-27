import type p5 from 'p5'
import type { Pt } from '../../../../parts'

/**
 * The canonical drawings of the show's recurring things (the director's): **the look**, and the light of the fashion
 * world it lives in (a press camera's flash, a spotlight's beam and its pool). Every part that shows one of these calls
 * it from here, so a look is one look and a flash is one flash everywhere. If one needs something it does not do, say
 * so in your report; do not draw your own.
 *
 * Every function draws in pixels from cells (`k` pixels a cell; points are in the caller's cells, the caller having
 * translated to its own origin, or not) and leaves p5's and the canvas's state as it found it. None of them draws
 * text, dashed lines or hairline rings. None is inked: light is light.
 */

const TAU = Math.PI * 2
const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

/** '#RRGGBB' and an alpha as a canvas colour. */
export function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${clamp01(a).toFixed(3)})`
}

/* ------------------------------------------------------------------ light */

/** A soft round light at `at` (cells), `r` cells to nothing, `a` at its middle: a glow, never a disc. */
export function bloom(p: p5, k: number, at: Pt, r: number, color: string, a: number): void {
  if (a <= 0.003 || r <= 0) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const x = at[0] * k
  const y = at[1] * k
  const R = r * k
  const g = ctx.createRadialGradient(x, y, 0, x, y, R)
  g.addColorStop(0, rgba(color, a))
  g.addColorStop(0.25, rgba(color, a * 0.55))
  g.addColorStop(0.6, rgba(color, a * 0.16))
  g.addColorStop(1, rgba(color, 0))
  ctx.save()
  ctx.fillStyle = g
  ctx.fillRect(x - R, y - R, 2 * R, 2 * R)
  ctx.restore()
}

/** A pool of light on a floor: an ellipse `rx` by `ry` cells about `at`, soft to its edge. */
export function pool(p: p5, k: number, at: Pt, rx: number, ry: number, color: string, a: number): void {
  if (a <= 0.003) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.translate(at[0] * k, at[1] * k)
  ctx.scale(1, ry / rx)
  const R = rx * k
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R)
  g.addColorStop(0, rgba(color, a))
  g.addColorStop(0.55, rgba(color, a * 0.5))
  g.addColorStop(1, rgba(color, 0))
  ctx.fillStyle = g
  ctx.fillRect(-R, -R, 2 * R, 2 * R)
  ctx.restore()
}

/**
 * A spotlight's beam: a cone of light from its lens at `from` to `to`, `w0` cells wide at the lens and `w1` at the far
 * end, brightest at the lens and paling along its length, soft at its sides (eight cones laid over each other, each a
 * little narrower, so across the beam the light rises evenly from nothing at its edge to `a` on its axis). Air, not a
 * shape: never outlined. `a` 0..1.
 */
export function beam(p: p5, k: number, from: Pt, to: Pt, w0: number, w1: number, color: string, a: number): void {
  if (a <= 0.003) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const dx = to[0] - from[0]
  const dy = to[1] - from[1]
  const L = Math.hypot(dx, dy)
  if (L < 1e-6) return
  const nx = -dy / L
  const ny = dx / L
  ctx.save()
  const n = 8
  for (let i = 0; i < n; i++) {
    const spread = 1.5 - (i * 1.2) / (n - 1)
    const share = 1 / n
    const g = ctx.createLinearGradient(from[0] * k, from[1] * k, to[0] * k, to[1] * k)
    g.addColorStop(0, rgba(color, a * share))
    g.addColorStop(0.7, rgba(color, a * share * 0.45))
    g.addColorStop(1, rgba(color, a * share * 0.08))
    const h0 = (w0 * spread) / 2
    const h1 = (w1 * spread) / 2
    ctx.beginPath()
    ctx.moveTo((from[0] + nx * h0) * k, (from[1] + ny * h0) * k)
    ctx.lineTo((to[0] + nx * h1) * k, (to[1] + ny * h1) * k)
    ctx.lineTo((to[0] - nx * h1) * k, (to[1] - ny * h1) * k)
    ctx.lineTo((from[0] - nx * h0) * k, (from[1] - ny * h0) * k)
    ctx.closePath()
    ctx.fillStyle = g
    ctx.fill()
  }
  ctx.restore()
}

/* ------------------------------------------------------------------ the look */

/**
 * How a glint swells and goes: up in 50 ms, gone over the next third of a second. `u` is seconds since it fired.
 * 0 before it and after.
 */
export function glintAt(u: number): number {
  if (u < 0 || u > 0.55) return 0
  if (u < 0.05) return u / 0.05
  return Math.exp(-(u - 0.05) / 0.11) * (1 - clamp01((u - 0.4) / 0.15))
}

/**
 * **The look.** A glint on the rim of the one who is giving it: four long rays and four short, thin and tapering from
 * a hot white point, turned a little off square, swelling in 50 ms and gone in half a second (`u`, seconds since the
 * look). `size` is the long rays' reach in cells (0.35 for Blue Steel; Magnum is the only one bigger than 0.6). Put it
 * on the rim up and toward the camera's light, e.g. the ball's centre + [0.09, -0.09]. A sharp cartoon "ting", never
 * a ring, never a disc: the one thing in the show that is allowed to look like a sparkle.
 */
export function glint(p: p5, k: number, at: Pt, u: number, size = 0.35, color = '#FFFFFF'): void {
  const s = glintAt(u)
  if (s <= 0.002) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const x = at[0] * k
  const y = at[1] * k
  const reach = size * k * (0.55 + 0.45 * s)
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(0.26 + 0.2 * (1 - s))
  // A soft bed of light under the rays.
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, reach * 0.55)
  g.addColorStop(0, rgba(color, 0.55 * s))
  g.addColorStop(1, rgba(color, 0))
  ctx.fillStyle = g
  ctx.fillRect(-reach, -reach, 2 * reach, 2 * reach)
  ctx.fillStyle = rgba(color, Math.min(1, 1.1 * s))
  for (let i = 0; i < 8; i++) {
    const long = i % 2 === 0
    const r = reach * (long ? 1 : 0.42)
    const w = Math.max(0.6, reach * (long ? 0.075 : 0.06))
    ctx.save()
    ctx.rotate((i * TAU) / 8)
    ctx.beginPath()
    ctx.moveTo(0, -w)
    ctx.lineTo(r, 0)
    ctx.lineTo(0, w)
    ctx.lineTo(-w * 0.5, 0)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }
  ctx.beginPath()
  ctx.arc(0, 0, Math.max(0.8, reach * 0.07), 0, TAU)
  ctx.fill()
  ctx.restore()
}

/* ------------------------------------------------------------------ the press */

/**
 * How a flash gun fires: white-hot for a frame or two, its light falling off over a quarter of a second, and an
 * afterglow in the reflector a little longer. `u` seconds since it fired. { pop, after } each 0..1.
 */
export function flashAt(u: number): { pop: number; after: number } {
  if (u < 0 || u > 1.2) return { pop: 0, after: 0 }
  const pop = u < 0.02 ? u / 0.02 : Math.exp(-(u - 0.02) / 0.07)
  const after = Math.exp(-u / 0.35) * (1 - clamp01((u - 0.9) / 0.3))
  return { pop, after }
}

/** The most recent of `times` at or before `t`, as seconds since; Infinity when none has fired. */
export function since(times: readonly number[], t: number): number {
  let best = Infinity
  for (const at of times) if (at <= t && t - at < best) best = t - at
  return best
}

/**
 * A press camera's flash firing at `at` (cells): a white-hot point, a short glint and a big soft bloom that lights the
 * air round it (`reach` cells), for `u` seconds since it fired. Draw it over the camera it comes from. What the press
 * do on a look, and what the director's flash cuts are made of.
 */
export function flashBurst(p: p5, k: number, at: Pt, u: number, reach = 1.6, color = '#FFFDF6'): void {
  const { pop, after } = flashAt(u)
  if (pop < 0.003 && after < 0.003) return
  bloom(p, k, at, reach, color, 0.85 * pop + 0.12 * after)
  bloom(p, k, at, reach * 0.3, color, Math.min(1, pop * 1.2 + after * 0.4))
  if (pop > 0.05) glint(p, k, at, 0.05 + (1 - pop) * 0.12, reach * 0.3, color)
}
