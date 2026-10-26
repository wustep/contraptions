import { R } from '../../../../parts'
import type { Pt } from './paint'

/**
 * Where a ball is, as a function of show time: moves laid end to end, each a pure function of time, so any frame can be
 * asked for in any order (scrubbing, a saved video, the checks).
 *
 * A move is a rest, a roll along a line, a hop (a true parabola under one gravity), a glide (a smooth carry along a
 * curve, for what the spirit world holds up: a float down steps, a fall that a river spirit slows), or a ride on
 * something that moves on its own clock (a train, a dragon, a rope). Rolls ease from and to the speeds round them, so
 * nothing starts or stops at once.
 *
 * The mark on a ball turns only as it rolls, by the distance rolled over its radius; on a ride it turns with what
 * carries it, in the air it keeps the turn it had, at rest it is still (`Path.spin`).
 */

/** Gravity, cells per second per second. */
export const G = 22

export type Kind = 'rest' | 'roll' | 'hop' | 'glide' | 'ride'

export interface Move {
  t0: number
  t1: number
  kind: Kind
  at(t: number): Pt
  /** For a ride: the angle the carrier is turned to at `t`, which the ball's mark turns with. */
  turn?(t: number): number
  /** How big it is drawn, 1 normally (a ball far down a tunnel's dark). */
  scale?(t: number): number
}

const dist = (a: Pt, b: Pt) => Math.hypot(b[0] - a[0], b[1] - a[1])

export const rest = (p: Pt, t0: number, t1: number, extra: Partial<Move> = {}): Move => ({ t0, t1, kind: 'rest', at: () => p, ...extra })

export type Ease = 'inout' | 'in' | 'out' | 'none'

/** The share of the way along at time share `u`: from rest to rest, from rest to twice the mean speed, the other way, or steady. */
export function eased(ease: Ease, u: number): number {
  if (ease === 'none') return u
  if (ease === 'in') return u * u
  if (ease === 'out') return 1 - (1 - u) * (1 - u)
  return u * u * (3 - 2 * u)
}

/** A point `s` of the way along the polyline `pts` (by length). */
export function along(pts: Pt[], s: number): Pt {
  const lens: number[] = [0]
  for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + dist(pts[i - 1], pts[i]))
  const total = lens[lens.length - 1] || 1e-9
  const d = Math.max(0, Math.min(1, s)) * total
  let i = 1
  while (i < lens.length - 1 && lens[i] < d) i++
  const a = pts[i - 1]
  const b = pts[i]
  const f = (d - lens[i - 1]) / Math.max(1e-9, lens[i] - lens[i - 1])
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]
}

/** A roll along `pts` from `t0` to `t1`. */
export function roll(pts: Pt[], t0: number, t1: number, ease: Ease = 'inout', extra: Partial<Move> = {}): Move {
  const T = Math.max(1e-6, t1 - t0)
  return { t0, t1, kind: 'roll', at: (t) => along(pts, eased(ease, Math.max(0, Math.min(1, (t - t0) / T)))), ...extra }
}

/** A hop from `a` at `t0` to `b` at `t1` under gravity: the one parabola that does it in that time. */
export function hop(a: Pt, b: Pt, t0: number, t1: number, extra: Partial<Move> = {}): Move {
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

/** The time a hop from `a` to `b` takes to rise `h` cells over the higher of the two. */
export function hopTime(a: Pt, b: Pt, h: number): number {
  const top = Math.min(a[1], b[1]) - h
  return Math.sqrt((2 * (a[1] - top)) / G) + Math.sqrt((2 * (b[1] - top)) / G)
}

/** How long a fall of `h` cells from rest takes. */
export const fallTime = (h: number): number => Math.sqrt((2 * Math.max(0, h)) / G)

/** A cubic Bézier through a, c1, c2, b at `u`. */
export function bez(a: Pt, c1: Pt, c2: Pt, b: Pt, u: number): Pt {
  const v = 1 - u
  const A = v * v * v
  const B = 3 * v * v * u
  const C = 3 * v * u * u
  const D = u * u * u
  return [A * a[0] + B * c1[0] + C * c2[0] + D * b[0], A * a[1] + B * c1[1] + C * c2[1] + D * b[1]]
}

/** A glide from `a` to `b` along a Bézier with handles `c1`, `c2`, eased: carried, not thrown. */
export function glide(a: Pt, c1: Pt, c2: Pt, b: Pt, t0: number, t1: number, ease: Ease = 'inout', extra: Partial<Move> = {}): Move {
  const T = Math.max(1e-6, t1 - t0)
  return { t0, t1, kind: 'glide', at: (t) => bez(a, c1, c2, b, eased(ease, Math.max(0, Math.min(1, (t - t0) / T)))), ...extra }
}

/** A ride on something that moves on its own clock: the ball is where `at(t)` says, turned with `turn(t)`. */
export const ride = (at: (t: number) => Pt, t0: number, t1: number, turn?: (t: number) => number, extra: Partial<Move> = {}): Move => ({
  t0,
  t1,
  kind: 'ride',
  at,
  turn,
  ...extra,
})

/** A step down (or up) a flight of stairs a step a time: hops from each tread to the next at the times given. */
export function steps(treads: Pt[], times: number[], air: number): Move[] {
  const out: Move[] = []
  for (let i = 0; i + 1 < treads.length; i++) {
    const t = times[i]
    const land = Math.min(t + air, times[i + 1] ?? t + air)
    out.push(hop(treads[i], treads[i + 1], t, land))
    if (i + 2 < treads.length) out.push(rest(treads[i + 1], land, times[i + 1]))
  }
  return out
}

export interface PathPoint {
  x: number
  y: number
  scale: number
  kind: Kind
}

/**
 * Moves laid end to end. Each must begin where and when the one before it ended (`seams` says where one does not, so
 * a jump is found where it is made).
 */
export class Path {
  readonly moves: Move[]
  private spins: Float32Array | null = null
  private readonly step = 1 / 120

  constructor(
    moves: Move[],
    readonly name: string,
  ) {
    this.moves = [...moves].filter((m) => m.t1 >= m.t0).sort((a, b) => a.t0 - b.t0)
  }

  get t0(): number {
    return this.moves[0]?.t0 ?? 0
  }

  get t1(): number {
    return this.moves[this.moves.length - 1]?.t1 ?? 0
  }

  moveAt(t: number): Move {
    const ms = this.moves
    if (t <= ms[0].t0) return ms[0]
    let lo = 0
    let hi = ms.length - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (ms[mid].t0 <= t) lo = mid
      else hi = mid - 1
    }
    return ms[lo]
  }

  at(t: number): PathPoint {
    const m = this.moveAt(t)
    const tt = Math.max(m.t0, Math.min(m.t1, t))
    const [x, y] = m.at(tt)
    return { x, y, scale: m.scale ? m.scale(tt) : 1, kind: m.kind }
  }

  where(t: number): Pt {
    const m = this.moveAt(t)
    return m.at(Math.max(m.t0, Math.min(m.t1, t)))
  }

  /** Every seam where a move does not begin where and when the last one ended: `[time, gap in cells, gap in s]`. */
  seams(): [number, number, number][] {
    const out: [number, number, number][] = []
    for (let i = 1; i < this.moves.length; i++) {
      const a = this.moves[i - 1]
      const b = this.moves[i]
      const d = dist(a.at(a.t1), b.at(b.t0))
      if (d > 1e-3 || Math.abs(b.t0 - a.t1) > 1e-6) out.push([b.t0, d, b.t0 - a.t1])
    }
    return out
  }

  /**
   * The mark's angle at `t`, integrated at 1/120 s as far as it has been asked for and no further: a roll turns it by
   * the signed distance over the radius (rightwards is clockwise on the screen), a ride turns it with its carrier, a
   * hop or a glide keeps the spin it had (slowly letting it go), a rest holds it.
   */
  spin(t: number, r = R): number {
    const f = (t - this.t0) / this.step
    const i = Math.max(0, Math.floor(f))
    this.buildTo(i + 1, r)
    const n = this.spinsLen
    const j = Math.max(0, Math.min(n - 2, i))
    const u = Math.max(0, Math.min(1, f - j))
    return this.spins![j] + (this.spins![j + 1] - this.spins![j]) * u
  }

  private spinsLen = 0
  private built = 0
  private sAngle = 0
  private sOmega = 0
  private sPrev: Pt = [0, 0]
  private sPrevMove: Move | null = null
  private sPrevTurn = 0

  private buildTo(want: number, r: number): void {
    if (!this.spins) {
      this.spinsLen = Math.max(2, Math.ceil((this.t1 - this.t0) / this.step) + 2)
      this.spins = new Float32Array(this.spinsLen)
      this.sPrev = this.where(this.t0)
      this.sPrevMove = this.moveAt(this.t0)
      this.sPrevTurn = this.sPrevMove.turn ? this.sPrevMove.turn(this.t0) : 0
      this.built = 1
    }
    const out = this.spins
    const end = Math.min(this.spinsLen, want + 1)
    for (let i = this.built; i < end; i++) {
      const t = this.t0 + i * this.step
      const m = this.moveAt(t)
      const p = this.where(t)
      const dx = p[0] - this.sPrev[0]
      const dy = p[1] - this.sPrev[1]
      if (m.kind === 'roll') {
        const d = Math.hypot(dx, dy)
        const sign = Math.abs(dx) > 1e-9 ? Math.sign(dx) : 0
        const dTheta = (sign * d) / r
        this.sAngle += dTheta
        this.sOmega = dTheta / this.step
      } else if (m.kind === 'ride') {
        const turn = m.turn ? m.turn(t) : 0
        if (m === this.sPrevMove) this.sAngle += turn - this.sPrevTurn
        this.sPrevTurn = turn
        this.sOmega = 0
      } else if (m.kind === 'hop' || m.kind === 'glide') {
        this.sAngle += this.sOmega * this.step
        this.sOmega *= Math.exp(-this.step / 1.5)
      } else {
        this.sOmega = 0
      }
      if (m !== this.sPrevMove && m.turn) this.sPrevTurn = m.turn(t)
      this.sPrevMove = m
      this.sPrev = p
      out[i] = this.sAngle
    }
    this.built = Math.max(this.built, end)
  }
}
