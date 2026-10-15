import type p5 from 'p5'
import type { PieceCtx } from '../../../../parts'
import type { Show } from '../../../../show'
import type { StockMap } from '../../../stock/types'
import { rgba, smooth } from './screen'

/**
 * The follow spot. Where the fair's run doubles back on itself (62 to 90 s), three and four floors of machines stand
 * in the frame at once, all as bright as the one the ball is on, and the ball is lost among them. So while floors are
 * stacked in the frame, the night comes down over the ones above and below, and the ball's own floor stays lit.
 *
 * It is worked out once, from the score: the band's height follows the ball, smoothed so a bounce does not shake it,
 * and its strength is how much of another floor is in the frame near the ball.
 */

const STEP = 0.1

export interface Spot {
  from: number
  /** Every STEP: the band's middle (cells) and how dark the floors off it go, 0 to 1. */
  y: Float32Array
  strength: Float32Array
}

/** The spot over the fair's `map`, worked out up to show time `end`; it is gone after that. */
export function spot(show: Show, map: StockMap, end: number): Spot {
  const from = map.begin
  const n = Math.ceil((end - from) / STEP) + 1
  const raw = new Float32Array(n)
  const ys = new Float32Array(n)
  const cells = map.pieces.filter((p) => p.spec.name !== 'rail').flatMap((p) => p.cells)
  for (let i = 0; i < n; i++) {
    const t = from + i * STEP
    let sum = 0
    let w = 0
    for (let j = -5; j <= 5; j++) {
      const k = 1 - Math.abs(j) / 6
      sum += show.at(t + j * 0.06).y * k
      w += k
    }
    const y = sum / w
    const x = show.at(t).x
    ys[i] = y
    // Another floor near the ball: a machine's cell within the frame's width of it, a floor or two up or down.
    let near = 0
    for (const [cx, cy] of cells) {
      const dy = Math.abs(cy - y)
      if (Math.abs(cx - x) < 7 && dy > 0.9 && dy < 2.6) near++
    }
    raw[i] = near >= 3 ? 1 : 0
  }
  // Coming down and going up over a second and a half, so it is never a switch; and up before `end`.
  const strength = new Float32Array(n)
  const reach = Math.round(1.5 / STEP)
  for (let i = 0; i < n; i++) {
    let m = 0
    for (let j = -reach; j <= reach; j++) {
      const v = raw[Math.max(0, Math.min(n - 1, i + j))]
      m = Math.max(m, v * (1 - Math.abs(j) / (reach + 1)))
    }
    strength[i] = smooth(m, 0, 1) * smooth(n - 1 - i, 0, reach)
  }
  return { from, y: ys, strength }
}

const read = (a: Float32Array, s: Spot, t: number): number => {
  const u = (t - s.from) / STEP
  if (u >= a.length - 1) return a[a.length - 1]
  const i = Math.max(0, Math.min(a.length - 2, Math.floor(u)))
  const f = Math.max(0, Math.min(1, u - i))
  return a[i] * (1 - f) + a[i + 1] * f
}

/** The night over the floors off the ball's, drawn over the machine in the world's cells. */
export function follow(p: p5, c: PieceCtx, line: number, t: number, s: Spot, night: string, depth = 0.5): void {
  const strength = read(s.strength, s, t)
  if (strength < 0.01) return
  const y = (read(s.y, s, t) - line) * c.k
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const reach = c.k * 60
  const g = ctx.createLinearGradient(0, y - c.k * 2, 0, y + c.k * 2)
  const a = depth * strength
  // The ball's floor clear, from the top of its machines to the foot of their posts; the floors over and under it dark.
  const at = (cells: number) => (cells + 2) / 4
  g.addColorStop(0, rgba(night, a))
  g.addColorStop(at(-1.15), rgba(night, a))
  g.addColorStop(at(-0.8), rgba(night, 0))
  g.addColorStop(at(0.2), rgba(night, 0))
  g.addColorStop(at(0.45), rgba(night, a))
  g.addColorStop(1, rgba(night, a))
  ctx.save()
  ctx.fillStyle = g
  ctx.fillRect(-reach * 4, y - reach, reach * 8, reach * 2)
  ctx.restore()
}
