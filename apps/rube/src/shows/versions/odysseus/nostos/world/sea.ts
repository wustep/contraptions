import { clamp01, lerp, mix, rgba, smooth, vgrad, type Paint } from '../draw'

/**
 * The sea, seen as a cutaway: above the waterline (y = 0) its surface goes away to the horizon, and below it the water
 * is cut open like the side of a tank, down to the bed, and under the bed the dark. Ships float on the line; what is
 * under the water is seen through it, darkened.
 *
 * The swell is a few long waves summed, so it is never a pattern; how high it runs is the weather (`weather`), which the
 * score sets by show time: calm off Troy, rising under Poseidon, the storm, the calm after.
 */

/**
 * Where the horizon is, for a frame: at the eye's level, a little above the frame's middle, as it is for a camera
 * looking straight out; never under the waterline (a camera at the water, or under it, sees the sea as a sliver).
 */
export function horizonOf(view: { cy: number; h: number }): number {
  return Math.min(-0.5 - 0.02 * view.h, view.cy - 0.06 * view.h)
}

/** How rough the sea is at `t`, 0 calm to 1 the storm. Set by the score (`setWeather`). */
let weatherFn: (t: number) => number = () => 0.15
export function setWeather(fn: (t: number) => number): void {
  weatherFn = fn
}
export const weather = (t: number): number => weatherFn(t)

/** The sea's colours at `t`, set by the score as the light changes (`setSeaLight`). */
export interface SeaLight {
  /** The far sea at the horizon. */
  far: string
  /** The sea's surface near the waterline. */
  near: string
  /** The water cut open, at the top and at the bed. */
  body: string
  deep: string
  /** The light on the swell's backs. */
  lit: string
  /** The waterline's edge. */
  edge: string
}
let lightFn: (t: number) => SeaLight = () => ({ far: '#5F7480', near: '#2C4652', body: '#1F3440', deep: '#0C141B', lit: '#8FA6AD', edge: '#14222B' })
export function setSeaLight(fn: (t: number) => SeaLight): void {
  lightFn = fn
}
export const seaLight = (t: number): SeaLight => lightFn(t)

/** The waterline's height at `x` (cells, negative is up) at `t`. */
export function surface(x: number, t: number): number {
  const w = weather(t)
  const a = 0.05 + 0.55 * w
  return (
    -a *
    (0.55 * Math.sin(x * 0.42 - t * 1.05) +
      0.3 * Math.sin(x * 0.91 + t * 1.6 + 1.3) +
      0.15 * Math.sin(x * 1.73 - t * 2.3 + 0.4) +
      w * 0.35 * Math.sin(x * 0.19 - t * 0.6 + 2.1))
  )
}

/** The slope of the waterline at `x`: what a hull floating there leans to. */
export function slope(x: number, t: number, span = 1.2): number {
  return Math.atan2(surface(x + span / 2, t) - surface(x - span / 2, t), span)
}

/**
 * The sea above the waterline: the surface going away to the horizon in long bands that close up as they go, the
 * swell's lit backs drawn as a few slow, wide shapes (never a field of marks).
 */
export function drawSeaPlane(g: Paint, x0: number, x1: number): void {
  const { ctx, t, view } = g
  const L = seaLight(t)
  const a = Math.max(x0, view.x0 - 1)
  const b = Math.min(x1, view.x1 + 1)
  if (b <= a) return
  const top = horizonOf(view)
  const span = -top
  if (view.y0 > 0.5 || view.y1 < top) return
  ctx.fillStyle = vgrad(ctx, top, 0, [
    [0, L.far],
    [0.35, mix(L.far, L.near, 0.45)],
    [1, L.near],
  ])
  ctx.fillRect(a, top, b - a, span + 0.6)
  // Bands of swell going away: a few long, low shapes, nearer ones wider apart and slower, faint enough to read as the
  // light on the water and not as stripes.
  const w = weather(t)
  for (let i = 0; i < 5; i++) {
    const f = (i + 0.5) / 5
    const depth = f * f
    const y = top + span * depth
    const amp = (0.04 + 0.22 * w) * (0.25 + depth) * Math.min(1, span / 6)
    const drift = t * (0.25 + 0.6 * depth) * (i % 2 ? 1 : -0.7)
    ctx.beginPath()
    const step = Math.max(0.3, 0.6 * (1.2 - depth))
    let first = true
    for (let x = a - step; x <= b + step; x += step) {
      const yy = y + amp * Math.sin(x * (0.5 / (0.3 + depth)) + drift + i * 1.7)
      if (first) {
        ctx.moveTo(x, yy)
        first = false
      } else ctx.lineTo(x, yy)
    }
    for (let x = b + step; x >= a - step; x -= step) {
      const yy = y + 0.06 + 0.12 * depth + amp * Math.sin(x * (0.5 / (0.3 + depth)) + drift + i * 1.7 + 0.5)
      ctx.lineTo(x, yy)
    }
    ctx.closePath()
    ctx.fillStyle = rgba(L.lit, 0.045 + 0.05 * depth)
    ctx.fill()
  }
}

/**
 * The waterline and the water under it, cut open: drawn over the balls and the hulls (it is in front of them), as a
 * body of water that darkens with depth, translucent near the top so a hull or a sinking man is seen through it.
 */
export function drawSeaBody(g: Paint, x0: number, x1: number, bed: (x: number) => number): void {
  const { ctx, t, view } = g
  const L = seaLight(t)
  const a = Math.max(x0, view.x0 - 1)
  const b = Math.min(x1, view.x1 + 1)
  if (b <= a || view.y1 < -2) return
  const step = Math.max(0.1, (b - a) / 160)
  const deepest = Math.min(view.y1 + 1, 400)
  ctx.beginPath()
  ctx.moveTo(a, surface(a, t))
  for (let x = a; x <= b + step; x += step) ctx.lineTo(x, surface(x, t))
  ctx.lineTo(b + step, deepest)
  ctx.lineTo(a, deepest)
  ctx.closePath()
  // Translucent near the top, so a hull, a sinking man or a spar is seen through the cut for a while; darkening as it
  // goes down until nothing is seen.
  ctx.fillStyle = vgrad(ctx, -0.6, Math.max(6, Math.min(deepest, 40)), [
    [0, rgba(L.body, 0.5)],
    [0.16, rgba(L.body, 0.74)],
    [0.45, rgba(mix(L.body, L.deep, 0.5), 0.9)],
    [1, rgba(L.deep, 0.97)],
  ])
  ctx.fill()
  // The waterline: the edge of the cut, a little lighter than the water under it.
  ctx.beginPath()
  ctx.moveTo(a, surface(a, t))
  for (let x = a; x <= b + step; x += step) ctx.lineTo(x, surface(x, t))
  ctx.strokeStyle = L.edge
  ctx.lineWidth = Math.max(1.25 * g.px, 0.035)
  ctx.stroke()
  void bed
}

/** A colour of the sea at depth `d` cells under the waterline (for things drawn inside it). */
export function waterAt(t: number, d: number): string {
  const L = seaLight(t)
  return mix(L.body, L.deep, clamp01(d / 30))
}

export { lerp, smooth }
