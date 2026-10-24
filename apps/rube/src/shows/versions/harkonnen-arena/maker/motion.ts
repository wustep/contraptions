import { R } from '../../../../parts'
import type { Pt } from './paint'

/**
 * Where a ball is, as a function of show time: a list of moves end to end, each a pure function of time, so any frame
 * can be asked for in any order (scrubbing, a saved video, the checks).
 *
 * A move is a hold, a roll along a line or over the sand, a hop under gravity, or a ride on something that carries it
 * (a worm's back, a rope). Rolls ease from where the move before leaves off, so nothing starts or stops at once; hops
 * are true parabolas, so a ball thrown high hangs as long as it should.
 *
 * The dot on a ball turns as it rolls, by the distance rolled over its radius, and not otherwise: in a hop it keeps the
 * turn it left with, riding it turns with what carries it, and holding it may turn to look at something (`look`), as a
 * head does. The turns are added up once, at 120 a second, as far as they are asked for (`spinAt`).
 */

/** Gravity, cells per second per second. A cell is about seven metres of the desert, so this is film gravity. */
export const G = 14

export type Kind = 'hold' | 'roll' | 'hop' | 'ride'

export interface Move {
  t0: number
  t1: number
  kind: Kind
  /** Where the ball is at `t` (t0 ≤ t ≤ t1). */
  at(t: number): Pt
  /** For a ride: how far what carries it has turned at `t`, which the dot turns with. */
  turn?(t: number): number
  /** For a hold: the way to look, radians (0 is to the right, positive turns down on the screen). */
  look?: number
  /** Out of sight. */
  hidden?: boolean
  /** How big it is drawn, 1 normally. */
  scale?(t: number): number
}

const dist = (a: Pt, b: Pt) => Math.hypot(b[0] - a[0], b[1] - a[1])

/** A ball holding still at `p`; it may turn to look one way. */
export const hold = (p: Pt, t0: number, t1: number, look?: number): Move => ({ t0, t1, kind: 'hold', at: () => p, look })

/** The share of the way along at time share `u`: rest to rest, from rest, to rest, or steady. */
export type Ease = 'inout' | 'in' | 'out' | 'none'
export function eased(ease: Ease, u: number): number {
  if (ease === 'none') return u
  if (ease === 'in') return u * u
  if (ease === 'out') return 1 - (1 - u) * (1 - u)
  return u * u * (3 - 2 * u)
}

/** A roll along the polyline `pts` from `t0` to `t1`. */
export function roll(pts: Pt[], t0: number, t1: number, ease: Ease = 'inout'): Move {
  const lens: number[] = [0]
  for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + dist(pts[i - 1], pts[i]))
  const total = lens[lens.length - 1] || 1e-9
  const T = Math.max(1e-6, t1 - t0)
  return {
    t0,
    t1,
    kind: 'roll',
    at: (t) => {
      const s = eased(ease, Math.max(0, Math.min(1, (t - t0) / T))) * total
      let i = 1
      while (i < lens.length - 1 && lens[i] < s) i++
      const a = pts[i - 1]
      const b = pts[i]
      const f = (s - lens[i - 1]) / Math.max(1e-9, lens[i] - lens[i - 1])
      return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]
    },
  }
}

/**
 * A roll over ground: from `x0` to `x1`, on the surface `y(x)` (the ball's centre one radius above it, times `size`).
 * The pace eases by `ease` along x.
 */
export function over(ground: (x: number) => number, x0: number, x1: number, t0: number, t1: number, ease: Ease = 'inout', size = 1): Move {
  const T = Math.max(1e-6, t1 - t0)
  return {
    t0,
    t1,
    kind: 'roll',
    at: (t) => {
      const x = x0 + (x1 - x0) * eased(ease, Math.max(0, Math.min(1, (t - t0) / T)))
      return [x, ground(x) - R * size]
    },
  }
}

/** A hop from `a` at `t0` to `b` at `t1` under gravity `g`: the one parabola that does it in that time. */
export function hop(a: Pt, b: Pt, t0: number, t1: number, g = G): Move {
  const T = Math.max(1e-6, t1 - t0)
  const vx = (b[0] - a[0]) / T
  const vy = (b[1] - a[1] - 0.5 * g * T * T) / T
  return {
    t0,
    t1,
    kind: 'hop',
    at: (t) => {
      const s = Math.max(0, Math.min(T, t - t0))
      return [a[0] + vx * s, a[1] + vy * s + 0.5 * g * s * s]
    },
  }
}

/** Carried by something: where it holds the ball at `t`, and how far it has turned (the dot turns with it). */
export function ride(where: (t: number) => Pt, t0: number, t1: number, turn?: (t: number) => number): Move {
  return { t0, t1, kind: 'ride', at: where, turn }
}

/** Out of sight at `p` (inside something, or not yet come). */
export const hidden = (p: Pt, t0: number, t1: number): Move => ({ t0, t1, kind: 'hold', at: () => p, hidden: true })

export interface PathPoint {
  x: number
  y: number
  hidden: boolean
  scale: number
}

/** A ball's whole way: its moves end to end. Before the first it is at the first's start; after the last, its end. */
export class Path {
  readonly moves: Move[]
  readonly t0: number
  readonly t1: number
  private spins: Float64Array | null = null
  private spinUpTo = -1

  constructor(moves: Move[], readonly name = 'path', readonly size = 1) {
    this.moves = [...moves].sort((a, b) => a.t0 - b.t0)
    if (!this.moves.length) throw new Error(`${name}: no moves`)
    for (let i = 1; i < this.moves.length; i++) {
      const gap = this.moves[i].t0 - this.moves[i - 1].t1
      if (gap > 1e-6 || gap < -1e-6) throw new Error(`${name}: a ${gap > 0 ? 'gap' : 'overlap'} of ${Math.abs(gap).toFixed(3)} s at ${this.moves[i].t0.toFixed(3)}`)
    }
    this.t0 = this.moves[0].t0
    this.t1 = this.moves[this.moves.length - 1].t1
  }

  /** The move at `t`. */
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
    const time = Math.max(m.t0, Math.min(m.t1, t))
    const [x, y] = m.at(time)
    return { x, y, hidden: !!m.hidden, scale: m.scale ? m.scale(time) : 1 }
  }

  where(t: number): Pt {
    const p = this.at(t)
    return [p.x, p.y]
  }

  /**
   * The dot's turn at `t`: rolled distance over the radius while rolling, the carrier's own turn while riding, held in
   * a hop, eased round to `look` in a hold that has one. Added up at 120 a second from the path's start, as far as asked.
   */
  spinAt(t: number, r = R * this.size): number {
    const step = 1 / 120
    // One step past `t`, so the two steps it falls between are both added up.
    const n = Math.max(0, Math.ceil((Math.min(t, this.t1) - this.t0) / step)) + 1
    if (!this.spins) this.spins = new Float64Array(Math.ceil((this.t1 - this.t0) / step) + 2)
    const spins = this.spins
    if (this.spinUpTo < 0) {
      spins[0] = 0
      this.spinUpTo = 0
    }
    for (let i = this.spinUpTo + 1; i <= n && i < spins.length; i++) {
      const ta = this.t0 + (i - 1) * step
      const tb = this.t0 + i * step
      const m = this.moveAt(tb)
      let s = spins[i - 1]
      if (m.kind === 'roll') {
        const [ax, ay] = this.where(ta)
        const [bx, by] = this.where(tb)
        const d = Math.hypot(bx - ax, by - ay)
        s += (Math.sign(bx - ax) || 1) * d / r
      } else if (m.kind === 'ride' && m.turn) {
        s += m.turn(tb) - m.turn(Math.max(m.t0, ta))
      } else if (m.kind === 'hold' && m.look !== undefined) {
        // Turn towards the look by the short way round, at most a turn and a half a second.
        let d = m.look - s
        d = Math.atan2(Math.sin(d), Math.cos(d))
        const most = 9.4 * step
        s += Math.max(-most, Math.min(most, d * 0.12))
      }
      spins[i] = s
    }
    this.spinUpTo = Math.max(this.spinUpTo, Math.min(n, spins.length - 1))
    if (t <= this.t0) return spins[0]
    const i = Math.min(spins.length - 1, Math.floor((t - this.t0) / step))
    const f = Math.min(1, (t - this.t0) / step - i)
    const a = spins[i]
    const b = spins[Math.min(spins.length - 1, i + 1)]
    return a + (b - a) * f
  }
}
