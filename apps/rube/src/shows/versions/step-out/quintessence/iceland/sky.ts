import { rgbaOf } from '../depth'
import { hash } from '../kit'
import { PLANE, bake, layBaked, onPlane, seen, type Frame } from './far'
import { ICE } from './theme'

/**
 * Iceland's sky: a cold clear blue going gold at the horizon, a low sun on the left, and weather going by on the
 * wind from the left (the way the plume leans): mares' tails high up, going by fast, and under them cumulus lit gold
 * from underneath by the low sun, great heaps overhead and smaller, flatter ones far off down to the horizon, with
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

/** The high cloud: mares' tails and cirrus, long fine streaks combed out along the wind, lit on top and shaded under. */
const paintHigh: Paint = (ctx) => {
  const lit = new Path2D()
  const shade = new Path2D()
  const bands = 11
  for (let r = 0; r < bands; r++) {
    const x0 = (r + hash(r, 1, 431)) * (SPAN / bands)
    const y0 = -0.5 + 0.24 * hash(r, 2, 431)
    // Nearer the horizon they are finer, as the sky goes away.
    const s = 1 - 0.45 * ((y0 + 0.5) / 0.24)
    const len = (0.18 + 0.2 * hash(r, 3, 431)) * s
    const curl = (hash(r, 4, 431) - 0.5) * 0.06
    const n = 26 + Math.round(20 * hash(r, 5, 431))
    for (let i = 0; i < n; i++) {
      const u = hash(i, r, 432)
      const x = x0 + u * len
      // The band curves, and its streaks fan out from its head.
      const y = y0 + curl * Math.sin(u * Math.PI) + (hash(i, r, 433) - 0.5) * 0.03 * s * (0.4 + u)
      const rx = (0.02 + 0.05 * hash(i, r, 434)) * s
      const ry = (0.0018 + 0.0022 * hash(i, r, 435)) * s
      oval(shade, x + rx * 0.1, y + ry * 1.3, rx, ry)
      oval(lit, x, y, rx * 0.92, ry * 0.85)
    }
  }
  // Higher still, cirrus combed out long and thin across the top of the sky, each band rising a little along the
  // wind and fraying at its tail.
  const high = 20
  for (let r = 0; r < high; r++) {
    const x0 = (r + hash(r, 1, 441)) * (SPAN / high)
    const y0 = -0.56 + 0.2 * hash(r, 2, 441)
    const len = 0.3 + 0.3 * hash(r, 3, 441)
    const rise = -0.04 - 0.05 * hash(r, 4, 441)
    const n = 40 + Math.round(30 * hash(r, 5, 441))
    for (let i = 0; i < n; i++) {
      const u = hash(i, r, 442)
      const x = x0 + u * len
      const y = y0 + rise * u + (hash(i, r, 443) - 0.5) * 0.036 * (0.3 + u)
      const rx = (0.025 + 0.06 * hash(i, r, 444)) * (1 - 0.4 * u)
      const ry = 0.0014 + 0.0018 * hash(i, r, 445)
      oval(shade, x + rx * 0.1, y + ry * 1.3, rx, ry)
      oval(lit, x, y, rx * 0.92, ry * 0.85)
    }
  }
  ctx.globalAlpha = 0.22
  ctx.fillStyle = ICE.cloudShade
  ctx.fill(shade)
  ctx.globalAlpha = 0.5
  ctx.fillStyle = ICE.cloudLit
  ctx.fill(lit)
  ctx.globalAlpha = 1
}

/**
 * A row of cumulus across the band: each a heap of rounds on a flat base, shaded below, lit on top, lit gold where the
 * sun gets under it, and the greatest built up into a tower, a narrower heap on top of the first. `width` gives each
 * heap's breadth (none where it is 0); `sy` flattens them (the far ones are seen more edge on); `a` is how much of them
 * shows through the haze.
 */
function heaps(ctx: CanvasRenderingContext2D, n: number, seed: number, base0: number, baseSpread: number, width: (c: number) => number, sy: number, a: number): void {
  // Shade, body, lit tops, gold underneath, the shade beside the gold, and the billows' own shading inside the body.
  const layers = [new Path2D(), new Path2D(), new Path2D(), new Path2D(), new Path2D(), new Path2D()]
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
      const puffs = 10 + Math.round(wk * 40)
      for (let j = 0; j < puffs; j++) {
        const u = (j + 0.5) / puffs
        const dome = Math.pow(Math.sin(Math.PI * u), 0.8)
        const r = wk * (0.07 + 0.15 * dome * (0.7 + 0.6 * hash(ck, j, seed + 1)))
        const x = xk + (u - 0.5) * wk + (hash(ck, j, seed + 2) - 0.5) * 0.02
        const y = bk - (r * 0.7 + dome * wk * 0.14 * hash(ck, j, seed + 3)) * sy
        // A round of this billow, placed and sized in its own radius.
        const put = (layer: number, dx: number, dy: number, rx: number, ry: number) => oval(layers[layer], x + dx * r, y + dy * r * sy, rx * r, ry * r * sy)
        put(0, 0, 0, 1, 0.9)
        put(1, -0.14, -0.2, 0.86, 0.78)
        if (dome > 0.3) put(5, 0.3, 0.18, 0.5, 0.4)
        // Cauliflower: small heads along each billow's top, shaded on their undersides.
        for (let b = 0; b < 3; b++) {
          const q = -2.4 + 1.5 * (b / 2) + (hash(ck * 31 + j, b, seed + 5) - 0.5) * 0.4
          put(5, Math.cos(q) * 0.62 + 0.05, Math.sin(q) * 0.55 + 0.08, 0.26, 0.2)
          put(2, Math.cos(q) * 0.62 - 0.04, Math.sin(q) * 0.55 - 0.04, 0.2, 0.16)
        }
        if (dome > 0.4) put(2, -0.28, -0.36, 0.56, 0.48)
        // The billows' own small heads, catching the light.
        if (dome > 0.6 && hash(ck, j, seed + 4) > 0.4) put(2, -0.1, -0.7, 0.3, 0.26)
      }
    }
    oval(layers[0], xc, base - 0.008 * sy, w * 0.56, 0.02 * sy)
    oval(layers[3], xc - w * 0.12, base - 0.002 * sy, w * 0.42, 0.0055 * sy)
    oval(layers[4], xc + w * 0.18, base - 0.004 * sy, w * 0.3, 0.007 * sy)
  }
  const colours = [ICE.cloudShade, ICE.cloudBody, ICE.cloudLit, ICE.cloudGold, ICE.cloudShade, ICE.cloudMid]
  const alphas = [1, 1, 1, 0.85, 0.5, 0.6]
  for (const i of [0, 1, 5, 2, 3, 4]) {
    ctx.globalAlpha = alphas[i] * a
    ctx.fillStyle = colours[i]
    ctx.fill(layers[i])
  }
  ctx.globalAlpha = 1
}

/** The cumulus: the same weather near and far, smaller and flatter and paler toward the horizon. */
const paintCumulus: Paint = (ctx) => {
  // Far off, over the ranges, down to the horizon.
  heaps(ctx, 16, 417, -0.008, 0.042, (c) => (hash(c, 4, 417) < 0.4 ? 0 : 0.04 + 0.13 * hash(c, 3, 417)), 0.55, 0.75)
  // Nearer: great heaps, and here and there a small fair-weather one between them.
  heaps(ctx, 11, 411, -0.06, 0.13, (c) => (c % 3 !== 1 ? 0.2 + 0.3 * hash(c, 3, 411) : hash(c, 4, 411) < 0.5 ? 0 : 0.06 + 0.07 * hash(c, 3, 411)), 1, 1)
}

/** The sky, the sun and the clouds: drawn first. `dim` is how far the ash has taken the light (0 to 0.55). */
export function drawSky(ctx: CanvasRenderingContext2D, f: Frame, k: number, t: number, dim: number): void {
  // The sky: cold blue overhead to gold at the horizon, going the colour of ash after the eruption.
  const sv = seen(f, PLANE.sky)
  // The bands are painted at the frame's own pixels a frame height.
  const m = ctx.getTransform()
  const ppu = (f.y1 - f.y0) * k * Math.hypot(m.a, m.b)
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
      ['ice-high', paintHigh, -0.66, -0.24, WIND.high],
      ['ice-cumulus', paintCumulus, -0.4, 0.0, WIND.cumulus],
    ] as const) {
      if (cv.y1 < y0 || cv.y0 > y1) continue
      const band = bake(key, ppu, SPAN, y0, y1, paint)
      if (band) layBaked(ctx, band, wind * t, cv.x0, cv.x1)
    }
    ctx.globalAlpha = 1
  })
}

