import type { Framing } from '../../../registry'
import type { Pt } from './path'

/**
 * The camera is authored: a list of keys, each a framing fully in effect at its time, and between them a move.
 *
 * A key either holds a point (`at`) or follows the ball (no `at`; `off` frames ahead of or above it), or something
 * between (`w`, how much of the hold). The camera is three curves blended: a hold curve through every key's point (a
 * follow key's point is where the follow has the camera at that key), the follow itself plus an offset curve, and the
 * weight between them. The hold and the scale move on monotone cubics (Fritsch–Carlson), so a move that carries on the
 * same way through a key keeps its speed through it, and one that stops or turns back comes to rest on it; the scale
 * moves in even steps of ratio, so a pull-back opens as evenly as it closes. A key marked `cut` is a cut: up to it
 * the camera keeps the framing before, and on it every curve jumps.
 */
export interface Key {
  t: number
  /** How many cells a 16:9 frame shows top to bottom. */
  cells: number
  /** A point to hold, in cells. Left out, the key follows the ball. */
  at?: Pt
  /** How much of the hold, 0 (follow) to 1 (hold). Defaults to 1 with `at`, 0 without. */
  w?: number
  /** Added to the follow: ahead of the ball, or above it. */
  off?: Pt
  /** A cut on this key. */
  cut?: boolean
  /** What the shot is about, for Zoom (`Framing.focus`): left out, the ball while following, else the hold. */
  focus?: Pt
}

/** Monotone cubic through (ts, vs), as a function of time; flat outside. Segments that are cut hold their left value. */
function monotone(ts: number[], vs: number[], cutAfter: boolean[]): (t: number) => number {
  const n = ts.length
  const d: number[] = []
  for (let i = 0; i < n - 1; i++) {
    const h = ts[i + 1] - ts[i]
    d.push(cutAfter[i] || h <= 1e-9 ? 0 : (vs[i + 1] - vs[i]) / h)
  }
  const m: number[] = new Array(n).fill(0)
  for (let i = 1; i < n - 1; i++) {
    if (cutAfter[i - 1] || cutAfter[i]) continue
    const a = d[i - 1]
    const b = d[i]
    if (a * b <= 0) continue
    const h0 = ts[i] - ts[i - 1]
    const h1 = ts[i + 1] - ts[i]
    const w1 = 2 * h1 + h0
    const w2 = h1 + 2 * h0
    m[i] = (w1 + w2) / (w1 / a + w2 / b)
  }
  return (t: number) => {
    if (t <= ts[0]) return vs[0]
    if (t >= ts[n - 1]) return vs[n - 1]
    let i = 0
    while (i + 1 < n && ts[i + 1] <= t) i++
    if (cutAfter[i]) return vs[i]
    const h = ts[i + 1] - ts[i]
    const u = (t - ts[i]) / h
    const u2 = u * u
    const u3 = u2 * u
    return (2 * u3 - 3 * u2 + 1) * vs[i] + (u3 - 2 * u2 + u) * h * m[i] + (-2 * u3 + 3 * u2) * vs[i + 1] + (u3 - u2) * h * m[i + 1]
  }
}

/** The ball smoothed over a short window that leans a little ahead: what a follow has the camera on. */
export function follower(where: (t: number) => Pt, lead = 0.12, span = 0.7): (t: number) => Pt {
  return (t: number): Pt => {
    let x = 0
    let y = 0
    let sum = 0
    for (let j = -10; j <= 10; j++) {
      const s = t + lead + (j / 10) * span
      const w = 1 - Math.abs(j) / 11
      const [px, py] = where(s)
      x += px * w
      y += py * w
      sum += w
    }
    return [x / sum, y / sum]
  }
}

export function director(keys: Key[], where: (t: number) => Pt): (t: number) => Framing {
  const ks = [...keys].sort((a, b) => a.t - b.t)
  const follow = follower(where)
  const ts = ks.map((k) => k.t)
  // A segment ending on a cut holds its left key's framing until the cut.
  const cutAfter = ks.map((_, i) => i + 1 < ks.length && !!ks[i + 1].cut)
  const wOf = (k: Key) => Math.max(0, Math.min(1, k.w ?? (k.at ? 1 : 0)))
  const hold = ks.map((k): Pt => {
    if (k.at) return k.at
    const [fx, fy] = follow(k.t)
    const [ox, oy] = k.off ?? [0, 0]
    return [fx + ox, fy + oy]
  })
  const hx = monotone(ts, hold.map((h) => h[0]), cutAfter)
  const hy = monotone(ts, hold.map((h) => h[1]), cutAfter)
  const lc = monotone(ts, ks.map((k) => Math.log(k.cells)), cutAfter)
  const ox = monotone(ts, ks.map((k) => (k.off ?? [0, 0])[0]), cutAfter)
  const oy = monotone(ts, ks.map((k) => (k.off ?? [0, 0])[1]), cutAfter)
  // The weight eases from key to key (smoothstep), so a hold lets go of the ball, and takes it, without a jolt.
  const weight = (t: number): number => {
    if (t <= ts[0]) return wOf(ks[0])
    let i = 0
    while (i + 1 < ks.length && ts[i + 1] <= t) i++
    if (i >= ks.length - 1) return wOf(ks[ks.length - 1])
    if (cutAfter[i]) return wOf(ks[i])
    const u = (t - ts[i]) / (ts[i + 1] - ts[i])
    const s = u * u * (3 - 2 * u)
    return wOf(ks[i]) + (wOf(ks[i + 1]) - wOf(ks[i])) * s
  }
  const focusAt = (t: number): Pt | undefined => {
    let i = 0
    while (i + 1 < ks.length && ts[i + 1] <= t) i++
    return ks[i].focus
  }
  return (t: number): Framing => {
    const w = weight(t)
    const H: Pt = [hx(t), hy(t)]
    let x = H[0]
    let y = H[1]
    if (w < 1) {
      const [fx, fy] = follow(t)
      const F: Pt = [fx + ox(t), fy + oy(t)]
      x = F[0] + (H[0] - F[0]) * w
      y = F[1] + (H[1] - F[1]) * w
    }
    const focus = focusAt(t) ?? (w < 0.5 ? where(t) : undefined)
    return { x, y, cells: Math.exp(lc(t)), focus }
  }
}
