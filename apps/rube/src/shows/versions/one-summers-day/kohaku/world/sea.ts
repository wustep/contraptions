import type { Light } from '../light'
import { ellipse, hash, hgrad, ink, mix, rgba, smooth, type Paint } from '../paint'
import { SEA_Y } from '../geo'
import { HORIZON } from './sky'

/**
 * The sea the rain makes: the plain east of the bathhouse under a hand's depth of still water, the railway running out
 * over it. The sky already lays the water from the horizon down (`drawSky`); this adds what makes it water and not a
 * coloured floor: a few long calm ripples, lying in rows that go back to the horizon (so the far ones move less as the
 * camera goes), the low sun's or the moon's path on it, the rings round anything that touches it, and the reflections
 * of what stands in it. Flat, still, never a glitter.
 */

/** How many rows of ripples lie between the horizon and the frame's foot. */
const ROWS = 9

/**
 * The water's calm details over world x `x0..x1`: long ripples in rows going back to the horizon, and the path of the
 * low sun or the moon. Drawn over the sky's water and under whatever stands in it.
 */
export function drawWater(g: Paint, L: Light, x0: number, x1: number): void {
  const { ctx, view: v } = g
  const hy = v.y0 + v.h * HORIZON
  if (hy >= v.y1) return
  const a = Math.max(v.x0, x0)
  const b = Math.min(v.x1, x1)
  if (b <= a) return
  ctx.save()
  ctx.beginPath()
  ctx.rect(a, hy, b - a, v.y1 - hy + 1)
  ctx.clip()
  // The sun's path, or the moon's: a soft band of the sky's light lying on the water under it, widening towards us.
  const low = smooth(L.sunY, 0.25, 0.75) * (1 - smooth(L.sunY, 1.0, 1.12)) * (1 - L.night * 0.8)
  if (low > 0.01) path(g, v.x0 + v.w * L.sunX, hy, v.y1, v.h, mix(L.seaLit, L.sun, 0.4), 0.42 * low)
  if (L.moon > 0.05) path(g, v.x0 + v.w * 0.26, hy, v.y1, v.h, '#C9CEC4', 0.16 * L.moon)
  // The ripples: a row a depth, each row's few long marks sliding with the camera by how near the row is.
  const lit = rgba(L.seaLit, 0.3 + 0.1 * (1 - L.night))
  const dark = rgba(mix(L.seaNear, '#000000', 0.25), 0.22)
  for (let r = 1; r <= ROWS; r++) {
    const f = r / ROWS
    const y = hy + Math.pow(f, 1.7) * (v.y1 - hy)
    if (y < hy + 0.004 * v.h) continue
    const p = 0.1 + 0.9 * f
    const shift = v.cx * (1 - p)
    const gap = 2.6 + 9 * (1 - f)
    const len = 0.25 + 1.6 * f
    const drift = g.t * 0.05 * (0.5 + f)
    const k0 = Math.floor((a - shift - drift) / gap) - 1
    const k1 = Math.ceil((b - shift - drift) / gap) + 1
    for (let k = k0; k <= k1; k++) {
      if (hash(k, r, 3) < 0.35) continue
      const x = k * gap + shift + drift + hash(k, r, 4) * gap * 0.6
      const w = len * (0.6 + 0.8 * hash(k, r, 5))
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + w, y)
      ink(g, hash(k, r, 6) < 0.7 ? lit : dark, 1.3 + 1.4 * f)
    }
  }
  ctx.restore()
}

/** A soft vertical band of light on the water under a light at screen x `x`, from the horizon to the frame's foot. */
function path(g: Paint, x: number, hy: number, y1: number, h: number, color: string, a: number): void {
  const { ctx } = g
  const w0 = h * 0.025
  const w1 = h * 0.12
  // As a stack of flat bands, each a little wider than the one above, fine enough that no step shows: no gradient
  // blooms round the light.
  const n = 14
  for (let i = 0; i < n; i++) {
    const ya = hy + ((y1 - hy) * i) / n
    const yb = hy + ((y1 - hy) * (i + 1)) / n
    const w = w0 + ((w1 - w0) * (i + 0.5)) / n
    ctx.fillStyle = hgrad(ctx, x - w, x + w, [
      [0, rgba(color, 0)],
      [0.5, rgba(color, a * (1 - (0.55 * i) / n))],
      [1, rgba(color, 0)],
    ])
    ctx.fillRect(x - w, ya, w * 2, yb - ya + 0.001)
  }
}

/**
 * The reflection of whatever `fn` draws, mirrored in the water at `y` (SEA_Y unless given), clipped to below it, at
 * `a`: a plain mirror, a little paler, as still water gives back.
 */
export function reflect(g: Paint, fn: () => void, a = 0.32, y = SEA_Y): void {
  const { ctx, view: v } = g
  if (y > v.y1 || a <= 0.003) return
  ctx.save()
  ctx.beginPath()
  ctx.rect(v.x0 - 1, y, v.w + 2, v.y1 - y + 1)
  ctx.clip()
  ctx.globalAlpha = a
  ctx.translate(0, 2 * y)
  ctx.scale(1, -1)
  fn()
  ctx.restore()
}

/**
 * Rings on the water spreading from `x` (at the surface) since `at`: two flat ellipses going out and fading over a
 * second and a half. Nothing before `at`.
 */
export function rings(g: Paint, L: Light, x: number, at: number, big = 1, y = SEA_Y): void {
  const age = g.t - at
  if (age < 0 || age > 1.8) return
  for (const lag of [0, 0.28]) {
    const s = age - lag
    if (s <= 0) continue
    const u = s / 1.5
    if (u >= 1) continue
    const r = (0.12 + 0.55 * (1 - Math.pow(1 - u, 2))) * big
    ellipse(g.ctx, x, y + 0.01, r, r * 0.22)
    ink(g, rgba(L.seaLit, 0.55 * (1 - u) * (lag ? 0.6 : 1)), 1.6)
  }
}

/** Where something stands in the water: a short light line along the surface across `x0..x1`, its foot in the water. */
export function waterline(g: Paint, L: Light, x0: number, x1: number, y = SEA_Y): void {
  g.ctx.beginPath()
  g.ctx.moveTo(x0 - 0.06, y)
  g.ctx.lineTo(x1 + 0.06, y)
  ink(g, rgba(L.seaLit, 0.5), 1.6)
}
