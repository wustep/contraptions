import type { Framing } from '../../../registry'
import type { Pt } from './paint'

/**
 * The camera is authored: shots, each a framing fully in effect at its time, and a move between each and the next.
 *
 * A shot either holds a point (`at`) or tracks someone (`on`, the hero unless it says; `off` frames ahead of them or
 * above). Between two holds the camera moves on a monotone cubic through every held point, so a move that carries on the
 * same way through a shot keeps its speed and one that turns back comes to rest there; between a hold and a track it
 * hands over smoothly from one to the other; between two tracks it follows, easing from one offset to the next. Its
 * size moves on the same kind of curve in even steps of ratio, so a pull back opens as evenly as a push in closes.
 *
 * A shot marked `cut` is a cut: up to it the camera keeps doing what the shot before asked (holding, or tracking), and
 * on it every curve jumps. A cut is film grammar; a cut that is not under a dissolve is put on the music.
 */
export interface Shot {
  t: number
  /** How many cells a 16:9 frame shows top to bottom. */
  cells: number
  /** A point to hold. */
  at?: Pt
  /** Someone to track (the hero, smoothed, when there is neither `at` nor `on`). */
  on?: (t: number) => Pt
  /** Added to what is tracked. */
  off?: Pt
  cut?: boolean
  /** What the shot is about, for Zoom. Left out: the tracked subject, or the held point. */
  focus?: Pt
}

/** A Fritsch–Carlson cubic through (ts, vs), flat outside; a segment that ends on a cut holds its left value. */
function monotone(ts: number[], vs: number[], cut: boolean[]): (t: number) => number {
  const n = ts.length
  const d: number[] = []
  for (let i = 0; i < n - 1; i++) {
    const h = ts[i + 1] - ts[i]
    d.push(cut[i] || h <= 1e-9 ? 0 : (vs[i + 1] - vs[i]) / h)
  }
  const m = new Array<number>(n).fill(0)
  for (let i = 1; i < n - 1; i++) {
    if (cut[i - 1] || cut[i] || d[i - 1] * d[i] <= 0) continue
    const h0 = ts[i] - ts[i - 1]
    const h1 = ts[i + 1] - ts[i]
    const a = 2 * h1 + h0
    const b = h1 + 2 * h0
    m[i] = (a + b) / (a / d[i - 1] + b / d[i])
  }
  return (t: number) => {
    if (n === 1 || t <= ts[0]) return vs[0]
    if (t >= ts[n - 1]) return vs[n - 1]
    const i = segOf(ts, t)
    if (cut[i]) return vs[i]
    const h = ts[i + 1] - ts[i]
    const u = (t - ts[i]) / h
    const u2 = u * u
    const u3 = u2 * u
    return (2 * u3 - 3 * u2 + 1) * vs[i] + (u3 - 2 * u2 + u) * h * m[i] + (-2 * u3 + 3 * u2) * vs[i + 1] + (u3 - u2) * h * m[i + 1]
  }
}

/** The segment holding `t`: the last key at or before it. */
function segOf(ts: number[], t: number): number {
  let lo = 0
  let hi = ts.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (ts[mid] <= t) lo = mid
    else hi = mid - 1
  }
  return Math.min(lo, ts.length - 2)
}

/** Someone smoothed over a short window that leans a little ahead: what a tracking shot has the camera on. */
export function steady(who: (t: number) => Pt, lead = 0.1, span = 0.45): (t: number) => Pt {
  return (t: number): Pt => {
    let x = 0
    let y = 0
    let sum = 0
    for (let j = -8; j <= 8; j++) {
      const w = 1 - Math.abs(j) / 9
      const [px, py] = who(t + lead + (j / 8) * span)
      x += px * w
      y += py * w
      sum += w
    }
    return [x / sum, y / sum]
  }
}

const ease = (u: number) => u * u * (3 - 2 * u)

export function lens(shots: Shot[], hero: (t: number) => Pt): (t: number) => Framing {
  const ks = [...shots].sort((a, b) => a.t - b.t)
  const n = ks.length
  const ts = ks.map((k) => k.t)
  const cut = ks.map((_, i) => i + 1 < n && !!ks[i + 1].cut)
  const heroSteady = steady(hero)
  const tracks = ks.map((k) => (k.at ? null : k.on ? steady(k.on) : heroSteady))
  const subject = (i: number, t: number): Pt => {
    const tr = tracks[i]!
    const [x, y] = tr(t)
    const [ox, oy] = ks[i].off ?? [0, 0]
    return [x + ox, y + oy]
  }
  const anchors = ks.map((k, i): Pt => k.at ?? subject(i, k.t))
  const hx = monotone(ts, anchors.map((a) => a[0]), cut)
  const hy = monotone(ts, anchors.map((a) => a[1]), cut)
  const lc = monotone(ts, ks.map((k) => Math.log(k.cells)), cut)
  return (t: number): Framing => {
    const i = n > 1 ? segOf(ts, Math.max(ts[0], Math.min(ts[n - 1], t))) : 0
    const j = Math.min(n - 1, i + 1)
    const a = ks[i]
    const b = ks[j]
    const cells = Math.exp(lc(t))
    // Before the first shot, after the last, or up to a cut: what the shot in force asks for, alone.
    const only = n === 1 || t <= ts[0] || t >= ts[n - 1] || cut[i]
    const k = t >= ts[n - 1] ? n - 1 : i
    if (only) {
      const s = ks[k]
      const p: Pt = s.at ?? subject(k, t)
      return { x: p[0], y: p[1], cells, focus: s.focus ?? (s.at ? undefined : hero(t)) }
    }
    const u = ease((t - ts[i]) / Math.max(1e-9, ts[j] - ts[i]))
    const H: Pt = [hx(t), hy(t)]
    let p: Pt
    if (a.at && b.at) p = H
    else if (!a.at && !b.at) {
      const pa = subject(i, t)
      const pb = subject(j, t)
      p = [pa[0] + (pb[0] - pa[0]) * u, pa[1] + (pb[1] - pa[1]) * u]
    } else {
      // A hold handing over to a track, or a track to a hold: the track's own curve, weighed in as the hold's goes out.
      const F = a.at ? subject(j, t) : subject(i, t)
      const w = a.at ? 1 - u : u
      p = [F[0] + (H[0] - F[0]) * w, F[1] + (H[1] - F[1]) * w]
    }
    const focus = (u < 0.5 ? a.focus : b.focus) ?? (a.at && b.at ? undefined : hero(t))
    return { x: p[0], y: p[1], cells, focus }
  }
}
