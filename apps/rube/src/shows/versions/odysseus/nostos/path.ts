import { R } from '../../../../parts'

/**
 * Where a ball is, as a function of show time: a list of moves end to end, each a pure function of time, so any frame
 * can be asked for in any order (scrubbing, a saved video, the checks).
 *
 * A move is a rest, a roll along a line, a flight under gravity, or a ride on something that carries it (the ship,
 * the raft, a bucket on a beam). Rolls are paced by a speed profile that starts and ends where the move before and the
 * move after have it, so nothing in the show starts or stops at once; flights are true parabolas under one gravity, so
 * a ball thrown high hangs as long as it should.
 *
 * The mark on a ball turns as it rolls, by the distance it has rolled over its radius, and not otherwise: on the ship
 * it turns with the ship, in flight it keeps the turn it left with, at rest it is still (`spinTable`).
 */

export type Pt = [number, number]

/** Gravity, cells per second per second: what every flight and fall in the show is drawn under. */
export const G = 26

export type Kind = 'rest' | 'roll' | 'fly' | 'ride'

export interface Move {
  t0: number
  t1: number
  kind: Kind
  /** Where the ball is at show time `t` (t0 ≤ t ≤ t1). */
  at(t: number): Pt
  /** For a ride: the angle the carrier is turned to at `t`, which the ball's mark turns with. */
  turn?(t: number): number
  /** Out of sight (inside the horse, under the ram's fleece). */
  hidden?: boolean
  /** How big it is drawn, 1 normally. */
  scale?(t: number): number
}

const len = (a: Pt, b: Pt) => Math.hypot(b[0] - a[0], b[1] - a[1])

/** A ball at rest at `p` from `t0` to `t1`. */
export const rest = (p: Pt, t0: number, t1: number, extra: Partial<Move> = {}): Move => ({ t0, t1, kind: 'rest', at: () => p, ...extra })

/**
 * A roll along the polyline `pts` from `t0` to `t1`, its speed changing linearly from `v0` to `v1` (cells a second)
 * where both are given and add up to the distance; otherwise eased: 'inout' (from rest to rest), 'in' (from rest,
 * leaving at speed), 'out' (arriving at speed, coming to rest), or 'none' (steady).
 */
export function roll(pts: Pt[], t0: number, t1: number, ease: 'inout' | 'in' | 'out' | 'none' = 'inout', extra: Partial<Move> = {}): Move {
  const lens: number[] = [0]
  for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + len(pts[i - 1], pts[i]))
  const total = lens[lens.length - 1] || 1e-9
  const T = Math.max(1e-6, t1 - t0)
  return {
    t0,
    t1,
    kind: 'roll',
    at: (t) => {
      const u = Math.max(0, Math.min(1, (t - t0) / T))
      const s = shapeOf(ease, u) * total
      let i = 1
      while (i < lens.length - 1 && lens[i] < s) i++
      const a = pts[i - 1]
      const b = pts[i]
      const f = (s - lens[i - 1]) / Math.max(1e-9, lens[i] - lens[i - 1])
      return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]
    },
    ...extra,
  }
}

/**
 * The share of the way along at time share `u`, for the four kinds of roll: smoothstep from rest to rest; a quadratic
 * start from rest to twice the mean speed; a quadratic slowing from twice the mean speed to rest; or steady.
 */
function shapeOf(ease: 'inout' | 'in' | 'out' | 'none', u: number): number {
  if (ease === 'none') return u
  if (ease === 'in') return u * u
  if (ease === 'out') return 1 - (1 - u) * (1 - u)
  return u * u * (3 - 2 * u)
}

/** A roll at a speed changing linearly from `v0` to `v1` along `pts`; its time is the distance over the mean speed. */
export function ramp(pts: Pt[], t0: number, v0: number, v1: number, extra: Partial<Move> = {}): Move {
  let total = 0
  for (let i = 1; i < pts.length; i++) total += len(pts[i - 1], pts[i])
  const T = total / Math.max(1e-6, (v0 + v1) / 2)
  const lens: number[] = [0]
  for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + len(pts[i - 1], pts[i]))
  return {
    t0,
    t1: t0 + T,
    kind: 'roll',
    at: (t) => {
      const tt = Math.max(0, Math.min(T, t - t0))
      const s = Math.min(total, v0 * tt + ((v1 - v0) / (2 * T)) * tt * tt)
      let i = 1
      while (i < lens.length - 1 && lens[i] < s) i++
      const a = pts[i - 1]
      const b = pts[i]
      const f = (s - lens[i - 1]) / Math.max(1e-9, lens[i] - lens[i - 1])
      return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]
    },
    ...extra,
  }
}

/** A flight from `a` at `t0` to `b` at `t1` under gravity: the one parabola that does it in that time. */
export function fly(a: Pt, b: Pt, t0: number, t1: number, extra: Partial<Move> = {}): Move {
  const T = Math.max(1e-6, t1 - t0)
  const vx = (b[0] - a[0]) / T
  const vy = (b[1] - a[1] - 0.5 * G * T * T) / T
  return {
    t0,
    t1,
    kind: 'fly',
    at: (t) => {
      const s = Math.max(0, Math.min(T, t - t0))
      return [a[0] + vx * s, a[1] + vy * s + 0.5 * G * s * s]
    },
    ...extra,
  }
}

/** How long a fall of `h` cells from rest takes under G. */
export const fallTime = (h: number): number => Math.sqrt((2 * Math.max(0, h)) / G)

/** The highest point of the flight `fly(a, b, t0, t1)` above `a`, in cells (positive is up). */
export function apex(a: Pt, b: Pt, T: number): number {
  const vy = (b[1] - a[1] - 0.5 * G * T * T) / T
  const tPeak = Math.max(0, Math.min(T, -vy / G))
  return -(vy * tPeak + 0.5 * G * tPeak * tPeak)
}

/** The flight time from `a` to `b` that peaks `h` cells above the higher of the two. */
export function flightFor(a: Pt, b: Pt, h: number): number {
  const top = Math.min(a[1], b[1]) - h
  const up = Math.sqrt((2 * (a[1] - top)) / G)
  const down = Math.sqrt((2 * (b[1] - top)) / G)
  return up + down
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

export interface PathPoint {
  x: number
  y: number
  hidden: boolean
  scale: number
  kind: Kind
}

/**
 * Moves laid end to end. Each must begin where the one before it ended, at the time it ended; the path says so at once
 * when it is built (`seams`), so a jump is found where it is made.
 */
export class Path {
  readonly moves: Move[]
  private spins: Float32Array | null = null
  private readonly step = 1 / 120

  constructor(
    moves: Move[],
    readonly name: string,
  ) {
    this.moves = [...moves].sort((a, b) => a.t0 - b.t0)
  }

  get t0(): number {
    return this.moves[0]?.t0 ?? 0
  }

  get t1(): number {
    return this.moves[this.moves.length - 1]?.t1 ?? 0
  }

  /** The move that has the ball at `t`: the last to begin at or before it, clamped to the ends. */
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
    return { x, y, hidden: !!m.hidden, scale: m.scale ? m.scale(tt) : 1, kind: m.kind }
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
      const pa = a.at(a.t1)
      const pb = b.at(b.t0)
      const d = len(pa, pb)
      if (d > 1e-3 || Math.abs(b.t0 - a.t1) > 1e-6) out.push([b.t0, d, b.t0 - a.t1])
    }
    return out
  }

  /**
   * The mark's angle at `t`. Built at 1/120 s, as far as it has been asked for and no further, so a ball that first
   * comes on late in the show costs its first frame nothing: a roll turns it by the signed distance rolled over the
   * radius (to the right is clockwise on the screen), a ride turns it with what carries it, a flight keeps the spin it
   * left with (slowly letting it go), a rest holds it.
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
      this.spins[0] = 0
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
        // Rolling along the ground under it: rightwards turns it clockwise.
        const sign = Math.abs(dx) > 1e-9 ? Math.sign(dx) : 0
        const dTheta = (sign * d) / r
        this.sAngle += dTheta
        this.sOmega = dTheta / this.step
      } else if (m.kind === 'ride') {
        const turn = m.turn ? m.turn(t) : 0
        if (m === this.sPrevMove) this.sAngle += turn - this.sPrevTurn
        this.sPrevTurn = turn
        this.sOmega = 0
      } else if (m.kind === 'fly') {
        this.sAngle += this.sOmega * this.step
        this.sOmega *= Math.exp(-this.step / 2.5)
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
