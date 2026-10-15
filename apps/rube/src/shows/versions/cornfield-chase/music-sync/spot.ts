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
 * and it is down while another stretch of the run, one the ball passes well before or after now, shares the frame.
 */

const STEP = 0.1

export interface Spot {
  from: number
  /** Show times the house lights come up: every floor lit at once on the beat, the spot easing back after. */
  cues: number[]
  /** Every STEP: the band's middle (cells) and how dark the floors off it go, 0 to 1. */
  y: Float32Array
  strength: Float32Array
}

/** The spot over the fair's `map`, worked out up to show time `end`; it is gone after that. It lifts on `cues`. */
export function spot(show: Show, map: StockMap, end: number, cues: number[] = []): Spot {
  const from = map.begin
  const n = Math.ceil((end - from) / STEP) + 1
  const raw = new Float32Array(n)
  const ys = new Float32Array(n)
  const pieces = map.pieces.filter((p) => p.spec.name !== 'rail')
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
    // Another floor near the ball: machines in the frame with it, a floor or more up or down, that the run passes
    // through well before or well after now. The ones it is on its way to, a floor up or down, are its own way.
    let near = 0
    for (const p of pieces) {
      if (p.end > t - 5 && p.begin < t + 5) continue
      for (const [cx, cy] of p.cells) {
        const dy = Math.abs(cy - y)
        if (Math.abs(cx - x) < 6 && dy > 0.6 && dy < 3) near++
      }
    }
    raw[i] = near >= 3 ? 1 : 0
  }
  // A gap of under two seconds in a stack is still the stack, and a stack the frame passes in under two seconds is not
  // one: so the night comes down once for a whole stretch, never in flickers.
  const hold = Math.round(1 / STEP)
  const spread = (a: Float32Array, keep: (v: number) => boolean, to: number) => a.map((_, i) => {
    for (let j = -hold; j <= hold; j++) if (keep(a[Math.max(0, Math.min(n - 1, i + j))])) return to
    return 1 - to
  })
  const any = (a: Float32Array) => spread(a, (v) => v > 0, 1)
  const all = (a: Float32Array) => spread(a, (v) => v === 0, 0)
  const held = any(all(all(any(raw))))
  // Coming down and going up over a second and a half, so it is never a switch; and up before `end`.
  const strength = new Float32Array(n)
  const reach = Math.round(1.5 / STEP)
  for (let i = 0; i < n; i++) {
    let m = 0
    for (let j = -reach; j <= reach; j++) {
      const v = held[Math.max(0, Math.min(n - 1, i + j))]
      m = Math.max(m, v * (1 - Math.abs(j) / (reach + 1)))
    }
    strength[i] = smooth(m, 0, 1) * smooth(n - 1 - i, 0, reach)
  }
  return { from, cues, y: ys, strength }
}

const read = (a: Float32Array, s: Spot, t: number): number => {
  const u = (t - s.from) / STEP
  if (u >= a.length - 1) return a[a.length - 1]
  const i = Math.max(0, Math.min(a.length - 2, Math.floor(u)))
  const f = Math.max(0, Math.min(1, u - i))
  return a[i] * (1 - f) + a[i + 1] * f
}

/** How far the house lights are up at show time `t` for a cue: up on its beat, held two beats, down over two more. */
const up = (s: Spot, t: number): number => {
  let out = 0
  for (const c of s.cues) out = Math.max(out, smooth(t, c - 0.06, c) * (1 - smooth(t, c + 1.25, c + 3.75)))
  return out
}

/** How far down the night is over the floors off the ball's at show time `t`, 0 to 1. */
export const strengthAt = (s: Spot, t: number): number => read(s.strength, s, t) * (1 - up(s, t))

/** The night over the floors off the ball's, drawn over the machine in the world's cells. */
export function follow(p: p5, c: PieceCtx, line: number, t: number, s: Spot, night: string, depth = 0.5): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  // Not over a frame of the whole fair (Overview), where the route is the point and every floor is a hair's width.
  const m = ctx.getTransform()
  const cells = Math.min(ctx.canvas.height, (ctx.canvas.width * 9) / 16) / (Math.hypot(m.a, m.b) * c.k)
  const strength = strengthAt(s, t) * (1 - smooth(cells, 9, 14))
  if (strength < 0.01) return
  // In the canvas's own pixels: the night solid over the floors above and below, a short ramp to the ball's floor,
  // which is clear from the top of its machines to the foot of their posts. Solid fills, and gradients only on the
  // ramps, which a big gradient over the whole canvas is not.
  const scale = Math.hypot(m.a, m.b)
  const cell = scale * c.k
  const y = m.f + (read(s.y, s, t) - line) * cell
  const a = depth * strength
  const w = ctx.canvas.width
  const h = ctx.canvas.height
  const top = [y - 1.15 * cell, y - 0.8 * cell]
  const foot = [y + 0.2 * cell, y + 0.45 * cell]
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.fillStyle = rgba(night, a)
  if (top[0] > 0) ctx.fillRect(0, 0, w, Math.min(h, top[0]))
  if (foot[1] < h) ctx.fillRect(0, Math.max(0, foot[1]), w, h - Math.max(0, foot[1]))
  for (const [y0, y1, from, to] of [[top[0], top[1], a, 0], [foot[0], foot[1], 0, a]]) {
    if (y1 < 0 || y0 > h) continue
    const g = ctx.createLinearGradient(0, y0, 0, y1)
    g.addColorStop(0, rgba(night, from))
    g.addColorStop(1, rgba(night, to))
    ctx.fillStyle = g
    ctx.fillRect(0, y0, w, y1 - y0)
  }
  ctx.restore()
}
