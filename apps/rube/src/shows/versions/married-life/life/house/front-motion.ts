import type { Pt, Seg } from '../../../../../parts'
import { G_EARTH } from '../physics'

/**
 * How the two of them move on the street side (the house builder's): positions as functions of show time, in world
 * cells, and a lane that follows one exactly at every moment that matters (a landing, a press, a stop) and closely
 * between. The fix-up and the end both build their lanes from these.
 */

export type Path = (T: number) => Pt

const clamp01 = (u: number) => Math.max(0, Math.min(1, u))

/** A cubic from x0 leaving at v0 (at t0) to x1 arriving at v1 (at t1), at T. Speeds in cells a second. */
export function cubic(T: number, t0: number, x0: number, v0: number, t1: number, x1: number, v1: number): number {
  const D = t1 - t0
  const u = clamp01((T - t0) / D)
  const u2 = u * u
  const u3 = u2 * u
  return (2 * u3 - 3 * u2 + 1) * x0 + (u3 - 2 * u2 + u) * D * v0 + (-2 * u3 + 3 * u2) * x1 + (u3 - u2) * D * v1
}

/** A flight under gravity from p0 at t0 to p1 at t1: the parabola that joins them in that time. */
export function flight(T: number, t0: number, p0: Pt, t1: number, p1: Pt, g = G_EARTH): Pt {
  const D = t1 - t0
  const u = clamp01((T - t0) / D)
  const lift = ((g * D * D) / 8) * 4 * u * (1 - u)
  return [p0[0] + (p1[0] - p0[0]) * u, p0[1] + (p1[1] - p0[1]) * u - lift]
}

/**
 * A careful step up (or down) from p0 at t0 to p1 at t1: an old man's, not a hop. It leaves and arrives at rest,
 * lifting a little over the edge on the way.
 */
export function stepUp(T: number, t0: number, p0: Pt, t1: number, p1: Pt, lift = 0.1): Pt {
  const u = clamp01((T - t0) / (t1 - t0))
  const s = u * u * (3 - 2 * u)
  const r = Math.min(1, u / 0.8)
  const rise = r * r * (3 - 2 * r)
  const over = Math.sin(Math.PI * u) ** 2
  return [p0[0] + (p1[0] - p0[0]) * s, p0[1] + (p1[1] - p0[1]) * rise - lift * over]
}

/** A crouch before a take-off: 0 until `lead` before it, gathering, and sprung out of in the first moment of the leap. */
export function crouch(T: number, takeoff: number, lead = 0.14): number {
  if (T <= takeoff - lead || T >= takeoff + 0.07) return 0
  if (T < takeoff) return Math.sin((Math.PI / 2) * ((T - (takeoff - lead)) / lead))
  const u = (T - takeoff) / 0.07
  return 1 - u * u * (3 - 2 * u)
}

/** A path in pieces: each piece holds until its end time; the last holds on. */
export function pieces(list: [number, Path][]): Path {
  return (T) => {
    for (const [end, fn] of list) if (T < end) return fn(T)
    return list[list.length - 1][1](T)
  }
}

/**
 * A lane that follows `path` (world cells) from t0 to t1, in the frame whose entry cell is `origin`: straight
 * pieces `rate` a second, and a piece boundary at every time in `breaks`, so each is exact.
 */
export function trace(path: Path, origin: Pt, t0: number, t1: number, breaks: number[], rate = 40): Seg[] {
  const ts = [t0, ...[...new Set(breaks)].filter((b) => b > t0 + 1e-6 && b < t1 - 1e-6).sort((a, b) => a - b), t1]
  const at = (T: number): Pt => {
    const [x, y] = path(T)
    return [x - origin[0], y - origin[1]]
  }
  const segs: Seg[] = []
  for (let i = 1; i < ts.length; i++) {
    const a = ts[i - 1]
    const b = ts[i]
    const n = Math.max(1, Math.ceil((b - a) * rate))
    for (let j = 0; j < n; j++) {
      const s0 = a + ((b - a) * j) / n
      const s1 = j === n - 1 ? b : a + ((b - a) * (j + 1)) / n
      segs.push({ from: at(s0), to: at(s1), dur: s1 - s0 })
    }
  }
  return segs
}
