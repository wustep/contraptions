import { mixHex } from '../../../../parts'
import { rgba } from './canvas'
import { WINDOW } from './desk'
import { MUSIC_END, smooth } from './music'
import { cloudAt, lampAt, nightAt, skyAt } from './world'

/**
 * The window's light on the room. Everything on the desk stands in front of the window, so the window backlights it:
 * a thin rim of light along each thing's top, the side toward the glass. Peach in the dusk, the night's cool blue
 * after, brighter and paler once the moon is up in a clear sky; and at the end, when the lamp is turned down, it is
 * what is left to light the room by. Strongest by the window, gone by the lamp.
 */

type Ctx = CanvasRenderingContext2D

/** The window's middle, across: the rims are strongest under it. */
const WX = (WINDOW.x0 + WINDOW.x1) / 2

/** The window's light at `t`: its colour, and how strong a rim it makes (0 to 1). */
export function rimAt(t: number): { color: string; a: number } {
  const sky = skyAt(t)
  const moon = smooth(nightAt(t), 0.5, 0.62) * (1 - 0.85 * cloudAt(t))
  const color = mixHex(mixHex('#8E98DA', '#F2A98C', sky.dusk * 0.85), '#E2E5FF', moon * 0.7)
  // With the lamp turned down at the end, the moonlight is the room's light.
  const dark = (1 - lampAt(t)) * smooth(t, MUSIC_END - 2, MUSIC_END + 4)
  const a = Math.min(1, 0.3 + 0.35 * sky.dusk + 0.3 * moon + 0.35 * dark)
  return { color, a }
}

/** How much of the window's light reaches across to `x`: all of it under the window, little past the books. */
export const reach = (x: number): number => Math.exp(-(((x - WX) / 2.6) ** 2))

/**
 * A rim along a top edge, the points in order, a little inside the outline: the window's light on it, fading along it as
 * it goes away from the window.
 */
export function rimLine(ctx: Ctx, lw: number, t: number, pts: { x: number; y: number }[], k = 1): void {
  const { color, a } = rimAt(t)
  if (pts.length < 2 || a * k < 0.01) return
  const x0 = pts[0].x
  const x1 = pts[pts.length - 1].x
  const g = ctx.createLinearGradient(x0, 0, x1 === x0 ? x0 + 0.01 : x1, 0)
  g.addColorStop(0, rgba(color, a * k * reach(x0)))
  g.addColorStop(1, rgba(color, a * k * reach(x1)))
  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  ctx.strokeStyle = g
  ctx.lineWidth = lw * 1.5
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(pts[0].x, pts[0].y)
  for (const p of pts.slice(1)) ctx.lineTo(p.x, p.y)
  ctx.stroke()
  ctx.restore()
}
