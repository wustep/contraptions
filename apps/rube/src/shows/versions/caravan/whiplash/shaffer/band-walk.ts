import { laneAt, type Lane, type Pt, type Seg } from '../../../../../parts'
import { route, type Way } from '../kit'
import { G_EARTH } from '../physics'

/**
 * A path written the way the ball lives it: from where it is, roll to here by then, hop to there landing then,
 * rest until then. Show seconds throughout; `ways(begin)` hands `route` the same path in slot seconds, so the lane
 * the part builds and the drawing that reads `at(T)` are one path.
 *
 * Speeds carry through: a roll starts at the speed the ball already has and changes evenly to whatever gets it to
 * its end on time, and a hop leaves at the speed it arrives with, so nothing lurches between two moves unless a
 * move is a strike.
 */

interface TWay {
  T: number
  p: Pt
  arc?: number
  ramp?: [number, number]
  ease?: Seg['ease']
  hidden?: boolean
}

export class Walk {
  readonly list: TWay[] = []
  T: number
  x: number
  y: number
  /** The ball's velocity as it is now: what the next move starts from. */
  vx = 0
  vy = 0

  constructor(T: number, p: Pt, vx = 0) {
    this.T = T
    this.x = p[0]
    this.y = p[1]
    this.vx = vx
    this.list.push({ T, p: [p[0], p[1]] })
  }

  get at(): Pt {
    return [this.x, this.y]
  }

  private push(w: TWay): this {
    this.list.push(w)
    this.T = w.T
    this.x = w.p[0]
    this.y = w.p[1]
    return this
  }

  /** Stay where he is until `T1`. */
  rest(T1: number): this {
    this.vx = 0
    this.vy = 0
    if (T1 <= this.T + 1e-9) return this
    return this.push({ T: T1, p: this.at })
  }

  /**
   * A straight run to `p` by `T1`, the speed changing evenly from the one he has (along the run) to whatever gets
   * him there on time. If that would mean stopping and going back, the run eases in and out instead.
   */
  roll(p: Pt, T1: number): this {
    const dx = p[0] - this.x
    const dy = p[1] - this.y
    const d = Math.hypot(dx, dy)
    const dt = T1 - this.T
    if (dt <= 1e-9) return this
    if (d < 1e-9) return this.rest(T1)
    const along = (this.vx * dx + this.vy * dy) / d
    const v0 = Math.max(0, along)
    const v1 = (2 * d) / dt - v0
    if (v1 < 0 || v0 + v1 < 1e-6) {
      this.push({ T: T1, p, ease: v0 > 0.05 ? 'out' : 'inout' })
      this.vx = 0
      this.vy = 0
      return this
    }
    this.push({ T: T1, p, ramp: [v0, v1] })
    this.vx = (v1 * dx) / d
    this.vy = (v1 * dy) / d
    return this
  }

  /** A run from rest (or from where he is) that gathers to a peak halfway and slows to `vEnd` at `p`, by `T1`. */
  travel(p: Pt, T1: number, vEnd: number): this {
    const dx = p[0] - this.x
    const dy = p[1] - this.y
    const d = Math.hypot(dx, dy)
    const dt = T1 - this.T
    if (dt <= 1e-9 || d < 1e-9) return this.rest(T1)
    const along = Math.max(0, (this.vx * dx + this.vy * dy) / d)
    // Two ramps of equal time: along → peak → vEnd. d = dt/4 (along + 2 peak + vEnd).
    const peak = Math.max(0, (4 * d) / dt - along - vEnd) / 2
    const m: Pt = [this.x + dx * ((along + peak) / 4) * (dt / d), this.y + dy * ((along + peak) / 4) * (dt / d)]
    const Tm = this.T + dt / 2
    this.push({ T: Tm, p: m, ramp: [along, peak] })
    this.push({ T: T1, p, ramp: [peak, vEnd] })
    this.vx = (vEnd * dx) / d
    this.vy = (vEnd * dy) / d
    return this
  }

  /** A glide to `p` by `T1` that starts and ends at rest (a duck, a lean, a flinch). */
  ease(p: Pt, T1: number, kind: Seg['ease'] = 'inout'): this {
    this.push({ T: T1, p, ease: kind })
    this.vx = 0
    this.vy = 0
    return this
  }

  /** A flight to `p`, landing at `T1`, under gravity `g`. */
  hop(p: Pt, T1: number, g = G_EARTH): this {
    const dt = T1 - this.T
    const arc = (g * dt * dt) / 8
    const dx = p[0] - this.x
    const dy = p[1] - this.y
    this.push({ T: T1, p, arc })
    // Coming down: the horizontal speed it flew with, and the vertical speed of the fall.
    this.vx = dx / dt
    this.vy = dy / dt + (g * dt) / 2
    return this
  }

  /** Hops in place, landing at each of `times`. */
  bounces(times: readonly number[], g = G_EARTH): this {
    for (const t of times) if (t > this.T + 1e-6) this.hop(this.at, t, g)
    return this
  }

  /** After landing, carry on along the floor at the speed he came down with (the fall's speed is taken by the floor). */
  landed(): this {
    this.vy = 0
    return this
  }

  /** The path in slot seconds, for `route`, moved by `-origin` into a part's frame. */
  ways(begin: number, origin: Pt = [0, 0]): Way[] {
    return this.list.map((w) => ({ at: w.T - begin, p: [w.p[0] - origin[0], w.p[1] - origin[1]] as Pt, arc: w.arc, ramp: w.ramp, ease: w.ease, hidden: w.hidden }))
  }

  lane(begin: number, fire: number, origin: Pt = [0, 0]): Lane {
    return { segs: route(this.ways(begin, origin)), fire: fire - begin }
  }
}

/** Where a lane built from `begin` has the ball at show time `T`. */
export const laneAtShow = (lane: Lane, begin: number, T: number): Pt => {
  const at = laneAt(lane, T - begin)
  return [at.x, at.y]
}
