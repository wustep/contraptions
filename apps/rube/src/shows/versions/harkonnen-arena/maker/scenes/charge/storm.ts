import { circle, composed, hash, layer, mix, rect, smooth, smoother, vgrad, type Brush } from '../../paint'
import { paintRange, type Range } from '../../world/dunes'
import { depthScale, frameH, horizonOf } from '../../world/land'
import { skyOf, type SkyKey } from '../../world/sky'
import { CHORD_DIES, FROM, stormFront, stormLeft } from './plan'

/**
 * The storm over the basin, and the sky it leaves.
 *
 * The values are the picture: the wall of the storm is the darkest thing in it, heavy, three great walls one before the
 * other, each topped by a crest of rolling billows that catches the low light as a flat paler band; the floor of the
 * basin is the palest, so the dark ships, the dark Sardaukar and the grey worms stand out against it; the sky between is
 * a dim brown, palest at the horizon. The wall's front rolls as it comes, and its foot is a skirt of dark blown sand along
 * the floor that the worms come out of. It is far behind the action's plane (a layer), so it barely moves as the camera
 * does: it is the size of the world. After the music it settles into itself and thins, and behind it is the evening, the
 * sun low in the west coming out of the last of the dust.
 */

/** The horizon's place in the frame: low, so the sky and the storm have most of it. */
export const TILT = 0.2

/** The sun is hidden in the storm; it comes out as the dust thins. */
const SUN_OUT = 315.5

export const SKY: SkyKey[] = [
  { t: FROM, top: '#36231B', low: '#B4805A', sun: { x: 0.24, y: 0.62, r: 0.022, color: '#FFE2B2' }, eclipse: 0 },
  { t: 309, top: '#3C271E', low: '#BA855C', sun: { x: 0.24, y: 0.62, r: 0.022, color: '#FFE2B2' }, eclipse: 0 },
  { t: CHORD_DIES + 7, top: '#8A6D60', low: '#EAB27C', sun: { x: 0.24, y: 0.62, r: 0.022, color: '#FFE2B2' }, eclipse: 0 },
]

/** The sand's light: pale under the storm, so all that stands on it reads; warmer in the evening. */
export function sandAt(t: number): { lit: string; shade: string; far: string } {
  const u = smoother(t, 309, CHORD_DIES + 7)
  return {
    lit: mix('#C58C5B', '#D49159', u),
    shade: mix('#7C4629', '#93532F', u),
    far: mix('#B98459', '#E0A672', u),
  }
}

const FAR_DUNES: Range = { seed: 77, spacing: 380, height: 26, vary: 0.6, soft: true }
const NEAR_DUNES: Range = { seed: 78, spacing: 200, height: 18, vary: 0.7, soft: true, gap: 0.3 }

/** How far behind the action's plane the storm's wall stands, cells. */
const STORM_D = 170

/**
 * One wall's front at height `y` (layer cells, negative up): a lean east as it rises, and on it a stack of billows, each
 * a round bulge `size` cells or so across, that climb the face as time goes on.
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

/** How high the wall's crest stands over its top at `x`: big round billows along it, drifting slowly west. */
function crestAt(x: number, t: number, seed: number, size: number): number {
  const u = (x + t * 1.4) / size
  const k = Math.floor(u)
  let up = 0
  for (const j of [k - 1, k, k + 1]) {
    const c = j + 0.5 + (hash(j, seed, 5) - 0.5) * 0.4
    const r = 0.6 + 0.3 * hash(j, seed, 6)
    const d = (u - c) / r
    if (Math.abs(d) < 1) up = Math.max(up, Math.sqrt(1 - d * d) * r * size * (0.55 + 0.5 * hash(j, seed, 7)))
  }
  return up
}

interface Wall {
  /** Its front's foot, east of the storm's front (layer cells); its height; its billows' size and how fast they climb. */
  ahead: number
  height: number
  size: number
  climb: number
  seed: number
  body: string
  band: string
}

/** The three walls, the back one highest and darkest; each crest catches the light as a band of its own. */
const WALLS: Wall[] = [
  { ahead: -50, height: 250, size: 70, climb: 1.6, seed: 11, body: '#21140F', band: '#5E3E2D' },
  { ahead: -22, height: 160, size: 52, climb: 2.4, seed: 12, body: '#2C1A13', band: '#704A33' },
  { ahead: 0, height: 92, size: 34, climb: 3.4, seed: 13, body: '#3B2418', band: '#87593B' },
]

/** One wall: its body from the floor up to its crest, west of its front, and the crest's band of light. */
function paintWall(b: Brush, wall: Wall, front: number, fall: number, a: number): void {
  const { ctx, view, t } = b
  // Settling, it falls back into the west and down a little, and thins away: never squats into pillars.
  const base = front + wall.ahead - (60 + 40 * (2 - WALLS.indexOf(wall))) * fall
  const H = wall.height * (1 - 0.3 * fall)
  const band = Math.max(3, H * 0.075)
  const n = 60
  const fx = (y: number) => frontAt(base, y, t, wall.seed, wall.size, wall.climb)
  const topX = fx(-H)
  const west = view.x0 - 10
  const m = 72
  // The crest, from the front's top west to the frame's edge.
  const crest: [number, number][] = []
  for (let i = 0; i <= m; i++) {
    const x = topX - ((topX - west) * i) / m
    crest.push([x, -H - crestAt(x, t, wall.seed, wall.size)])
  }
  ctx.beginPath()
  ctx.moveTo(west, 2)
  for (let i = 0; i <= n; i++) {
    const y = 2 + ((-H - 2) * i) / n
    ctx.lineTo(Math.max(west, fx(y)), y)
  }
  for (const [x, y] of crest) ctx.lineTo(Math.max(west, x), y)
  ctx.closePath()
  ctx.fillStyle = b.ca(wall.body, a)
  ctx.fill()
  // The band: the crest and a strip under it, flat and paler, where the low light still reaches the top of the dust.
  ctx.beginPath()
  for (let i = 0; i <= m; i++) {
    const [x, y] = crest[i]
    if (i) ctx.lineTo(Math.max(west, x), y)
    else ctx.moveTo(Math.max(west, x), y)
  }
  for (let i = m; i >= 0; i--) {
    const [x, y] = crest[i]
    // Thickest over the heads of the billows, thin in the dips between them: the light lies on what stands up.
    const head = Math.min(1, (-H - y) / (wall.size * 0.45))
    ctx.lineTo(Math.max(west, x), y + band * (0.35 + 1.1 * head))
  }
  ctx.closePath()
  ctx.fillStyle = b.ca(wall.band, a)
  ctx.fill()
}

/** The basin's sand as one gradient, from the horizon's far sand down to the near sand: anything of the sand uses it. */
export function basinFill(b: Brush): CanvasGradient {
  const { ctx, view, t } = b
  const hy = horizonOf(view, TILT)
  const sand = sandAt(t)
  const far = mix(sand.far, skyOf(SKY, t).low, 0.3)
  const gr = ctx.createLinearGradient(0, hy, 0, Math.max(hy + 4, 0) + Math.max(6, frameH(view) * 0.25))
  gr.addColorStop(0, b.c(far))
  gr.addColorStop(0.45, b.c(sand.lit))
  gr.addColorStop(1, b.c(mix(sand.lit, sand.shade, 0.22)))
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
  // The sun, low in the west, only as the storm thins: a flat disc that comes out of the dust.
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
  const left = stormLeft(t)
  if (left > 0.002) {
    const front = stormFront(t)
    const fall = 1 - left
    layer(b, depthScale(frameH(view), STORM_D), hy, (lb) => {
      for (const wall of WALLS) paintWall(lb, wall, front, fall, (wall.ahead === 0 ? 0.96 : 0.99) * left * left)
    })
  }
  paintRange(b, NEAR_DUNES, depthScale(frameH(view), 380), hy, { lit: sand.far, shade: sand.shade, air: sky.low, pale: 0.32 }, 1)
}

/**
 * The skirt: blown sand along the floor at the storm's foot, in the action's plane, dark as the storm, streaming east
 * over whatever comes out of it. One shape, thinning east into the floor; drawn over the worms and their riders, so they
 * come out of it.
 */
export function paintSkirt(b: Brush): void {
  const { ctx, view, t } = b
  const left = stormLeft(t)
  if (left <= 0.002) return
  const front = stormFront(t) + 24
  const reach = 18
  if (view.x0 > front + reach + 2) return
  const x0 = view.x0 - 2
  const x1 = front + reach
  const n = 56
  ctx.beginPath()
  ctx.moveTo(x0, 2)
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n
    // Highest at the wall, down to nothing at its reach; its top rolls east in long swells.
    const u = Math.max(0, Math.min(1, (x - (front - 50)) / (reach + 50)))
    const swell = 0.84 + 0.16 * Math.sin(x / 7 - t * 2.2) * Math.sin(x / 17 - t * 0.9)
    ctx.lineTo(x, -14 * (1 - u * u) * swell)
  }
  ctx.lineTo(x1 + 2, 2)
  ctx.closePath()
  const gr = ctx.createLinearGradient(front - 30, 0, x1, 0)
  gr.addColorStop(0, b.ca('#45291C', 0.94 * left))
  gr.addColorStop(0.55, b.ca('#5E3A28', 0.72 * left))
  gr.addColorStop(1, b.ca('#8A5B3D', 0))
  ctx.fillStyle = gr
  ctx.fill()
}
