import { rgbaOf } from '../depth'
import { hash } from '../kit'
import { measure, PLANE, bake, layBaked, onPlane, seen, type Frame } from './far'
import { ICE } from './theme'

/**
 * Iceland's sky: a cold clear blue going gold at the horizon, a low sun on the left, and weather going by on the
 * wind from the left (the way the plume leans): a few strokes of cirrus high up, going by fast, and under them a few
 * great heaps of cumulus lit gold from underneath by the low sun, and a few flat ones far off over the ranges, with
 * open sky between. After the eruption the ash spreads over all of it and the light goes grey-mauve (`dim`).
 *
 * The clouds are painted once into bands (`bake`), one for the high cloud and one for the cumulus, and laid on moving
 * with the wind.
 */

/** The far horizon, frame heights below the centre (from the resting camera). */
export const HZ = 0.035
/** The sun: low on the left, just over the ranges. */
export const SUN: [number, number] = [-0.6, HZ - 0.108]

/** How the wind moves each layer, frame heights a second. */
const WIND = { high: 0.04, cumulus: 0.03 }
const SPAN = 3

type Paint = (ctx: CanvasRenderingContext2D) => void
/** An ellipse on a band's path, and again a span over where it crosses either end of the band. */
function oval(path: Path2D, x: number, y: number, rx: number, ry: number): void {
  for (const dx of [0, -SPAN, SPAN]) {
    // Past the band's right end it comes round on the left, and the other way about.
    if (dx < 0 && x + rx < SPAN - 0.02) continue
    if (dx > 0 && x - rx > 0.02) continue
    path.moveTo(x + dx + rx, y)
    path.ellipse(x + dx, y, rx, ry, 0, 0, Math.PI * 2)
  }
}

/** The high cloud: a few long strokes of cirrus combed out along the wind, rising a little as they go. */
const paintHigh: Paint = (ctx) => {
  const lit = new Path2D()
  const strokes = 5
  for (let r = 0; r < strokes; r++) {
    const x0 = (r + hash(r, 1, 441)) * (SPAN / strokes)
    const y0 = -0.56 + 0.22 * hash(r, 2, 441)
    const len = 0.35 + 0.3 * hash(r, 3, 441)
    const rise = -0.03 - 0.03 * hash(r, 4, 441)
    // Each stroke is a few long thin rounds laid end to end, thinning toward its tail.
    for (let i = 0; i < 4; i++) {
      const u = (i + 0.5) / 4
      oval(lit, x0 + u * len, y0 + rise * u, len * 0.22, 0.004 * (1 - 0.5 * u))
    }
  }
  ctx.globalAlpha = 0.4
  ctx.fillStyle = ICE.cloudLit
  ctx.fill(lit)
  ctx.globalAlpha = 1
}

/**
 * A row of cumulus across the band: each a heap of a few rounds on a flat base, shaded below, lit on top, gold where
 * the sun gets under it, and the greatest built up into a tower, a narrower heap on top of the first. `width` gives each
 * heap's breadth (none where it is 0); `sy` flattens them (the far ones are seen more edge on); `a` is how much of them
 * shows through the haze.
 */
function heaps(ctx: CanvasRenderingContext2D, n: number, seed: number, base0: number, baseSpread: number, width: (c: number) => number, sy: number, a: number): void {
  // Shade, body, lit tops, and the gold underneath.
  const layers = [new Path2D(), new Path2D(), new Path2D(), new Path2D()]
  for (let c = 0; c < n; c++) {
    const xc = (c + 0.2 + 0.6 * hash(c, 1, seed)) * (SPAN / n)
    const base = base0 - baseSpread * hash(c, 2, seed)
    const w = width(c)
    if (w <= 0) continue
    for (let k = 0; k < (w > 0.38 ? 2 : 1); k++) {
      // The tower's upper heap: narrower, standing on the first and leaning a little with the wind.
      const wk = w * (1 - 0.4 * k)
      const xk = xc + 0.05 * k * w
      const bk = base - 0.17 * k * w * sy
      const ck = c + 53 * k
      const puffs = 5 + Math.round(wk * 12)
      for (let j = 0; j < puffs; j++) {
        const u = (j + 0.5) / puffs
        const dome = Math.pow(Math.sin(Math.PI * u), 0.8)
        const r = wk * (0.1 + 0.16 * dome * (0.8 + 0.4 * hash(ck, j, seed + 1)))
        const x = xk + (u - 0.5) * wk
        const y = bk - (r * 0.7 + dome * wk * 0.12 * hash(ck, j, seed + 3)) * sy
        oval(layers[0], x, y, r, r * 0.9 * sy)
        oval(layers[1], x - 0.14 * r, y - 0.2 * r * sy, 0.86 * r, 0.78 * r * sy)
        if (dome > 0.4) oval(layers[2], x - 0.28 * r, y - 0.36 * r * sy, 0.56 * r, 0.48 * r * sy)
      }
    }
    oval(layers[0], xc, base - 0.008 * sy, w * 0.56, 0.02 * sy)
    oval(layers[3], xc - w * 0.08, base - 0.006 * sy, w * 0.4, 0.007 * sy)
  }
  const colours = [ICE.cloudShade, ICE.cloudBody, ICE.cloudLit, ICE.cloudGold]
  const alphas = [1, 1, 1, 0.7]
  for (let i = 0; i < layers.length; i++) {
    ctx.globalAlpha = alphas[i] * a
    ctx.fillStyle = colours[i]
    ctx.fill(layers[i])
  }
  ctx.globalAlpha = 1
}

/** The cumulus: the same weather near and far, smaller and flatter and paler toward the horizon. */
const paintCumulus: Paint = (ctx) => {
  // Far off, over the ranges: a few low, flat ones.
  heaps(ctx, 16, 417, -0.008, 0.03, (c) => (hash(c, 4, 417) < 0.7 ? 0 : 0.08 + 0.1 * hash(c, 3, 417)), 0.5, 0.6)
  // Nearer: a few great heaps with open sky between them.
  heaps(ctx, 11, 411, -0.06, 0.13, (c) => (c % 3 === 0 ? 0.24 + 0.26 * hash(c, 3, 411) : 0), 1, 1)
}

/** The sky, the sun and the clouds: drawn first. `dim` is how far the ash has taken the light (0 to 0.55). */
export function drawSky(ctx: CanvasRenderingContext2D, f: Frame, k: number, t: number, dim: number): void {
  // The sky: cold blue overhead to gold at the horizon, going the colour of ash after the eruption.
  const sv = seen(f, PLANE.sky)
  // The bands are painted at the frame's own pixels a frame height.
  const m = ctx.getTransform()
  const ppu = measure(f) * k * Math.hypot(m.a, m.b)
  onPlane(ctx, f, k, PLANE.sky, () => {
    // Cold blue overhead going pale toward the horizon, and gold low down on the sun's side, fading out across the
    // sky away from it: the gold is laid on first, faded upward, and the blue goes in behind it. Painted once; the
    // ash is laid over it.
    const sky = bake('ice-sky', ppu, 2.4, -0.62, HZ + 0.07, (c) => {
      c.translate(1.2, 0)
      const y0 = -0.62
      const y1 = HZ + 0.07
      const warm = c.createLinearGradient(-1.2, 0, 1.2, 0)
      warm.addColorStop(0, rgbaOf(ICE.skyGold, 1))
      warm.addColorStop(0.3, rgbaOf(ICE.skyGold, 1))
      warm.addColorStop(0.55, rgbaOf(ICE.skyLow, 0.7))
      warm.addColorStop(0.9, rgbaOf(ICE.skyLow, 0))
      c.fillStyle = warm
      c.fillRect(-1.2, y0, 2.4, y1 - y0)
      const up = c.createLinearGradient(0, y0, 0, y1)
      up.addColorStop(0, 'rgba(0,0,0,0)')
      up.addColorStop(0.3, 'rgba(0,0,0,0.12)')
      up.addColorStop(0.65, 'rgba(0,0,0,0.75)')
      up.addColorStop(0.85, 'rgba(0,0,0,1)')
      c.globalCompositeOperation = 'destination-in'
      c.fillStyle = up
      c.fillRect(-1.2, y0, 2.4, y1 - y0)
      const blue = c.createLinearGradient(0, y0, 0, y1)
      blue.addColorStop(0, ICE.skyHigh)
      blue.addColorStop(0.4, ICE.skyTop)
      blue.addColorStop(0.85, ICE.skyMid)
      blue.addColorStop(1, ICE.skyMid)
      c.globalCompositeOperation = 'destination-over'
      c.fillStyle = blue
      c.fillRect(-1.2, y0, 2.4, y1 - y0)
      c.globalCompositeOperation = 'source-over'
    })
    // Over the band, on a stage taller than 16:9: the sky's own colour overhead.
    if (sv.y0 < -0.62) {
      ctx.fillStyle = ICE.skyHigh
      ctx.fillRect(sv.x0, sv.y0, sv.x1 - sv.x0, -0.62 - sv.y0 + 0.002)
    }
    if (sky) layBaked(ctx, sky, -1.2, sv.x0, sv.x1)
    else {
      ctx.fillStyle = ICE.skyMid
      ctx.fillRect(sv.x0, sv.y0, sv.x1 - sv.x0, HZ + 0.07 - sv.y0)
    }
    if (dim > 0.002) {
      ctx.fillStyle = rgbaOf(ICE.skyAsh, 0.9 * dim)
      ctx.fillRect(sv.x0 - 0.05, sv.y0 - 0.05, sv.x1 - sv.x0 + 0.1, HZ + 0.12 - sv.y0)
    }
    // The sun: a plain disc in the low haze, going into the ash.
    const sunA = Math.max(0, 1 - 1.6 * dim)
    if (sunA > 0.01) {
      ctx.fillStyle = rgbaOf(ICE.sun, 0.95 * sunA)
      ctx.beginPath()
      ctx.arc(SUN[0], SUN[1], 0.024, 0, Math.PI * 2)
      ctx.fill()
    }
  })

  // The clouds: the high rafts, then the cumulus, each going by on the wind at its own pace. As the ash spreads they
  // go into it.
  const cv = seen(f, PLANE.cloud)
  const fade = 1 - 0.8 * Math.min(1, dim / 0.5)
  onPlane(ctx, f, k, PLANE.cloud, () => {
    ctx.globalAlpha = fade
    for (const [key, paint, y0, y1, wind] of [
      ['ice-high', paintHigh, -0.66, -0.2, WIND.high],
      ['ice-cumulus', paintCumulus, -0.46, 0.0, WIND.cumulus],
    ] as const) {
      if (cv.y1 < y0 || cv.y0 > y1) continue
      const band = bake(key, ppu, SPAN, y0, y1, paint)
      if (band) layBaked(ctx, band, wind * t, cv.x0, cv.x1)
    }
    ctx.globalAlpha = 1
  })
}

