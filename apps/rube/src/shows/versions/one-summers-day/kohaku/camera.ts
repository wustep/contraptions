import type { Framing } from '../../../registry'
import type { Pt } from './paint'

/**
 * The camera is authored: keys, each a framing fully in effect at its time, and between them a move.
 *
 * A key holds a point (`at`), or follows Chihiro (no `at`: `off` frames ahead of or above her), or something between
 * (`w`, how much of the hold). Between keys the hold point, the offset and the size of the frame each move on a
 * monotone cubic, so a move that goes on the same way through a key keeps its speed and one that turns back comes to
 * rest on it; the size moves in even steps of ratio, so a pull-back opens as evenly as a push-in closes. A key marked
 * `cut` is a cut: up to it the camera keeps the framing before, and on it everything changes at once. The show's cuts
 * are few and every one is on the music.
 */
export interface Key {
  t: number
  /** How many cells a 16:9 frame shows top to bottom. */
  cells: number
  /** A point to hold. Left out, the key follows her. */
  at?: Pt
  /** How much of the hold, 0 (follow) to 1 (hold). Defaults to 1 with `at`, 0 without. */
  w?: number
  /** Added to the follow: ahead of her, or above. */
  off?: Pt
  /** A cut on this key. */
  cut?: boolean
  /** What the shot is about, for Zoom (`Framing.focus`). Left out: her while following, else nothing. */
  focus?: Pt
  /** Under Zoom, how far below the middle to hold (`Framing.zoomDrop`). */
  drop?: number
}

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
    let lo = 0
    let hi = n - 1
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1
      if (ts[mid] <= t) lo = mid
      else hi = mid
    }
    const i = lo
    if (cutAfter[i]) return vs[i]
    const h = ts[i + 1] - ts[i]
    const u = (t - ts[i]) / h
    const u2 = u * u
    const u3 = u2 * u
    return (2 * u3 - 3 * u2 + 1) * vs[i] + (u3 - 2 * u2 + u) * h * m[i] + (-2 * u3 + 3 * u2) * vs[i + 1] + (u3 - u2) * h * m[i + 1]
  }
}

/** Her position smoothed over a short window leaning a little ahead: what a follow has the camera on. */
export function follower(where: (t: number) => Pt, lead = 0.15, width = 0.8): (t: number) => Pt {
  return (t: number): Pt => {
    let x = 0
    let y = 0
    let sum = 0
    for (let j = -8; j <= 8; j++) {
      const s = t + lead + (j / 8) * width
      const w = 1 - Math.abs(j) / 9
      const [px, py] = where(s)
      x += px * w
      y += py * w
      sum += w
    }
    return [x / sum, y / sum]
  }
}

export interface Director {
  (t: number): Framing
  /** The cuts, show seconds. */
  cuts: number[]
}

export function director(keys: Key[], where: (t: number) => Pt): Director {
  const ks = [...keys].sort((a, b) => a.t - b.t)
  const follow = follower(where)
  const ts = ks.map((k) => k.t)
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
  const dr = monotone(ts, ks.map((k) => k.drop ?? 0), cutAfter)
  const index = (t: number): number => {
    let lo = 0
    let hi = ks.length - 1
    if (t < ts[0]) return 0
    while (hi > lo) {
      const mid = (lo + hi + 1) >> 1
      if (ts[mid] <= t) lo = mid
      else hi = mid - 1
    }
    return lo
  }
  const weight = (t: number): number => {
    const i = index(t)
    if (t <= ts[0] || i >= ks.length - 1) return wOf(ks[i])
    if (cutAfter[i]) return wOf(ks[i])
    const u = (t - ts[i]) / (ts[i + 1] - ts[i])
    const s = u * u * (3 - 2 * u)
    return wOf(ks[i]) + (wOf(ks[i + 1]) - wOf(ks[i])) * s
  }
  const fn = ((t: number): Framing => {
    const w = weight(t)
    let x = hx(t)
    let y = hy(t)
    if (w < 1) {
      const [fx, fy] = follow(t)
      const Fx = fx + ox(t)
      const Fy = fy + oy(t)
      x = Fx + (x - Fx) * w
      y = Fy + (y - Fy) * w
    }
    const i = index(t)
    const focus = ks[i].focus ?? (w < 0.5 ? where(t) : undefined)
    const drop = dr(t)
    return { x, y, cells: Math.exp(lc(t)), focus, ...(drop ? { zoomDrop: drop } : {}) }
  }) as Director
  fn.cuts = ks.filter((k) => k.cut).map((k) => k.t)
  return fn
}
