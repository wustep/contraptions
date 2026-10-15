import { rgbaOf } from '../depth'
import { hash } from '../kit'
import { PLANE, bake, layBaked, onPlane, seen, type Frame } from './far'
import { ICE } from './theme'

/**
 * Iceland's sky: a cold clear blue going gold at the horizon, a low sun on the left, and weather going by on the
 * wind from the left (the way the plume leans): mares' tails and a dappled veil high up, rolls of stratocumulus, big
 * cumulus lit gold from underneath by the low sun, and long thin cloud low down. After the eruption the ash spreads
 * over all of it and the light goes grey-mauve (`dim`).
 *
 * The clouds are painted once into bands (`bake`), one for the high cloud and one for the cumulus, and laid on moving
 * with the wind.
 */

/** The far horizon, frame heights below the centre (from the resting camera). */
export const HZ = 0.035
/** The sun: low on the left, just over the ranges. */
export const SUN: [number, number] = [-0.6, HZ - 0.108]

/** How the wind moves each layer, frame heights a second. */
const WIND = { high: 0.016, cumulus: 0.022 }
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

/** The high cloud: mares' tails, long fine streaks combed out along the wind, lit on top and shaded under. */
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
  // And a veil of the thinnest cloud over the whole of the high sky: a fine dappling, thick in places and thin in
  // others, as a mackerel sky goes.
  const veil = new Path2D()
  for (let i = 0; i < 4200; i++) {
    const x = SPAN * hash(i, 1, 437)
    const y = -0.58 + 0.42 * hash(i, 2, 437)
    const thick = 0.7 + 0.2 * Math.sin((x / SPAN) * Math.PI * 2 * 5 + y * 9) + 0.12 * Math.sin((x / SPAN) * Math.PI * 2 * 11 - y * 23)
    if (hash(i, 5, 437) > thick) continue
    const s = 1 - 0.5 * Math.max(0, (y + 0.5) / 0.32)
    oval(veil, x, y, (0.005 + 0.01 * hash(i, 3, 437)) * s, (0.0016 + 0.0016 * hash(i, 4, 437)) * s)
  }
  ctx.globalAlpha = 0.3
  ctx.fillStyle = ICE.cloudLit
  ctx.fill(veil)
  ctx.globalAlpha = 0.22
  ctx.fillStyle = ICE.cloudShade
  ctx.fill(shade)
  ctx.globalAlpha = 0.5
  ctx.fillStyle = ICE.cloudLit
  ctx.fill(lit)
  ctx.globalAlpha = 1
}

/** The cumulus: each a heap of rounds on a flat base, shaded below, lit on top, lit gold where the sun gets under it. */
const paintCumulus: Paint = (ctx) => {
  // Shade, body, lit tops, gold underneath, low streaks' shade, and the billows' own shading inside the body.
  const layers = [new Path2D(), new Path2D(), new Path2D(), new Path2D(), new Path2D(), new Path2D()]
  const add = (layer: number, x: number, y: number, rx: number, ry: number) => oval(layers[layer], x, y, rx, ry)
  const n = 11
  for (let c = 0; c < n; c++) {
    const xc = (c + 0.2 + 0.6 * hash(c, 1, 411)) * (SPAN / n)
    const base = -0.06 - 0.13 * hash(c, 2, 411)
    // Some great heaps, and small fair-weather ones between them.
    const w = c % 3 === 1 ? 0.07 + 0.08 * hash(c, 3, 411) : 0.16 + 0.26 * hash(c, 3, 411)
    const puffs = 10 + Math.round(w * 40)
    for (let j = 0; j < puffs; j++) {
      const u = (j + 0.5) / puffs
      const dome = Math.pow(Math.sin(Math.PI * u), 0.8)
      const r = w * (0.07 + 0.15 * dome * (0.7 + 0.6 * hash(c, j, 412)))
      const x = xc + (u - 0.5) * w + (hash(c, j, 413) - 0.5) * 0.02
      const y = base - r * 0.7 - dome * w * 0.14 * hash(c, j, 414)
      add(0, x, y, r, r * 0.9)
      add(1, x - 0.14 * r, y - 0.2 * r, r * 0.86, r * 0.78)
      if (dome > 0.3) add(5, x + 0.3 * r, y + 0.18 * r, r * 0.5, r * 0.4)
      // Cauliflower: small heads along each billow's top, shaded on their undersides.
      for (let b = 0; b < 3; b++) {
        const a = -2.4 + 1.5 * (b / 2) + (hash(c * 31 + j, b, 416) - 0.5) * 0.4
        const bx = x + Math.cos(a) * r * 0.62
        const by = y + Math.sin(a) * r * 0.55
        add(5, bx + 0.05 * r, by + 0.08 * r, r * 0.26, r * 0.2)
        add(2, bx - 0.04 * r, by - 0.04 * r, r * 0.2, r * 0.16)
      }
      if (dome > 0.4) add(2, x - 0.28 * r, y - 0.36 * r, r * 0.56, r * 0.48)
      // The billows' own small heads, catching the light.
      if (dome > 0.6 && hash(c, j, 415) > 0.4) add(2, x - 0.1 * r, y - 0.7 * r, r * 0.3, r * 0.26)
    }
    add(0, xc, base - 0.008, w * 0.56, 0.02)
    add(3, xc - w * 0.12, base - 0.002, w * 0.42, 0.0055)
    add(4, xc + w * 0.18, base - 0.004, w * 0.3, 0.007)
  }
  // Rolls of stratocumulus across the middle of the sky: chains of flat rounds, blue-grey, lit gold underneath.
  for (let r = 0; r < 7; r++) {
    const x0 = (r + hash(r, 21, 421)) * (SPAN / 7)
    const y0 = -0.24 + 0.1 * hash(r, 22, 421)
    const len = 0.2 + 0.25 * hash(r, 23, 421)
    const m = 8 + Math.round(10 * hash(r, 24, 421))
    for (let i = 0; i < m; i++) {
      const u = i / (m - 1)
      const x = x0 + u * len
      const y = y0 + 0.01 * Math.sin(u * 5 + r) + (hash(i, r, 425) - 0.5) * 0.008
      const rx = (0.018 + 0.016 * hash(i, r, 426)) * (0.6 + 0.4 * Math.sin(Math.PI * u))
      add(4, x + 0.003, y + 0.003, rx, rx * 0.42)
      add(5, x, y, rx * 0.9, rx * 0.36)
      add(3, x - rx * 0.2, y + rx * 0.3, rx * 0.6, rx * 0.12)
    }
  }
  // Fine streaks low in the sky, toward the horizon.
  for (let i = 0; i < 90; i++) {
    const x = SPAN * hash(i, 15, 421)
    const y = -0.13 + 0.125 * hash(i, 16, 421)
    add(i % 2 ? 2 : 4, x, y, 0.025 + 0.07 * hash(i, 17, 421), 0.0014 + 0.002 * hash(i, 18, 421))
  }
  // Long thin cloud low down, over the ranges.
  for (let i = 0; i < 10; i++) {
    const x = (i + hash(i, 11, 421)) * (SPAN / 10)
    const y = -0.015 - 0.04 * hash(i, 12, 421)
    const w = 0.1 + 0.18 * hash(i, 13, 421)
    const h = 0.004 + 0.005 * hash(i, 14, 421)
    add(i % 3 ? 2 : 4, x, y, w, h)
    add(i % 3 ? 2 : 4, x + w * 0.45, y + h * 0.8, w * 0.55, h * 0.7)
  }
  const colours = [ICE.cloudShade, ICE.cloudBody, ICE.cloudLit, ICE.cloudGold, ICE.cloudShade, ICE.cloudMid]
  const alphas = [1, 1, 1, 0.85, 0.5, 0.6]
  for (const i of [0, 1, 5, 2, 3, 4]) {
    ctx.globalAlpha = alphas[i]
    ctx.fillStyle = colours[i]
    ctx.fill(layers[i])
  }
  ctx.globalAlpha = 1
}

/** The sky, the sun and the clouds: drawn first. `dim` is how far the ash has taken the light (0 to 0.55). */
export function drawSky(ctx: CanvasRenderingContext2D, f: Frame, k: number, t: number, dim: number): void {
  // The sky: cold blue overhead to gold at the horizon, going the colour of ash after the eruption.
  const sv = seen(f, PLANE.sky)
  // The bands are painted at the frame's own pixels a frame height.
  const m = ctx.getTransform()
  const ppu = (f.y1 - f.y0) * k * Math.hypot(m.a, m.b)
  onPlane(ctx, f, k, PLANE.sky, () => {
    // One gradient for the whole sky, round the low sun: gold-white at it, gold along the horizon, cold blue away
    // from it. Painted once; the ash is laid over it.
    const sky = bake('ice-sky', ppu, 2.4, -0.62, HZ + 0.07, (c) => {
      c.translate(1.2, 0)
      const g = c.createRadialGradient(SUN[0], SUN[1], 0, SUN[0], SUN[1] + 0.3, 1.7)
      g.addColorStop(0, ICE.sunCore)
      g.addColorStop(0.035, ICE.sunGold)
      g.addColorStop(0.2, ICE.skyLow)
      g.addColorStop(0.42, ICE.skyMid)
      g.addColorStop(0.75, ICE.skyTop)
      g.addColorStop(1, ICE.skyHigh)
      c.fillStyle = g
      c.fillRect(-1.2, -0.62, 2.4, HZ + 0.69)
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
    const sunA = Math.max(0, 1 - 1.6 * dim)
    if (sunA > 0.01) {
      ctx.fillStyle = `rgba(255, 247, 226, ${(0.95 * sunA).toFixed(3)})`
      ctx.beginPath()
      ctx.arc(SUN[0], SUN[1], 0.02, 0, Math.PI * 2)
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
      ['ice-high', paintHigh, -0.56, -0.24, WIND.high],
      ['ice-cumulus', paintCumulus, -0.4, 0.0, WIND.cumulus],
    ] as const) {
      if (cv.y1 < y0 || cv.y0 > y1) continue
      const band = bake(key, ppu, SPAN, y0, y1, paint)
      if (band) layBaked(ctx, band, wind * t, cv.x0, cv.x1)
    }
    ctx.globalAlpha = 1
  })
}

