import type { Paint } from '../../draw'

/**
 * `stroke` for a drawing made in a context scaled by `scale` (the horse, drawn a man to the unit): the same weight it
 * would have in world cells, and never under 1.25 CSS pixels.
 */
export function strokeIn(g: Paint, color: string, w: number, scale: number): void {
  g.ctx.strokeStyle = color
  g.ctx.lineWidth = Math.max(1.25 * g.px, w / 108) / scale
  g.ctx.stroke()
}
