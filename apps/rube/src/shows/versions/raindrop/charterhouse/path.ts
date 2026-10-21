import { R, type Pt } from '../../../../parts'

/**
 * The ball's one path, as a list of moves laid end to end in show time. Each move starts where the last ended and
 * is pinned to the music at both ends, so a landing, a tip or a knock is on its note by construction.
 *
 * - `roll`: along a polyline (cells), its pace a cubic from `v0` to `v1` cells a second (left out, the move's mean
 *   pace), so a hand-off between two rolls need not jump.
 * - `fly`: a flight under gravity from where it is to `to`, landing at the move's end exactly.
 * - `hide`: out of sight inside something (a pipe), from where it is to `to`.
 * - `ride`: carried: wherever `fn(t)` says (a bucket, a pot on the wheel, a lever's cradle).
 * - `rest`: still.
 *
 * How far the ball has turned (`turned`, radians) is the distance it has rolled along x, over its radius: what the
 * stage spins its mark by. In flight it keeps the spin it left with; carried or at rest it keeps its face.
 */

export type Move =
  | { kind: 'roll'; t0: number; t1: number; pts: Pt[]; v0?: number; v1?: number }
  | { kind: 'fly'; t0: number; t1: number; from: Pt; to: Pt; g: number }
  | { kind: 'hide'; t0: number; t1: number; from: Pt; to: Pt }
  | { kind: 'ride'; t0: number; t1: number; fn: (t: number) => Pt; hidden?: boolean }
  | { kind: 'rest'; t0: number; t1: number; at: Pt }

export interface BallAt {
  x: number
  y: number
  /** Direction of travel, radians. */
  angle: number
  /** Cells a second. */
  speed: number
  hidden: boolean
  /** Which move has it. */
  move: number
}

/** Cells a second squared: the show's gravity (a cell is a quarter of a metre, and the film a little slow). */
export const G = 30

interface Rolled {
  lens: number[]
  total: number
}

const lengths = (pts: Pt[]): Rolled => {
  const lens: number[] = []
  let total = 0
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])
    lens.push(d)
    total += d
  }
  return { lens, total }
}

/** A point `s` cells along a polyline, with the direction it runs there and the signed x it has covered. */
function along(pts: Pt[], r: Rolled, s: number): { p: Pt; a: number; dx: number } {
  let left = Math.max(0, Math.min(r.total, s))
  let dx = 0
  for (let i = 0; i < r.lens.length; i++) {
    const L = r.lens[i]
    const [ax, ay] = pts[i]
    const [bx, by] = pts[i + 1]
    if (left <= L || i === r.lens.length - 1) {
      const f = L > 0 ? Math.min(1, left / L) : 1
      return { p: [ax + (bx - ax) * f, ay + (by - ay) * f], a: Math.atan2(by - ay, bx - ax), dx: dx + (bx - ax) * f }
    }
    left -= L
    dx += bx - ax
  }
  return { p: pts[pts.length - 1], a: 0, dx }
}

/** Cubic Hermite from 0 to 1 with end slopes `m0`, `m1`: how far along a roll is at `u` of its time. */
const hermite = (u: number, m0: number, m1: number): number => {
  const u2 = u * u
  const u3 = u2 * u
  return (u3 - 2 * u2 + u) * m0 + (-2 * u3 + 3 * u2) + (u3 - u2) * m1
}
const hermiteD = (u: number, m0: number, m1: number): number => {
  const u2 = u * u
  return (3 * u2 - 4 * u + 1) * m0 + (-6 * u2 + 6 * u) + (3 * u2 - 2 * u) * m1
}

export class BallPath {
  readonly moves: Move[]
  private readonly rolled: (Rolled | null)[]
  private readonly turnedAt: number[]
  private readonly flyV: (Pt | null)[]

  constructor(moves: Move[]) {
    this.moves = moves
    this.rolled = moves.map((m) => (m.kind === 'roll' ? lengths(m.pts) : null))
    this.flyV = moves.map((m) => {
      if (m.kind !== 'fly') return null
      const T = m.t1 - m.t0
      return [(m.to[0] - m.from[0]) / T, (m.to[1] - m.from[1]) / T - (m.g * T) / 2]
    })
    // Turn at each move's start, summed from the moves before it.
    this.turnedAt = []
    let turned = 0
    let spin = 0
    for (let i = 0; i < moves.length; i++) {
      this.turnedAt.push(turned)
      const m = moves[i]
      if (m.kind === 'roll') {
        const r = this.rolled[i]!
        turned += along(m.pts, r, r.total).dx / R
        const T = m.t1 - m.t0
        const last = m.pts.length - 1
        const dir = Math.sign(m.pts[last][0] - m.pts[Math.max(0, last - 1)][0]) || 1
        spin = (dir * (m.v1 ?? r.total / T)) / R
      } else if (m.kind === 'fly') {
        turned += spin * (m.t1 - m.t0)
      } else {
        spin = 0
      }
    }
  }

  /** The move that has the ball at `t`. */
  index(t: number): number {
    const ms = this.moves
    let lo = 0
    let hi = ms.length - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (ms[mid].t0 <= t) lo = mid
      else hi = mid - 1
    }
    return lo
  }

  at(t: number): BallAt {
    const i = this.index(t)
    const m = this.moves[i]
    const u = Math.max(0, Math.min(1, (t - m.t0) / Math.max(1e-9, m.t1 - m.t0)))
    const T = Math.max(1e-9, m.t1 - m.t0)
    switch (m.kind) {
      case 'roll': {
        const r = this.rolled[i]!
        const mean = r.total / T
        const m0 = ((m.v0 ?? mean) * T) / Math.max(1e-9, r.total)
        const m1 = ((m.v1 ?? mean) * T) / Math.max(1e-9, r.total)
        const s = hermite(u, m0, m1) * r.total
        const a = along(m.pts, r, s)
        return { x: a.p[0], y: a.p[1], angle: a.a, speed: (hermiteD(u, m0, m1) * r.total) / T, hidden: false, move: i }
      }
      case 'fly': {
        const [vx, vy] = this.flyV[i]!
        const dt = u * T
        const x = m.from[0] + vx * dt
        const y = m.from[1] + vy * dt + 0.5 * m.g * dt * dt
        const wy = vy + m.g * dt
        return { x, y, angle: Math.atan2(wy, vx), speed: Math.hypot(vx, wy), hidden: false, move: i }
      }
      case 'hide':
        return { x: m.from[0] + (m.to[0] - m.from[0]) * u, y: m.from[1] + (m.to[1] - m.from[1]) * u, angle: Math.atan2(m.to[1] - m.from[1], m.to[0] - m.from[0]), speed: 0, hidden: true, move: i }
      case 'ride': {
        const p = m.fn(Math.min(m.t1, Math.max(m.t0, t)))
        const q = m.fn(Math.min(m.t1, Math.max(m.t0, t)) - 1 / 60)
        const d = Math.hypot(p[0] - q[0], p[1] - q[1])
        return { x: p[0], y: p[1], angle: d > 1e-6 ? Math.atan2(p[1] - q[1], p[0] - q[0]) : 0, speed: d * 60, hidden: !!m.hidden, move: i }
      }
      case 'rest':
        return { x: m.at[0], y: m.at[1], angle: 0, speed: 0, hidden: false, move: i }
    }
  }

  /** How far the ball has turned by `t`, radians. */
  turned(t: number): number {
    const i = this.index(t)
    const m = this.moves[i]
    const base = this.turnedAt[i]
    if (m.kind === 'roll') {
      const r = this.rolled[i]!
      const T = Math.max(1e-9, m.t1 - m.t0)
      const u = Math.max(0, Math.min(1, (t - m.t0) / T))
      const mean = r.total / T
      const s = hermite(u, ((m.v0 ?? mean) * T) / Math.max(1e-9, r.total), ((m.v1 ?? mean) * T) / Math.max(1e-9, r.total)) * r.total
      return base + along(m.pts, r, s).dx / R
    }
    if (m.kind === 'fly') {
      const next = this.turnedAt[i + 1] ?? base
      const u = Math.max(0, Math.min(1, (t - m.t0) / Math.max(1e-9, m.t1 - m.t0)))
      return base + (next - base) * u
    }
    return base
  }

  /** Where the last move ends: where the ball is left. */
  end(): Pt {
    return endOf(this.moves[this.moves.length - 1])
  }
}

export function endOf(m: Move): Pt {
  switch (m.kind) {
    case 'roll':
      return m.pts[m.pts.length - 1]
    case 'fly':
    case 'hide':
      return m.to
    case 'ride':
      return m.fn(m.t1)
    case 'rest':
      return m.at
  }
}

/**
 * Builds a path move by move, each from where the last left the ball, so no move names where it starts. `now` is
 * the time the last move ended: the next starts there.
 */
export class Route {
  readonly moves: Move[] = []
  private here: Pt
  private time: number

  constructor(start: Pt, t0: number) {
    this.here = start
    this.time = t0
  }

  get now(): number {
    return this.time
  }
  get at(): Pt {
    return this.here
  }

  rest(until: number): this {
    if (until > this.time + 1e-9) this.moves.push({ kind: 'rest', t0: this.time, t1: until, at: this.here })
    this.time = Math.max(this.time, until)
    return this
  }
  roll(until: number, pts: Pt[], v0?: number, v1?: number): this {
    this.moves.push({ kind: 'roll', t0: this.time, t1: until, pts: [this.here, ...pts], v0, v1 })
    this.here = pts[pts.length - 1]
    this.time = until
    return this
  }
  fly(until: number, to: Pt, g = G): this {
    this.moves.push({ kind: 'fly', t0: this.time, t1: until, from: this.here, to, g })
    this.here = to
    this.time = until
    return this
  }
  hide(until: number, to: Pt): this {
    this.moves.push({ kind: 'hide', t0: this.time, t1: until, from: this.here, to })
    this.here = to
    this.time = until
    return this
  }
  ride(until: number, fn: (t: number) => Pt, hidden = false): this {
    this.moves.push({ kind: 'ride', t0: this.time, t1: until, fn, hidden })
    this.here = fn(until)
    this.time = until
    return this
  }
  /** Jump the ball to `to` with no time passing: only where nothing could see it (in a pipe, out of shot). */
  put(to: Pt): this {
    this.here = to
    return this
  }
  build(end: number): BallPath {
    this.rest(end)
    return new BallPath(this.moves)
  }
}

/** The speed a ball must leave `from` with to land on `to` after `T` seconds under `g`: its arc's top, for checks. */
export function apex(from: Pt, to: Pt, T: number, g = G): number {
  const vy = (to[1] - from[1]) / T - (g * T) / 2
  return vy < 0 ? from[1] - (vy * vy) / (2 * g) : from[1]
}
