import type { Pt } from '../../../../parts'
import type { Framing } from '../../../registry'

/**
 * The camera is authored, not found. Between keys it eases from one framing
 * to the next; within a key it either follows the ball (smoothed over a
 * short window that leans a little ahead) or holds a point, or a mix of the
 * two. A key is where a framing is fully in effect: the move to it starts at
 * the key before.
 */
export interface Shot {
  t: number
  /** How many cells a 16:9 frame shows top to bottom. */
  cells: number
  /** A point to hold, in cells. */
  hold?: Pt
  /** How much of the hold: 0 follows the ball, 1 holds the point. Defaults to 1 with a hold, 0 without. */
  w?: number
  /** Added to the follow: frame ahead of the ball, or above it. */
  off?: Pt
}

const ease = (u: number): number => {
  const v = Math.max(0, Math.min(1, u))
  return v * v * (3 - 2 * v)
}

export function director(where: (t: number) => Pt, shots: Shot[], duration: number): (t: number) => Framing {
  const keys = [...shots].sort((a, b) => a.t - b.t)
  const follow = (t: number): Pt => {
    let x = 0
    let y = 0
    let sum = 0
    for (let j = -12; j <= 16; j++) {
      const w = 1 - Math.abs(j - 2) / 15
      const s = Math.max(0, Math.min(duration, t + j * 0.05))
      const [px, py] = where(s)
      x += px * w
      y += py * w
      sum += w
    }
    return [x / sum, y / sum]
  }
  const weight = (k: Shot): number => k.w ?? (k.hold ? 1 : 0)
  return (t: number): Framing => {
    let i = 0
    while (i + 1 < keys.length && keys[i + 1].t <= t) i++
    const a = keys[i]
    const b = keys[Math.min(i + 1, keys.length - 1)]
    const u = a === b || t <= a.t ? 0 : ease((t - a.t) / (b.t - a.t))
    const mix = (x: number, y: number) => x + (y - x) * u
    const cells = mix(a.cells, b.cells)
    const w = mix(weight(a), weight(b))
    const offA = a.off ?? [0, 0]
    const offB = b.off ?? [0, 0]
    const holdA = a.hold ?? b.hold ?? [0, 0]
    const holdB = b.hold ?? a.hold ?? [0, 0]
    const hold: Pt = [mix(holdA[0], holdB[0]), mix(holdA[1], holdB[1])]
    const [fx, fy] = w >= 1 ? hold : follow(t)
    const x = fx + mix(offA[0], offB[0])
    const y = fy + mix(offA[1], offB[1])
    return { x: x + (hold[0] - x) * w, y: y + (hold[1] - y) * w, cells }
  }
}
