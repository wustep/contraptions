import type { Framing } from '../../../registry'
import type { Pt } from './paint'

/**
 * The camera, authored: a list of shots, each a framing fully in effect at its time, and between two shots a move.
 *
 * A shot either holds a point (`at`) or tracks something (`track`, a function of time: a ball, a worm's head), or
 * some of each (`w`, how much of the hold). Between shots the camera is three curves blended: a hold curve through every
 * shot's point (a tracking shot's point is where the track has the camera at that shot), the track itself with its
 * offset eased from shot to shot, and the weight between them. The hold and the size move on monotone cubics, so a move
 * that carries on the same way through a shot keeps its speed through it, and one that stops or turns comes to rest on
 * it; the size moves in even steps of ratio, so a pull back opens as evenly as a push in closes. A shot marked `cut` is
 * a cut: up to it the camera keeps the framing before, and on it every curve jumps.
 *
 * Two shots in a row that track must track the same thing, or the camera would jump between them; a change of what is
 * tracked goes through a hold or a cut.
 */
export interface Shot {
  t: number
  /** How many cells a 16:9 frame shows top to bottom. */
  cells: number
  /** A point to hold, in cells. */
  at?: Pt
  /** What to track, where there is no `at` (or `w` < 1). */
  track?: (t: number) => Pt
  /** How much of the hold, 0 (track) to 1 (hold). Defaults to 1 with `at`, 0 without. */
  w?: number
  /** Added to the track: ahead of it, or above it. */
  off?: Pt
  /** A cut on this shot. */
  cut?: boolean
  /** What the shot is about, for Zoom (`Framing.focus`). Left out: the track while tracking, else the hold. */
  focus?: Pt | ((t: number) => Pt)
  /** Under Zoom, how far below (positive) or above the middle it holds (`Framing.zoomDrop`). */
  zoomDrop?: number
}

/** Monotone cubic through (ts, vs) as a function of time; flat outside. A segment that ends on a cut holds its left value. */
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

/**
 * A track smoothed over a short window that leans a little ahead: what a tracking shot has the camera on. Sampled
 * finely (every 1/40 s), so where the tracked thing turns sharply, as on a leap, the camera's speed changes smoothly
 * and not in a staircase of steps a sample apart.
 */
const STEADY_N = 32
export function steady(where: (t: number) => Pt, lead = 0.15, span = 0.8): (t: number) => Pt {
  return (t: number): Pt => {
    let x = 0
    let y = 0
    let sum = 0
    for (let j = -STEADY_N; j <= STEADY_N; j++) {
      const s = t + lead + (j / STEADY_N) * span
      const w = 1 - Math.abs(j) / (STEADY_N + 1)
      const [px, py] = where(s)
      x += px * w
      y += py * w
      sum += w
    }
    return [x / sum, y / sum]
  }
}

export interface Lens {
  (t: number): Framing
  /** The cuts, show seconds. */
  cuts: number[]
}

export function lens(shots: Shot[]): Lens {
  const ks = [...shots].sort((a, b) => a.t - b.t)
  if (!ks.length) throw new Error('maker: no shots')
  const ts = ks.map((k) => k.t)
  const cutAfter = ks.map((_, i) => i + 1 < ks.length && !!ks[i + 1].cut)
  const wOf = (k: Shot) => Math.max(0, Math.min(1, k.w ?? (k.at ? 1 : 0)))
  const tracks = ks.map((k) => (k.track ? steady(k.track) : null))
  const hold = ks.map((k, i): Pt => {
    if (k.at) return k.at
    const tr = tracks[i]
    const [fx, fy] = tr ? tr(k.t) : [0, 0]
    const [ox, oy] = k.off ?? [0, 0]
    return [fx + ox, fy + oy]
  })
  const hx = monotone(ts, hold.map((h) => h[0]), cutAfter)
  const hy = monotone(ts, hold.map((h) => h[1]), cutAfter)
  const lc = monotone(ts, ks.map((k) => Math.log(k.cells)), cutAfter)
  const ox = monotone(ts, ks.map((k) => (k.off ?? [0, 0])[0]), cutAfter)
  const oy = monotone(ts, ks.map((k) => (k.off ?? [0, 0])[1]), cutAfter)
  const index = (t: number): number => {
    let lo = 0
    let hi = ks.length - 1
    if (t < ts[0]) return 0
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (ts[mid] <= t) lo = mid
      else hi = mid - 1
    }
    return lo
  }
  // The weight eases from shot to shot (smoothstep), so a hold lets go of a track, and takes it, without a jolt.
  const weight = (t: number, i: number): number => {
    if (i >= ks.length - 1 || cutAfter[i] || t <= ts[i]) return wOf(ks[i])
    const u = Math.min(1, (t - ts[i]) / (ts[i + 1] - ts[i]))
    const s = u * u * (3 - 2 * u)
    return wOf(ks[i]) + (wOf(ks[i + 1]) - wOf(ks[i])) * s
  }
  const camera = ((t: number): Framing => {
    const i = index(t)
    const w = weight(t, i)
    let x = hx(t)
    let y = hy(t)
    // The track: this shot's, or the next one's when this one holds and the next takes something up.
    const tr = tracks[i] ?? (!cutAfter[i] ? tracks[i + 1] : null)
    let tracked: Pt | null = null
    if (w < 1 && tr) {
      tracked = tr(t)
      const F: Pt = [tracked[0] + ox(t), tracked[1] + oy(t)]
      x = F[0] + (x - F[0]) * w
      y = F[1] + (y - F[1]) * w
    }
    const k = ks[i]
    const f = k.focus
    const focus = typeof f === 'function' ? f(t) : f ?? (tracked && w < 0.5 ? tracked : undefined)
    return { x, y, cells: Math.exp(lc(t)), focus, zoomDrop: k.zoomDrop }
  }) as Lens
  camera.cuts = ks.filter((k) => k.cut).map((k) => k.t)
  return camera
}
