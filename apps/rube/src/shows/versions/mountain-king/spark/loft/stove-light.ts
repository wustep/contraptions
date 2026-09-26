import type p5 from 'p5'
import { mixHex } from '../../../../../parts'
import { sparkIn } from '../fx'
import { LOFT } from '../worlds'
import { DOOR } from './layout'
import { doorOpen, fireRoar } from './stove-door'

/**
 * How LOFT-B's corner of the loft is lit, frame by frame: the spark (its warm light falls off over two or three
 * cells), the stove's banked fire (a red pool under the door's vent while it is shut; a flood of red-gold through the
 * doorway while it is open), and the dark. Everything the wheel, the stove and the cat draw asks `shade` for its
 * colour at its place, so a thing is its lit colour near a light and its night colour far from one.
 */

export interface Light {
  t: number
  /** The spark, in loft cells, and how strongly it lights (its heat; less while it is out of sight). */
  sx: number
  sy: number
  power: number
  /** The doorway: how open (0..1), and the fire's roar. */
  open: number
  roar: number
  /** The flicker the fire's light has this frame. */
  flick: number
}

/** The light of the loft at show time `t`. */
export function lightAt(t: number): Light {
  const s = sparkIn('loft', t)
  const flick = 0.85 + 0.09 * Math.sin(t * 13.1) + 0.06 * Math.sin(t * 29.3 + 1.1)
  return {
    t,
    sx: s?.x ?? 0,
    sy: s?.y ?? 0,
    power: s ? Math.min(1.3, s.heat) * (s.hidden ? 0.35 : 1) : 0,
    open: doorOpen(t),
    roar: fireRoar(t),
    flick,
  }
}

/** The spark's light at (x, y), 0..1. */
export function sparkLight(L: Light, x: number, y: number): number {
  if (L.power <= 0) return 0
  const r = 1.45 + 0.8 * L.power
  const d2 = ((x - L.sx) ** 2 + (y - L.sy) ** 2) / (r * r)
  return Math.min(1, (L.power * 1.05) / ((1 + d2) * (1 + d2)))
}

/** The vent's slots, low on the door: where the banked fire's glow comes out while the door is shut. */
export const VENT = { x: (DOOR.x0 + DOOR.x1) / 2, y: DOOR.y1 - 0.62 }

/**
 * The fire's light at (x, y), 0..1: a small red pool from the vent while the door is shut, the doorway's flood while
 * it is open. It falls on what is in front of the stove and below the doorway's top: the floor, the cat, the sill.
 */
export function fireLight(L: Light, x: number, y: number): number {
  const mx = (DOOR.x0 + DOOR.x1) / 2
  const my = (DOOR.y0 + DOOR.y1) / 2 + 0.4
  // The vent: a little light, always there while the door is shut.
  const vd2 = ((x - VENT.x) ** 2 + ((y - VENT.y) * 0.8) ** 2) / (2.1 * 2.1)
  const vent = (0.32 * (1 - L.open)) / ((1 + vd2) * (1 + vd2))
  // The doorway: much more, and more again as the fire roars; only below the doorway's top edge.
  const reach = 4.2 + 2.2 * L.roar
  const dd2 = ((x - mx) ** 2 + (y - my) ** 2) / (reach * reach)
  const below = Math.max(0, Math.min(1, (y - DOOR.y0 + 1.2) / 2.4))
  const door = (L.open * (0.8 + 0.5 * L.roar) * below) / ((1 + dd2) * (1 + dd2))
  return Math.min(1, (vent + door) * L.flick)
}

/**
 * A material's colour at (x, y): its night colour in the dark, its lit colour in the spark's light, reddened by the
 * fire's. A big shape takes its flat fill without the spark (`near` false) and gets the spark's light as a pool laid
 * over it (`lightOn`), so a cat is lit where the spark is, not all over.
 */
export function shade(L: Light, x: number, y: number, dark: string, lit: string, amb = 0.42, near = true): string {
  const s = near ? sparkLight(L, x, y) : 0
  const f = fireLight(L, x, y)
  const night = mixHex(LOFT.night, dark, amb)
  let c = mixHex(night, lit, Math.min(1, s))
  if (f > 0.003) c = mixHex(c, mixHex(lit, LOFT.ember, 0.45), Math.min(0.85, f))
  return c
}

/* ------------------------------------------------------------------ drawing with light */

/** A closed polygon in loft cells, filled with p5's current fill and stroke. */
export function poly(p: p5, k: number, pts: readonly (readonly [number, number])[]): void {
  p.beginShape()
  for (const [x, y] of pts) p.vertex(x * k, y * k)
  p.endShape(p.CLOSE)
}

/** `rgba()` of a hex colour. */
export function rgba(hex: string, a: number): string {
  const v = parseInt(hex.slice(1), 16)
  return `rgba(${(v >> 16) & 255}, ${(v >> 8) & 255}, ${v & 255}, ${Math.max(0, Math.min(1, a))})`
}

/**
 * The light that falls on a shape, laid over its flat fill and clipped to it: a soft pool of `lit` round the spark
 * (how a thing near the spark reads as lit by it), and the fire's red-gold from the doorway. `sheen` scales both,
 * lower for iron (dull) than for fur or wax.
 */
export function lightOn(p: p5, k: number, L: Light, pts: readonly (readonly [number, number])[], lit: string, sheen = 1, fire = 1): void {
  const nearSpark = L.power > 0.01
  const f = fireLight(L, (DOOR.x0 + DOOR.x1) / 2, DOOR.y1 + 1.5) * fire
  if (!nearSpark && f < 0.01) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  // Only if the shape is anywhere near a light.
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (const [x, y] of pts) {
    x0 = Math.min(x0, x)
    x1 = Math.max(x1, x)
    y0 = Math.min(y0, y)
    y1 = Math.max(y1, y)
  }
  const rs = 2.2 + 1.2 * L.power
  const sparkNear = nearSpark && L.sx > x0 - rs && L.sx < x1 + rs && L.sy > y0 - rs && L.sy < y1 + rs
  const fireNear = f >= 0.01 && x1 > DOOR.x0 - 7 && x0 < DOOR.x1 + 7 && y1 > DOOR.y0 - 1
  if (!sparkNear && !fireNear) return
  ctx.save()
  ctx.beginPath()
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * k, y * k) : ctx.moveTo(x * k, y * k)))
  ctx.closePath()
  ctx.clip()
  const pool = (x: number, y: number, r: number, a: number, col: string) => {
    const g = ctx.createRadialGradient(x * k, y * k, 0, x * k, y * k, r * k)
    g.addColorStop(0, rgba(col, a))
    g.addColorStop(0.42, rgba(col, a * 0.42))
    g.addColorStop(1, rgba(col, 0))
    ctx.fillStyle = g
    ctx.fillRect((x - r) * k, (y - r) * k, 2 * r * k, 2 * r * k)
  }
  if (sparkNear) pool(L.sx, L.sy, rs, 0.72 * Math.min(1, L.power) * sheen, lit)
  if (fireNear) {
    const reach = 5 + 2.5 * L.roar
    pool((DOOR.x0 + DOOR.x1) / 2, DOOR.y1 - 0.2, reach, 0.8 * f * sheen, mixHex(lit, LOFT.ember, 0.5))
  }
  ctx.restore()
}
