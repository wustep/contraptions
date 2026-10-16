import { frame, hash, mix, rgba, type Brush } from './brush'
import { rainAt, tones, windAt } from './look'

/**
 * The rain: thin straight streaks in two depths, the near ones longer, quicker and fewer. It is drawn about the
 * frame, not the world (it is falling between the camera and everything), at a length that is a share of the frame,
 * so it reads the same in a close shot and a wide one. How much of it there is, and how it slants, is the weather's
 * (`rainAt`, `windAt`).
 */

interface Layer {
  /** Streaks at full rain. */
  n: number
  /** Streak length, as a share of the frame's height. */
  len: number
  /** Frames' heights a second it falls. */
  speed: number
  alpha: number
  /** Line width, as a share of the frame's height (never under a pixel). */
  w: number
  seed: number
}

const FAR: Layer = { n: 340, len: 0.022, speed: 1.15, alpha: 0.2, w: 0.0009, seed: 7 }
const NEAR: Layer = { n: 90, len: 0.05, speed: 1.9, alpha: 0.26, w: 0.0014, seed: 19 }

function layer(b: Brush, t: number, L: Layer, density: number, slant: number, color: string, above: number): void {
  const f = frame(b)
  const W = f.x1 - f.x0
  const H = f.y1 - f.y0
  const n = Math.round(L.n * density)
  if (n <= 0) return
  const len = L.len * H
  const dx = Math.tan(slant)
  const g = b.g
  g.beginPath()
  const bottom = Math.min(f.y1, above)
  for (let i = 0; i < n; i++) {
    const u = hash(i, L.seed, 1)
    const phase = hash(i, L.seed, 2)
    const sp = L.speed * (0.85 + 0.3 * hash(i, L.seed, 3))
    const fall = (phase + t * sp) % 1
    // The streak's foot, over the frame plus a streak's length at the top, slid sideways by the wind.
    const y = f.y0 - len + fall * (H + len * 2)
    if (y - len > bottom) continue
    const x = f.x0 - H * 0.3 + u * (W + H * 0.6) + (y - f.y0) * dx
    const y1 = Math.min(y, bottom)
    const x1 = x - (y - y1) * dx
    g.moveTo(x1, y1)
    g.lineTo(x - len * dx, y - len)
  }
  g.lineWidth = Math.max(b.px, L.w * H)
  g.lineCap = 'butt'
  g.strokeStyle = rgba(color, L.alpha)
  g.stroke()
}

/** The rain at `t`, nothing under `above` (cells): a roof, or the ground over the cistern. */
export function drawRain(b: Brush, t: number, above = Infinity, scale = 1): void {
  const d = rainAt(t) * scale
  if (d <= 0.01) return
  const c = tones(t)
  const slant = windAt(t)
  const col = mix(c.rain, c.skyLow, 0.2)
  layer(b, t, FAR, d, slant * 0.9, col, above)
  layer(b, t, NEAR, d * d, slant, col, above)
}
