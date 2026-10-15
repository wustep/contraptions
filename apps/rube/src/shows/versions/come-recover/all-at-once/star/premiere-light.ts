import type p5 from 'p5'
import { mixHex } from '../../../../../parts'
import { PREMIERE, STAR } from '../worlds'

/**
 * The premiere's paints and its light. Every colour is the premiere's own (`worlds.ts`), or two of them mixed; light
 * (a flash, a beam, a lamp's pool, neon) is the one thing painted as a gradient.
 */

export const NIGHT = PREMIERE.bg
export const INK = PREMIERE.ink

/** The theatre's front: a dark plum stucco, its pilasters a shade warmer, its trim brass in the dark. */
export const FACADE = mixHex(NIGHT, STAR.velvet, 0.42)
export const FACADE_DEEP = mixHex(NIGHT, STAR.velvet, 0.2)
export const PILASTER = mixHex(FACADE, STAR.brass, 0.14)
/** The street and the kerb under the carpet. */
export const STREET = mixHex(NIGHT, STAR.wet, 0.3)
/** The alley: its walls wet and blue in the dark, its stone a shade lighter, its paving darker and shining. */
export const WALL = mixHex(mixHex(NIGHT, STAR.wet, 0.5), STAR.neonTeal, 0.05)
export const WALL_FAR = mixHex(NIGHT, STAR.wet, 0.3)
export const STONE = mixHex(STAR.wet, STAR.rain, 0.18)
export const STONE_DEEP = mixHex(NIGHT, STAR.wet, 0.28)
export const IRON = mixHex(NIGHT, STAR.wet, 0.25)
/** The wet paving: nearly black, for the lights to shine back out of. */
export const WET = mixHex(NIGHT, STAR.wet, 0.55)
/** The press's cameras: black bodies, silver reflectors. */
export const BODY = mixHex(NIGHT, INK, 0.1)
export const SILVER = mixHex(STAR.rain, INK, 0.45)

export function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.max(0, Math.min(1, a))})`
}

const ctxOf = (p: p5): CanvasRenderingContext2D => p.drawingContext as CanvasRenderingContext2D

/** A round glow at (x, y) (pixels), radius `r`: bright at its heart and gone at its edge. */
export function glow(p: p5, x: number, y: number, r: number, hex: string, a: number, core = 0.35): void {
  if (a <= 0.004 || r <= 0.5) return
  const ctx = ctxOf(p)
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, rgba(hex, a))
  g.addColorStop(core, rgba(hex, a * 0.4))
  g.addColorStop(1, rgba(hex, 0))
  ctx.fillStyle = g
  ctx.fillRect(x - r, y - r, 2 * r, 2 * r)
}

/** An oval glow: a pool of light on the ground, `rx` wide and `ry` deep (pixels). */
export function pool(p: p5, x: number, y: number, rx: number, ry: number, hex: string, a: number): void {
  if (a <= 0.004 || rx <= 0.5 || ry <= 0.1) return
  const ctx = ctxOf(p)
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(1, ry / rx)
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx)
  g.addColorStop(0, rgba(hex, a))
  g.addColorStop(0.55, rgba(hex, a * 0.45))
  g.addColorStop(1, rgba(hex, 0))
  ctx.fillStyle = g
  ctx.fillRect(-rx, -rx, 2 * rx, 2 * rx)
  ctx.restore()
}

/**
 * A beam: a cone of light from `a` (its lens, half-width `wa`) to `b` (where it falls, half-width `wb`), pixels,
 * brightest at the lens and thinning along its length.
 */
export function beam(p: p5, a: [number, number], b: [number, number], wa: number, wb: number, hex: string, alphaA: number, alphaB: number): void {
  if (Math.max(alphaA, alphaB) <= 0.004) return
  const ctx = ctxOf(p)
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const len = Math.hypot(dx, dy) || 1
  const nx = -dy / len
  const ny = dx / len
  const g = ctx.createLinearGradient(a[0], a[1], b[0], b[1])
  g.addColorStop(0, rgba(hex, alphaA))
  g.addColorStop(1, rgba(hex, alphaB))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(a[0] + nx * wa, a[1] + ny * wa)
  ctx.lineTo(b[0] + nx * wb, b[1] + ny * wb)
  ctx.lineTo(b[0] - nx * wb, b[1] - ny * wb)
  ctx.lineTo(a[0] - nx * wa, a[1] - ny * wa)
  ctx.closePath()
  ctx.fill()
}

/**
 * A smear of light straight down from (x, y) on wet ground: a reflection, `w` wide and `h` long (pixels). A soft
 * outer column and a brighter narrow core, both fading down.
 */
export function smear(p: p5, x: number, y: number, w: number, h: number, hex: string, a: number): void {
  if (a <= 0.004 || h <= 0.5) return
  const ctx = ctxOf(p)
  for (const [ww, aa] of [
    [w, a * 0.45],
    [w * 0.45, a],
  ] as const) {
    const g = ctx.createLinearGradient(0, y, 0, y + h)
    g.addColorStop(0, rgba(hex, aa))
    g.addColorStop(0.6, rgba(hex, aa * 0.35))
    g.addColorStop(1, rgba(hex, 0))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(x - ww / 2, y)
    ctx.lineTo(x + ww / 2, y)
    ctx.lineTo(x + ww * 0.36, y + h)
    ctx.lineTo(x - ww * 0.36, y + h)
    ctx.closePath()
    ctx.fill()
  }
}

/** A four-pointed glint: the star a flashbulb makes, tapered spikes, `r` long (pixels). */
export function glint(p: p5, x: number, y: number, r: number, hex: string, a: number, turn = 0): void {
  if (a <= 0.004 || r <= 0.5) return
  const ctx = ctxOf(p)
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(turn)
  ctx.fillStyle = rgba(hex, a)
  for (let i = 0; i < 4; i++) {
    const long = i % 2 === 0 ? r : r * 0.62
    ctx.beginPath()
    ctx.moveTo(0, -r * 0.07)
    ctx.lineTo(long, 0)
    ctx.lineTo(0, r * 0.07)
    ctx.closePath()
    ctx.fill()
    ctx.rotate(Math.PI / 2)
  }
  ctx.restore()
}
