import { circle, clamp01, mix, rect, vgrad, type Brush } from '../paint'

/**
 * Arrakis's sky, by show time: a gradient from the zenith down to the haze over the horizon, and the sun, a flat disc
 * (never a glow: its light is in what it falls on). The sky is pale by day, a white heat with a little warmth in it, and
 * goes amber as the afternoon goes on. Then the moon comes over the sun: the disc darkens from one side until it is a
 * black disc in a rim of light, and the sky goes down with it (the grade takes the colour away at the same time).
 *
 * The sun stands in the frame, not in the world: it is too far to move as the camera moves, so it is placed as shares of
 * the frame, keyed through the show like the light.
 */

export interface SkyKey {
  t: number
  top: string
  low: string
  /** The sun: where it is as shares of the frame (0,0 the top left), its radius as a share of the frame's height. */
  sun: { x: number; y: number; r: number; color: string }
  /** How much of the sun the moon covers, 0 to 1. */
  eclipse: number
}

const ease = (u: number) => u * u * (3 - 2 * u)

export function skyOf(keys: SkyKey[], t: number): SkyKey {
  if (t <= keys[0].t) return keys[0]
  if (t >= keys[keys.length - 1].t) return keys[keys.length - 1]
  let i = 0
  while (i + 1 < keys.length && keys[i + 1].t <= t) i++
  const a = keys[i]
  const b = keys[i + 1]
  const u = ease(clamp01((t - a.t) / Math.max(1e-6, b.t - a.t)))
  const l = (p: number, q: number) => p + (q - p) * u
  return {
    t,
    top: mix(a.top, b.top, u),
    low: mix(a.low, b.low, u),
    sun: { x: l(a.sun.x, b.sun.x), y: l(a.sun.y, b.sun.y), r: l(a.sun.r, b.sun.r), color: mix(a.sun.color, b.sun.color, u) },
    eclipse: l(a.eclipse, b.eclipse),
  }
}

/**
 * The sky over the frame, horizon at world y `hy`: the zenith colour at the frame's top (or higher, for a frame that is
 * mostly ground), the haze's at the horizon, and the haze on down past it (the land is drawn over it).
 */
export function paintSky(b: Brush, s: SkyKey, hy: number): void {
  const { ctx, view } = b
  const top = Math.min(view.y0, hy - view.h * 0.6)
  ctx.fillStyle = vgrad(b, top, hy, [[0, s.top], [0.72, mix(s.top, s.low, 0.6)], [1, s.low]])
  rect(ctx, view.x0 - 1, view.y0 - 1, view.w + 2, Math.max(0, hy - view.y0) + 1)
  ctx.fill()
  ctx.fillStyle = b.c(s.low)
  rect(ctx, view.x0 - 1, hy, view.w + 2, Math.max(0, view.y1 - hy) + 1)
  ctx.fill()
  paintSun(b, s)
}

/** The sun as a flat disc; covered, the moon's black disc over it, sliding in from the left, and a thin rim of light. */
export function paintSun(b: Brush, s: SkyKey): void {
  const { ctx, view } = b
  const r = s.sun.r * view.h
  const x = view.x0 + s.sun.x * view.w
  const y = view.y0 + s.sun.y * view.h
  if (x + r < view.x0 || x - r > view.x1 || y + r < view.y0 || y - r > view.y1) return
  const e = clamp01(s.eclipse)
  ctx.fillStyle = b.c(s.sun.color)
  circle(ctx, x, y, r)
  ctx.fill()
  if (e <= 0.001) return
  // The moon: a hair bigger than the sun, coming in from the west until it sits on it, leaving its rim.
  const mr = r * 0.97
  const mx = x - (1 - e) * r * 2.1
  ctx.fillStyle = b.c('#0B0907')
  circle(ctx, mx, y, mr)
  ctx.fill()
}
