import { rgba } from './canvas'
import { roofSnow } from './snow'

/**
 * What stands on the roofs across the street, and on their walls (`sky.ts` draws the city): water towers on legs with
 * their pointed caps, antennas, a stair head set back, fire escapes zigzagging down the nearer walls. Silhouettes in
 * the building's own colour, a thin edge of the sky's light along them (the dusk's, then the moon's), and the snow on
 * them once it has settled. All in the city's layer coordinates.
 */

type Ctx = CanvasRenderingContext2D

/** A water tower on the roof at `x` (its middle), the roof's top at `y`, `s` its scale (1 is a near one). */
export function waterTower(ctx: Ctx, t: number, x: number, y: number, s: number, color: string, edge: string, edgeA: number, far: boolean): void {
  const legH = 0.07 * s
  const bw = 0.11 * s
  const bh = 0.1 * s
  const top = y - legH - bh
  ctx.fillStyle = color
  // The legs, and a cross brace.
  for (const lx of [x - bw * 0.42, x - bw * 0.1, x + bw * 0.1, x + bw * 0.42]) ctx.fillRect(lx - 0.005 * s, y - legH, 0.01 * s, legH)
  ctx.fillRect(x - bw * 0.45, y - legH * 0.55, bw * 0.9, 0.008 * s)
  // The barrel, a little narrower at its foot.
  ctx.beginPath()
  ctx.moveTo(x - bw / 2, top)
  ctx.lineTo(x + bw / 2, top)
  ctx.lineTo(x + bw * 0.46, y - legH)
  ctx.lineTo(x - bw * 0.46, y - legH)
  ctx.closePath()
  ctx.fill()
  // Its hoops.
  ctx.fillStyle = rgba(edge, 0.12 * edgeA)
  for (const k of [0.3, 0.65]) ctx.fillRect(x - bw * 0.48, top + bh * k, bw * 0.96, 0.006 * s)
  // The pointed cap, and its finial.
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(x - bw * 0.56, top + 0.004)
  ctx.lineTo(x, top - 0.055 * s)
  ctx.lineTo(x + bw * 0.56, top + 0.004)
  ctx.closePath()
  ctx.fill()
  ctx.fillRect(x - 0.003 * s, top - 0.075 * s, 0.006 * s, 0.022 * s)
  // The sky's light down its far side.
  if (edgeA > 0.01) {
    ctx.strokeStyle = rgba(edge, 0.55 * edgeA)
    ctx.lineWidth = 0.006 * s
    ctx.beginPath()
    ctx.moveTo(x, top - 0.055 * s)
    ctx.lineTo(x + bw * 0.56, top + 0.004)
    ctx.moveTo(x + bw / 2, top + 0.006)
    ctx.lineTo(x + bw * 0.46, y - legH)
    ctx.stroke()
  }
  // Snow on its cap: a white crown, its point clear.
  snowCap(ctx, t, x, top, bw, s, far)
}

/** The settled snow on a pointed cap, as a little white collar round it. */
function snowCap(ctx: Ctx, t: number, x: number, top: number, bw: number, s: number, far: boolean): void {
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(x - bw * 0.58, top + 0.006)
  ctx.lineTo(x, top - 0.057 * s)
  ctx.lineTo(x + bw * 0.58, top + 0.006)
  ctx.lineTo(x + bw * 0.58, top - 0.1 * s)
  ctx.lineTo(x - bw * 0.58, top - 0.1 * s)
  ctx.closePath()
  ctx.clip()
  roofSnow(ctx, t, x - bw * 0.56, top + 0.004, bw * 1.12, far, 0.018 * s)
  ctx.restore()
}

/** An antenna: a mast and two short cross bars. */
export function antenna(ctx: Ctx, x: number, y: number, h: number, color: string): void {
  ctx.fillStyle = color
  ctx.fillRect(x - 0.004, y - h, 0.008, h)
  ctx.fillRect(x - 0.03, y - h * 0.75, 0.06, 0.006)
  ctx.fillRect(x - 0.02, y - h * 0.5, 0.04, 0.006)
}

/**
 * A fire escape down a wall, from `y0` to `y1`, `x` its left and `w` wide: a landing at each floor and a stair slanting
 * between them, alternating, in thin dark iron, its rails catching a little of the sky; snow on each landing once it
 * lies.
 */
export function fireEscape(ctx: Ctx, t: number, x: number, w: number, y0: number, y1: number, floor: number, iron: string, edge: string, edgeA: number): void {
  ctx.strokeStyle = iron
  ctx.lineWidth = 0.009
  ctx.beginPath()
  let k = 0
  for (let y = y0 + floor * 0.85; y < y1 - 0.02; y += floor, k++) {
    // The landing, and its railing.
    ctx.moveTo(x, y)
    ctx.lineTo(x + w, y)
    ctx.moveTo(x, y - 0.045)
    ctx.lineTo(x + w, y - 0.045)
    for (let r = 0; r <= 4; r++) {
      ctx.moveTo(x + (w * r) / 4, y)
      ctx.lineTo(x + (w * r) / 4, y - 0.045)
    }
    // The stair down to the next, one way and then the other.
    if (y + floor < y1 - 0.02) {
      const a = k % 2 ? x + w * 0.15 : x + w * 0.85
      const b = k % 2 ? x + w * 0.85 : x + w * 0.15
      ctx.moveTo(a, y)
      ctx.lineTo(b, y + floor)
    }
  }
  ctx.stroke()
  if (edgeA > 0.01) {
    ctx.strokeStyle = rgba(edge, 0.3 * edgeA)
    ctx.lineWidth = 0.004
    ctx.beginPath()
    for (let y = y0 + floor * 0.85; y < y1 - 0.02; y += floor) {
      ctx.moveTo(x, y - 0.047)
      ctx.lineTo(x + w, y - 0.047)
    }
    ctx.stroke()
  }
  for (let y = y0 + floor * 0.85; y < y1 - 0.02; y += floor) roofSnow(ctx, t, x, y, w, false, 0.014)
}
