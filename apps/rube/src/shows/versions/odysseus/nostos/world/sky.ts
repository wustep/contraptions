import { circle, clamp01, hash, mix, rgba, vgrad, type Paint } from '../draw'
import { layer } from './depth'
import { horizonOf } from './sea'

/**
 * The sky over the whole voyage, by show time: a gradient from the zenith to the horizon, the sun or the moon as a
 * flat disc (never a glow: the light is in what it falls on), and a few long clouds. The score keys it (`setSkyKeys`):
 * night at Troy, a grey morning at the Cyclops' island, fog at Telepylus, the white noon of the Sirens, the storm,
 * Ogygia's days and nights, a dawn at Ithaca, and the sun going down in the west.
 */

export interface SkyKey {
  t: number
  /** The zenith and the horizon. */
  top: string
  low: string
  /** The sun (or moon): where it is as shares of the frame (0,0 top left), its colour, and how much of it is seen. */
  disc?: { x: number; y: number; r: number; color: string; a: number }
  /** Cloud: its colour and how much of the sky it covers, 0 to 1. */
  cloud: string
  cover: number
  /** The sea's colours under this sky. */
  far: string
  near: string
  body: string
  deep: string
  lit: string
  edge: string
}

let keys: SkyKey[] = []
export function setSkyKeys(ks: SkyKey[]): void {
  keys = [...ks].sort((a, b) => a.t - b.t)
}

const ease = (u: number) => u * u * (3 - 2 * u)

/** The sky at `t`: the two keys round it, mixed. */
export function skyAt(t: number): SkyKey {
  if (!keys.length) throw new Error('nostos: no sky keys')
  if (t <= keys[0].t) return keys[0]
  if (t >= keys[keys.length - 1].t) return keys[keys.length - 1]
  let i = 0
  while (i + 1 < keys.length && keys[i + 1].t <= t) i++
  const a = keys[i]
  const b = keys[i + 1]
  const u = ease(clamp01((t - a.t) / Math.max(1e-6, b.t - a.t)))
  const m = (x: string, y: string) => mix(x, y, u)
  const disc = a.disc && b.disc
    ? { x: a.disc.x + (b.disc.x - a.disc.x) * u, y: a.disc.y + (b.disc.y - a.disc.y) * u, r: a.disc.r + (b.disc.r - a.disc.r) * u, color: m(a.disc.color, b.disc.color), a: a.disc.a + (b.disc.a - a.disc.a) * u }
    : a.disc
      ? { ...a.disc, a: a.disc.a * (1 - u) }
      : b.disc
        ? { ...b.disc, a: b.disc.a * u }
        : undefined
  return {
    t,
    top: m(a.top, b.top),
    low: m(a.low, b.low),
    disc,
    cloud: m(a.cloud, b.cloud),
    cover: a.cover + (b.cover - a.cover) * u,
    far: m(a.far, b.far),
    near: m(a.near, b.near),
    body: m(a.body, b.body),
    deep: m(a.deep, b.deep),
    lit: m(a.lit, b.lit),
    edge: m(a.edge, b.edge),
  }
}

/**
 * The sky behind everything in view: its gradient pinned to the frame (the sky does not scroll), the horizon's band of
 * haze where the world's horizon is, the disc, and the clouds, which drift slower than the sea so they read as far.
 */
export function drawSky(g: Paint): void {
  const { ctx, t, view } = g
  const s = skyAt(t)
  const hy = horizonOf(view)
  const top = Math.min(view.y0, hy - 1)
  ctx.fillStyle = vgrad(ctx, top, Math.max(hy, view.y0 + 0.01), [
    [0, s.top],
    [1, s.low],
  ])
  ctx.fillRect(view.x0 - 1, view.y0 - 1, view.x1 - view.x0 + 2, Math.max(0, Math.min(view.y1, hy + 2) - view.y0 + 1))
  if (s.disc && s.disc.a > 0.01) {
    const d = s.disc
    // In the sky's own terms: across the frame, and down from the frame's top to the horizon; and cut off by the
    // horizon, so a low sun sets into the sea rather than through it.
    const x = view.x0 + (view.x1 - view.x0) * d.x
    const y = view.y0 + (hy - view.y0) * d.y
    ctx.save()
    ctx.beginPath()
    ctx.rect(view.x0 - 1, view.y0 - 1, view.x1 - view.x0 + 2, hy - view.y0 + 1)
    ctx.clip()
    circle(ctx, x, y, d.r * view.h)
    ctx.fillStyle = rgba(d.color, d.a)
    ctx.fill()
    ctx.restore()
  }
  if (s.cover > 0.01) drawClouds(g, s, hy)
}

/**
 * Long, flat clouds in three ranks at three depths (`layer`), the nearest the lowest-reaching and the widest: a handful
 * of big shapes that drift with the wind and slide by slowly as the camera pans, never a field of marks.
 */
function drawClouds(g: Paint, s: SkyKey, hy: number): void {
  const { ctx, t, view } = g
  for (let r = 0; r < 3; r++) {
    const L = layer(view, [420, 220, 120][r])
    const spacing = [70, 52, 40][r]
    const drift = t * [0.25, 0.4, 0.6][r]
    // The span of layer x the frame shows.
    const lx0 = view.cx + (view.x0 - view.cx) / L.s
    const lx1 = view.cx + (view.x1 - view.cx) / L.s
    const first = Math.floor((lx0 - drift) / spacing) - 1
    const last = Math.ceil((lx1 - drift) / spacing) + 1
    ctx.fillStyle = rgba(s.cloud, Math.min(1, s.cover) * [0.5, 0.62, 0.75][r])
    for (let i = first; i <= last; i++) {
      const seed = hash(i, r, 7)
      if (seed > 0.2 + 0.8 * s.cover) continue
      const cx = L.x(i * spacing + drift + (seed - 0.5) * spacing * 0.6)
      const cy = Math.min(hy - 0.4, L.y(-[16, 12, 9][r] - 10 * hash(i, r, 3)))
      const w = (18 + 26 * seed) * L.s
      const h = (1.2 + 1.6 * hash(i, r, 5)) * L.s
      ctx.beginPath()
      ctx.ellipse(cx, cy, w / 2, h, 0, 0, Math.PI * 2)
      ctx.ellipse(cx - w * 0.16, cy - h * 0.75, w * 0.2, h * 0.95, 0, 0, Math.PI * 2)
      ctx.ellipse(cx + w * 0.14, cy - h * 0.55, w * 0.24, h * 0.85, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}
