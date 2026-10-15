import type { Pt } from '../../../../../parts'
import { motes, sway, type Frame } from '../depth'
import { ctxOf, rgba, type Pen } from '../pen'
import { climb, daylight, gold, rose, strength, sunUp } from './dawn'
import { CORRIDOR_WIN, FLOOR } from './geo'

/**
 * The morning's light, moving as the sun climbs: two faint shafts through the ward's tall window coming down across
 * the bed, a little dust in them; the corridor's window laying its panes on the checkerboard, the patches drawing in
 * toward the wall as the sun gets up, and a little of that light in the air between; a few motes in the nursery's
 * sunbeam to the boy. All of it is light lying on the room, laid over it plainly (never added up into glare), and none
 * of it hangs round a window as a glow: grey-blue at the cut, rose as the sky colours, and gold once the sun is over the
 * roofs (`dawn.ts`).
 */

/* ------------------------------------------------------------------ the ward's window */

/** Where the ward's shafts come in: two bands of the window's lower panes, at this height, and how long they reach. */
const WARD_BANDS: [number, number][] = [
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

/** The shafts through the ward's window, down over the bed, and a little dust turning in them. */
export function wardShafts(pen: Pen, t: number, f: Frame): void {
  if (f.x0 > 2.2 || f.x1 < -4.2 || f.y1 < -2.4) return
  const { k } = pen
  const ctx = ctxOf(pen.p)
  const dir = wardDir(t)
  // Thin cloud going over the sun now and then: the shafts dim and come back.
  const a = (0.05 * strength(t) * strength(t) + 0.01) * (0.82 + 0.18 * sway(t, 1, 7.5))
  const col = daylight(t)
  const ox = 0.5
  // Two fills, the bands and their cores, so each shaft's edge is soft.
  ctx.save()
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
    n: 45,
    seed: 951,
    box: [Math.max(-3.8, f.x0), -2.3, Math.min(2.0, f.x1), 1.25],
    size: [0.007, 0.016],
    color: '#FFF6E6',
    alpha: 0.35 + 0.2 * gold(t),
    drift: [-0.035, 0.012],
    wander: 0.14,
    twinkle: 0,
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
 * drawing in toward the wall as it climbs; a faint light in the air from the glass down to them; a little dust in it.
 */
export function corridorLight(pen: Pen, t: number, f: Frame): void {
  const W = CORRIDOR_WIN
  if (f.x1 < W.x0 - 1 || f.x0 > W.x1 + 4) return
  const { k } = pen
  const ctx = ctxOf(pen.p)
  const col = daylight(t)
  const a = 0.07 + 0.08 * rose(t) + 0.13 * sunUp(t)
  const { z0, z1, lean } = patchOf(t)
  const zm = (z0 + z1) / 2
  const mid = (W.x0 + W.x1) / 2
  const y0 = rowY(z0)
  const y1 = rowY(z1)
  ctx.save()
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
  g.addColorStop(0.4, rgba(pen, col, a * 0.18))
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
    n: 30,
    seed: 953,
    box: [W.x0 - 0.3, top, W.x1 + 1.6, Math.min(y1, 2.4)],
    size: [0.006, 0.014],
    color: '#FFF6E6',
    alpha: 0.32 + 0.2 * sunUp(t),
    drift: [0.02, 0.018],
    wander: 0.12,
    twinkle: 0,
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

/** A little dust in the sunbeam that crosses the nursery to the boy, once the sun is over the roofs; less in its window's light before. */
export function nurseryMotes(pen: Pen, t: number, beam: Pt[], on: number): void {
  const [a, b, c, d] = beam
  motes(pen, t, {
    n: 35,
    seed: 957,
    box: [Math.min(a[0], d[0]) - 0.1, a[1], Math.max(b[0], c[0]) + 0.1, c[1]],
    size: [0.005, 0.012],
    color: '#FFF4DC',
    alpha: 0.42,
    drift: [0.025, 0.015],
    wander: 0.1,
    twinkle: 0,
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
