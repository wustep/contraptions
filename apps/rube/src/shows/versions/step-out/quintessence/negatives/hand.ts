/**
 * The bookends' one hand (the negatives room and the street, the B1 builder's): one ink, one weight, one way of
 * drawing. Everything is a flat value shape with a hairline of the same graphite round it, and light is the only
 * thing that is ever soft. The room is that hand in the dark, lit from under the film; the street is the same hand
 * in a pale morning. Both places import from here, so they cannot drift apart.
 */

/** The ink: a graphite with a little blue in it, for every line in both places. */
export const INK = '#23272B'
/** The stroke weight both themes draw with. */
export const WEIGHT = 0.8

/** `#rrggbb` with an alpha, as a canvas colour. */
export function rgba(hex: string, a = 1): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.max(0, Math.min(1, a))})`
}

/** Two `#rrggbb` colours mixed, `f` of the way from `a` to `b`, as `#rrggbb`. */
export function mix(a: string, b: string, f: number): string {
  const g = Math.max(0, Math.min(1, f))
  const pa = parseInt(a.slice(1), 16)
  const pb = parseInt(b.slice(1), 16)
  let out = '#'
  for (const s of [16, 8, 0]) {
    const v = Math.round(((pa >> s) & 255) * (1 - g) + ((pb >> s) & 255) * g)
    out += v.toString(16).padStart(2, '0')
  }
  return out
}

export const clamp01 = (v: number): number => Math.max(0, Math.min(1, v))
/** 0 until `a`, 1 from `b`, smooth between. */
export const ramp = (t: number, a: number, b: number): number => {
  const u = clamp01((t - a) / (b - a))
  return u * u * (3 - 2 * u)
}
/** A knock that rises at once at `at` and dies away over `tau`: 0 before. */
export const knock = (t: number, at: number, tau = 0.16): number => (t < at ? 0 : Math.exp(-(t - at) / tau))
/** A damped settle: a small swing after `at` that dies over `tau`, `hz` times a second. 0 before. */
export const settle = (t: number, at: number, hz = 3, tau = 0.3): number => (t < at ? 0 : Math.exp(-(t - at) / tau) * Math.sin((t - at) * hz * Math.PI * 2))

type Ctx2D = CanvasRenderingContext2D

/** A box in cells, filled, with the ink's hairline round it when `line` is given. */
export function slab(ctx: Ctx2D, k: number, x0: number, y0: number, x1: number, y1: number, fill: string | CanvasGradient | null, line?: { color: string; w: number }): void {
  if (fill) {
    ctx.fillStyle = fill
    ctx.fillRect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k)
  }
  if (line) {
    ctx.strokeStyle = line.color
    ctx.lineWidth = line.w
    ctx.strokeRect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k)
  }
}

/** A straight hairline, in cells. */
export function rule(ctx: Ctx2D, k: number, x0: number, y0: number, x1: number, y1: number, color: string, w: number): void {
  ctx.strokeStyle = color
  ctx.lineWidth = w
  ctx.beginPath()
  ctx.moveTo(x0 * k, y0 * k)
  ctx.lineTo(x1 * k, y1 * k)
  ctx.stroke()
}

/** A rounded box path, in cells (not filled or stroked). */
export function roundBox(ctx: Ctx2D, k: number, x0: number, y0: number, x1: number, y1: number, r: number): void {
  const rr = Math.min(r, (x1 - x0) / 2, (y1 - y0) / 2) * k
  ctx.beginPath()
  ctx.roundRect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k, rr)
}

/** A soft pool of light: a radial gradient of `color` at `a` in the middle, gone at `r` cells (squashed by `sy`). */
export function pool(ctx: Ctx2D, k: number, x: number, y: number, r: number, color: string, a: number, sy = 1): void {
  if (a <= 0.002 || r <= 0) return
  ctx.save()
  ctx.translate(x * k, y * k)
  ctx.scale(1, sy)
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * k)
  g.addColorStop(0, rgba(color, a))
  g.addColorStop(0.45, rgba(color, a * 0.42))
  g.addColorStop(1, rgba(color, 0))
  ctx.fillStyle = g
  ctx.fillRect(-r * k, -r * k, 2 * r * k, 2 * r * k)
  ctx.restore()
}

/** The contact shadow under a ball resting on a surface at `y` (cells), soft and flat. */
export function contact(ctx: Ctx2D, k: number, x: number, y: number, a: number, color = INK): void {
  pool(ctx, k, x, y, 0.2, color, a, 0.28)
}
