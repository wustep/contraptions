import { loudness, osc, PERIOD, wrap } from './music'
import { LENGTH, RADIUS, along } from './path'
import { mixHex } from '../../../../parts'
import { hash, polar, smooth, type Sky } from './world'
import type { Ctx2D } from './frame'
import { rainAt } from './air'

/**
 * The sea's surface: wavelets, seen in perspective, catching the sky on their faces and dark in their troughs; small
 * and close-packed at the horizon, longer and further apart nearer, the near water going by faster than the far
 * (parallax), with a slow drift of the wind across it. Two sets of them, cross-fading slowly band by band, so the
 * surface glitters rather than slides. How ruffled it is follows how full the music is: calm under the Gymnopédie's long
 * notes, livelier where the Gnossiennes run on.
 *
 * Drawn from two tiles made once, in bands from the horizon down, each band moved by its own depth's pace. A band's
 * pace and its wind are whole numbers of tiles a period, so the surface comes round with everything else.
 */

/** A tile's width, cells: a whole share of the way round. */
export const SHARES = 28
const TILE = LENGTH / SHARES
/** How far down from the horizon the surface is drawn, cells, and in how many bands. */
const DEEP = 3.4
const BANDS = 16
/** Pixels a cell in the tiles. */
const P = 150

/** Band `j`'s top and bottom, cells below the horizon: thin at the horizon, thicker nearer. */
const EDGES = Array.from({ length: BANDS + 1 }, (_, j) => 0.012 * Math.pow(DEEP / 0.012, j / BANDS))
EDGES[0] = 0

/** Band `j`'s pace, as a share of the ball's (whole tiles a period), and its wind (whole tiles a period, across). */
export const BAND = EDGES.slice(0, -1).map((y0, j) => {
  const mid = (y0 + EDGES[j + 1]) / 2
  return { y0, y1: EDGES[j + 1], pace: Math.round((1 + 0.45 * mid) * SHARES) / SHARES, wind: 2 + (j % 3), phase: hash(j, 401) * 6.28 }
})

let tiles: HTMLCanvasElement[] | null = null
/** The glitter path's own canvas. */
let shine: HTMLCanvasElement | null = null
/** The lamps' glitter's canvas, and its mask. */
let warm: HTMLCanvasElement | null = null
let under: HTMLCanvasElement | null = null

/** Make the tiles now, if they are not made: on the first frame of the sea, far off at the seam, not the first close one. */
export function warmRipples(): void {
  tiles ??= makeTiles()
}

/** The two tiles: wavelets drawn white on their lit faces and dark in their troughs, wrapping across. */
function makeTiles(): HTMLCanvasElement[] {
  return [0, 1].map((variant) => {
    const c = document.createElement('canvas')
    c.width = Math.round(TILE * P)
    c.height = Math.round(DEEP * P)
    const g = c.getContext('2d')!
    const W = c.width
    let n = 0
    for (const band of BAND) {
      const top = band.y0 * P
      const bottom = band.y1 * P
      // Rows of wavelets through the band, each a little deeper than the last.
      let y = top
      while (y < bottom) {
        const depth = Math.max(0.012, y / P)
        const thick = Math.max(1, depth * 0.016 * P)
        const len = Math.max(2.5, depth * 0.13 * P)
        const count = Math.min(240, Math.round((W / len) * 0.42))
        for (let i = 0; i < count; i++) {
          const id = n++
          const h1 = hash(id, variant, 402)
          const x = hash(id, variant, 403) * W
          const l = len * (0.45 + 1.1 * hash(id, variant, 404))
          const yy = y + hash(id, variant, 405) * thick * 2
          // Most are the sky caught on a wavelet's face; some its shadowed trough, under it.
          const lit = h1 < 0.62
          g.fillStyle = lit ? `rgba(255, 255, 255, ${(0.55 + 0.45 * hash(id, variant, 406)).toFixed(3)})` : `rgba(0, 6, 18, ${(0.5 + 0.5 * hash(id, variant, 407)).toFixed(3)})`
          for (const dx of [0, -W]) {
            if (x + dx + l < 0 || x + dx > W) continue
            g.beginPath()
            g.ellipse(x + dx + l / 2, yy, l / 2, thick / 2, 0, 0, Math.PI * 2)
            g.fill()
          }
        }
        y += thick * 3.2
      }
    }
    return c
  })
}

/**
 * The surface over the sea, in the world's transform: clipped to the water, drawn square to the sea under the middle
 * of the frame. `half` is how far the frame reaches either way, cells; `light`, how much of it to draw.
 */
export interface Glitter {
  /** Where it is across the frame, cells from the middle; how bright; how wide its path is at the horizon, cells. */
  x: number
  light: number
  width: number
  /** Its colour, when not white: a low sun's or moon's. */
  colour?: string
}

/** A lit lamp over the water: where it is across the frame, cells from the middle, and how bright it burns. */
export interface Lamp {
  x: number
  light: number
}

export function drawRipples(ctx: Ctx2D, k: number, t: number, half: number, day: Sky, water: Path2D, light: number, glitter: Glitter[] = [], lamps: Lamp[] = []): void {
  if (light < 0.01) return
  tiles ??= makeTiles()
  const u = along(t) + 0.55
  const time = wrap(t)
  // Livelier as the music is fuller, and in the shower's wind; fainter at night, when the sky has less light to give them.
  const ruffle = 0.7 + 0.55 * loudness(t) + 0.45 * rainAt(t)
  const lit = light * ruffle * (0.2 - 0.1 * day.night)
  const [x, y] = polar(u, 0)
  ctx.save()
  ctx.clip(water)
  ctx.translate(x * k, y * k)
  ctx.rotate(u / RADIUS)
  ctx.scale(k / P, k / P)
  const reach = (half + TILE) * P
  const W = TILE * P
  const bands: { off: number; sy: number; sh: number; far: number; alphas: number[] }[] = []
  for (const band of BAND) {
    const off = ((band.pace * along(t) + (band.wind * TILE * time) / PERIOD) % TILE) * P
    const sy = band.y0 * P
    const sh = Math.max(1, (band.y1 - band.y0) * P)
    // At the horizon the wavelets are too small to tell: they merge into the sky's sheen. And they fade out before the
    // last band, so a tall frame (a phone held upright), whose sea goes deeper, has no edge to them.
    const far = smooth(band.y1, 0.02, 0.3) * (1 - smooth(band.y0, DEEP * 0.55, DEEP * 0.95))
    // The two sets cross-fading, slowly, each band in its own time.
    const s = osc(t, 0.21, band.phase)
    const alphas = [0.55 + 0.45 * s, 0.55 - 0.45 * s]
    for (let v = 0; v < 2; v++) {
      ctx.globalAlpha = lit * far * alphas[v]
      for (let x0 = -off - Math.ceil(reach / W) * W; x0 < reach; x0 += W) ctx.drawImage(tiles[v], 0, sy, W, sh, x0, sy, W, sh)
    }
    bands.push({ off, sy, sh, far, alphas })
  }
  // Under the sun or the moon, the same wavelets lit: a glitter path, wider nearer. Drawn into a canvas of its own, its
  // column of the surface, faded off to either side, and added to the light of the frame.
  for (const g of glitter) {
    const widest = (g.width + 0.55 * DEEP) * P
    const left = g.x * P - widest
    const gw = Math.ceil(2 * widest)
    const gh = Math.ceil(DEEP * P)
    shine ??= document.createElement('canvas')
    if (shine.width !== gw || shine.height !== gh) {
      shine.width = gw
      shine.height = gh
    }
    const gc = shine.getContext('2d')!
    gc.setTransform(1, 0, 0, 1, 0, 0)
    gc.globalCompositeOperation = 'source-over'
    gc.clearRect(0, 0, gw, gh)
    gc.translate(-left, 0)
    for (const b of bands) {
      if (b.far < 0.05) continue
      for (let v = 0; v < 2; v++) {
        gc.globalAlpha = Math.min(1, b.far * b.alphas[v])
        span(gc, tiles[v], left, left + gw, b.off, b.sy, b.sh, W)
      }
    }
    // Faded to either side, the narrower the further off: rubbed out band by band ('destination-out' touches only the
    // band it is drawn over, where 'destination-in' would clear the rest of the canvas).
    gc.setTransform(1, 0, 0, 1, 0, 0)
    gc.globalAlpha = 1
    gc.globalCompositeOperation = 'destination-out'
    for (const b of bands) {
      const w = (g.width + 0.55 * (b.sy + b.sh / 2) / P) * P
      const fade = gc.createLinearGradient(widest - w, 0, widest + w, 0)
      fade.addColorStop(0, 'rgba(0, 0, 0, 1)')
      fade.addColorStop(0.25, 'rgba(0, 0, 0, 0.7)')
      fade.addColorStop(0.5, 'rgba(0, 0, 0, 0)')
      fade.addColorStop(0.75, 'rgba(0, 0, 0, 0.7)')
      fade.addColorStop(1, 'rgba(0, 0, 0, 1)')
      gc.fillStyle = fade
      gc.fillRect(0, b.sy, gw, b.sh + 0.5)
    }
    if (g.colour) {
      gc.globalCompositeOperation = 'source-atop'
      gc.fillStyle = g.colour
      gc.fillRect(0, 0, gw, gh)
    }
    ctx.globalCompositeOperation = 'lighter'
    ctx.globalAlpha = Math.min(1, light * g.light * 1.25)
    ctx.drawImage(shine, left, 0)
    ctx.globalCompositeOperation = 'source-over'
  }
  // Under each lit lamp, the wavelets catch its flame: a warm column of glitter going down from its foot, as the sun's
  // does by day. All the lamps in one canvas: the surface drawn whole into it, kept only under the lamps (a mask of their
  // columns, added together), and tinted the flame's colour. Fading as the camera draws back: from further off a lamp's
  // glitter is a speck.
  const glow = lamps.length ? 1 - smooth(half, 14, 17) : 0
  if (glow > 0.01) {
    // Only as wide as the lamps in the frame reach.
    const xs = lamps.map((l) => l.x)
    const lo = Math.max(-(half + 0.6), Math.min(...xs) - 0.6) * P
    const hi = Math.min(half + 0.6, Math.max(...xs) + 0.6) * P
    const gw = Math.max(1, Math.ceil(hi - lo))
    const gh = Math.ceil(DEEP * P)
    warm ??= document.createElement('canvas')
    under ??= document.createElement('canvas')
    for (const c of [warm, under]) {
      if (c.width !== gw || c.height !== gh) {
        c.width = gw
        c.height = gh
      }
    }
    const mc = under.getContext('2d')!
    mc.setTransform(1, 0, 0, 1, 0, 0)
    mc.globalCompositeOperation = 'source-over'
    mc.clearRect(0, 0, gw, gh)
    mc.globalCompositeOperation = 'lighter'
    for (const lamp of lamps) {
      const lx = lamp.x * P - lo
      if (lx < -0.5 * P || lx > gw + 0.5 * P) continue
      // A narrow column, a little wider and fainter as it comes nearer.
      mc.save()
      mc.translate(lx, 0)
      mc.scale(0.32 * P, 2.3 * P)
      const g = mc.createRadialGradient(0, 0, 0, 0, 0, 1)
      // A burning lamp (about half its flare) lights its column fully.
      const a = Math.min(1, 1.8 * lamp.light)
      g.addColorStop(0, `rgba(0, 0, 0, ${a.toFixed(3)})`)
      g.addColorStop(0.4, `rgba(0, 0, 0, ${(0.6 * a).toFixed(3)})`)
      g.addColorStop(1, 'rgba(0, 0, 0, 0)')
      mc.fillStyle = g
      mc.fillRect(-1, 0, 2, 1)
      mc.restore()
    }
    const gc = warm.getContext('2d')!
    gc.setTransform(1, 0, 0, 1, 0, 0)
    gc.globalCompositeOperation = 'source-over'
    gc.globalAlpha = 1
    gc.clearRect(0, 0, gw, gh)
    gc.translate(-lo, 0)
    for (const b of bands) {
      if (b.far < 0.05) continue
      for (let v = 0; v < 2; v++) {
        gc.globalAlpha = Math.min(1, b.far * b.alphas[v])
        span(gc, tiles[v], lo, lo + gw, b.off, b.sy, b.sh, W)
      }
    }
    gc.setTransform(1, 0, 0, 1, 0, 0)
    gc.globalAlpha = 1
    gc.globalCompositeOperation = 'destination-in'
    gc.drawImage(under, 0, 0)
    gc.globalCompositeOperation = 'source-atop'
    gc.fillStyle = 'rgb(255, 200, 128)'
    gc.fillRect(0, 0, gw, gh)
    ctx.globalCompositeOperation = 'lighter'
    // Twice over, the second fainter: the wavelets are sparse, and a flame on dark water is bright.
    ctx.globalAlpha = Math.min(1, light * glow)
    ctx.drawImage(warm, lo, 0)
    ctx.globalAlpha = Math.min(1, 0.6 * light * glow)
    ctx.drawImage(warm, lo, 0)
    ctx.globalCompositeOperation = 'source-over'
  }
  // Slicks: long streaks of glassy water where the wind does not reach, the sky smooth in them.
  const glass = mixHex(day.sea, day.low, 0.55)
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(glass.slice(i, i + 2), 16))
  for (const slick of SLICKS) {
    const span2 = TILE * 2
    let d = (slick.x - slick.pace * along(t) - (span2 * time) / PERIOD) % span2
    if (d < -span2 / 2) d += span2
    if (d > span2 / 2) d -= span2
    const w = slick.w * (0.4 + slick.y)
    // Faded towards the edge of its repeat, where it comes round from the other side: in a wide frame, where the
    // surface is still faintly drawn, that is inside the picture.
    const edge = 1 - smooth(Math.abs(d), span2 * 0.3, span2 * 0.46)
    if (Math.abs(d) - w > half + 1 || edge < 0.01) continue
    const h = Math.max(0.012, slick.h * slick.y)
    const breathe = 0.75 + 0.25 * osc(t, 0.03, slick.seed)
    ctx.save()
    ctx.translate(d * P, slick.y * P)
    ctx.scale(w * P, h * P)
    const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
    const a = light * 0.55 * breathe * edge * smooth(slick.y, 0.03, 0.2)
    gr.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`)
    gr.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, ${(a * 0.6).toFixed(3)})`)
    gr.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`)
    ctx.globalAlpha = 1
    ctx.fillStyle = gr
    ctx.fillRect(-1, -1, 2, 2)
    ctx.restore()
  }
  ctx.restore()
}

/** Draw the part of a band of a tile between `lo` and `hi` (tile pixels across the frame), its copies wrapped. */
function span(ctx: Ctx2D, tile: HTMLCanvasElement, lo: number, hi: number, off: number, sy: number, sh: number, W: number): void {
  if (hi <= lo) return
  // Where `lo` falls in the tile: its copies start at -off + n W.
  let a = lo
  while (a < hi) {
    const inTile = (((a + off) % W) + W) % W
    const take = Math.min(hi - a, W - inTile)
    ctx.drawImage(tile, inTile, sy, take, sh, a, sy, take, sh)
    a += take
  }
}

/** The slicks: at depths below the horizon, long and thin, going by at their depth's pace, carried a little by the wind. */
export const SLICKS = Array.from({ length: 12 }, (_, i) => {
  const y = 0.06 + 1.6 * hash(i, 411) ** 1.3
  return {
    x: hash(i, 412) * TILE * 2,
    y,
    pace: (2 * Math.round(((1 + 0.45 * y) * SHARES) / 2)) / SHARES,
    w: 0.9 + 1.6 * hash(i, 413),
    h: 0.05 + 0.04 * hash(i, 414),
    seed: i,
  }
})

/** How much of the surface is drawn as the camera draws out: gone well before the far-off picture. */
export const ripplesAt = (cells: number): number => 1 - smooth(cells, 12, 24)
