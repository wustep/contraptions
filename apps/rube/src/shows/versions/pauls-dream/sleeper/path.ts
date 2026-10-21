import { R } from '../../../../parts'
import type { Pt } from './paint'

/**
 * Where a ball is, as a pure function of show time: a run of segments end to end, each one a rest, a roll, a hop under
 * gravity or a ride on something that carries it. Any frame can be asked for in any order (a scrub, a saved video, the
 * checks), and none of it remembers the last frame.
 *
 * A run is written with `Walk`, which starts each segment where the last one left the ball, at the time it left it,
 * so a run cannot jump by construction; only a ride hands the ball to a function of its own, and `Run.gaps` says where
 * one does not pick it up where the last left it.
 *
 * The mark on a ball turns as it rolls (by the distance over its radius, to the right clockwise) and at no other time:
 * riding, it turns with what carries it if that turns; in the air it keeps the spin it left with, letting it go
 * slowly; at rest it is still.
 */

/** Gravity, cells a second a second: every hop and fall in the show is under this one. */
export const G = 24

export type Kind = 'rest' | 'roll' | 'hop' | 'ride'

export interface Seg {
  t0: number
  t1: number
  kind: Kind
  at(t: number): Pt
  /** For a ride: how far what carries it has turned at `t` (the mark turns with it). */
  turn?(t: number): number
  /** Out of sight (inside a ship, a box). */
  hidden?: boolean
  /** How big it is drawn, 1 as itself (a ball far off in a ship's window is smaller). */
  size?(t: number): number
}

export type Ease = 'inout' | 'in' | 'out' | 'none'

const dist = (a: Pt, b: Pt) => Math.hypot(b[0] - a[0], b[1] - a[1])

/** The share of the way along at time share `u`: from rest to rest, from rest, to rest, or steady. */
function eased(e: Ease, u: number): number {
  if (e === 'none') return u
  if (e === 'in') return u * u
  if (e === 'out') return 1 - (1 - u) * (1 - u)
  return u * u * (3 - 2 * u)
}

/** Along the polyline `pts` by arc length `s`. */
function along(pts: Pt[], lens: number[], s: number): Pt {
  let i = 1
  while (i < lens.length - 1 && lens[i] < s) i++
  const a = pts[i - 1]
  const b = pts[i]
  const f = (s - lens[i - 1]) / Math.max(1e-9, lens[i] - lens[i - 1])
  return [a[0] + (b[0] - a[0]) * Math.max(0, Math.min(1, f)), a[1] + (b[1] - a[1]) * Math.max(0, Math.min(1, f))]
}

function lengths(pts: Pt[]): number[] {
  const lens = [0]
  for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + dist(pts[i - 1], pts[i]))
  return lens
}

export const rest = (p: Pt, t0: number, t1: number, extra: Partial<Seg> = {}): Seg => ({ t0, t1, kind: 'rest', at: () => p, ...extra })

export function roll(pts: Pt[], t0: number, t1: number, ease: Ease = 'inout', extra: Partial<Seg> = {}): Seg {
  const lens = lengths(pts)
  const total = lens[lens.length - 1]
  const T = Math.max(1e-6, t1 - t0)
  return { t0, t1, kind: 'roll', at: (t) => along(pts, lens, eased(ease, Math.max(0, Math.min(1, (t - t0) / T))) * total), ...extra }
}

/** A hop from `a` at `t0` to `b` at `t1` under G: the one parabola that does it in that time. */
export function hop(a: Pt, b: Pt, t0: number, t1: number, extra: Partial<Seg> = {}): Seg {
  const T = Math.max(1e-6, t1 - t0)
  const vx = (b[0] - a[0]) / T
  const vy = (b[1] - a[1] - 0.5 * G * T * T) / T
  return {
    t0,
    t1,
    kind: 'hop',
    at: (t) => {
      const s = Math.max(0, Math.min(T, t - t0))
      return [a[0] + vx * s, a[1] + vy * s + 0.5 * G * s * s]
    },
    ...extra,
  }
}

/** How long a hop from `a` to `b` takes if it rises `h` cells over the higher of the two. */
export function hopTime(a: Pt, b: Pt, h: number): number {
  const top = Math.min(a[1], b[1]) - Math.max(0, h)
  return Math.sqrt((2 * (a[1] - top)) / G) + Math.sqrt((2 * (b[1] - top)) / G)
}

/** How high a hop from `a` to `b` in `T` seconds rises over `a` (cells; up is positive). */
export function hopHeight(a: Pt, b: Pt, T: number): number {
  const vy = (b[1] - a[1] - 0.5 * G * T * T) / T
  const top = Math.max(0, Math.min(T, -vy / G))
  return -(vy * top + 0.5 * G * top * top)
}

export const ride = (at: (t: number) => Pt, t0: number, t1: number, turn?: (t: number) => number, extra: Partial<Seg> = {}): Seg => ({
  t0,
  t1,
  kind: 'ride',
  at,
  turn,
  ...extra,
})

/**
 * A run written as it happens: each step starts where the last one left the ball. `to` times are absolute show times.
 *
 *     new Walk([x, y], 12).wait(14).roll([[x2, y2]], 15.2).hop([x3, y3], 15.9).ride(onShip, 30).segs
 */
export class Walk {
  readonly segs: Seg[] = []
  private p: Pt
  private t: number

  constructor(from: Pt, t0: number) {
    this.p = from
    this.t = t0
  }

  get at(): Pt {
    return this.p
  }

  get time(): number {
    return this.t
  }

  /** Still where it is until `to`. */
  wait(to: number, extra: Partial<Seg> = {}): this {
    if (to > this.t + 1e-9) this.segs.push(rest(this.p, this.t, to, extra))
    this.t = Math.max(this.t, to)
    return this
  }

  /** Rolls through `pts` (from where it is), arriving at the last at `to`. */
  roll(pts: Pt[], to: number, ease: Ease = 'inout', extra: Partial<Seg> = {}): this {
    this.segs.push(roll([this.p, ...pts], this.t, to, ease, extra))
    this.p = pts[pts.length - 1]
    this.t = to
    return this
  }

  /** Hops to `b`, landing at `to`. */
  hop(b: Pt, to: number, extra: Partial<Seg> = {}): this {
    this.segs.push(hop(this.p, b, this.t, to, extra))
    this.p = b
    this.t = to
    return this
  }

  /** Carried by `at` until `to`; `at(now)` should be where it is. */
  ride(at: (t: number) => Pt, to: number, turn?: (t: number) => number, extra: Partial<Seg> = {}): this {
    this.segs.push(ride(at, this.t, to, turn, extra))
    this.p = at(to)
    this.t = to
    return this
  }

  /** Puts it somewhere else at once: only across a cut, where nothing sees it go. */
  jump(to: Pt): this {
    this.p = to
    return this
  }
}

export interface RunPoint {
  x: number
  y: number
  hidden: boolean
  size: number
  kind: Kind
}

/** Segments laid end to end, gaps allowed (the ball is off the stage in a gap). */
export class Run {
  readonly segs: Seg[]
  private spins: Float32Array | null = null
  private built = 0
  private readonly step = 1 / 120

  constructor(
    segs: Seg[],
    readonly name: string,
  ) {
    this.segs = [...segs].sort((a, b) => a.t0 - b.t0)
  }

  get t0(): number {
    return this.segs[0]?.t0 ?? 0
  }

  get t1(): number {
    return this.segs[this.segs.length - 1]?.t1 ?? 0
  }

  /** The segment that has it at `t`: the last to begin at or before it. */
  segAt(t: number): Seg | null {
    const s = this.segs
    if (!s.length) return null
    if (t <= s[0].t0) return s[0]
    let lo = 0
    let hi = s.length - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (s[mid].t0 <= t) lo = mid
      else hi = mid - 1
    }
    return s[lo]
  }

  /** Whether some segment holds `t` (it is on the stage). */
  covers(t: number): boolean {
    const g = this.segAt(t)
    return !!g && t >= g.t0 - 1e-9 && t <= g.t1 + 1e-9
  }

  at(t: number): RunPoint {
    const g = this.segAt(t)
    if (!g) return { x: 0, y: 0, hidden: true, size: 0, kind: 'rest' }
    const tt = Math.max(g.t0, Math.min(g.t1, t))
    const [x, y] = g.at(tt)
    return { x, y, hidden: !!g.hidden, size: g.size ? g.size(tt) : 1, kind: g.kind }
  }

  where(t: number): Pt {
    const g = this.segAt(t)
    if (!g) return [0, 0]
    return g.at(Math.max(g.t0, Math.min(g.t1, t)))
  }

  /** Every place one segment does not begin where and when the last one ended: [time, cells, seconds]. */
  gaps(): [number, number, number][] {
    const out: [number, number, number][] = []
    for (let i = 1; i < this.segs.length; i++) {
      const a = this.segs[i - 1]
      const b = this.segs[i]
      const d = dist(a.at(a.t1), b.at(b.t0))
      if (d > 1e-3 || Math.abs(b.t0 - a.t1) > 1e-6) out.push([b.t0, d, b.t0 - a.t1])
    }
    return out
  }

  /** The mark's angle at `t` (radians), worked out at 1/120 s as far as it has been asked for. */
  spin(t: number, r = R): number {
    const f = (t - this.t0) / this.step
    const i = Math.max(0, Math.floor(f))
    this.build(i + 2, r)
    const n = this.spins!.length
    const j = Math.max(0, Math.min(n - 2, i))
    const u = Math.max(0, Math.min(1, f - j))
    return this.spins![j] + (this.spins![j + 1] - this.spins![j]) * u
  }

  private angle = 0
  private omega = 0
  private prev: Pt = [0, 0]
  private prevSeg: Seg | null = null
  private prevTurn = 0

  private build(want: number, r: number): void {
    if (!this.spins) {
      this.spins = new Float32Array(Math.max(2, Math.ceil((this.t1 - this.t0) / this.step) + 3))
      this.prev = this.where(this.t0)
      this.prevSeg = this.segAt(this.t0)
      this.prevTurn = this.prevSeg?.turn ? this.prevSeg.turn(this.t0) : 0
      this.built = 1
    }
    const out = this.spins
    const end = Math.min(out.length, want + 1)
    for (let i = this.built; i < end; i++) {
      const t = this.t0 + i * this.step
      const g = this.segAt(t)
      const p = this.where(t)
      const dx = p[0] - this.prev[0]
      const dy = p[1] - this.prev[1]
      const sameSeg = g === this.prevSeg
      if (!g || !this.covers(t)) {
        this.omega = 0
      } else if (g.kind === 'roll' && sameSeg) {
        const d = Math.hypot(dx, dy)
        const turn = (Math.abs(dx) > 1e-9 ? Math.sign(dx) : 0) * (d / r)
        this.angle += turn
        this.omega = turn / this.step
      } else if (g.kind === 'ride') {
        const turn = g.turn ? g.turn(t) : 0
        if (sameSeg) this.angle += turn - this.prevTurn
        this.prevTurn = turn
        this.omega = 0
      } else if (g.kind === 'hop') {
        this.angle += this.omega * this.step
        this.omega *= Math.exp(-this.step / 2)
      } else {
        this.omega = 0
      }
      if (!sameSeg && g?.turn) this.prevTurn = g.turn(t)
      this.prevSeg = g
      this.prev = p
      out[i] = this.angle
    }
    this.built = Math.max(this.built, end)
  }
}
