import { mixHex } from '../../../../parts'
import { rgba } from './canvas'
import { climbAt } from './cat'
import { CAT, DESK, GLASS, WINDOW } from './desk'
import { MUSIC_END, smooth } from './music'
import { flashAt, moonAt } from './sky'
import { coverAt, lampAt, skyAt } from './world'

/**
 * The window's light on the desk. What comes in through the glass falls down and out into the room, onto the desk's
 * top under the window: the window's own shape, four panes, the bars' shadow a cross through it, lying on the wood,
 * nearer the wall for the bottom of the glass and further out for the top.
 *
 * In the dusk a low warm light, long; through the rain and the cloud, nothing to speak of; when the moon is up in a
 * clear sky, a pale cool one, shorter, the moon being high; and in a flash of the far lightning, for a moment, a cold
 * one. At the end, with the lamp turned down, the moonlight on the desk is the room's light, and the kitten asleep on
 * the sill is a soft dark in it.
 *
 * (Not the headlights: a car below throws its light up, onto the ceiling and the wall, never down onto the desk.)
 */

type Ctx = CanvasRenderingContext2D

/** The bars' half widths in the light: the mullion's as the frame draws it, the transom's wider (its depth, seen
 * from above, throws a broader shadow). */
const BAR = 0.05
const TRANSOM = 0.17

interface Spill {
  /** Its colour, and how strong it is (0 to 1). */
  color: string
  a: number
  /** How far out onto the desk a point of the glass lands, a fraction of the desk's depth per cell of its height. */
  kd: number
  /** How far across, cells per cell of height (the light comes from the right of the window, so it goes left). */
  kx: number
}

/** The window's light at `t`. */
export function spillAt(t: number): Spill {
  const sky = skyAt(t)
  const moon = moonAt(t)
  const flash = flashAt(t).a
  const end = smooth(t, MUSIC_END - 2, MUSIC_END + 4)
  const dusk = 0.32 * sky.dusk
  const night = moon * (0.26 + 0.08 * coverAt(t) + 0.3 * end * (1 - lampAt(t)))
  const cold = 0.55 * flash
  const a = Math.min(0.75, dusk + night + cold)
  const w = a > 0 ? 1 / Math.max(1e-6, dusk + night + cold) : 0
  const color = mixHex(mixHex('#C4CCFF', '#FFB27E', dusk * w), '#E8ECFF', cold * w)
  // A low sun lays the light long; the moon, high, shorter; and the moon has crossed to the right as the night goes.
  const kd = 0.17 * dusk * w + 0.14 * (night + cold) * w
  const kx = -0.04 * dusk * w + 0.13 * night * w + 0.05 * cold * w
  return { color, a, kd, kx }
}

/** The four panes of the glass, as rectangles (x0, y0, x1, y1). */
const PANES: [number, number, number, number][] = (() => {
  const m = WINDOW.mullion
  const tr = WINDOW.transom
  const out: [number, number, number, number][] = []
  for (const [x0, x1] of [[GLASS.x0, m - BAR], [m + BAR, GLASS.x1]])
    for (const [y0, y1] of [[GLASS.y0, tr - TRANSOM], [tr + TRANSOM, GLASS.y1]]) out.push([x0, y0, x1, y1])
  return out
})()

/** Where a point of the glass lands on the desk's top. */
function land(s: Spill, x: number, y: number): { x: number; y: number } {
  const h = DESK.y - y
  return { x: x - s.kx * h, y: DESK.y + DESK.top * Math.min(1.2, s.kd * h) }
}

/** The patch's outline, all four panes. */
function patch(ctx: Ctx, s: Spill): void {
  ctx.beginPath()
  for (const [x0, y0, x1, y1] of PANES) {
    const c = [land(s, x0, y1), land(s, x1, y1), land(s, x1, y0), land(s, x0, y0)]
    ctx.moveTo(c[0].x, c[0].y)
    for (const q of c.slice(1)) ctx.lineTo(q.x, q.y)
    ctx.closePath()
  }
}

/** Kept to the desk's top. */
function onTop(ctx: Ctx): void {
  ctx.beginPath()
  ctx.rect(-40, DESK.y, 80, DESK.top)
  ctx.clip()
}

/** The light lying on the desk, in its colour: drawn with the desk, under what stands on it. */
export function spill(ctx: Ctx, t: number): void {
  const s = spillAt(t)
  if (s.a < 0.01 || s.kd <= 0) return
  ctx.save()
  onTop(ctx)
  ctx.globalCompositeOperation = 'screen'
  // Brightest in its middle and nearest the window, falling away toward its ends and its far edge, as light through a
  // window does on a surface: a light, not a sheet laid on the wood. Its edges soft, a little halo round each pane.
  const mid = land(s, (GLASS.x0 + GLASS.x1) / 2, GLASS.y1 - (GLASS.y1 - GLASS.y0) * 0.3)
  const near = land(s, 0, GLASS.y1).y
  const far = land(s, 0, GLASS.y0).y
  patch(ctx, s)
  ctx.lineJoin = 'round'
  for (const [w, k] of [[0.12, 0.04], [0.07, 0.06], [0.035, 0.1]]) {
    ctx.strokeStyle = rgba(s.color, k * s.a)
    ctx.lineWidth = w
    ctx.stroke()
  }
  ctx.save()
  patch(ctx, s)
  ctx.clip()
  ctx.translate(mid.x, mid.y)
  ctx.scale((GLASS.x1 - GLASS.x0) * 0.62, Math.max(0.02, (far - near) * 0.9))
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
  g.addColorStop(0, rgba(s.color, 0.75 * s.a))
  g.addColorStop(0.55, rgba(s.color, 0.45 * s.a))
  g.addColorStop(1, rgba(s.color, 0.12 * s.a))
  ctx.fillStyle = g
  ctx.fillRect(-1.2, -1.2, 2.4, 2.4)
  ctx.restore()
  // The kitten asleep on the sill, at the end, keeps a little of it off the desk.
  const c = climbAt(t)
  if (c.dy < -1.3) {
    const cx = (CAT.x0 + CAT.chest) / 2 + c.dx
    const at = land(s, cx, GLASS.y1 - 0.25)
    ctx.globalCompositeOperation = 'multiply'
    patch(ctx, s)
    ctx.clip()
    ctx.translate(at.x, at.y)
    ctx.scale(0.55, DESK.top * s.kd * 0.35 + 0.01)
    const k = ctx.createRadialGradient(0, 0, 0.1, 0, 0, 1)
    k.addColorStop(0, `rgba(40, 34, 70, ${(0.7 * Math.min(1, s.a * 3)).toFixed(3)})`)
    k.addColorStop(1, 'rgba(40, 34, 70, 0)')
    ctx.fillStyle = k
    ctx.fillRect(-1, -1, 2, 2)
  }
  ctx.restore()
}

/** The same light in the room's light map (`light.ts`): what it reaches, the night's dark does not take. */
export function spillShare(g: Ctx, t: number): void {
  const s = spillAt(t)
  if (s.a < 0.01 || s.kd <= 0) return
  g.save()
  onTop(g)
  g.globalAlpha = Math.min(1, s.a * 1.1)
  g.fillStyle = '#FFFFFF'
  patch(g, s)
  g.fill()
  g.restore()
}
