/**
 * Light added to light, made cheap in Safari.
 *
 * A show's glows are mostly a gradient filled over a rectangle with the canvas set to add ('lighter'): a lamp's
 * bloom, a firework's flash, a spotlight's pool. WebKit (Safari, and every browser on an iPhone) draws exactly that
 * one combination, a gradient added, a pixel at a time off the GPU: a glow over a 5K frame costs it some 30 ms, where
 * the same glow laid on plainly, or an image added, costs well under one. Chrome and Firefox have no such slow path.
 *
 * So in WebKit a gradient added with `fillRect` is drawn in two steps that each stay fast: the gradient filled plainly
 * onto a scratch canvas, in the same transform, over only the device pixels the rectangle covers; then that scratch
 * added onto the canvas one to one, under the canvas's own clip and alpha. The sum is the same light, a level or two of
 * rounding apart where a glow is faintest. A rectangle of a few pixels is left alone, as are a shadow or a filter,
 * which the scratch would not carry.
 *
 * A scratch is drawn into once a frame. WebKit copies a canvas that is drawn into again while a drawing that reads it
 * is still on its way to the screen, which costs more than the glow did, so each glow in a frame has a scratch of its
 * own, from a pool that is free again once the frame is drawn.
 *
 * Installed once, by the show stage (`stage.ts`); nothing in a show has to know.
 */

/** The browsers with the slow path: WebKit's own, which is every browser on iOS, but not Chrome's Blink. */
const slowAdd = (ua: string): boolean => /AppleWebKit\//.test(ua) && !/(Chrome|Chromium|Edg)\//.test(ua)

/** Fewer device pixels than this, and the slow path costs less than the two steps. */
const SMALL = 128 * 128
/** At most this many scratches are kept; past it the least lately used is made over to the size wanted. */
const KEEP = 64

interface Scratch {
  canvas: HTMLCanvasElement
  g: CanvasRenderingContext2D
  /** The frame it was last drawn into (`frame`). */
  used: number
}

let installed = false
const pool: Scratch[] = []
/** Counts frames: a task that draws, and the microtask after it that frees the pool. */
let frame = 0
let freeing = false

/** A scratch at least `w` × `h`, not drawn into this frame. */
function scratchFor(w: number, h: number): Scratch | null {
  if (!freeing) {
    freeing = true
    queueMicrotask(() => {
      frame++
      freeing = false
    })
  }
  let best: Scratch | null = null
  for (const s of pool) {
    if (s.used === frame || s.canvas.width < w || s.canvas.height < h) continue
    // Not one far bigger than the glow: clearing and adding cost by its size.
    if (s.canvas.width * s.canvas.height > 2.25 * w * h + 65536) continue
    if (!best || s.canvas.width * s.canvas.height < best.canvas.width * best.canvas.height) best = s
  }
  if (!best) {
    // Sizes round up a little, so a glow that grows by a pixel a frame keeps its scratch.
    const cw = Math.ceil(w / 64) * 64
    const ch = Math.ceil(h / 64) * 64
    if (pool.length < KEEP) {
      const canvas = document.createElement('canvas')
      const g = canvas.getContext('2d')
      if (!g) return null
      best = { canvas, g, used: -1 }
      pool.push(best)
    } else {
      for (const s of pool) if (s.used !== frame && (!best || s.used < best.used)) best = s
      if (!best) return null
    }
    best.canvas.width = cw
    best.canvas.height = ch
  }
  best.used = frame
  return best
}

export function installAdditiveGradients(): void {
  if (installed || typeof navigator === 'undefined' || !slowAdd(navigator.userAgent)) return
  installed = true
  const P = CanvasRenderingContext2D.prototype
  const fillRect = P.fillRect
  P.fillRect = function (this: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    if (this.globalCompositeOperation !== 'lighter' || !(this.fillStyle instanceof CanvasGradient) || !plain(this)) return fillRect.call(this, x, y, w, h)
    const m = this.getTransform()
    let x0 = Infinity
    let y0 = Infinity
    let x1 = -Infinity
    let y1 = -Infinity
    for (const [px, py] of [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]) {
      const dx = m.a * px + m.c * py + m.e
      const dy = m.b * px + m.d * py + m.f
      x0 = Math.min(x0, dx)
      y0 = Math.min(y0, dy)
      x1 = Math.max(x1, dx)
      y1 = Math.max(y1, dy)
    }
    // Whole device pixels, and only those on the canvas.
    const X0 = Math.max(0, Math.floor(x0))
    const Y0 = Math.max(0, Math.floor(y0))
    const X1 = Math.min(this.canvas.width, Math.ceil(x1))
    const Y1 = Math.min(this.canvas.height, Math.ceil(y1))
    const bw = X1 - X0
    const bh = Y1 - Y0
    if (!(bw > 0 && bh > 0)) return
    const s = bw * bh < SMALL ? null : scratchFor(bw, bh)
    if (!s) return fillRect.call(this, x, y, w, h)
    const { g, canvas } = s
    g.setTransform(1, 0, 0, 1, 0, 0)
    g.globalCompositeOperation = 'source-over'
    g.globalAlpha = 1
    g.clearRect(0, 0, bw, bh)
    g.setTransform(m.a, m.b, m.c, m.d, m.e - X0, m.f - Y0)
    g.fillStyle = this.fillStyle
    fillRect.call(g, x, y, w, h)
    this.save()
    this.setTransform(1, 0, 0, 1, 0, 0)
    this.imageSmoothingEnabled = false
    this.drawImage(canvas, 0, 0, bw, bh, X0, Y0, bw, bh)
    this.restore()
  }
}

/** No shadow and no filter: what the scratch would leave out. */
function plain(ctx: CanvasRenderingContext2D): boolean {
  if (ctx.shadowBlur > 0 || ctx.shadowOffsetX !== 0 || ctx.shadowOffsetY !== 0) return false
  const filter = (ctx as { filter?: string }).filter
  return filter === undefined || filter === 'none'
}
