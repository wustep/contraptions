import type { Placed } from '../../../../plan'
import { clamp01, standing } from './paint'

/**
 * The frame. Caladan is in the old scope picture, 2.39:1 between black bars; Arrakis is the open frame, as Villeneuve
 * opens his picture to the full height of the IMAX screen in the desert. The bars slide away as the frigate comes down
 * over Arrakis, and never come back.
 *
 * Drawn last of all, over everything, against the canvas itself: the band they leave is the stage's width over 2.39
 * (the whole stage where it is already wider than that), in its middle. A vision laid over the frame (`Dream`) is
 * painted at another moment of the show, so it asks for the bars of the moment it is seen in (`seenAt`), and the
 * picture's bars stay whole over it.
 */

const SCOPE = 2.39

/** [t, amount] keys: 1 the bars in, 0 out; eased between. */
let keys: [number, number][] = [[0, 0]]

export function setScope(k: [number, number][]): void {
  keys = [...k].sort((a, b) => a[0] - b[0])
  if (!keys.length) keys = [[0, 0]]
}

/** How far in the bars are at `t`. */
export function scopeAt(t: number): number {
  if (t <= keys[0][0]) return keys[0][1]
  for (let i = 0; i + 1 < keys.length; i++) {
    const [ta, a] = keys[i]
    const [tb, b] = keys[i + 1]
    if (t < tb) {
      const u = clamp01((t - ta) / Math.max(1e-9, tb - ta))
      return a + (b - a) * u * u * u * (u * (u * 6 - 15) + 10)
    }
  }
  return keys[keys.length - 1][1]
}

/**
 * The moment the frame on the stage is seen at, while a vision paints another: the blend tells this module the live
 * time and the vision's time before either frame is painted, and a frame painted at the vision's time takes the live
 * frame's bars.
 */
let live = -1
let vision = -1
export function seenAt(liveTime: number, visionTime: number): void {
  live = liveTime
  vision = visionTime
}
const barsFor = (t: number): number => scopeAt(Math.abs(t - vision) < 1e-6 && live >= 0 ? live : t)

export function frame(): Placed {
  return standing('frame', null, null, (g) => {
    const f = barsFor(g.t)
    if (f <= 0.001) return
    const ctx = g.ctx
    const W = ctx.canvas.width
    const H = ctx.canvas.height
    const keep = Math.min(H, W / SCOPE)
    const bar = ((H - keep) / 2) * f
    if (bar <= 0.01) return
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, W, bar)
    ctx.fillRect(0, H - bar, W, bar)
    ctx.restore()
  })
}
