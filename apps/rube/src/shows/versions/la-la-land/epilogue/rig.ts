import type p5 from 'p5'
import type { Ctx } from './kit'
import { PAINT } from './worlds'

/**
 * The dream's stage, in the hand every set shares: painted flats lit in their
 * own colours, the battens they hang from, the beams that light them. A part
 * draws its set out of these so the whole dream reads as one stage, and puts
 * its machines in front.
 *
 * Every measure is in cells; multiply by `c.k` is done here.
 */

/** A painted flat: a rectangle of sky, `top` at its top blending to `bottom` at its foot, and a thin frame edge. */
export function flat(p: p5, c: Ctx, x: number, y: number, w: number, h: number, top: string, bottom: string, edge = true): void {
  const { k, ink, weight } = c
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const g = ctx.createLinearGradient(0, y * k, 0, (y + h) * k)
  g.addColorStop(0, top)
  g.addColorStop(1, bottom)
  p.push()
  p.noStroke()
  ctx.fillStyle = g
  ctx.fillRect(x * k, y * k, w * k, h * k)
  if (edge) {
    p.noFill()
    p.stroke(ink)
    p.strokeWeight(weight * 0.7)
    p.rect((x + w / 2) * k, (y + h / 2) * k, w * k, h * k)
  }
  p.pop()
}

/** A batten over a flat, and the two lines it hangs from, up out of the frame. */
export function batten(p: p5, c: Ctx, x0: number, x1: number, y: number): void {
  const { k, ink, weight } = c
  p.push()
  p.stroke(ink)
  p.strokeWeight(weight * 0.9)
  p.line(x0 * k, y * k, x1 * k, y * k)
  p.strokeWeight(weight * 0.45)
  for (const x of [x0 + 0.4, x1 - 0.4]) p.line(x * k, y * k, x * k, (y - 60) * k)
  p.pop()
}

/** A spotlight's beam: a soft wedge of light from `from` widening to `w` at `to`. Additive, so it lights what it falls on. */
export function beam(p: p5, c: Ctx, from: [number, number], to: [number, number], w: number, a = 0.18, colour = PAINT.beam): void {
  const { k } = c
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const dx = to[0] - from[0]
  const dy = to[1] - from[1]
  const L = Math.hypot(dx, dy) || 1
  const nx = (-dy / L) * (w / 2)
  const ny = (dx / L) * (w / 2)
  const g = ctx.createLinearGradient(from[0] * k, from[1] * k, to[0] * k, to[1] * k)
  g.addColorStop(0, hexA(colour, a))
  g.addColorStop(1, hexA(colour, 0))
  p.push()
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(from[0] * k, from[1] * k)
  ctx.lineTo((to[0] + nx) * k, (to[1] + ny) * k)
  ctx.lineTo((to[0] - nx) * k, (to[1] - ny) * k)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
  p.pop()
}

/** A lamp's glow: a soft disc of light round (x, y), radius `r`. Additive. */
export function glow(p: p5, c: Ctx, x: number, y: number, r: number, a = 0.5, colour = PAINT.gold): void {
  const { k } = c
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const g = ctx.createRadialGradient(x * k, y * k, 0, x * k, y * k, r * k)
  g.addColorStop(0, hexA(colour, a))
  g.addColorStop(0.5, hexA(colour, a * 0.35))
  g.addColorStop(1, hexA(colour, 0))
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.fillStyle = g
  ctx.fillRect((x - r) * k, (y - r) * k, 2 * r * k, 2 * r * k)
  ctx.restore()
}

/** `#rrggbb` with an alpha, as a CSS colour. */
export function hexA(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.max(0, Math.min(1, a))})`
}
