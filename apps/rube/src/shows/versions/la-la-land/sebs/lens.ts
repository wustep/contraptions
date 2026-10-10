import type p5 from 'p5'
import { frame, rgba, scenery } from './kit'

/**
 * The lens the whole picture is seen through: the corners falling off a little, as a camera lens's do. Not in the
 * home movie, whose gate has its own. Drawn over each place and under its cover.
 */
const MOVIE: [number, number] = [340.5, 395.3]

/**
 * The grade: the room as it is, muted; the dream, in full colour, as the film's Epilogue does it. The real club at the
 * start is graded colder and greyer, her yellow and his blue with it; the colour comes in as the spotlight's iris
 * opens on Lipton's (39.95 to 41.9) and goes again as the colour drains out at the waking (451.5 to 453.73). Then on
 * The End's swell, as their stars come out over the city, it comes back: the music brings it.
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

/**
 * What of the canvas is picture at `t`, in the current frame's cells: all of it but the masking at the sides. (What is
 * drawn outside it is covered; a place can leave it undrawn.)
 */
export function picture(p: p5, k: number, t: number): { x0: number; y0: number; x1: number; y1: number } {
  const f = frame(p, k)
  const a = aperture(t)
  if (a > 0.9995) return f
  // And a pixel or two under the masking's edge, where it is not quite opaque.
  const m = (p.drawingContext as CanvasRenderingContext2D).getTransform()
  const half = (Math.min(f.x1 - f.x0, ((f.y1 - f.y0) * 16) / 9) * a) / 2 + 2 / (k * (Math.hypot(m.a, m.b) || 1))
  return { x0: Math.max(f.x0, f.cx - half), y0: f.y0, x1: Math.min(f.x1, f.cx + half), y1: f.y1 }
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
    // Only the picture is filled: the masking covers the rest.
    const v = picture(p, k, t)
    const fill = () => ctx.fillRect(v.x0 * k, v.y0 * k, (v.x1 - v.x0) * k, (v.y1 - v.y0) * k)
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
      fill()
    }
    if (m > 0.01) {
      // Greyer: the colour drawn out toward grey; and colder: a little blue laid in the shadows.
      ctx.globalCompositeOperation = 'saturation'
      ctx.fillStyle = paint('#808080', 0.36 * m)
      fill()
      ctx.globalCompositeOperation = 'soft-light'
      ctx.fillStyle = paint('#3A5A9A', 0.28 * m)
      fill()
      if (iris && iris.f > 0.05) {
        // The warm light of the dream gathering in the circle as it closes: a lamp's warmth, laid on by screen.
        ctx.globalCompositeOperation = 'screen'
        const warm = ctx.createRadialGradient(iris.x * k, iris.y * k, 0, iris.x * k, iris.y * k, iris.r * k)
        const a = 0.42 * iris.f * iris.f
        warm.addColorStop(0, rgba('#F2A65A', a))
        warm.addColorStop(0.65, rgba('#C8506A', 0.7 * a))
        warm.addColorStop(1, rgba('#C8506A', 0))
        ctx.fillStyle = warm
        fill()
      }
      ctx.globalCompositeOperation = 'source-over'
    }
    const g = ctx.createRadialGradient(f.cx * k, f.cy * k, r * 0.55 * k, f.cx * k, f.cy * k, r * 1.02 * k)
    g.addColorStop(0, rgba('#000000', 0))
    g.addColorStop(1, rgba('#000000', 0.2))
    ctx.fillStyle = g
    // The fall-off is nothing inside its inner circle, so only the ring outside it is filled.
    ctx.beginPath()
    ctx.rect(v.x0 * k, v.y0 * k, (v.x1 - v.x0) * k, (v.y1 - v.y0) * k)
    ctx.moveTo((f.cx + r * 0.55) * k, f.cy * k)
    ctx.arc(f.cx * k, f.cy * k, r * 0.55 * k, 0, Math.PI * 2)
    ctx.fill('evenodd')
    ctx.restore()
  },
})
