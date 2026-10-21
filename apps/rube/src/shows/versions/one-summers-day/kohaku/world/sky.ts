import type { Light } from '../light'
import { circle, fill, hash, layer, mix, rgba, vgrad, type Paint, type Pt, type View } from '../paint'

/**
 * The sky: a gradient fixed to the frame from the top down to the horizon, the sun or the moon as a flat disc, and the
 * summer's cumulus in a far layer that barely moves as the camera goes. Below the horizon, until something stands in
 * front of it, is water: the plain the rain turns to sea, paling to the sky at its far edge.
 */

/** Where the horizon is: a share of the frame down from its top (eye level, so it goes where the camera goes). */
export const HORIZON = 0.62

export const horizonOf = (v: View): number => v.y0 + v.h * HORIZON

export function drawSky(g: Paint, L: Light): void {
  const { ctx, view: v } = g
  const hy = horizonOf(v)
  ctx.fillStyle = vgrad(ctx, v.y0, hy, [
    [0, L.top],
    [0.6, L.mid],
    [1, L.low],
  ])
  ctx.fillRect(v.x0 - 1, v.y0 - 1, v.w + 2, hy - v.y0 + 1.001)
  // The sun or the moon, where the light plan puts them (as shares of the frame), never under the horizon line.
  const r = v.h * 0.03
  if (L.sunY < 1.15) {
    const sx = v.x0 + v.w * L.sunX
    const sy = v.y0 + v.h * HORIZON * L.sunY
    ctx.save()
    ctx.beginPath()
    ctx.rect(v.x0 - 1, v.y0 - 1, v.w + 2, hy - v.y0 + 1)
    ctx.clip()
    circle(ctx, sx, sy, r * (1 + 0.3 * Math.max(0, L.sunY - 0.6)))
    fill(ctx, L.sun)
    ctx.restore()
  }
  if (L.moon > 0.01) {
    const mx = v.x0 + v.w * 0.26
    const my = v.y0 + v.h * 0.15
    circle(ctx, mx, my, r * 0.85)
    fill(ctx, rgba('#EDE9D6', L.moon))
  }
  // Below the horizon, the far water (whatever land there is stands in front of it).
  ctx.fillStyle = vgrad(ctx, hy, v.y1, [
    [0, L.seaFar],
    [1, L.seaNear],
  ])
  ctx.fillRect(v.x0 - 1, hy, v.w + 2, v.y1 - hy + 1)
}

interface Lobe {
  x: number
  y: number
  r: number
}

/** The lobes of one cumulus heap, `w` across and `h` high, its flat base at `y`: cached by seed and size. */
function lobesOf(x: number, y: number, w: number, h: number, seed: number): Lobe[] {
  const out: Lobe[] = []
  const n = 7 + Math.floor(hash(seed, 1) * 5)
  const lean = (hash(seed, 2) - 0.5) * 0.3
  // A dome, a little lopsided, its top made of round lobes; then a tower of smaller ones on its highest part.
  const top = (u: number) => h * Math.pow(Math.max(0, Math.sin(Math.PI * Math.min(1, Math.max(0, u + lean * (u - 0.5))))), 0.75)
  for (let i = 0; i <= n; i++) {
    const u = i / n
    const r = (w / n) * (0.7 + 0.55 * hash(seed, i + 3)) * (0.55 + 0.6 * Math.sin(Math.PI * u))
    out.push({ x: x - w / 2 + u * w, y: y - top(u) + r * 0.75, r })
  }
  const m = 3 + Math.floor(hash(seed, 4) * 3)
  for (let i = 0; i < m; i++) {
    const u = 0.32 + (0.36 * (i + 0.5)) / m + (hash(seed, i + 30) - 0.5) * 0.08
    const r = (w / n) * (0.8 + 0.5 * hash(seed, i + 40))
    out.push({ x: x - w / 2 + u * w, y: y - top(u) - r * (0.15 + 0.35 * hash(seed, i + 50)), r })
  }
  return out
}

function heap(ctx: CanvasRenderingContext2D, lobes: Lobe[], x: number, y: number, w: number, dx = 0, dy = 0, grow = 1): void {
  ctx.beginPath()
  for (const l of lobes) {
    ctx.moveTo(l.x + dx + l.r * grow, l.y + dy)
    ctx.arc(l.x + dx, l.y + dy, l.r * grow, 0, Math.PI * 2)
  }
  // The body under the lobes, down to the flat base.
  const sorted = [...lobes].sort((a, b) => a.x - b.x)
  ctx.moveTo(x - w / 2 + dx, y + dy)
  for (const l of sorted) ctx.lineTo(l.x + dx, l.y + dy)
  ctx.lineTo(x + w / 2 + dx, y + dy)
  ctx.closePath()
}

/**
 * A summer cumulus: a heap of rounded lobes on a flat base, its lit face and its shaded underside two flat tones, the
 * way the film's painters lay them. `w` across and `h` high, its base at `y`.
 */
export function cumulus(g: Paint, x: number, y: number, w: number, h: number, seed: number, L: Light, a = 1): void {
  const { ctx } = g
  const lobes = lobesOf(x, y, w, h, seed)
  ctx.save()
  // Nothing below the base: a cumulus sits on a level floor of air.
  ctx.beginPath()
  ctx.rect(x - w, y - h * 3, w * 2, h * 3)
  ctx.clip()
  heap(ctx, lobes, x, y, w)
  fill(ctx, rgba(L.shade, a))
  ctx.save()
  heap(ctx, lobes, x, y, w)
  ctx.clip()
  // A middle tone where the lobes turn away, then the lit face: the heap lifted up and to the sun's side, so the shade
  // keeps the underside and a rim down the far side. Three flat tones, not a gradient.
  const lift = h * 0.22
  heap(ctx, lobes, x, y, w, -w * 0.012, -lift * 0.45, 0.99)
  fill(ctx, rgba(mix(L.cloud, L.shade, 0.45), a))
  heap(ctx, lobes, x, y, w, -w * 0.025, -lift, 0.97)
  fill(ctx, rgba(L.cloud, a))
  ctx.restore()
  ctx.restore()
}

/**
 * The day's clouds: big heaps far off over the horizon, barely moving with the camera. Each is [x in cells (in the
 * layer), its base's height over the horizon and its width, both in frame heights, seed]: they are as far as the sky,
 * so a closer or wider frame does not change their size on the screen.
 */
export function drawClouds(g: Paint, L: Light, at: Pt, heaps: [number, number, number, number][], p = 0.05, a = 1): void {
  if (a <= 0.01) return
  layer(g, p, 0, at, (v) => {
    const hy = horizonOf(v)
    for (const [x, dy, w, seed] of heaps) {
      const W = w * v.h
      const cx = x + g.t * 0.02
      if (cx + W < v.x0 || cx - W > v.x1) continue
      cumulus(g, cx, hy - dy * v.h, W, W * (0.5 + 0.25 * hash(seed, 9)), seed, L, a)
    }
  })
}

/** A low bank of cloud along the horizon: a long row of small lobes, paler towards the sky. */
export function drawBank(g: Paint, L: Light, a = 1): void {
  const { ctx, view: v } = g
  const hy = horizonOf(v)
  const r = v.h * 0.03
  ctx.beginPath()
  const off = (v.cx * 0.03) % (r * 2.2)
  for (let x = v.x0 - r * 3 - off; x < v.x1 + r * 3; x += r * 1.6) {
    const i = Math.round(x / (r * 1.6) + v.cx * 0.03 / (r * 1.6))
    const rr = r * (0.7 + 0.8 * hash(i, 71))
    ctx.moveTo(x + rr, hy - rr * 0.4)
    ctx.arc(x, hy - rr * 0.4, rr, 0, Math.PI * 2)
  }
  ctx.rect(v.x0 - 1, hy - r * 0.4, v.w + 2, r)
  fill(ctx, rgba(mix(L.cloud, L.low, 0.55), a))
}
