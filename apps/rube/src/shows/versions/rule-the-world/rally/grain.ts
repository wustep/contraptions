import { hash, scenery } from './kit'
import { CREDITS_AT, DURATION } from './music'

/**
 * The film's stock: grain and a soft vignette over every place, the 35 mm of a picture shot the way pictures were in
 * 1952 and the way this one was. The grain is one tile of noise made once, laid over the whole canvas in screen space
 * and moved to a new place twenty-four times a second of show time (so a saved frame is the same every time it is
 * drawn); the vignette darkens the corners a little. It is drawn over everything but the ball, which the stage draws
 * last.
 */

const TILE = 192
let tile: HTMLCanvasElement | null = null
function noise(): HTMLCanvasElement | null {
  if (tile) return tile
  if (typeof document === 'undefined') return null
  const c = document.createElement('canvas')
  c.width = TILE
  c.height = TILE
  const g = c.getContext('2d')
  if (!g) return null
  const img = g.createImageData(TILE, TILE)
  for (let i = 0; i < TILE * TILE; i++) {
    // Mostly mid-grey, with a soft spread either side: grain, not snow.
    const u = (hash(i, 7, 1952) + hash(i, 11, 25) + hash(i, 13, 3)) / 3
    const v = Math.round(128 + (u - 0.5) * 2 * 120)
    img.data[i * 4] = v
    img.data[i * 4 + 1] = v
    img.data[i * 4 + 2] = v
    img.data[i * 4 + 3] = 255
  }
  g.putImageData(img, 0, 0)
  tile = c
  return c
}

/** How strong the grain is: a little less under the credits, so the words sit on a quieter picture. */
const strength = (t: number): number => 0.075 * (1 - 0.35 * Math.max(0, Math.min(1, (t - CREDITS_AT) / 3)))

export const grain = scenery<null>({
  name: 'grain',
  draw: () => {},
  over: (p, _s, c) => {
    const ctx = p.drawingContext as CanvasRenderingContext2D
    const n = noise()
    const w = ctx.canvas.width
    const h = ctx.canvas.height
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    // The vignette.
    const r = Math.hypot(w, h) / 2
    const v = ctx.createRadialGradient(w / 2, h / 2, r * 0.45, w / 2, h / 2, r * 1.05)
    v.addColorStop(0, 'rgba(10, 8, 6, 0)')
    v.addColorStop(1, 'rgba(10, 8, 6, 0.32)')
    ctx.fillStyle = v
    ctx.fillRect(0, 0, w, h)
    // The grain, moved on every 1/24 s of show time.
    if (n) {
      const f = Math.floor(Math.max(0, Math.min(DURATION, c.t)) * 24)
      const ox = Math.floor(hash(f, 1) * TILE)
      const oy = Math.floor(hash(f, 2) * TILE)
      const pattern = ctx.createPattern(n, 'repeat')
      if (pattern) {
        // The tile is drawn at a scale that keeps a grain about one pixel and a half on a 720p frame.
        const s = Math.max(1, h / 480)
        pattern.setTransform(new DOMMatrix([s, 0, 0, s, -ox * s, -oy * s]))
        ctx.globalCompositeOperation = 'overlay'
        ctx.globalAlpha = strength(c.t)
        ctx.fillStyle = pattern
        ctx.fillRect(0, 0, w, h)
      }
    }
    ctx.restore()
  },
})
