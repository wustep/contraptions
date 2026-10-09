import { frame, hash, rgba, scenery } from './kit'

/**
 * The lens the whole picture is seen through: the corners falling off a little, as a camera lens's do, and a fine
 * grain over everything, crawling frame to frame. Light enough that nothing is hidden by it; enough that the show
 * reads as a picture on film rather than drawn on glass. Not in the home movie, whose eight-millimetre stock has its
 * own. Drawn over each place and under its cover.
 */
const MOVIE: [number, number] = [340.5, 395.3]

let TILE: HTMLCanvasElement | null = null
function tile(): HTMLCanvasElement | null {
  if (TILE || typeof document === 'undefined') return TILE
  const n = 160
  const cv = document.createElement('canvas')
  cv.width = n
  cv.height = n
  const g = cv.getContext('2d')
  if (!g) return null
  const img = g.createImageData(n, n)
  for (let i = 0; i < n * n; i++) {
    const v = hash(i, 91)
    const light = v > 0.5
    const a = Math.abs(v - 0.5) * 2
    const c = light ? 255 : 0
    img.data[i * 4] = c
    img.data[i * 4 + 1] = c
    img.data[i * 4 + 2] = c
    img.data[i * 4 + 3] = a > 0.6 ? Math.round((a - 0.6) * 2.5 * 255) : 0
  }
  g.putImageData(img, 0, 0)
  TILE = cv
  return cv
}

export const lens = scenery<null>({
  name: 'lens',
  draw: () => {},
  over(p, _s, c) {
    const t = c.t
    if (t > MOVIE[0] && t < MOVIE[1]) return
    const k = c.k
    const f = frame(p, k)
    const ctx = p.drawingContext as CanvasRenderingContext2D
    const w = f.x1 - f.x0
    const h = f.y1 - f.y0
    const r = Math.hypot(w, h) / 2
    ctx.save()
    const g = ctx.createRadialGradient(f.cx * k, f.cy * k, r * 0.55 * k, f.cx * k, f.cy * k, r * 1.02 * k)
    g.addColorStop(0, rgba('#000000', 0))
    g.addColorStop(1, rgba('#000000', 0.2))
    ctx.fillStyle = g
    ctx.fillRect(f.x0 * k, f.y0 * k, w * k, h * k)
    const tl = tile()
    if (tl) {
      const fi = Math.floor(t * 24)
      const m = ctx.getTransform()
      const scale = Math.hypot(m.a, m.b) || 1
      const step = (1.4 * p.pixelDensity()) / scale
      const pat = ctx.createPattern(tl, 'repeat')
      if (pat) {
        pat.setTransform(new DOMMatrix().translate(hash(fi, 92) * tl.width * step, hash(fi, 93) * tl.height * step).scale(step))
        ctx.globalAlpha = 0.06
        ctx.fillStyle = pat
        ctx.fillRect(f.x0 * k, f.y0 * k, w * k, h * k)
      }
    }
    ctx.restore()
  },
})
