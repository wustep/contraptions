import { hash, scenery } from './kit'
import { CREDITS_AT, DURATION } from './music'

/**
 * The film's stock: grain and a soft vignette over every place, the 35 mm of a picture shot the way pictures were in
 * 1952 and the way this one was. The grain is one tile of noise made once and baked with the vignette into a few
 * full frames per canvas size; each frame lays one of them, a new one twelve times a second of show time (so a saved
 * frame is the same every time it is drawn). The vignette darkens the corners a little. It is drawn over everything but the ball, which the stage draws
 * last.
 */

const TILE = 192
let tile: HTMLCanvasElement | null = null
/**
 * The grain tile: specks of light and dark with alpha, over nothing, so it is laid with a plain draw (no blend mode,
 * which a software canvas pays for over every pixel of the frame).
 */
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
    // Mostly nothing, with a soft spread either side: grain, not snow.
    const u = (hash(i, 7, 1952) + hash(i, 11, 25) + hash(i, 13, 3)) / 3 - 0.5
    const v = u > 0 ? 255 : 0
    img.data[i * 4] = v
    img.data[i * 4 + 1] = v
    img.data[i * 4 + 2] = v
    img.data[i * 4 + 3] = Math.round(Math.min(1, Math.abs(u) * 2.6) * 255)
  }
  g.putImageData(img, 0, 0)
  tile = c
  return c
}

/**
 * The stock for a canvas of a size: the vignette and a field of grain baked together, in a few variants, made once and
 * kept. Each frame lays one of them with a single plain draw, the cheapest way a software canvas has to cover itself.
 */
const VARIANTS = 4
let stock: { w: number; h: number; frames: HTMLCanvasElement[] } | null = null
function stockFor(w: number, h: number): HTMLCanvasElement[] | null {
  if (stock && stock.w === w && stock.h === h) return stock.frames
  if (typeof document === 'undefined') return null
  const n = noise()
  const frames: HTMLCanvasElement[] = []
  for (let k = 0; k < VARIANTS; k++) {
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
    const pattern = n ? g.createPattern(n, 'repeat') : null
    if (pattern) {
      // A grain about one pixel and a half on a 720p frame, each variant the tile at another offset.
      const s = Math.max(1, h / 480)
      pattern.setTransform(new DOMMatrix([s, 0, 0, s, -Math.floor(hash(k, 1) * TILE) * s, -Math.floor(hash(k, 2) * TILE) * s]))
      g.globalAlpha = 0.075
      g.fillStyle = pattern
      g.fillRect(0, 0, w, h)
    }
    frames.push(c)
  }
  stock = { w, h, frames }
  return frames
}

/** How strong the stock is: a little less under the credits, so the words sit on a quieter picture. */
const strength = (t: number): number => 1 - 0.35 * Math.max(0, Math.min(1, (t - CREDITS_AT) / 3))

export const grain = scenery<null>({
  name: 'grain',
  draw: () => {},
  over: (p, _s, c) => {
    const ctx = p.drawingContext as CanvasRenderingContext2D
    const w = ctx.canvas.width
    const h = ctx.canvas.height
    const frames = stockFor(w, h)
    if (!frames) return
    // A new field of grain twelve times a second of show time, never the same one twice running.
    const f = Math.floor(Math.max(0, Math.min(DURATION, c.t)) * 12)
    const k = (f + Math.floor(hash(f, 3) * (VARIANTS - 1)) + 1) % VARIANTS
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalAlpha = strength(c.t)
    ctx.drawImage(frames[k], 0, 0)
    ctx.restore()
  },
})
