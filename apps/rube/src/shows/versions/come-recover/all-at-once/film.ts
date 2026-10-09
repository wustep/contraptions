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
 *   lens were gauzed, and a faint bloom over it. It ends as an old romance does, the picture closing on her in a
 *   heart.
 * - **Raccacoonie** is a cartoon, drawn clean; it opens on her the way a cartoon does, in a round iris that blooms
 *   out to the frame, and ends with the iris closing on her.
 *
 * The rest are left as they are: the surf and everywhere at once a storm of pictures
 * of their own, Jobu's dark and the rocks plain. Back home, the picture is the plain full frame again.
 *
 * Drawn over everything in its world (after the eyes), against the frame as it is on the stage. The bars keep a band
 * 2.39 times as wide as it is tall, or the whole frame where the stage is wider than that already. A flicker before a
 * jump shows the next world in its own picture, as a jump in the film would. The grain and scratches are worked out
 * from the show's clock, at 24 a second, so a scrubbed frame is the frame that played. Nothing in them flashes: the
 * print's grain is fine and dim, and its brightness does not flicker. With reduced motion the grain holds still and
 * the scratches and dust are left out.
 */

export type Look = 'scope' | 'print' | 'dream' | 'tape' | 'tube' | 'cartoon'

/** The worlds that are pictures of their own, and which. */
export const LOOKS: Partial<Record<WorldKey, Look>> = { premiere: 'scope', dojo: 'print', hotdog: 'dream', hibachi: 'cartoon' }

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

/** The bars' band in pixels, top and bottom, for a frame `w` × `h` pixels, keeping at least `least` of its height. */
export const band = (w: number, h: number, least = 0): { top: number; bottom: number } => {
  const keep = Math.min(h, Math.max(least * h, w / SCOPE))
  const bar = (h - keep) / 2
  return { top: bar, bottom: h - bar }
}

/** The share of a 16:9 frame's height the scope band keeps: for the checks, and for framing what must be seen. */
export const SCOPE_KEEP = 16 / 9 / SCOPE
/** How much of a 16:9 frame's height is picture in `world`. */
export const keepOf = (look: Look | undefined): number => (look === 'scope' || look === 'print' ? SCOPE_KEEP : 1)
export const keepIn = (world: WorldKey): number => keepOf(LOOKS[world])

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

/** Scanlines: a tile one line dark in three, made once. */
let linesTile: HTMLCanvasElement | null = null
function scanlines(): HTMLCanvasElement | null {
  if (linesTile || typeof document === 'undefined') return linesTile
  const c = document.createElement('canvas')
  c.width = 1
  c.height = 3
  const g = c.getContext('2d')
  if (!g) return null
  g.fillStyle = 'rgba(0, 0, 0, 0.22)'
  g.fillRect(0, 2, 1, 1)
  linesTile = c
  return c
}

/** A VHS tape's wear: scanlines, a soft bloom, and the tracking band rolling slowly down it. */
function paintTape(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, t: number, calm: boolean, px: number, lite: boolean): void {
  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  ctx.fillStyle = 'rgba(46, 24, 70, 0.16)'
  ctx.fillRect(x, y, w, h)
  ctx.restore()
  const tile = scanlines()
  if (tile) {
    const pattern = ctx.createPattern(tile, 'repeat')
    if (pattern) {
      pattern.setTransform(new DOMMatrix([px, 0, 0, px, x, y]))
      ctx.fillStyle = pattern
      ctx.fillRect(x, y, w, h)
    }
  }
  if (lite) return
  paintGrain(ctx, x, y, w, h, t, 0.14, px)
  if (!calm) {
    // The tracking band: a soft lighter streak of noise a twentieth of the picture tall, rolling down every 8 s.
    const u = ((t / 8) % 1) * 1.3 - 0.15
    const by = y + u * h
    const bh = h * 0.05
    ctx.save()
    ctx.beginPath()
    ctx.rect(x, by, w, bh)
    ctx.clip()
    paintGrain(ctx, x, by, w, bh, t + 0.5, 0.5, px * 0.8)
    const g = ctx.createLinearGradient(0, by, 0, by + bh)
    g.addColorStop(0, 'rgba(255, 255, 255, 0)')
    g.addColorStop(0.5, 'rgba(255, 255, 255, 0.12)')
    g.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = g
    ctx.fillRect(x, by, w, bh)
    ctx.restore()
  }
  paintVignette(ctx, x, y, w, h, 0.38)
}

/**
 * A look painted into the rectangle (x, y, w, h), in the drawing's current units, over what is already there: the
 * whole frame of a world, or one panel of everywhere at once. `px` is one pixel of the stage in those units; `t` is
 * the show's clock, held still when `calm`. A panel narrower than widescreen keeps at least `least` of its height
 * between its bars, so a tall one is not all bars. A `lite` picture, for the many small panels of everywhere at once,
 * is only its grade and its bars (and the tape's scanlines): no grain, wear or vignette, which cost too much a panel.
 */
export function paintPicture(ctx: CanvasRenderingContext2D, look: Look, x: number, y: number, w: number, h: number, t: number, calm: boolean, px: number, least = 0, lite = false): void {
  const { top, bottom } = look === 'scope' || look === 'print' ? band(w, h, least) : { top: 0, bottom: h }
  if (calm) t = 0
  // A cartoon is drawn clean: its picture is only its irises (`IRISES`).
  if (look === 'cartoon') return
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
    if (!lite) {
      paintGrain(ctx, x, y + top, w, bottom - top, t, 0.3, px * 1.4)
      if (!calm) paintWear(ctx, x, y + top, w, bottom - top, t, px)
      paintVignette(ctx, x, y + top, w, bottom - top, 0.5, true)
    }
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
  } else if (look === 'tape') {
    paintTape(ctx, x, y, w, h, t, calm, px, lite)
  } else if (look === 'tube') {
    // Under office tubes: everything gone a little green and flat.
    ctx.save()
    ctx.globalCompositeOperation = 'multiply'
    ctx.fillStyle = 'rgba(208, 236, 214, 0.6)'
    ctx.fillRect(x, y, w, h)
    ctx.globalCompositeOperation = 'screen'
    ctx.fillStyle = 'rgba(24, 38, 30, 0.35)'
    ctx.fillRect(x, y, w, h)
    ctx.restore()
    if (!lite) paintVignette(ctx, x, y, w, h, 0.22)
  } else if (!lite) {
    paintGrain(ctx, x, y + top, w, bottom - top, t, 0.12, px * 1.1)
    paintVignette(ctx, x, y + top, w, bottom - top, 0.32)
  }
  if (top > 0.5 * px) {
    ctx.fillStyle = '#000000'
    ctx.fillRect(x - px, y - px, w + 2 * px, top + px)
    ctx.fillRect(x - px, y + bottom, w + 2 * px, h - bottom + px)
  }
}

/** One pixel of the stage in the drawing's current units: from the canvas's transform. */
export function pixelOf(ctx: CanvasRenderingContext2D): number {
  const m = ctx.getTransform()
  return 1 / Math.max(1e-6, Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)))
}

/** Whether the viewer asks for reduced motion, now: for the pictures drawn inside other parts (the panels). */
const MOTION = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null
export const prefersCalm = (): boolean => !!MOTION?.matches

/** The look of each world as a panel of everywhere at once (by its skin's key), and as the surf flies through it. */
export const PANEL_LOOKS: Record<string, Look> = { premiere: 'scope', alley: 'scope', dojo: 'print', hotdog: 'dream', karaoke: 'tape', irs: 'tube' }

/* ------------------------------------------------------------------ irises */

/** An iris: the picture closing on her, or opening from her, through a hole in the black. */
export interface Iris {
  /** Show seconds it starts and has finished. */
  from: number
  to: number
  open: boolean
  shape: 'round' | 'heart'
  /** Its radius when shut on her, cells. */
  small: number
}

/** The lives' irises: the romance closes on her in a heart; the cartoon opens on her and closes on her, round. */
export const IRISES: Partial<Record<WorldKey, Iris[]>> = {
  hotdog: [{ from: 105.85, to: 106.731, open: false, shape: 'heart', small: 1.35 }],
  hibachi: [
    { from: 106.731, to: 107.4, open: true, shape: 'round', small: 1.35 },
    { from: 120.3, to: 120.953, open: false, shape: 'round', small: 1.1 },
  ],
}

/** How far open an iris is at `t`, 0 shut on her to 1 the whole frame; null outside it. */
export function irisAt(iris: Iris, t: number): number | null {
  if (t < iris.from || t > iris.to) return null
  const u = (t - iris.from) / (iris.to - iris.from)
  // Opening: quick from her and slowing to the frame. Closing: slow from the frame, quickening onto her.
  return iris.open ? 1 - (1 - u) ** 3 : 1 - u * u * u
}

/** A heart about (0, 0), `r` across its widest half, its middle where the ball is. */
function heartPath(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  const n = 64
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2
    const hx = 16 * Math.sin(a) ** 3
    const hy = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a))
    const px = x + (hx / 16) * r
    const py = y + ((hy + 2.5) / 16) * r
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
}

/** The black round an iris's hole, over the whole frame (x, y, w, h), the hole at (cx, cy), all in pixels. */
function paintIris(ctx: CanvasRenderingContext2D, iris: Iris, open: number, x: number, y: number, w: number, h: number, cx: number, cy: number, k: number): void {
  // Wide open is past the frame's far corner from her.
  const far = Math.max(Math.hypot(cx - x, cy - y), Math.hypot(cx - x - w, cy - y), Math.hypot(cx - x, cy - y - h), Math.hypot(cx - x - w, cy - y - h))
  const big = iris.shape === 'heart' ? far * 1.5 : far * 1.05
  const r = iris.small * k + (big - iris.small * k) * open
  ctx.save()
  ctx.beginPath()
  ctx.rect(x - 2, y - 2, w + 4, h + 4)
  if (iris.shape === 'heart') heartPath(ctx, cx, cy, r)
  else ctx.arc(cx, cy, r, 0, Math.PI * 2, true)
  ctx.fillStyle = '#000000'
  ctx.fill('evenodd')
  ctx.restore()
}

/** The picture a world is in, over everything in it. */
export interface Picture {
  look: Look
  /** With reduced motion asked for, the grain holds still and the print shows no scratches or dust coming and going. */
  calm: () => boolean
  /** Its irises, and where she is (its own cells), for them to close on. */
  irises?: Iris[]
  where?: (t: number) => [number, number]
}

export const film = scenery<Picture>({
  name: 'film',
  draw: () => {},
  over: (p, pic, c) => {
    const ctx = p.drawingContext as CanvasRenderingContext2D
    const f = frame(p, c.k)
    const k = c.k
    // One pixel of the stage, in this drawing's units (the canvas may be drawn at a scale).
    const px = Math.max(0.5, ((f.y1 - f.y0) * k) / 540)
    paintPicture(ctx, pic.look, f.x0 * k, f.y0 * k, (f.x1 - f.x0) * k, (f.y1 - f.y0) * k, c.t, pic.calm(), px)
    for (const iris of pic.irises ?? []) {
      const open = irisAt(iris, c.t)
      if (open === null || !pic.where) continue
      // On her, a little smoothed, so the hole rides with her and does not shake with every bounce.
      let sx = 0
      let sy = 0
      for (let j = -3; j <= 3; j++) {
        const [wx, wy] = pic.where(Math.max(iris.from, Math.min(iris.to, c.t + j * 0.03)))
        sx += wx
        sy += wy
      }
      paintIris(ctx, iris, open, f.x0 * k, f.y0 * k, (f.x1 - f.x0) * k, (f.y1 - f.y0) * k, (sx / 7) * k, (sy / 7) * k, k)
    }
  },
})
