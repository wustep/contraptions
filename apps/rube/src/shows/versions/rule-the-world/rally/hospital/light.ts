import type { Pt } from '../../../../../parts'
import { hash, smooth } from '../kit'
import { bloom, motes, sway, type Frame } from '../depth'
import { ctxOf, rgba, type Pen } from '../pen'
import { climb, daylight, gold, rose, strength, sunUp } from './dawn'
import { SON } from '../music'
import { CORRIDOR_WIN, FLOOR, GLASS, SUN_CLEAR } from './geo'

/**
 * The morning's light, moving as the sun climbs: low shafts through the ward's tall window crossing the room over the
 * bed, dust turning in them; the corridor's window laying its panes on the checkerboard, the patches drawing in toward
 * the wall as the sun gets up, and the light standing in the air between; motes in the nursery's sunbeam to the boy;
 * and the nursery's lit window blooming warm on the hall round it. Every one is grey-blue at the cut, rose as the sky
 * colours, and gold once the sun is over the roofs (`dawn.ts`).
 */

const lighter = (pen: Pen): void => {
  ctxOf(pen.p).globalCompositeOperation = 'lighter'
}

/* ------------------------------------------------------------------ the ward's window */

/** Where the ward's shafts come in: three bands of the window's lower panes, at this height, and how long they reach. */
const WARD_BANDS: [number, number][] = [
  [-0.6, -0.2],
  [0.12, 0.6],
  [0.95, 1.55],
]
const WARD_Y = -1.5
const WARD_LEN = 4.6

/** The way the ward's light goes: down and away to the door, steeper as the sun climbs. */
function wardDir(t: number): Pt {
  const e = 0.48 + 0.34 * climb(t)
  return [-Math.cos(e), Math.sin(e)]
}

/** How lit a point is by the ward's shafts, 0 to 1: inside a band, toward the middle of its length. */
function wardLit(t: number, dir: Pt, x: number, y: number): number {
  const v = (y - WARD_Y) / dir[1]
  if (v <= 0 || v >= WARD_LEN) return 0
  const u = x - v * dir[0]
  let lit = 0
  for (const [a, b] of WARD_BANDS) {
    const e = Math.min(u - a, b - u)
    if (e > 0) lit = Math.max(lit, Math.min(1, e / 0.12))
  }
  return lit * Math.min(1, v / 0.7) * (1 - v / WARD_LEN) * (0.6 + 0.4 * strength(t))
}

/** The shafts through the ward's window, over the bed, and the dust turning in them. */
export function wardShafts(pen: Pen, t: number, f: Frame): void {
  if (f.x0 > 2.2 || f.x1 < -4.2 || f.y1 < -2.4) return
  const { k } = pen
  const ctx = ctxOf(pen.p)
  const dir = wardDir(t)
  // Thin cloud going over the sun now and then: the shafts dim and come back.
  const a = (0.1 * strength(t) * strength(t) + 0.02) * (0.82 + 0.18 * sway(t, 1, 7.5))
  const col = daylight(t)
  const ox = 0.5
  // Two fills, the bands and their cores, so each shaft's edge is soft.
  ctx.save()
  lighter(pen)
  for (const [inset, share] of [[0, 0.45], [0.09, 0.55]] as [number, number][]) {
    const g = ctx.createLinearGradient(ox * k, WARD_Y * k, (ox + dir[0] * WARD_LEN) * k, (WARD_Y + dir[1] * WARD_LEN) * k)
    g.addColorStop(0, rgba(pen, col, 0))
    g.addColorStop(0.22, rgba(pen, col, a * share))
    g.addColorStop(0.6, rgba(pen, col, a * share * 0.45))
    g.addColorStop(1, rgba(pen, col, 0))
    ctx.fillStyle = g
    ctx.beginPath()
    for (const [b0, b1] of WARD_BANDS) {
      const x0 = b0 + inset
      const x1 = b1 - inset
      ctx.moveTo(x0 * k, WARD_Y * k)
      ctx.lineTo(x1 * k, WARD_Y * k)
      ctx.lineTo((x1 + dir[0] * WARD_LEN) * k, (WARD_Y + dir[1] * WARD_LEN) * k)
      ctx.lineTo((x0 + dir[0] * WARD_LEN) * k, (WARD_Y + dir[1] * WARD_LEN) * k)
      ctx.closePath()
    }
    ctx.fill()
  }
  ctx.restore()
  motes(pen, t, {
    n: 120,
    seed: 951,
    box: [Math.max(-3.8, f.x0), -2.3, Math.min(2.0, f.x1), 1.25],
    size: [0.007, 0.019],
    color: '#FFF6E6',
    alpha: 0.55 + 0.3 * gold(t),
    drift: [-0.035, 0.012],
    wander: 0.14,
    twinkle: 0.6,
    light: (x, y) => wardLit(t, dir, x, y),
  })
}

/* ------------------------------------------------------------------ the corridor's window */

/** The checkerboard's perspective (as `drawFloor` lays it): a wall line `xb` at depth `z` rows out from the wall. */
const HY = -1.4
const HH = FLOOR - HY
const rowY = (z: number): number => HY + HH / (1 - 0.1 * z)
const floorX = (f: Frame, xb: number, y: number): number => f.cx + ((xb - f.cx) * (y - HY)) / HH

/** Where the corridor window's light lies on the floor at `t`: from row `z0` out to row `z1`, and how far it leans per row. */
function patchOf(t: number): { z0: number; z1: number; lean: number } {
  const c = climb(t)
  const z0 = 0.18 + 0.75 * (1 - c)
  return { z0, z1: z0 + 2.3, lean: 0.62 - 0.3 * c }
}

/**
 * The corridor window's light: its four panes laid on the checkerboard in front of it, leaning off with the sun and
 * drawing in toward the wall as it climbs; the light standing in the air from the glass down to them; dust in it.
 */
export function corridorLight(pen: Pen, t: number, f: Frame): void {
  const W = CORRIDOR_WIN
  if (f.x1 < W.x0 - 1 || f.x0 > W.x1 + 4) return
  const { k } = pen
  const ctx = ctxOf(pen.p)
  const col = daylight(t)
  const a = 0.08 + 0.1 * rose(t) + 0.16 * sunUp(t)
  const { z0, z1, lean } = patchOf(t)
  const zm = (z0 + z1) / 2
  const mid = (W.x0 + W.x1) / 2
  const y0 = rowY(z0)
  const y1 = rowY(z1)
  ctx.save()
  lighter(pen)
  // The panes on the floor, brightest by the wall.
  if (f.y1 > y0) {
    const g = ctx.createLinearGradient(0, y0 * k, 0, y1 * k)
    g.addColorStop(0, rgba(pen, col, a))
    g.addColorStop(1, rgba(pen, col, a * 0.35))
    ctx.fillStyle = g
    ctx.beginPath()
    for (const [xa, xb] of [[W.x0 + 0.05, mid - 0.035], [mid + 0.035, W.x1 - 0.05]]) {
      for (const [za, zb] of [[z0, zm - 0.07], [zm + 0.07, z1]]) {
        const ya = rowY(za)
        const yb = rowY(zb)
        ctx.moveTo(floorX(f, xa + lean * za, ya) * k, ya * k)
        ctx.lineTo(floorX(f, xb + lean * za, ya) * k, ya * k)
        ctx.lineTo(floorX(f, xb + lean * zb, yb) * k, yb * k)
        ctx.lineTo(floorX(f, xa + lean * zb, yb) * k, yb * k)
        ctx.closePath()
      }
    }
    ctx.fill()
  }
  // The light in the air, from the glass down and out to the floor.
  const top = W.y1 - 1.1
  const g = ctx.createLinearGradient(0, top * k, 0, y1 * k)
  g.addColorStop(0, rgba(pen, col, 0))
  g.addColorStop(0.4, rgba(pen, col, a * 0.42))
  g.addColorStop(1, rgba(pen, col, 0))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(W.x0 * k, top * k)
  ctx.lineTo(W.x1 * k, top * k)
  ctx.lineTo(floorX(f, W.x1 + lean * z1, y1) * k, y1 * k)
  ctx.lineTo(floorX(f, W.x0 + lean * z1, y1) * k, y1 * k)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
  // Dust turning in it.
  const xl = (y: number): [number, number] => {
    const u = Math.max(0, Math.min(1, (y - top) / (y1 - top)))
    return [W.x0 + (floorX(f, W.x0 + lean * z1, y1) - W.x0) * u, W.x1 + (floorX(f, W.x1 + lean * z1, y1) - W.x1) * u]
  }
  motes(pen, t, {
    n: 80,
    seed: 953,
    box: [W.x0 - 0.3, top, W.x1 + 1.6, Math.min(y1, 2.4)],
    size: [0.006, 0.016],
    color: '#FFF6E6',
    alpha: 0.45 + 0.35 * sunUp(t),
    drift: [0.02, 0.018],
    wander: 0.12,
    twinkle: 0.6,
    light: (x, y) => {
      const [l, r] = xl(y)
      const e = Math.min(x - l, r - x)
      if (e <= 0) return 0
      const u = (y - top) / (y1 - top)
      return Math.min(1, e / 0.15) * Math.min(1, u * 3) * (1 - 0.6 * u)
    },
  })
}

/** How much of the corridor window's light is on the bench (its seat is in the shaft): 0 to 1. */
export const benchLit = (t: number): number => 0.25 + 0.25 * rose(t) + 0.5 * sunUp(t)

/* ------------------------------------------------------------------ the nursery */

/** Dust in the sunbeam that crosses the nursery to the boy, once the sun is over the roofs; a little in its window's light before. */
export function nurseryMotes(pen: Pen, t: number, beam: Pt[], on: number): void {
  const [a, b, c, d] = beam
  motes(pen, t, {
    n: 90,
    seed: 957,
    box: [Math.min(a[0], d[0]) - 0.1, a[1], Math.max(b[0], c[0]) + 0.1, c[1]],
    size: [0.005, 0.014],
    color: '#FFF4DC',
    alpha: 0.6,
    drift: [0.025, 0.015],
    wander: 0.1,
    twinkle: 0.6,
    light: (x, y) => {
      const u = (y - a[1]) / (c[1] - a[1])
      const l = a[0] + (d[0] - a[0]) * u
      const r = b[0] + (c[0] - b[0]) * u
      const e = Math.min(x - l, r - x)
      if (e <= 0) return 0
      return (0.15 + 0.85 * on) * Math.min(1, e / 0.18) * Math.min(1, u * 4)
    },
  })
}

/** The bloom round the nursery's own window once the sun stands in it: halation on its bars and the wall about it. */
export function sunBloom(pen: Pen, t: number, sun: Pt): void {
  const up = sunUp(t)
  if (up < 0.01) return
  bloom(pen, sun, 1.3, '#FFD48A', 0.2 * up + 0.12 * Math.exp(-Math.max(0, t - SUN_CLEAR) / 0.8))
}

/** The nursery's lit window, seen from the hall: a warm bloom over the glass and the wall round it, from the moment the blind is up. */
export function glassBloom(pen: Pen, t: number, f: Frame): void {
  const on = smooth(t, SON - 0.1, SON + 1.2)
  if (on < 0.01) return
  const c: Pt = [(GLASS.x0 + GLASS.x1) / 2 + 0.6, (GLASS.y0 + GLASS.y1) / 2 + 0.3]
  if (c[0] + 4 < f.x0 || c[0] - 4 > f.x1) return
  bloom(pen, c, 3.6, '#FFD9A0', on * (0.05 + 0.05 * gold(t)))
}

/* ------------------------------------------------------------------ the dapple */

/** A soft round of light, painted once per colour and stamped: the dapple is many of them. */
const sprites = new Map<string, HTMLCanvasElement>()
function sprite(col: string): HTMLCanvasElement | null {
  const have = sprites.get(col)
  if (have) return have
  if (typeof document === 'undefined') return null
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')
  if (!g) return null
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  r.addColorStop(0, col)
  r.addColorStop(0.45, col.replace('rgb(', 'rgba(').replace(')', ',0.55)'))
  r.addColorStop(1, col.replace('rgb(', 'rgba(').replace(')', ',0)'))
  g.fillStyle = r
  g.fillRect(0, 0, 64, 64)
  if (sprites.size > 24) sprites.clear()
  sprites.set(col, c)
  return c
}

/** The walls the dapple falls on: the ward's round its window, and the corridor's either side of the nursery glass. */
const DAPPLE_WALLS: [number, number, number, number][] = [
  [-3.2, -5.3, 2.4, 0.05],
  [-6.9, -5.3, -3.6, 0.05],
  [-11.9, -5.3, -6.9, -2.5],
  [-16.5, -5.3, -11.9, 0.05],
]

/**
 * The morning through leaves: the light from the windows lies on the walls in soft rounds that slide and breathe as
 * the leaves outside move in the air, and wink out and in as they cover the sun and let it through. Faint in the grey,
 * fuller in the rose, and strongest once the sun is up. It is the ward's slow motion, everywhere at once and never
 * busy: none of it on the nursery's glass, where father and son are.
 */
export function dapple(pen: Pen, t: number, f: Frame): void {
  const { k } = pen
  const ctx = ctxOf(pen.p)
  const q = (v: number) => Math.round(v / 8) * 8
  const [r, g, b] = rgbOf(pen, daylight(t))
  const sun = sprite(`rgb(${q(r)},${q(g)},${q(b)})`)
  // The leaves' shade: the wall's own cool grey-green, deeper than it.
  const [sr, sg, sb] = rgbOf(pen, '#8E9A96')
  const leaf = sprite(`rgb(${q(sr)},${q(sg)},${q(sb)})`)
  if (!sun || !leaf) return
  // Seen from close to; as the camera comes away over the credits it would be spots on a wall, so it goes.
  const near = 1 - smooth(f.y1 - f.y0, 7, 10)
  const a0 = (0.16 + 0.16 * rose(t) + 0.22 * sunUp(t)) * near
  if (a0 <= 0.005) return
  ctx.save()
  DAPPLE_WALLS.forEach(([x0, y0, x1, y1], w) => {
    if (x1 < f.x0 || x0 > f.x1 || y1 < f.y0 || y0 > f.y1) return
    const n = Math.round((x1 - x0) * (y1 - y0) * 3)
    for (let i = 0; i < n; i++) {
      const h1 = hash(i, w, 401)
      const h2 = hash(i, w, 402)
      const h3 = hash(i, w, 403)
      // The leaves move in the air: each round slides a little on its own, and the whole tree sways together.
      const x = x0 + (x1 - x0) * h1 + 0.16 * sway(t, i + w * 50, 2.2 + 2 * h3) + 0.1 * sway(t, w, 5.5)
      const y = y0 + (y1 - y0) * h2 + 0.08 * sway(t, i + w * 50 + 7, 2.9 + 1.6 * h1)
      const wink = 0.5 + 0.5 * Math.sin(t * (0.9 + 1.4 * h3) + i * 2.3)
      const a = a0 * (0.25 + 0.75 * wink * wink) * (0.6 + 0.4 * h2)
      if (a < 0.01) continue
      const shade = h1 > 0.45
      const rr = (shade ? 0.3 + 0.45 * h3 : 0.16 + 0.3 * h3) * (0.85 + 0.15 * wink)
      ctx.globalCompositeOperation = shade ? 'source-over' : 'lighter'
      ctx.globalAlpha = shade ? Math.min(1, a * 1.5) : Math.min(1, a * 2.2)
      ctx.drawImage(shade ? leaf : sun, (x - rr) * k, (y - rr * 0.8) * k, 2 * rr * k, 1.6 * rr * k)
    }
  })
  ctx.restore()
}

type Rgb = [number, number, number]
function rgbOf(pen: Pen, hex: string): Rgb {
  const h = pen.tone(hex).replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}
