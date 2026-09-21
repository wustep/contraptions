import type p5 from 'p5'
import { solid } from '../../../../../../src/core/draw'
import type { Pt } from '../../../parts'

/**
 * What the mountain's ways down share: a slope is one line, the thing on it
 * is somewhere along that line, and its pace is the slope's. A `Track` is
 * that line by its own length; a `Ride` is a run along it under a cartoon
 * gravity and a drag, worked out once, that both the lane and the drawing
 * read, so nothing on a slope is ever off it.
 */

/** A corner of a slope's line and how round it is turned. */
export type Corner = [x: number, y: number, r?: number]

/**
 * The line through `corners`, each one turned on a circle of its own radius
 * tangent to both sides, as points a hundredth of a cell apart or less. A
 * slope is straights and curves and nothing else, so its pace never jumps.
 */
const ml0 = (x: number, y: number) => Math.hypot(x, y)

export function rounded(corners: Corner[], step = 0.01): Pt[] {
  const out: Pt[] = []
  const push = (x: number, y: number) => {
    const last = out[out.length - 1]
    if (!last || Math.hypot(last[0] - x, last[1] - y) > 1e-9) out.push([x, y])
  }
  const line = (a: Pt, b: Pt) => {
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step))
    for (let i = 0; i <= n; i++) push(a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n)
  }
  let from: Pt = [corners[0][0], corners[0][1]]
  for (let i = 1; i < corners.length - 1; i++) {
    const [cx, cy, r = 0] = corners[i]
    const ax = corners[i - 1][0] - cx
    const ay = corners[i - 1][1] - cy
    const bx = corners[i + 1][0] - cx
    const by = corners[i + 1][1] - cy
    const la = Math.hypot(ax, ay)
    const lb = Math.hypot(bx, by)
    const half = Math.acos(Math.max(-1, Math.min(1, (ax * bx + ay * by) / (la * lb)))) / 2
    // How far back from the corner the curve begins, held to what either side has room for.
    const back = Math.min(r / Math.tan(half), la * 0.49, lb * 0.49)
    const rr = back * Math.tan(half)
    if (!(rr > 1e-6) || !(ml0(ax / la + bx / lb, ay / la + by / lb) > 1e-9)) {
      line(from, [cx, cy])
      from = [cx, cy]
      continue
    }
    const p0: Pt = [cx + (ax / la) * back, cy + (ay / la) * back]
    const p1: Pt = [cx + (bx / lb) * back, cy + (by / lb) * back]
    const mx = ax / la + bx / lb
    const my = ay / la + by / lb
    const ml = Math.hypot(mx, my)
    const d = rr / Math.sin(half)
    const ox = cx + (mx / ml) * d
    const oy = cy + (my / ml) * d
    line(from, p0)
    let a0 = Math.atan2(p0[1] - oy, p0[0] - ox)
    let a1 = Math.atan2(p1[1] - oy, p1[0] - ox)
    if (a1 - a0 > Math.PI) a1 -= Math.PI * 2
    if (a0 - a1 > Math.PI) a0 -= Math.PI * 2
    const n = Math.max(2, Math.ceil((Math.abs(a1 - a0) * rr) / step))
    for (let j = 1; j <= n; j++) {
      const a = a0 + ((a1 - a0) * j) / n
      push(ox + Math.cos(a) * rr, oy + Math.sin(a) * rr)
    }
    from = p1
  }
  const end = corners[corners.length - 1]
  line(from, [end[0], end[1]])
  return out
}

export interface Track {
  pts: Pt[]
  length: number
  /**
   * The point `off` cells out from the line on its upper side, `s` cells
   * along it, and the slope there: radians, y down, positive where the line
   * falls the way it runs.
   */
  at(s: number, off?: number): { at: Pt; slope: number }
  /** How far along the line it first reaches `x`. */
  reach(x: number): number
}

export function trackOf(pts: Pt[]): Track {
  const acc: number[] = [0]
  for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))
  const length = acc[acc.length - 1]
  // The slope at each point is the line's through its neighbours, so it turns smoothly between them.
  const slopes = pts.map((_, i) => {
    const a = pts[Math.max(0, i - 1)]
    const b = pts[Math.min(pts.length - 1, i + 1)]
    return Math.atan2(b[1] - a[1], b[0] - a[0])
  })
  const at = (s: number, off = 0): { at: Pt; slope: number } => {
    const want = Math.max(0, Math.min(length, s))
    let lo = 0
    let hi = pts.length - 1
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1
      if (acc[mid] <= want) lo = mid
      else hi = mid
    }
    const f = acc[hi] > acc[lo] ? (want - acc[lo]) / (acc[hi] - acc[lo]) : 0
    const slope = slopes[lo] + (slopes[hi] - slopes[lo]) * f
    const x = pts[lo][0] + (pts[hi][0] - pts[lo][0]) * f
    const y = pts[lo][1] + (pts[hi][1] - pts[lo][1]) * f
    return { at: [x + off * Math.sin(slope), y - off * Math.cos(slope)], slope }
  }
  const reach = (x: number): number => {
    for (let i = 1; i < pts.length; i++) {
      if (pts[i - 1][0] <= x && pts[i][0] >= x && pts[i][0] > pts[i - 1][0]) return acc[i - 1] + ((acc[i] - acc[i - 1]) * (x - pts[i - 1][0])) / (pts[i][0] - pts[i - 1][0])
    }
    return length
  }
  return { pts, length, at, reach }
}

export interface Ride {
  /** Seconds the ride lasts. */
  dur: number
  /** How far along the track, and how fast, `t` seconds in; held at the ends. */
  s(t: number): number
  v(t: number): number
}

/**
 * A run along `track` from `s0` at pace `v0`: gravity along the slope, a drag
 * on the pace, and whatever else `push` adds (a brake, soft snow), a 480th
 * of a second at a time, until `done` says so. The pace may go negative: a
 * thing that runs up a wall comes back down it.
 */
export function ride(track: Track, s0: number, v0: number, g: number, drag: number, done: (s: number, v: number, t: number) => boolean, push?: (s: number, v: number) => number): Ride {
  const DT = 1 / 480
  const S: number[] = [s0]
  const V: number[] = [v0]
  let s = s0
  let v = v0
  while (S.length < 480 * 8) {
    v += (g * Math.sin(track.at(s).slope) - drag * v + (push ? push(s, v) : 0)) * DT
    s = Math.max(0, Math.min(track.length, s + v * DT))
    S.push(s)
    V.push(v)
    if (done(s, v, (S.length - 1) * DT)) break
  }
  const last = S.length - 1
  const read = (arr: number[], t: number): number => {
    const f = Math.max(0, Math.min(last, t / DT))
    const i = Math.floor(f)
    return arr[i] + (arr[Math.min(last, i + 1)] - arr[i]) * (f - i)
  }
  return { dur: last * DT, s: (t) => read(S, t), v: (t) => read(V, t) }
}

/**
 * A body of snow, rock or ice: `fill` inside one ink line, along `top` (left
 * to right) and closed along `floor` beneath. With `tail`, the underside
 * leaves the floor there and rises to meet the top's last point, so a hill
 * thins to nothing where the snow's own line takes over and does not end in
 * a sill at its cell's edge.
 */
export function body(p: p5, k: number, ink: string, weight: number, fill: string, top: Pt[], floor: number, tail?: number): void {
  const last = top[top.length - 1]
  solid(p, ink, weight, fill)
  p.beginShape()
  p.vertex(top[0][0] * k, floor * k)
  for (const [x, y] of top) p.vertex(x * k, y * k)
  if (tail === undefined) p.vertex(last[0] * k, floor * k)
  else p.bezierVertex(((last[0] + tail) / 2) * k, last[1] * k, ((last[0] + tail) / 2) * k, floor * k, tail * k, floor * k)
  p.endShape(p.CLOSE)
}

/** Lumps of snow lying where they fell: `at` are their places on the ground, `r` their sizes. */
export function lumps(p: p5, k: number, ink: string, weight: number, white: string, at: [x: number, y: number, r: number][]): void {
  solid(p, ink, weight * 0.8, white)
  for (const [x, y, r] of at) p.circle(x * k, (y - r * 0.8) * k, r * 2 * k)
}
