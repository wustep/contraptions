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

/**
 * One channel of the framing across the keys: monotone cubic (Fritsch-Carlson), so a move that goes on the same
 * way through a key carries its speed through it instead of stopping there and starting again, while a key held
 * (the same value either side) or a turn (the value going back) still comes to rest on it. `left[i]` and `right[i]`
 * are the channel's value at the start and end of the move from key i to key i + 1; where they disagree at a key
 * (a hold that only one side has, and that side's weight is nil there), the key is a stop.
 */
function channel(ts: number[], left: number[], right: number[]): (i: number, u: number) => number {
  const n = ts.length
  const h = (i: number) => ts[i + 1] - ts[i]
  const d = (i: number) => (h(i) > 1e-6 ? (right[i] - left[i]) / h(i) : 0)
  const m: number[] = new Array(n).fill(0)
  for (let i = 1; i < n - 1; i++) {
    if (Math.abs(right[i - 1] - left[i]) > 1e-9 || h(i - 1) <= 1e-6 || h(i) <= 1e-6) continue
    const a = d(i - 1)
    const b = d(i)
    if (a * b <= 0) continue
    const w1 = 2 * h(i) + h(i - 1)
    const w2 = h(i) + 2 * h(i - 1)
    m[i] = (w1 + w2) / (w1 / a + w2 / b)
  }
  return (i, u) => {
    if (i >= n - 1 || u <= 0) return left[i]
    const H = h(i)
    const u2 = u * u
    const u3 = u2 * u
    return (2 * u3 - 3 * u2 + 1) * left[i] + (u3 - 2 * u2 + u) * H * m[i] + (-2 * u3 + 3 * u2) * right[i] + (u3 - u2) * H * m[i + 1]
  }
}

/**
 * Where a follow puts the camera at `t`: the ball smoothed over a short window that leans a little ahead. The score
 * hands it a `where` that carries the ball on past its own leg at the speed it crosses the cut, so a follow on either
 * side of a moving cut goes on at her speed instead of slowing to a stop on it.
 */
export function follower(where: (t: number) => Pt, duration: number): (t: number) => Pt {
  return (t: number): Pt => {
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
}

export function director(where: (t: number) => Pt, shots: Shot[], duration: number): (t: number) => Framing {
  const keys = [...shots].sort((a, b) => a.t - b.t)
  const follow = follower(where, duration)
  const weight = (k: Shot): number => k.w ?? (k.hold ? 1 : 0)
  // Each move's two ends, channel by channel, as the move itself has them (a key with no hold takes its partner's).
  const n = keys.length
  const ts = keys.map((k) => k.t)
  const ends = (get: (a: Shot, b: Shot) => [number, number]) => {
    const l: number[] = []
    const r: number[] = []
    for (let i = 0; i < n; i++) {
      const [x, y] = get(keys[i], keys[Math.min(i + 1, n - 1)])
      l.push(x)
      r.push(y)
    }
    return channel(ts, l, r)
  }
  // The zoom goes in even steps of scale, not of cells: a pull-back from one cell to ten opens as evenly as it closes.
  const cellsAt = ends((a, b) => [Math.log(a.cells), Math.log(b.cells)])
  const wAt = ends((a, b) => [weight(a), weight(b)])
  const offX = ends((a, b) => [(a.off ?? [0, 0])[0], (b.off ?? [0, 0])[0]])
  const offY = ends((a, b) => [(a.off ?? [0, 0])[1], (b.off ?? [0, 0])[1]])
  // A follow key's hold is where the follow has the camera at that key, so a move between a follow and a hold goes
  // from where the camera is to where it is going, and carries its speed on through the next key instead of
  // stopping on it.
  const at = keys.map((k): Pt => {
    if (k.hold) return k.hold
    const [fx, fy] = follow(k.t)
    const [ox, oy] = k.off ?? [0, 0]
    return [fx + ox, fy + oy]
  })
  const holdX = ends((a, b) => [at[keys.indexOf(a)][0], at[keys.indexOf(b)][0]])
  const holdY = ends((a, b) => [at[keys.indexOf(a)][1], at[keys.indexOf(b)][1]])
  return (t: number): Framing => {
    let i = 0
    while (i + 1 < n && keys[i + 1].t <= t) i++
    const last = i >= n - 1 || t <= keys[i].t
    const u = last ? 0 : (t - keys[i].t) / (keys[i + 1].t - keys[i].t)
    const cells = Math.exp(cellsAt(i, u))
    const w = Math.max(0, Math.min(1, wAt(i, u)))
    const hold: Pt = [holdX(i, u), holdY(i, u)]
    const [fx, fy] = w >= 1 ? hold : follow(t)
    const x = fx + offX(i, u)
    const y = fy + offY(i, u)
    return { x: x + (hold[0] - x) * w, y: y + (hold[1] - y) * w, cells }
  }
}
