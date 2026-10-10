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

/**
 * The frame: the room as it is is seen in the old narrow picture, the dream in the wide one. La La Land opens on a
 * square old frame that stretches out to CinemaScope; here the masking at the sides of the picture opens the same way
 * as the dream begins (on Lipton's, once the spotlight's iris has opened on it), closes in again as the dream drains
 * at the waking, and opens once more when the band's stage blazes and the camera draws back to the city.
 * How much of the composed width shows, 0..1: the narrow frame is the Academy's 1.37 to 1 inside the 16 to 9.
 */
export const NARROW = 1.37 / (16 / 9)
const SPANS: [number, number, number, number][] = [
  // [from, to, aperture before, aperture after]
  [41.03, 43.0, NARROW, 1],
  [451.5, 453.73, 1, NARROW],
  [478.05, 480.2, NARROW, 1],
]
export function aperture(t: number): number {
  let a = NARROW
  for (const [t0, t1, a0, a1] of SPANS) {
    if (t < t0) return a
    if (t >= t1) { a = a1; continue }
    const u = (t - t0) / (t1 - t0)
    return a0 + (a1 - a0) * u * u * (3 - 2 * u)
  }
  return a
}

/** The masking at the sides of the picture, drawn last of all, over the covers too: it is the screen's, not the scene's. */
export const masking = scenery<null>({
  name: 'masking',
  draw: () => {},
  over(p, _s, c) {
    const a = aperture(c.t)
    if (a > 0.9995) return
    const k = c.k
    const f = frame(p, k)
    // The composed frame is 16 to 9 and whole on the canvas; the picture is the middle `a` of its width.
    const w = Math.min(f.x1 - f.x0, ((f.y1 - f.y0) * 16) / 9)
    const half = (w * a) / 2
    const ctx = p.drawingContext as CanvasRenderingContext2D
    ctx.save()
    ctx.fillStyle = '#060507'
    const pad = 1
    ctx.fillRect((f.x0 - pad) * k, (f.y0 - pad) * k, (f.cx - half - f.x0 + pad) * k, (f.y1 - f.y0 + 2 * pad) * k)
    ctx.fillRect((f.cx + half) * k, (f.y0 - pad) * k, (f.x1 - f.cx - half + pad) * k, (f.y1 - f.y0 + 2 * pad) * k)
    // A little of the picture's light falls off into the masking's edge, as a projected picture's does.
    const soft = w * 0.012
    for (const side of [-1, 1]) {
      const x = f.cx + side * half
      const g = ctx.createLinearGradient(x * k, 0, (x - side * soft) * k, 0)
      g.addColorStop(0, rgba('#060507', 0.85))
      g.addColorStop(1, rgba('#060507', 0))
      ctx.fillStyle = g
      ctx.fillRect(Math.min(x, x - side * soft) * k, (f.y0 - pad) * k, soft * k, (f.y1 - f.y0 + 2 * pad) * k)
    }
    ctx.restore()
  },
})

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
export type IrisAt = (t: number, span: number) => { x: number; y: number; r: number; f: number; dark?: number } | null

/** The way out of the dream: the circle the dark and grey close in to round him at `at` (world cells), as the dream
 * drains and he goes back to the keys; it shuts on the last chord (453.73). */
export function wakingCircle(t: number, at: [number, number], span: number): { x: number; y: number; r: number; f: number; dark: number } | null {
  const LAST = 453.73
  if (t < 451.45 || t >= LAST + 0.4) return null
  const sm = (a: number, b: number) => { const v = Math.max(0, Math.min(1, (t - a) / (b - a))); return v * v * (3 - 2 * v) }
  const r = (span * (1 - sm(451.5, LAST)) + 1.1 * sm(451.5, LAST)) * (1 - sm(LAST, LAST + 0.38))
  return { x: at[0], y: at[1] - 0.2, r: Math.max(0.02, r), f: 0.55 * sm(452.2, LAST) * (1 - sm(LAST, LAST + 0.38)), dark: 0.6 * sm(451.9, LAST) }
}

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
    // The corners are the picture's: in the narrow frame, the masking's edges.
    const r = Math.hypot(Math.min(w, (h * 16) / 9) * aperture(t), h) / 2
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
    // At the waking the circle also darkens outside, half way to the dark the way in closed to.
    if (iris && (iris.dark ?? 0) > 0.01) {
      const dk = ctx.createRadialGradient(iris.x * k, iris.y * k, iris.r * 0.8 * k, iris.x * k, iris.y * k, iris.r * 1.15 * k)
      dk.addColorStop(0, rgba('#000000', 0))
      dk.addColorStop(1, rgba('#000000', iris.dark ?? 0))
      ctx.fillStyle = dk
      ctx.fillRect(f.x0 * k, f.y0 * k, w * k, h * k)
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
    // The dream's edge: all through the dream a soft glow of its rose at the corners of the frame, the colour the
    // echoes bring into the real world; the drive and the last room wear it too, until the waking takes it away.
    const dream = 1 - m
    if (dream > 0.01) {
      ctx.globalCompositeOperation = 'screen'
      // Stronger, and further in, in the drive and the dream's last room, which look most like the room as it is.
      const near = Math.max(0, Math.min(1, (t - 395.3) / 1.5)) * (1 - Math.max(0, Math.min(1, (t - 451.5) / 1.5)))
      const d = ctx.createRadialGradient(f.cx * k, f.cy * k, r * (0.6 - 0.14 * near) * k, f.cx * k, f.cy * k, r * 1.02 * k)
      d.addColorStop(0, rgba('#E46A9A', 0))
      d.addColorStop(1, rgba('#E46A9A', (0.14 + 0.44 * near) * dream))
      ctx.fillStyle = d
      ctx.fillRect(f.x0 * k, f.y0 * k, w * k, h * k)
      ctx.globalCompositeOperation = 'source-over'
    }
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
