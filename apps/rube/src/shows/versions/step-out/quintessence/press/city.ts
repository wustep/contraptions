import type { Pt } from '../../../../../parts'
import { hash } from '../kit'
import { layer, rgbaOf, type View } from '../depth'

/**
 * Manhattan at dawn, through the windows of the Life building (the PRESS builder's): seen from Ted's office high on the
 * mezzanine, and through the gallery of tall windows on the press hall's far wall. A sky going from steel blue to a
 * low gold, a band of cloud lit underneath, towers on three planes (the far ones pale in the haze, the near ones dark
 * with lit windows, a water tank on a roof here and there), and the postal helicopter's cousin crossing the morning.
 *
 * Drawn only inside a clip the caller sets (a window's panes), so it costs only what is seen of it.
 */

type C2 = CanvasRenderingContext2D

/** Where the city's planes are composed: the office's framing. */
const ANCHOR: Pt = [0, -1.2]
const REF = 3.5
/** The city's horizon, in its planes' cells: low in the office windows, under the hall's high ones. */
const HORIZON = 0.35

const SKY: [number, string][] = [
  [-4.2, '#1F3542'],
  [-2.6, '#3F6070'],
  [-1.2, '#86A3AC'],
  [-0.2, '#D7B98F'],
  [HORIZON, '#EFC58C'],
]

/** One plane of towers: their silhouettes, and the windows lit in them. */
interface Towers {
  z: number
  seed: number
  /** Width and height (above the horizon) of the narrowest and lowest, and their spread. */
  w: Pt
  h: Pt
  body: string
  lit: string
  /** Share of window cells lit. */
  share: number
  /** Window grid pitch, cells. */
  pitch: number
}

const PLANES: Towers[] = [
  { z: 0.05, seed: 3, w: [0.22, 0.4], h: [0.5, 1.9], body: '#93A9B2', lit: '#C9D3D2', share: 0, pitch: 0 },
  { z: 0.09, seed: 7, w: [0.3, 0.55], h: [0.7, 2.4], body: '#5F7784', lit: '#E8C186', share: 0.18, pitch: 0.075 },
  { z: 0.14, seed: 11, w: [0.42, 0.75], h: [1.0, 3.3], body: '#25333B', lit: '#F2B866', share: 0.3, pitch: 0.1 },
]

/** The tower at index i of a plane: its left edge, width, top (y), and what is on its roof. */
function tower(pl: Towers, i: number): { x: number; w: number; top: number; crown: number } {
  const step = pl.w[0] + pl.w[1] * 0.5
  const x = i * step + (hash(i, 1, pl.seed) - 0.5) * step * 0.5
  const w = pl.w[0] + pl.w[1] * hash(i, 2, pl.seed)
  // A few soar; most are mid-rise.
  const tall = hash(i, 3, pl.seed)
  const h = pl.h[0] + (pl.h[1] - pl.h[0]) * (tall > 0.85 ? 0.75 + 0.25 * hash(i, 4, pl.seed) : tall * 0.7)
  return { x, w, top: HORIZON - h, crown: hash(i, 5, pl.seed) }
}

/**
 * The city through the hall's high windows, without a clip: each pane (world cells, a rectangle under a round head)
 * filled with the dawn sky, and the two farther skylines cut to each pane by hand. Through old glass, high up, that is
 * all there is to see: the sky and the tops of the towers.
 */
export function cityThrough(ctx: C2, v: View, panes: { x: number; y0: number; y1: number; w: number }[]): void {
  const k = v.k
  if (!panes.length) return
  const glass = new Path2D()
  let bottom = -Infinity
  for (const w of panes) {
    const r = w.w / 2
    glass.moveTo(w.x * k, w.y1 * k)
    glass.lineTo(w.x * k, (w.y0 + r) * k)
    glass.arc((w.x + r) * k, (w.y0 + r) * k, r * k, Math.PI, 0)
    glass.lineTo((w.x + w.w) * k, w.y1 * k)
    glass.closePath()
    bottom = Math.max(bottom, w.y1)
  }
  // The sky, by where the city's horizon is at this frame.
  const at = (z: number, y: number) => {
    const s = Math.pow(v.h / REF, 1 - z)
    const oy = ANCHOR[1] + z * (v.cy - ANCHOR[1])
    return v.cy + (y - oy) * s
  }
  const g = ctx.createLinearGradient(0, at(0.02, SKY[0][0]) * k, 0, at(0.02, HORIZON) * k)
  const span = SKY[SKY.length - 1][0] - SKY[0][0]
  for (const [y, c] of SKY) g.addColorStop((y - SKY[0][0]) / span, c)
  ctx.fillStyle = g
  ctx.fill(glass)
  // The towers of the two farther planes, cut to each pane.
  for (const pl of PLANES.slice(0, 2)) {
    const s = Math.pow(v.h / REF, 1 - pl.z)
    const ox = ANCHOR[0] + pl.z * (v.cx - ANCHOR[0])
    const oy = ANCHOR[1] + pl.z * (v.cy - ANCHOR[1])
    const wx = (x: number) => v.cx + (x - ox) * s
    const wy = (y: number) => v.cy + (y - oy) * s
    const step = pl.w[0] + pl.w[1] * 0.5
    const px0 = ox + (v.x0 - v.cx) / s
    const px1 = ox + (v.x1 - v.cx) / s
    const body = new Path2D()
    for (let i = Math.floor((px0 - 1.5) / step); i <= Math.ceil((px1 + 0.5) / step); i++) {
      const tw = tower(pl, i)
      const a = wx(tw.x)
      const b = wx(tw.x + tw.w)
      const y = wy(tw.top)
      if (y > bottom) continue
      for (const w of panes) {
        const l = Math.max(a, w.x)
        const r = Math.min(b, w.x + w.w)
        if (r <= l) continue
        const yt = Math.max(y, w.y0 + w.w / 2)
        if (yt >= w.y1) continue
        body.rect(l * k, yt * k, (r - l) * k, (w.y1 - yt) * k)
      }
    }
    ctx.fillStyle = pl.body
    ctx.fill(body)
  }
}

/** The city at `t`, whole, as Ted's windows show it: drawn under the caller's clip. */
export function drawCity(ctx: C2, v: View, t: number): void {
  const k = v.k
  // The sky, a plane all but on the lens.
  layer(ctx, v, 0.02, ANCHOR, REF, (s) => {
    ctx.save()
    ctx.scale(k, k)
    const g = ctx.createLinearGradient(0, SKY[0][0], 0, SKY[SKY.length - 1][0])
    const span = SKY[SKY.length - 1][0] - SKY[0][0]
    for (const [y, c] of SKY) g.addColorStop((y - SKY[0][0]) / span, c)
    ctx.fillStyle = g
    ctx.fillRect(s.x0, s.y0, s.w, s.h)
    ctx.restore()
  })
  // A band of cloud, lit gold from underneath, going over slowly.
  layer(ctx, v, 0.035, ANCHOR, REF, (s) => {
    ctx.save()
    ctx.scale(k, k)
    const lit = new Path2D()
    const dim = new Path2D()
    const tile = 3.4
    const i0 = Math.floor((s.x0 - 2 - t * 0.09) / tile)
    const i1 = Math.ceil((s.x1 + 2 - t * 0.09) / tile)
    for (let i = i0; i <= i1; i++) {
      for (let j = 0; j < 6; j++) {
        const x = i * tile + hash(i, j, 21) * tile + t * 0.09 * (1 + 0.3 * j)
        const y = -3.3 + j * 0.42 + hash(i, j, 22) * 0.3
        const w = 0.5 + 1.5 * hash(i, j, 23)
        const h = 0.04 + 0.06 * hash(i, j, 24)
        dim.roundRect(x, y, w, h, h / 2)
        lit.roundRect(x + w * 0.12, y + h * 0.55, w * 0.76, h * 0.5, h / 4)
      }
    }
    ctx.fillStyle = 'rgba(46, 70, 84, 0.55)'
    ctx.fill(dim)
    ctx.fillStyle = 'rgba(244, 204, 150, 0.5)'
    ctx.fill(lit)
    ctx.restore()
  })
  // The towers, far to near.
  for (const pl of PLANES) {
    layer(ctx, v, pl.z, ANCHOR, REF, (s) => {
      ctx.save()
      ctx.scale(k, k)
      const body = new Path2D()
      const lit = new Path2D()
      const cool = new Path2D()
      const step = pl.w[0] + pl.w[1] * 0.5
      const i0 = Math.floor((s.x0 - 1.5) / step)
      const i1 = Math.ceil((s.x1 + 0.5) / step)
      const bottom = s.y1 + 0.5
      for (let i = i0; i <= i1; i++) {
        const tw = tower(pl, i)
        if (tw.x > s.x1 || tw.x + tw.w < s.x0) continue
        body.rect(tw.x, tw.top, tw.w, bottom - tw.top)
        // A setback near the top, or a spire, or a water tank on its legs.
        if (tw.crown > 0.7) {
          body.rect(tw.x + tw.w * 0.2, tw.top - 0.18, tw.w * 0.6, 0.19)
          body.rect(tw.x + tw.w * 0.38, tw.top - 0.36, tw.w * 0.24, 0.19)
          body.moveTo(tw.x + tw.w * 0.47, tw.top - 0.36)
          body.lineTo(tw.x + tw.w * 0.5, tw.top - 0.7)
          body.lineTo(tw.x + tw.w * 0.53, tw.top - 0.36)
          body.closePath()
        } else if (tw.crown > 0.4) {
          const cx = tw.x + tw.w * (0.3 + 0.3 * hash(i, 6, pl.seed))
          body.rect(cx - 0.05, tw.top - 0.14, 0.1, 0.1)
          body.moveTo(cx - 0.065, tw.top - 0.14)
          body.lineTo(cx, tw.top - 0.19)
          body.lineTo(cx + 0.065, tw.top - 0.14)
          body.closePath()
          body.rect(cx - 0.04, tw.top - 0.04, 0.012, 0.05)
          body.rect(cx + 0.028, tw.top - 0.04, 0.012, 0.05)
        }
        if (!pl.share) continue
        // Its windows: a grid, a share of them lit, each changing now and then.
        const p = pl.pitch
        const cols = Math.max(1, Math.floor((tw.w - p * 0.6) / p))
        const x0 = tw.x + (tw.w - cols * p) / 2 + p * 0.22
        const yTop = Math.max(tw.top + p * 0.8, s.y0 - p)
        const rows = Math.ceil((Math.min(bottom, s.y1 + p) - yTop) / (p * 1.3))
        const r0 = Math.floor((yTop - tw.top) / (p * 1.3))
        for (let r = r0; r < r0 + rows; r++) {
          const y = tw.top + p * 0.8 + r * p * 1.3
          for (let cI = 0; cI < cols; cI++) {
            const h = hash(i * 131 + cI, r, pl.seed)
            if (h > pl.share) continue
            // Now and then a window goes on or off.
            const epoch = Math.floor(t / 2.7 + hash(cI, r, i) * 8)
            if (hash(i * 17 + cI, r * 13 + epoch, pl.seed + 1) < 0.1) continue
            ;(h < pl.share * 0.25 ? cool : lit).rect(x0 + cI * p, y, p * 0.5, p * 0.62)
          }
        }
      }
      ctx.fillStyle = pl.body
      ctx.fill(body)
      ctx.fillStyle = pl.lit
      ctx.fill(lit)
      ctx.fillStyle = '#CFE0E4'
      ctx.fill(cool)
      ctx.restore()
    })
  }
  // Pigeons wheeling over the roofs: a loose flock going round, each bird's wings beating.
  layer(ctx, v, 0.08, ANCHOR, REF, (s) => {
    ctx.save()
    ctx.scale(k, k)
    const birds = new Path2D()
    const cx = -1.6 + 1.2 * Math.sin(t * 0.21)
    const cy = -2.0 + 0.35 * Math.sin(t * 0.33)
    for (let i = 0; i < 14; i++) {
      const a = t * (0.5 + 0.2 * hash(i, 1, 33)) + hash(i, 2, 33) * 6.283
      const r = 0.25 + 0.5 * hash(i, 3, 33)
      const x = cx + Math.cos(a) * r * 1.6
      const y = cy + Math.sin(a) * r * 0.45
      if (x < s.x0 - 0.2 || x > s.x1 + 0.2) continue
      const flap = Math.sin(t * 11 + i * 1.7) * 0.025
      const w = 0.035
      birds.moveTo(x - w, y - flap)
      birds.lineTo(x, y + 0.008)
      birds.lineTo(x + w, y - flap)
      birds.lineTo(x, y + 0.02)
      birds.closePath()
    }
    ctx.fillStyle = '#26343C'
    ctx.fill(birds)
    ctx.restore()
  })
  // A helicopter crossing the morning above the towers, its white light winking.
  layer(ctx, v, 0.11, ANCHOR, REF, (s) => {
    const x = 3.2 - 0.62 * (t - 190.8)
    const y = -1.75 + 0.06 * Math.sin(t * 0.9)
    if (x < s.x0 - 0.5 || x > s.x1 + 0.5) return
    ctx.save()
    ctx.scale(k, k)
    ctx.fillStyle = '#1B262D'
    ctx.beginPath()
    ctx.ellipse(x, y, 0.075, 0.042, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillRect(x + 0.05, y - 0.012, 0.15, 0.022)
    ctx.fillRect(x + 0.18, y - 0.04, 0.02, 0.05)
    // The rotor, a blur that comes and goes.
    const rr = 0.13 + 0.03 * Math.sin(t * 40)
    ctx.fillRect(x - rr, y - 0.06, 2 * rr, 0.008)
    ctx.fillRect(x - 0.006, y - 0.06, 0.012, 0.03)
    const blink = (t * 1.1) % 1 < 0.12
    if (blink) {
      ctx.fillStyle = rgbaOf('#FFFFFF', 0.95)
      ctx.beginPath()
      ctx.arc(x, y + 0.045, 0.018, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = rgbaOf('#FFFFFF', 0.2)
      ctx.beginPath()
      ctx.arc(x, y + 0.045, 0.07, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  })
}
