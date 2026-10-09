import { frame, hash, scenery } from './kit'
import type { WorldKey } from './worlds'

/**
 * Every life is its own picture.
 *
 * At home the show is the plain full frame. The lives she jumps into are pictures of other kinds, so a jump changes
 * not only the world but the film it is in:
 *
 * - **The movie star's life** (the premiere, and the alley behind the theatre) is in widescreen: the frame closes to
 *   2.39:1 between black bars, with a soft vignette and a fine grain, a picture made for a cinema.
 * - **The kung fu picture** (the dojo) is an old print in scope: faded warm, its blacks lifted, heavy grain that
 *   dances a frame at a time, a scratch or two down the emulsion, dust, and a darker edge.
 *
 * - **The hot dog life** is a soft-focus romance: the full frame, its edges gone to a glowing pink haze as if the
 *   lens were gauzed, and a faint bloom over it.
 *
 * The rest are left as they are: Raccacoonie is a cartoon already, the surf and everywhere at once a storm of pictures
 * of their own, Jobu's dark and the rocks plain. Back home, the picture is the plain full frame again.
 *
 * Drawn over everything in its world (after the eyes), against the frame as it is on the stage. The bars keep a band
 * 2.39 times as wide as it is tall, or the whole frame where the stage is wider than that already. A flicker before a
 * jump shows the next world in its own picture, as a jump in the film would. The grain and scratches are worked out
 * from the show's clock, at 24 a second, so a scrubbed frame is the frame that played. Nothing in them flashes: the
 * print's grain is fine and dim, and its brightness does not flicker. With reduced motion the grain holds still and
 * the scratches and dust are left out.
 */

export type Look = 'scope' | 'print' | 'dream'

/** The worlds that are pictures of their own, and which. */
export const LOOKS: Partial<Record<WorldKey, Look>> = { premiere: 'scope', dojo: 'print', hotdog: 'dream' }

const SCOPE = 2.39
/** Grain changes 24 times a second, as a film's frames do. */
const FPS = 24

/** A tile of grain, made once: grey noise about mid-grey, for an overlay. */
let grainTile: HTMLCanvasElement | null = null
function grain(): HTMLCanvasElement | null {
  if (grainTile || typeof document === 'undefined') return grainTile
  const n = 192
  const c = document.createElement('canvas')
  c.width = n
  c.height = n
  const g = c.getContext('2d')
  if (!g) return null
  const img = g.createImageData(n, n)
  for (let i = 0; i < n * n; i++) {
    // Two octaves, so it is grain and not pixels.
    const v = 128 + (hash(i, 3) - 0.5) * 150 + (hash(Math.floor(i / 2), 9) - 0.5) * 60
    img.data[i * 4] = v
    img.data[i * 4 + 1] = v
    img.data[i * 4 + 2] = v
    img.data[i * 4 + 3] = 255
  }
  g.putImageData(img, 0, 0)
  grainTile = c
  return c
}

/** The bars' band in pixels, top and bottom, for a frame `w` × `h` pixels. */
export const band = (w: number, h: number): { top: number; bottom: number } => {
  const keep = Math.min(h, w / SCOPE)
  const bar = (h - keep) / 2
  return { top: bar, bottom: h - bar }
}

/** The share of a 16:9 frame's height the scope band keeps: for the checks, and for framing what must be seen. */
export const SCOPE_KEEP = 16 / 9 / SCOPE
/** How much of a 16:9 frame's height is picture in `world`. */
export const keepIn = (world: WorldKey): number => (LOOKS[world] === 'scope' || LOOKS[world] === 'print' ? SCOPE_KEEP : 1)

function paintGrain(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, t: number, strength: number, scale: number): void {
  const tile = grain()
  if (!tile) return
  const f = Math.floor(t * FPS)
  ctx.save()
  ctx.globalCompositeOperation = 'overlay'
  ctx.globalAlpha = strength
  const pattern = ctx.createPattern(tile, 'repeat')
  if (pattern) {
    // A new offset each film frame, so it dances; scaled so its grain is a few pixels whatever the stage.
    const ox = hash(f, 1) * tile.width
    const oy = hash(f, 2) * tile.height
    pattern.setTransform(new DOMMatrix([scale, 0, 0, scale, x - ox * scale, y - oy * scale]))
    ctx.fillStyle = pattern
    ctx.fillRect(x, y, w, h)
  }
  ctx.restore()
}

function paintVignette(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, a: number, warm = false): void {
  // An ellipse the frame's shape: a circle in a space squashed to it, clear in the middle, darkest in the corners.
  ctx.save()
  ctx.translate(x + w / 2, y + h / 2)
  ctx.scale(1, h / w)
  const g = ctx.createRadialGradient(0, 0, 0.36 * w, 0, 0, 0.72 * w)
  const c = warm ? '30, 16, 6' : '0, 0, 0'
  g.addColorStop(0, `rgba(${c}, 0)`)
  g.addColorStop(1, `rgba(${c}, ${a})`)
  ctx.fillStyle = g
  ctx.fillRect(-w / 2, -w / 2, w, w)
  ctx.restore()
}

/** The old print's wear: a scratch or two, and dust, each lasting a frame or a few. */
function paintWear(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, t: number, px: number): void {
  const f = Math.floor(t * FPS)
  ctx.save()
  // Scratches: a long one that stays a while and wanders, and short ones now and then.
  const run = Math.floor(f / 30)
  if (hash(run, 21) < 0.7) {
    const sx = x + w * (0.12 + 0.76 * hash(run, 22)) + Math.sin(f * 0.7) * px * 1.5
    ctx.strokeStyle = `rgba(250, 240, 220, ${0.16 + 0.08 * hash(f, 23)})`
    ctx.lineWidth = Math.max(1, px * 0.9)
    ctx.beginPath()
    ctx.moveTo(sx, y)
    ctx.lineTo(sx + px * 2 * (hash(run, 24) - 0.5), y + h)
    ctx.stroke()
  }
  if (hash(f, 25) < 0.3) {
    const sx = x + w * hash(f, 26)
    const y0 = y + h * hash(f, 27) * 0.6
    ctx.strokeStyle = `rgba(20, 12, 6, ${0.22 + 0.15 * hash(f, 28)})`
    ctx.lineWidth = Math.max(1, px * 0.7)
    ctx.beginPath()
    ctx.moveTo(sx, y0)
    ctx.lineTo(sx, y0 + h * (0.15 + 0.3 * hash(f, 29)))
    ctx.stroke()
  }
  // Dust: a few dark flecks and hairs, new each frame.
  const nDust = Math.floor(hash(f, 30) * 4)
  for (let i = 0; i < nDust; i++) {
    const dx = x + w * hash(f, 31 + i)
    const dy = y + h * hash(f, 41 + i)
    const r = px * (0.8 + 2.2 * hash(f, 51 + i))
    ctx.fillStyle = `rgba(16, 10, 6, ${0.35 + 0.3 * hash(f, 61 + i)})`
    ctx.beginPath()
    if (hash(f, 71 + i) < 0.3) {
      ctx.ellipse(dx, dy, r * 3.5, r * 0.35, hash(f, 81 + i) * Math.PI, 0, Math.PI * 2)
    } else {
      ctx.ellipse(dx, dy, r, r * 0.8, 0, 0, Math.PI * 2)
    }
    ctx.fill()
  }
  ctx.restore()
}

/** The picture a world is in, over everything in it. */
export interface Picture {
  look: Look
  /** With reduced motion asked for, the grain holds still and the print shows no scratches or dust coming and going. */
  calm: () => boolean
}

export const film = scenery<Picture>({
  name: 'film',
  draw: () => {},
  over: (p, pic, c) => {
    const look = pic.look
    const ctx = p.drawingContext as CanvasRenderingContext2D
    const f = frame(p, c.k)
    const k = c.k
    const x = f.x0 * k
    const y = f.y0 * k
    const w = (f.x1 - f.x0) * k
    const h = (f.y1 - f.y0) * k
    // One pixel of the stage, in this drawing's units (the canvas may be drawn at a scale).
    const px = Math.max(0.5, h / 540)
    const { top, bottom } = look === 'dream' ? { top: 0, bottom: h } : band(w, h)
    const calm = pic.calm()
    const t = calm ? 0 : c.t
    if (look === 'print') {
      // Faded and warm: the blacks lifted toward a brown, the whole a little yellowed.
      ctx.save()
      ctx.globalCompositeOperation = 'multiply'
      ctx.fillStyle = 'rgba(236, 214, 178, 0.55)'
      ctx.fillRect(x, y, w, h)
      ctx.globalCompositeOperation = 'screen'
      ctx.fillStyle = 'rgba(52, 32, 18, 0.5)'
      ctx.fillRect(x, y, w, h)
      ctx.restore()
      paintGrain(ctx, x, y + top, w, bottom - top, t, 0.3, px * 1.4)
      if (!calm) paintWear(ctx, x, y + top, w, bottom - top, t, px)
      paintVignette(ctx, x, y + top, w, bottom - top, 0.5, true)
    } else if (look === 'dream') {
      // A faint bloom over all of it, and the edges gone soft into a glowing haze.
      ctx.save()
      ctx.globalCompositeOperation = 'screen'
      ctx.fillStyle = 'rgba(255, 228, 232, 0.08)'
      ctx.fillRect(x, y, w, h)
      ctx.restore()
      ctx.save()
      ctx.translate(x + w / 2, y + h / 2)
      ctx.scale(1, h / w)
      const g = ctx.createRadialGradient(0, 0, 0.3 * w, 0, 0, 0.66 * w)
      g.addColorStop(0, 'rgba(255, 236, 238, 0)')
      g.addColorStop(0.6, 'rgba(255, 236, 238, 0.32)')
      g.addColorStop(1, 'rgba(255, 244, 245, 0.78)')
      ctx.fillStyle = g
      ctx.fillRect(-w / 2, -w / 2, w, w)
      ctx.restore()
    } else {
      paintGrain(ctx, x, y + top, w, bottom - top, t, 0.12, px * 1.1)
      paintVignette(ctx, x, y + top, w, bottom - top, 0.32)
    }
    if (top > 0.5) {
      ctx.fillStyle = '#000000'
      ctx.fillRect(x - 2, y - 2, w + 4, top + 2)
      ctx.fillRect(x - 2, y + bottom, w + 4, h - bottom + 2)
    }
  },
})
