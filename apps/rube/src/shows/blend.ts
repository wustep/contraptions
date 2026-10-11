/**
 * Glows and grades made cheap in Safari.
 *
 * Much of a show's light is a radial gradient filled over a rectangle in a blend mode: a lamp's bloom or a firework's
 * flash added ('lighter'), a pool of shade multiplied, a lens's grade in soft light. WebKit (Safari, and every browser
 * on an iPhone) fills a radial gradient in any of those modes a pixel at a time off the GPU: one over a 5K frame costs
 * it some 40 ms, where the same gradient laid on plainly, a linear one in the same mode, or an image in the same mode
 * cost well under ten. Chrome and Firefox have no such slow path.
 *
 * So in WebKit such a `fillRect` is drawn in two steps that each stay fast: the gradient filled plainly onto a scratch
 * canvas, in the same transform, over only the device pixels the rectangle covers; then that scratch drawn onto the
 * canvas one to one in the blend mode, under the canvas's own clip and alpha. The result is the same, a level or two
 * of rounding apart where a gradient is faintest. A rectangle of a few pixels is left alone, as are a shadow or a
 * filter, which the scratch would not carry.
 *
 * A scratch is drawn into once a frame. WebKit copies a canvas that is drawn into again while a drawing that reads it
 * is still on its way to the screen, which costs more than the gradient did, so each gradient in a frame has a scratch
 * of its own, from a pool that is free again once the frame is drawn.
 *
 * Installed once, by the show stage (`stage.ts`); nothing in a show has to know.
 */

/** The browsers with the slow path: WebKit's own, which is every browser on iOS, but not Chrome's Blink. */
const slow = (ua: string): boolean => /AppleWebKit\//.test(ua) && !/(Chrome|Chromium|Edg)\//.test(ua)

/**
 * The modes WebKit fills a radial gradient in slowly (measured: the rest of the blend modes, the bounded Porter-Duff
 * ones and 'screen' and 'exclusion', are as quick as 'source-over'). None of these touches what lies outside what is
 * drawn, so drawing less than the whole canvas is the same drawing.
 */
const SLOW = new Set<string>(['lighter', 'multiply', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'hue', 'saturation', 'color', 'luminosity'])

/** Fewer device pixels than this, and the slow path costs less than the two steps. */
const SMALL = 128 * 128
/** At most this many scratches are kept; past it the least lately used is made over to the size wanted. */
const KEEP = 256
/** And at most this many pixels in all: three of the largest canvas drawn on, and never fewer than two 1080p frames. */
const FLOOR = 2 * 1920 * 1080
/** Frames a scratch may go unused before it is let go: some seconds of a show. */
const IDLE = 300

interface Scratch {
  canvas: HTMLCanvasElement
  g: CanvasRenderingContext2D
  /** The frame it was last drawn into (`frame`). */
  used: number
}

let installed = false
/** The radial gradients made, which are the ones with the slow path. */
const radial = new WeakSet<CanvasGradient>()
const pool: Scratch[] = []
let budget = FLOOR
/** Counts frames: a task that draws, and the microtask after it that frees the pool. */
let frame = 0
let freeing = false

/** A scratch at least `w` × `h` for a canvas `W` × `H`, not drawn into this frame if it can be helped. */
function scratchFor(w: number, h: number, W: number, H: number): Scratch | null {
  if (!freeing) {
    freeing = true
    queueMicrotask(() => {
      frame++
      freeing = false
    })
    // A scratch not drawn into for a while (a show with big glows gone by) is let go.
    for (let i = pool.length - 1; i >= 0; i--) {
      if (frame - pool[i].used < IDLE) continue
      pool[i].canvas.width = 0
      pool[i].canvas.height = 0
      pool.splice(i, 1)
    }
  }
  // A gradient over a good part of the canvas has a scratch the canvas's size, so that any of a frame's big ones can be
  // drawn on any of them.
  const big = w * h > (W * H) / 4
  let best: Scratch | null = null
  for (const s of pool) {
    if (s.used === frame || s.canvas.width < w || s.canvas.height < h) continue
    // Not one far bigger than the gradient: clearing and drawing cost by its size.
    if (!big && s.canvas.width * s.canvas.height > 2.25 * w * h + 65536) continue
    if (!best || s.canvas.width * s.canvas.height < best.canvas.width * best.canvas.height) best = s
  }
  if (best) {
    best.used = frame
    return best
  }
  // Sizes round up a little, so a gradient that grows by a pixel a frame keeps its scratch.
  const cw = big ? W : Math.ceil(w / 64) * 64
  const ch = big ? H : Math.ceil(h / 64) * 64
  // Room for it: the least lately used, not drawn into this frame, are let go first.
  let held = cw * ch
  for (const s of pool) held += s.canvas.width * s.canvas.height
  for (const s of [...pool].sort((p, q) => p.used - q.used)) {
    if (held <= budget && pool.length < KEEP) break
    if (s.used === frame) continue
    held -= s.canvas.width * s.canvas.height
    s.canvas.width = 0
    s.canvas.height = 0
    pool.splice(pool.indexOf(s), 1)
  }
  if (held > budget || pool.length >= KEEP) {
    // No room for another: one already drawn into this frame, the smallest that will do. WebKit copies it first, which
    // still costs a fraction of the slow path (eleven fireworks' washes over a 5K frame: 400 ms slow, 50 ms so).
    for (const s of pool) {
      if (s.canvas.width < w || s.canvas.height < h) continue
      if (!best || s.canvas.width * s.canvas.height < best.canvas.width * best.canvas.height) best = s
    }
    return best
  }
  const canvas = document.createElement('canvas')
  const g = canvas.getContext('2d')
  if (!g) return null
  canvas.width = cw
  canvas.height = ch
  best = { canvas, g, used: frame }
  pool.push(best)
  return best
}

export function installBlendedGradients(): void {
  if (installed || typeof navigator === 'undefined' || !slow(navigator.userAgent)) return
  installed = true
  const P = CanvasRenderingContext2D.prototype
  const createRadialGradient = P.createRadialGradient
  P.createRadialGradient = function (this: CanvasRenderingContext2D, ...args: Parameters<CanvasRenderingContext2D['createRadialGradient']>): CanvasGradient {
    const g = createRadialGradient.apply(this, args)
    radial.add(g)
    return g
  }
  const fillRect = P.fillRect
  P.fillRect = function (this: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    const style = this.fillStyle
    if (!SLOW.has(this.globalCompositeOperation) || typeof style === 'string' || !radial.has(style as CanvasGradient) || !plain(this)) return fillRect.call(this, x, y, w, h)
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
    budget = Math.max(budget, 3 * this.canvas.width * this.canvas.height)
    const s = bw * bh < SMALL ? null : scratchFor(bw, bh, this.canvas.width, this.canvas.height)
    if (!s) return fillRect.call(this, x, y, w, h)
    const { g, canvas } = s
    g.setTransform(1, 0, 0, 1, 0, 0)
    g.globalCompositeOperation = 'source-over'
    g.globalAlpha = 1
    g.clearRect(0, 0, bw, bh)
    g.setTransform(m.a, m.b, m.c, m.d, m.e - X0, m.f - Y0)
    g.fillStyle = style
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
