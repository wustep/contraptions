import type { Light } from '../light'
import { fill, hash, layer, lit, mix, rgba, vgrad, type Paint, type Pt, type View } from '../paint'
import { horizonOf } from './sky'

/**
 * The sea of cloud under the moon: rank on rank of rounded cloud tops going away to the horizon, silver where the moon
 * is on them and blue in their hollows, the nearest a world-plane floor of cloud they fly over and fall through. Through
 * one gap in it, far below, a river winds in the moonlight: his river, as she remembers it.
 */

/** The near cloud floor: its top, and its underside, in world cells. */
export const CLOUD_TOP = -20.6
export const CLOUD_BOTTOM = -15.2
/** The gap in the near cloud, where the river shows far below: its middle and half-width. */
export const GAP = { x: 33.5, w: 3.4 }

/** A rank of cloud tops across the view at `y`, lobes of about `r`, in two tones. */
function rank(ctx: CanvasRenderingContext2D, v: View, y: number, r: number, seed: number, top: string, body: string, gap?: { x: number; w: number }): void {
  const lobes: [number, number, number][] = []
  const step = r * 1.05
  const i0 = Math.floor((v.x0 - r * 2) / step)
  const i1 = Math.ceil((v.x1 + r * 2) / step)
  for (let i = i0; i <= i1; i++) {
    const x = i * step + (hash(i, seed) - 0.5) * r * 0.6
    if (gap && Math.abs(x - gap.x) < gap.w) continue
    const rr = r * (0.8 + 0.4 * hash(i, seed + 1))
    lobes.push([x, y - rr * 0.25 * hash(i, seed + 2), rr])
  }
  const shape = () => {
    ctx.beginPath()
    for (const [x, ly, rr] of lobes) {
      ctx.moveTo(x + rr, ly)
      ctx.arc(x, ly, rr, 0, Math.PI * 2)
    }
  }
  // The body down to the bottom of the view, then the moonlit tops: the lobes lifted.
  shape()
  if (!gap) ctx.rect(v.x0 - 1, y, v.w + 2, v.y1 - y + 2)
  fill(ctx, body)
  ctx.save()
  shape()
  if (!gap) ctx.rect(v.x0 - 1, y, v.w + 2, v.y1 - y + 2)
  ctx.clip()
  ctx.beginPath()
  for (const [x, ly, rr] of lobes) {
    ctx.moveTo(x - rr * 0.08 + rr * 0.92, ly - rr * 0.22)
    ctx.arc(x - rr * 0.08, ly - rr * 0.22, rr * 0.92, 0, Math.PI * 2)
  }
  fill(ctx, top)
  ctx.restore()
}

/** The far ranks, from the horizon down to the near floor, each nearer one bigger and moving more with the camera. */
export function drawCloudSea(g: Paint, L: Light, at: Pt, a = 1): void {
  if (a <= 0.01) return
  const { ctx } = g
  ctx.save()
  ctx.globalAlpha = a
  const ranks = 4
  for (let k = 0; k < ranks; k++) {
    const p = 0.08 + 0.2 * k
    layer(g, p, 0, at, (v) => {
      const hy = horizonOf(v)
      const y = hy + v.h * (0.015 + 0.045 * k + 0.02 * k * k)
      const r = v.h * (0.03 + 0.03 * k)
      const far = 1 - k / ranks
      const top = mix(L.cloud, L.low, far * 0.6)
      const body = mix(top, L.shade, 0.4)
      rank(ctx, v, y, r, 300 + k * 17, top, body)
    })
  }
  ctx.restore()
}

/** The basin in the floor over the gap: how far down the surface dips at `x` (0 away from it). */
const dip = (x: number): number => {
  const u = (x - GAP.x) / GAP.w
  return Math.abs(u) >= 1 ? 0 : Math.pow(Math.cos((u * Math.PI) / 2), 1.4) * 1.25
}

/**
 * The near floor of cloud, in the world's plane: a continuous lumpy surface, moonlit on its tops, its body going down
 * to the underside; over the gap it falls away into a basin, its far wall in shade, and deep down in it the land in the
 * moonlight with the river winding silver through it.
 */
export function drawCloudFloor(g: Paint, L: Light, a = 1): void {
  if (a <= 0.01) return
  const { ctx, view: v } = g
  if (v.y1 < CLOUD_TOP - 1.5 || v.y0 > CLOUD_BOTTOM + 1) return
  ctx.save()
  ctx.globalAlpha = a
  const top = L.cloud
  const body = mix(L.cloud, L.shade, 0.45)
  const deep = mix(L.shade, L.top, 0.25)
  const gx0 = GAP.x - GAP.w
  const gx1 = GAP.x + GAP.w
  const by = CLOUD_TOP + 0.05
  if (gx1 > v.x0 - 1 && gx0 < v.x1 + 1) {
    // The land deep in the basin, seen from high over it: so it moves little with the camera.
    ctx.save()
    ctx.beginPath()
    ctx.ellipse(GAP.x, by + 0.62, GAP.w * 0.98, 1.1, 0, 0, Math.PI * 2)
    ctx.clip()
    const dx = (v.cx - GAP.x) * 0.6
    ctx.translate(dx, 0)
    // Moonlit country far below: hazed going away, darker green near.
    ctx.fillStyle = vgrad(ctx, by - 0.2, by + 1.7, [
      [0, mix(lit('#56705E', L.ambient, 0.5), L.low, 0.45)],
      [1, lit('#2F4A3A', L.ambient, 0.5)],
    ])
    ctx.fillRect(GAP.x - GAP.w * 2, by - 0.5, GAP.w * 4, 3)
    // Low hills going away in it, the river coming out from between them.
    ctx.beginPath()
    ctx.moveTo(GAP.x - GAP.w * 1.5, by + 0.5)
    ctx.quadraticCurveTo(GAP.x - 1.8, by + 0.02, GAP.x - 0.2, by + 0.44)
    ctx.quadraticCurveTo(GAP.x + 1.2, by + 0.1, GAP.x + GAP.w * 1.5, by + 0.46)
    ctx.lineTo(GAP.x + GAP.w * 1.5, by + 2)
    ctx.lineTo(GAP.x - GAP.w * 1.5, by + 2)
    ctx.closePath()
    fill(ctx, mix(lit('#3E5A46', L.ambient, 0.5), L.low, 0.15))
    // The river: a ribbon winding towards us out of the hills, widening as it comes, silver with the moon on it.
    const N = 32
    const mid = (u: number): Pt => [GAP.x - 0.1 + 1.7 * Math.sin(u * 4.2 + 0.5) * (0.3 + 0.7 * u), by + 0.4 + u * 1.0]
    const half = (u: number) => 0.03 + 0.2 * u
    ctx.beginPath()
    for (let i = 0; i <= N; i++) {
      const [x, y] = mid(i / N)
      if (i === 0) ctx.moveTo(x - half(i / N), y)
      else ctx.lineTo(x - half(i / N), y)
    }
    for (let i = N; i >= 0; i--) {
      const [x, y] = mid(i / N)
      ctx.lineTo(x + half(i / N), y)
    }
    ctx.closePath()
    fill(ctx, mix('#E2EAE4', L.cloud, 0.2))
    ctx.restore()
    // The basin's far wall, in shade, its lower edge hanging in lobes.
    ctx.beginPath()
    ctx.moveTo(gx0, by)
    for (let x = gx0; x <= gx1; x += 0.25) ctx.lineTo(x, by - 0.02)
    for (let x = gx1; x >= gx0; x -= 0.4) {
      const d = 0.28 + 0.12 * Math.sin(x * 3.1) + 0.6 * dip(x) * 0.35
      ctx.quadraticCurveTo(x + 0.2, by + d + 0.12, x - 0.0, by + d)
    }
    ctx.closePath()
    fill(ctx, deep)
  }
  // The floor's body under the surface, to its underside, with no body over the basin.
  ctx.save()
  ctx.beginPath()
  ctx.rect(v.x0 - 1, CLOUD_TOP, v.w + 2, CLOUD_BOTTOM - CLOUD_TOP + 0.6)
  if (gx1 > v.x0 - 1 && gx0 < v.x1 + 1) ctx.ellipse(GAP.x, by + 0.62, GAP.w * 0.98, 1.1, 0, 0, Math.PI * 2)
  ctx.clip('evenodd')
  ctx.fillStyle = vgrad(ctx, CLOUD_TOP, CLOUD_BOTTOM + 0.5, [
    [0, body],
    [0.6, mix(body, L.low, 0.25)],
    [1, rgba(body, 0)],
  ])
  ctx.fillRect(v.x0 - 1, CLOUD_TOP, v.w + 2, CLOUD_BOTTOM - CLOUD_TOP + 0.6)
  ctx.restore()
  // The surface: overlapping lobes along it, dipping into the basin on its near side, two flat tones.
  const lobes: [number, number, number][] = []
  const step = 0.55
  for (let i = Math.floor((v.x0 - 2) / step); i <= Math.ceil((v.x1 + 2) / step); i++) {
    const x = i * step + (hash(i, 501) - 0.5) * 0.25
    const r = 0.42 + 0.3 * hash(i, 502)
    const inBasin = Math.abs(x - GAP.x) < GAP.w * 0.98
    // In the basin only its near rim: lobes along the ellipse's lower edge.
    const y = inBasin ? by + 0.62 + Math.sqrt(Math.max(0, 1 - ((x - GAP.x) / (GAP.w * 0.98)) ** 2)) * 1.1 + r * 0.45 : CLOUD_TOP + 0.1 - r * 0.25 * hash(i, 503) + dip(x) * 0.3
    lobes.push([x, y, inBasin ? r * 0.8 : r])
  }
  ctx.beginPath()
  for (const [x, y, r] of lobes) {
    ctx.moveTo(x + r, y)
    ctx.arc(x, y, r, 0, Math.PI * 2)
  }
  fill(ctx, body)
  ctx.beginPath()
  for (const [x, y, r] of lobes) {
    ctx.moveTo(x - r * 0.08 + r * 0.9, y - r * 0.22)
    ctx.arc(x - r * 0.08, y - r * 0.22, r * 0.9, 0, Math.PI * 2)
  }
  fill(ctx, top)
  ctx.restore()
}

/** Inside the cloud, falling through it: the frame goes to the cloud's pale and comes out of it, `a` 0 to 1. */
export function drawMist(g: Paint, L: Light, a: number): void {
  if (a <= 0.003) return
  const { ctx, view: v } = g
  ctx.fillStyle = rgba(mix(L.cloud, L.shade, 0.35), Math.min(1, a))
  ctx.fillRect(v.x0 - 1, v.y0 - 1, v.w + 2, v.h + 2)
}
