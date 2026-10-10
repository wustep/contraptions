import { frame, hash, rgba, scenery } from './kit'

/**
 * The lens the whole picture is seen through: the corners falling off a little, as a camera lens's do, and a fine
 * grain over everything, crawling frame to frame. Light enough that nothing is hidden by it; enough that the show
 * reads as a picture on film rather than drawn on glass. Not in the home movie, whose eight-millimetre stock has its
 * own. Drawn over each place and under its cover.
 */
const MOVIE: [number, number] = [340.5, 395.3]

/**
 * The grade: the room as it is, muted; the dream, in full colour, as the film's Epilogue does it. The real club at the
 * start is graded colder and greyer, her yellow and his blue with it; the colour comes in as the spotlight's iris
 * opens on Lipton's (39.95 to 41.9) and goes again as the rose drains out at the waking (451.5 to 453.73). Then on
 * The End's swell, as his notes rise to become their stars over the city, it comes back: the music brings it.
 */
export function muted(t: number): number {
  const ramp = (a: number, b: number) => Math.max(0, Math.min(1, (t - a) / (b - a)))
  const s = (u: number) => u * u * (3 - 2 * u)
  if (t < 40.6) return 1 - s(ramp(39.95, 40.6))
  if (t < 451.5) return 0
  if (t < 494) return s(ramp(451.5, 453.73))
  return 1 - s(ramp(494, 503))
}

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

/** A circle the grade lifts inside (the spotlight's iris into the dream; his stage with the band), in world cells, or null. */
export type IrisAt = (t: number, span: number) => { x: number; y: number; r: number; f: number } | null

export const lens = scenery<{ iris: IrisAt } | null>({
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
    const m = muted(t)
    // Into the dream: as the stage light closes down on him at the keys, the circle of light round him fills with the
    // dream's warm colour while the room outside stays grey; it shuts, and opens on Lipton's.
    const iris = m > 0.01 ? _s?.iris(t, Math.hypot(w, h)) : null
    const paint = (c: string, a: number) => {
      if (!iris) return c === '' ? '' : rgba(c, a)
      const g = ctx.createRadialGradient(iris.x * k, iris.y * k, iris.r * 0.75 * k, iris.x * k, iris.y * k, iris.r * 1.05 * k)
      g.addColorStop(0, rgba(c, 0))
      g.addColorStop(1, rgba(c, a))
      return g
    }
    if (m > 0.01) {
      // Greyer: the colour drawn out toward grey; and colder: a little blue laid in the shadows.
      ctx.globalCompositeOperation = 'saturation'
      ctx.fillStyle = paint('#808080', 0.36 * m)
      ctx.fillRect(f.x0 * k, f.y0 * k, w * k, h * k)
      ctx.globalCompositeOperation = 'soft-light'
      ctx.fillStyle = paint('#3A5A9A', 0.28 * m)
      ctx.fillRect(f.x0 * k, f.y0 * k, w * k, h * k)
      if (iris && iris.f > 0.05) {
        // The warm light of the dream gathering in the circle as it closes: a lamp's warmth, laid on by screen.
        ctx.globalCompositeOperation = 'screen'
        const warm = ctx.createRadialGradient(iris.x * k, iris.y * k, 0, iris.x * k, iris.y * k, iris.r * k)
        const a = 0.42 * iris.f * iris.f
        warm.addColorStop(0, rgba('#F2A65A', a))
        warm.addColorStop(0.65, rgba('#C8506A', 0.7 * a))
        warm.addColorStop(1, rgba('#C8506A', 0))
        ctx.fillStyle = warm
        ctx.fillRect(f.x0 * k, f.y0 * k, w * k, h * k)
      }
      ctx.globalCompositeOperation = 'source-over'
    }
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
