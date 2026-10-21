import { circle, clamp01, composed, hash, layer, mix, rect, smooth, smoother, vgrad, type Brush } from '../../paint'
import { paintRange, type Range } from '../../world/dunes'
import { depthScale, frameH, horizonOf } from '../../world/land'
import { skyOf, type SkyKey } from '../../world/sky'
import { CHORD_DIES, FROM, stormFront, stormLeft } from './plan'

/**
 * The storm over the basin, and the sky it leaves.
 *
 * Through the charge the light is the storm's: a low brown sky, and in the west a wall of dust standing up out of the
 * desert higher than the frame. Its front is a stack of great rounded billows that climb as it comes, the face of each
 * a little paler where the light still reaches it, the body behind them darker the higher it goes. Its foot is a skirt
 * of blown sand along the flat that the worms come out of. It is far behind the action's plane (a layer), so it barely
 * moves as the camera does: it is the size of the world. After the music the wall settles into itself and thins, and
 * the sky behind it is the evening: warm and low, the sun on the horizon in the east.
 */

/** The horizon's place in the frame: low, so the sky and the storm have most of it. */
export const TILT = 0.2

/** The sun is hidden in the storm; it comes out as the dust thins. */
const SUN_OUT = 316

export const SKY: SkyKey[] = [
  { t: FROM, top: '#4F3427', low: '#A9683D', sun: { x: 0.79, y: 0.6, r: 0.02, color: '#FFE2B2' }, eclipse: 0 },
  { t: 309, top: '#573829', low: '#B06E40', sun: { x: 0.79, y: 0.6, r: 0.02, color: '#FFE2B2' }, eclipse: 0 },
  { t: CHORD_DIES + 7, top: '#8A6D60', low: '#EAB27C', sun: { x: 0.79, y: 0.6, r: 0.02, color: '#FFE2B2' }, eclipse: 0 },
]

/** The sand's light: storm-lit through the charge, evening after it. */
export function sandAt(t: number): { lit: string; shade: string; far: string } {
  const u = smoother(t, 309, CHORD_DIES + 7)
  return {
    lit: mix('#A3613A', '#CF8A54', u),
    shade: mix('#6C3A22', '#93532F', u),
    far: mix('#95603C', '#DDA370', u),
  }
}

const FAR_DUNES: Range = { seed: 77, spacing: 380, height: 26, vary: 0.6, soft: true }
const NEAR_DUNES: Range = { seed: 78, spacing: 200, height: 18, vary: 0.7, soft: true, gap: 0.3 }

/** How far behind the action's plane the storm's wall stands, cells. */
const STORM_D = 170

/**
 * One wall's front at height `y` (layer cells, negative up): a lean east as it rises, and on it a stack of billows,
 * each a round bulge `size` cells or so across, that climb the face as time goes on.
 */
function frontAt(base: number, y: number, t: number, seed: number, size: number, climb: number): number {
  const u = (-y + t * climb) / size
  const k = Math.floor(u)
  let bulge = 0
  for (const j of [k - 1, k, k + 1]) {
    const c = j + 0.5 + (hash(j, seed) - 0.5) * 0.3
    const r = 0.55 + 0.35 * hash(j, seed, 1)
    const d = (u - c) / r
    if (Math.abs(d) < 1) bulge = Math.max(bulge, Math.sqrt(1 - d * d) * r * size * (0.55 + 0.45 * hash(j, seed, 2)))
  }
  // The top leans out east over the basin, the wall coming on like a wave that does not break.
  return base + Math.min(0, y) * -0.42 + bulge
}

/** One wall: everything west of its front, from the flat up past the frame's top, darker as it goes up. */
function wall(b: Brush, base: number, seed: number, size: number, climb: number, low: string, high: string, a: number, top: number): void {
  const { ctx, view, t } = b
  const y0 = Math.min(view.y0 - 4, top)
  const n = 90
  ctx.beginPath()
  ctx.moveTo(view.x0 - 10, 2)
  for (let i = 0; i <= n; i++) {
    const y = 2 + ((top - 2) * i) / n
    ctx.lineTo(Math.max(view.x0 - 10, frontAt(base, y, t, seed, size, climb)), y)
  }
  ctx.lineTo(view.x0 - 10, y0)
  ctx.closePath()
  const gr = ctx.createLinearGradient(0, 0, 0, top)
  gr.addColorStop(0, b.ca(low, a))
  gr.addColorStop(1, b.ca(high, a))
  ctx.fillStyle = gr
  ctx.fill()
}

/** The basin's sand as one gradient, from the horizon's far sand down to the near sand: anything of the sand uses it. */
export function basinFill(b: Brush): CanvasGradient {
  const { ctx, view, t } = b
  const hy = horizonOf(view, TILT)
  const sand = sandAt(t)
  const far = mix(sand.far, skyOf(SKY, t).low, 0.35)
  const gr = ctx.createLinearGradient(0, hy, 0, Math.max(hy + 4, 0) + Math.max(6, frameH(view) * 0.25))
  gr.addColorStop(0, b.c(far))
  gr.addColorStop(0.45, b.c(sand.lit))
  gr.addColorStop(1, b.c(mix(sand.lit, sand.shade, 0.3)))
  return gr
}

/** The basin under the sky: one gradient, no edges. */
export function paintBasin(b: Brush): void {
  const { ctx, view } = b
  const hy = horizonOf(view, TILT)
  ctx.fillStyle = basinFill(b)
  rect(ctx, view.x0 - 1, hy, view.w + 2, Math.max(0, view.y1 - hy) + 1)
  ctx.fill()
}

/** The sky, the far desert under the storm's light, and the wall. */
export function paintStormSky(b: Brush): void {
  const { ctx, view, t } = b
  const hy = horizonOf(view, TILT)
  const sky = skyOf(SKY, t)
  ctx.fillStyle = vgrad(b, Math.min(view.y0, hy - view.h * 0.6), hy, [[0, sky.top], [0.72, mix(sky.top, sky.low, 0.6)], [1, sky.low]])
  rect(ctx, view.x0 - 1, view.y0 - 1, view.w + 2, Math.max(0, hy - view.y0) + 1)
  ctx.fill()
  // The sun, low in the east, only as the storm thins: a flat disc that comes out of the dust.
  const out = smooth(t, SUN_OUT, SUN_OUT + 8)
  if (out > 0.002) {
    // Shares of the composed 16:9 frame, so a phone held upright has it where a wide screen does.
    const f = composed(view)
    const r = sky.sun.r * f.h
    circle(ctx, f.cx + (sky.sun.x - 0.5) * f.h * (16 / 9), f.cy + (sky.sun.y - 0.5) * f.h, r)
    ctx.fillStyle = b.ca(sky.sun.color, out)
    ctx.fill()
  }
  paintBasin(b)
  const sand = sandAt(t)
  paintRange(b, FAR_DUNES, depthScale(frameH(view), 1100), hy, { lit: sand.far, shade: sand.shade, air: sky.low, pale: 0.6 }, 1)
  // The wall, in its layer: the body, then the billows of its front, then its lit face; as the evening comes it
  // settles and thins.
  const left = stormLeft(t)
  if (left > 0.002) {
    const front = stormFront(t)
    const fall = 1 - left
    layer(b, depthScale(frameH(view), STORM_D), hy, (lb) => {
      wall(lb, front - 50 - 50 * fall, 11, 60, 1.6, '#6E3E26', '#2C1A13', 0.95 * left, -1600 + 1300 * fall)
      wall(lb, front - 20 - 70 * fall, 12, 38, 2.4, '#97583A', '#3E241A', 0.82 * left, -1000 + 860 * fall)
      wall(lb, front - 90 * fall, 13, 24, 3.4, '#B7774A', '#6A3C27', 0.72 * left, -420 + 370 * fall)
    })
    // The storm's top over the basin: the sky darker toward the frame's top, the most of it in the west.
    const shade = ctx.createLinearGradient(view.x0, view.y0, view.x0 + view.w * 0.9, view.y0 + (hy - view.y0) * 0.55)
    shade.addColorStop(0, b.ca('#2E1C15', 0.62 * left))
    shade.addColorStop(1, b.ca('#2E1C15', 0))
    ctx.fillStyle = shade
    rect(ctx, view.x0 - 1, view.y0 - 1, view.w + 2, Math.max(0, hy - view.y0) + 1)
    ctx.fill()
  }
  paintRange(b, NEAR_DUNES, depthScale(frameH(view), 380), hy, { lit: sand.far, shade: sand.shade, air: sky.low, pale: 0.32 }, 1)
}

/**
 * The skirt: blown sand along the flat at the storm's foot, in the action's plane, streaming east over whatever comes
 * out of it. Drawn over the worms and their riders, so they come out of it.
 */
export function paintSkirt(b: Brush): void {
  const { ctx, view, t } = b
  const left = stormLeft(t)
  if (left <= 0.002) return
  const front = stormFront(t) + 24
  if (view.x0 > front + 40) return
  const bands: [number, number, string, number, number][] = [
    // [reach east of the front, height, colour, alpha, seed]
    [0, 16, '#7A4428', 0.9, 31],
    [16, 9, '#925532', 0.66, 32],
    [30, 4.5, '#A6663C', 0.45, 33],
  ]
  for (const [reach, h, color, a, seed] of bands) {
    const x1 = front + reach
    if (x1 < view.x0 - 2) continue
    const n = 48
    ctx.beginPath()
    ctx.moveTo(view.x0 - 2, 2)
    for (let i = 0; i <= n; i++) {
      const x = view.x0 - 2 + ((x1 - view.x0 + 2) * i) / n
      // Highest at the wall, thinning to nothing at its reach; its top rolls east in long swells.
      const u = clamp01((x - (front - 60)) / (reach + 60))
      const swell = 0.82 + 0.18 * Math.sin(x / 7 - t * 2.2 + seed) * Math.sin(x / 17 - t * 0.9)
      ctx.lineTo(x, -h * (1 - u * u) * swell)
    }
    ctx.lineTo(x1 + 2, 2)
    ctx.closePath()
    ctx.fillStyle = b.ca(color, a * left)
    ctx.fill()
  }
}
