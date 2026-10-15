import { scenery } from './kit'
import { CREDITS_AT } from './music'

/**
 * A soft vignette over every place: the corners of the frame a little darker, the way an old lens has them. Baked once
 * per canvas size and laid with one plain draw (no blend mode, which a software canvas pays for over every pixel). It
 * is drawn over everything but the ball, which the stage draws last. There is no grain: the picture is clean.
 */

/** One per canvas size it has been laid on lately: the stage's, and the finale's rooms' (`snap.ts`). */
const baked: { w: number; h: number; c: HTMLCanvasElement }[] = []
function vignetteFor(w: number, h: number): HTMLCanvasElement | null {
  const have = baked.find((b) => b.w === w && b.h === h)
  if (have) return have.c
  if (typeof document === 'undefined') return null
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d')
  if (!g) return null
  const r = Math.hypot(w, h) / 2
  const v = g.createRadialGradient(w / 2, h / 2, r * 0.45, w / 2, h / 2, r * 1.05)
  v.addColorStop(0, 'rgba(10, 8, 6, 0)')
  v.addColorStop(1, 'rgba(10, 8, 6, 0.32)')
  g.fillStyle = v
  g.fillRect(0, 0, w, h)
  baked.unshift({ w, h, c })
  if (baked.length > 3) baked.pop()
  return c
}

/** How strong it is: a little less under the credits, so the words sit on a quieter picture. */
const strength = (t: number): number => 1 - 0.35 * Math.max(0, Math.min(1, (t - CREDITS_AT) / 3))

export const vignette = scenery<null>({
  name: 'vignette',
  draw: () => {},
  over: (p, _s, c) => {
    const ctx = p.drawingContext as CanvasRenderingContext2D
    const frame = vignetteFor(ctx.canvas.width, ctx.canvas.height)
    if (!frame) return
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalAlpha = strength(c.t)
    ctx.drawImage(frame, 0, 0)
    ctx.restore()
  },
})
