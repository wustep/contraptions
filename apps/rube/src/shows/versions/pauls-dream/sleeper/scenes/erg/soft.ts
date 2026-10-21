import { rgba } from '../../paint'

/**
 * A wash with no edge: a colour over a box, fading in from its west side and out at its east, and through a profile
 * from top to bottom, drawn as a small picture stretched over the box (two gradients cannot be multiplied on the canvas
 * itself, and stacked bands of alpha band). The picture is 64 pixels and is made again each time it is asked for.
 */

let canvas: HTMLCanvasElement | null = null

/**
 * Lay `color` at `alpha` over the box from `x0, y0` to `x1, y1` (cells): across, coming up over `inX` cells from the west
 * and going over `outX` to the east; down, through `down`, [share, strength 0..1] stops from the top to the bottom.
 */
export function softBox(
  ctx: CanvasRenderingContext2D,
  color: string,
  alpha: number,
  box: { x0: number; y0: number; x1: number; y1: number },
  inX: number,
  outX: number,
  down: [number, number][],
): void {
  if (alpha <= 0.002 || typeof document === 'undefined') return
  canvas ??= document.createElement('canvas')
  const c = canvas
  c.width = 64
  c.height = 64
  const m = c.getContext('2d')
  if (!m) return
  const v = m.createLinearGradient(0, 0, 0, 64)
  for (const [at, k] of down) v.addColorStop(Math.max(0, Math.min(1, at)), rgba(color, k))
  m.fillStyle = v
  m.fillRect(0, 0, 64, 64)
  m.globalCompositeOperation = 'destination-in'
  const span = Math.max(1e-3, box.x1 - box.x0)
  const a = Math.min(0.49, inX / span)
  const b = Math.max(0.51, 1 - outX / span)
  const h = m.createLinearGradient(0, 0, 64, 0)
  h.addColorStop(0, 'rgba(0,0,0,0)')
  h.addColorStop(a, 'rgba(0,0,0,1)')
  h.addColorStop(b, 'rgba(0,0,0,1)')
  h.addColorStop(1, 'rgba(0,0,0,0)')
  m.fillStyle = h
  m.fillRect(0, 0, 64, 64)
  m.globalCompositeOperation = 'source-over'
  const was = ctx.globalAlpha
  ctx.globalAlpha = was * Math.min(1, alpha)
  ctx.drawImage(c, box.x0, box.y0, box.x1 - box.x0, box.y1 - box.y0)
  ctx.globalAlpha = was
}
