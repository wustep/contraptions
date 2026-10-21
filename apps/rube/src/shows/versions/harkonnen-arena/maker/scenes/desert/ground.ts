import { clamp01, ellipse, smooth, type Brush } from '../../paint'
import { SAND } from '../../world/land'
import { FUNNEL_R, MAW_R, W, XH, funnelDepth, swellH, swellX } from './plan'

/**
 * The flat the harvester works: level sand from the rock out to the horizon's ranges, and what the worm does to it.
 * Worm sign is a long swell running under it from the east, its west face in shadow, heaving on the booms. Then the
 * sand round the machine goes down into a funnel, its far wall in shade and lit on its west side by the sun behind us,
 * and the near rim hides what sinks into it.
 */

const SWELL_L = 28

/** The flat's surface at `x` (world y), with the swell in it. */
export function flatAt(x: number, t: number): number {
  const h = swellH(t)
  if (h <= 0) return 0
  const u = (x - swellX(t)) / SWELL_L
  if (u <= -1 || u >= 1) return 0
  // Steeper in front (west, where it pushes), long behind.
  const v = u < 0 ? u * 1.25 : u * 0.8
  const k = Math.max(0, 1 - v * v)
  return -h * k * k
}

/** The flat across the frame, with the swell and its shadowed face. */
export function paintFlat(b: Brush, t: number): void {
  const { ctx, view } = b
  const x0 = view.x0 - 1
  const x1 = view.x1 + 1
  const bottom = Math.max(view.y1 + 1, 2)
  ctx.fillStyle = b.c(SAND.lit)
  ctx.fillRect(x0, 0, x1 - x0, bottom)
  const h = swellH(t)
  if (h <= 0.01) return
  const sx = swellX(t)
  if (sx + SWELL_L < x0 || sx - SWELL_L > x1) return
  // The swell's body, then its west face in shade, crisp at the top and soft at the foot.
  const n = 48
  ctx.beginPath()
  ctx.moveTo(sx - SWELL_L, 0.05)
  for (let i = 0; i <= n; i++) {
    const x = sx - SWELL_L + (2 * SWELL_L * i) / n
    ctx.lineTo(x, flatAt(x, t))
  }
  ctx.lineTo(sx + SWELL_L, 0.05)
  ctx.closePath()
  ctx.fillStyle = b.c(SAND.lit)
  ctx.fill()
  const crest = sx - SWELL_L * 0.12
  ctx.beginPath()
  ctx.moveTo(crest, flatAt(crest, t))
  for (let i = 1; i <= 16; i++) {
    const x = crest - (SWELL_L * 0.8 * i) / 16
    ctx.lineTo(x, flatAt(x, t))
  }
  ctx.lineTo(crest - SWELL_L * 0.25, h * 0.15)
  ctx.quadraticCurveTo(crest + SWELL_L * 0.05, -h * 0.35, crest + 0.1, flatAt(crest, t))
  ctx.closePath()
  const gr = ctx.createLinearGradient(0, -h, 0, 0.2)
  gr.addColorStop(0, b.c(SAND.shade))
  gr.addColorStop(0.65, b.ca(SAND.shade, 0.9))
  gr.addColorStop(1, b.ca(SAND.shade, 0))
  ctx.fillStyle = gr
  ctx.fill()
  // Sand blown off the crest as it runs: a long thin veil trailing east behind it, lifting on each heave.
  const top = flatAt(crest, t)
  const veil = 0.55 * Math.min(1, h / 3)
  ctx.beginPath()
  ctx.moveTo(crest - 0.4, top + 0.1)
  ctx.quadraticCurveTo(crest + SWELL_L * 0.25, top - h * 0.55, crest + SWELL_L * 0.95, top + h * 0.15)
  ctx.quadraticCurveTo(crest + SWELL_L * 0.4, top + h * 0.1, crest - 0.4, top + 0.1)
  ctx.closePath()
  ctx.fillStyle = b.ca(SAND.air, veil)
  ctx.fill()
}

/** The funnel's rim, seen a little from above: how wide, how squashed. */
const RY = 0.24

/** The hole: its far wall, in shade, its west part lit, with sand running down it toward the middle. */
export function paintFunnelBack(b: Brush, t: number): void {
  const d = funnelDepth(t)
  if (d <= 0.01) return
  const { ctx } = b
  const open = clamp01(d / 1.2)
  const rx = FUNNEL_R * (0.55 + 0.45 * open)
  const ry = rx * RY
  ctx.save()
  ellipse(ctx, XH, 0, rx, ry)
  ctx.clip()
  // The far wall: from the rim down to where the near rim hides the rest, darker the deeper it goes.
  ctx.fillStyle = b.c(SAND.shade)
  ctx.fillRect(XH - rx - 1, -ry - 1, 2 * rx + 2, 2 * ry + 2)
  ctx.beginPath()
  ctx.ellipse(XH - rx * 0.35, -ry * 0.1, rx * 0.75, ry * 1.05, 0, 0, Math.PI * 2)
  ctx.fillStyle = b.ca(SAND.lit, 0.55)
  ctx.fill()
  // Sand running in: three long tongues from the rim toward the middle, crawling down.
  for (let i = 0; i < 3; i++) {
    const a = Math.PI * (1.15 + 0.35 * i)
    const crawl = ((t - W.sink) * 0.35 + i * 0.33) % 1
    const rx0 = XH + Math.cos(a) * rx * 0.95
    const ry0 = Math.sin(a) * ry * 0.95
    const tx = XH + (rx0 - XH) * (0.35 - 0.2 * crawl)
    const ty = ry0 * 0.35 + d * 0.15
    ctx.beginPath()
    ctx.moveTo(rx0 - 0.9, ry0)
    ctx.quadraticCurveTo((rx0 + tx) / 2, (ry0 + ty) / 2 - 0.4, tx, ty)
    ctx.quadraticCurveTo((rx0 + tx) / 2 + 0.8, (ry0 + ty) / 2, rx0 + 0.9, ry0)
    ctx.closePath()
    ctx.fillStyle = b.ca(SAND.lit, 0.35 * (1 - smooth(t, W.maw, W.maw + 2)))
    ctx.fill()
  }
  ctx.restore()
}

/** The near rim: the flat in front of the hole, which hides the lower part of whatever has gone down into it. */
export function paintFunnelFront(b: Brush, t: number): void {
  const d = funnelDepth(t)
  if (d <= 0.01) return
  const { ctx, view } = b
  const open = clamp01(d / 1.2)
  const rx = FUNNEL_R * (0.55 + 0.45 * open)
  const ry = rx * RY
  // As wide as the mouth that comes up through it, so nothing that stands in the hole shows under the sand beside it.
  const wide = Math.max(rx, MAW_R) + 2
  const bottom = Math.max(view.y1, ry) + 1
  ctx.beginPath()
  ctx.moveTo(XH - wide, 0)
  ctx.lineTo(XH - rx, 0)
  ctx.ellipse(XH, 0, rx, ry, 0, Math.PI, 0, true)
  ctx.lineTo(XH + wide, 0)
  ctx.lineTo(XH + wide, bottom)
  ctx.lineTo(XH - wide, bottom)
  ctx.closePath()
  ctx.fillStyle = b.c(SAND.lit)
  ctx.fill()
}
