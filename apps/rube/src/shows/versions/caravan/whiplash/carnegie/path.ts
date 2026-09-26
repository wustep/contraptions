import type { Pt, Seg } from '../../../../../parts'
import { CRASH, HAT, RIDE, cymbalSwing, type Cymbal } from '../drums'
import { KIT_AT, land } from './stage'

/**
 * A lane written forward in show time, for the director's Carnegie parts (the hush, the finale): rests, flights
 * under gravity, and rides on things that move. Every segment ends exactly where and when it is told to, so a
 * landing is on its stroke by construction.
 */
export class Path {
  readonly segs: Seg[] = []
  constructor(
    public t: number,
    public p: Pt,
  ) {}
  private to(q: Pt, at: number, extra: Partial<Seg> = {}): void {
    if (at <= this.t + 1e-9) return
    this.segs.push({ from: this.p, to: q, dur: at - this.t, ...extra })
    this.t = at
    this.p = q
  }
  /** Still where he is until `until`. */
  rest(until: number): void {
    this.to(this.p, until)
  }
  /** Along a straight line to `q`, eased, arriving at `at`. */
  roll(q: Pt, at: number, ease: Seg['ease'] = 'inout'): void {
    this.to(q, at, { ease })
  }
  /** A flight to `q`, landing at `at`: the parabola gravity `g` draws in that time, its lift kept between `lo` and `hi`. */
  hop(q: Pt, at: number, g = 12, lo = 0, hi = Infinity): void {
    const T = at - this.t
    this.to(q, at, { arc: Math.max(lo, Math.min(hi, (g * T * T) / 8)) })
  }
  /** Carried by `fn` (a point of show time) until `until`, sampled `hz` a second. */
  ride(fn: (T: number) => Pt, until: number, hz = 60): void {
    const a = this.t
    const n = Math.max(1, Math.ceil((until - a) * hz))
    for (let j = 1; j <= n; j++) {
      const T = j === n ? until : a + ((until - a) * j) / n
      this.to(fn(T), T)
    }
  }
  /** Falling from where he is (moving at `v`, cells a second) under `g` to land on `q` at `at`: a real throw's path. */
  fall(q: Pt, at: number, g = 12, hz = 60): void {
    const p0 = this.p
    const t0 = this.t
    const T = at - t0
    // The throw that reaches `q` at `at` under g: its start velocity follows from the two ends.
    const vx = (q[0] - p0[0]) / T
    const vy = (q[1] - p0[1] - 0.5 * g * T * T) / T
    this.ride((t) => {
      const s = t - t0
      return [p0[0] + vx * s, p0[1] + vy * s + 0.5 * g * s * s]
    }, at, hz)
    this.p = q
  }
}

/* ------------------------------------------------------------------ where he sits on the kit */

const R = 0.13
const dome = (s: Cymbal, dx: number, h = 0.085 * 0.9): number => h * Math.sin(Math.PI * Math.max(0, Math.min(1, dx / s.w + 0.5)))

/**
 * Where his centre is on a cymbal, `dx` along it from its bell, when the cymbal is drawn turned by `extra` past its
 * own tilt (its swing, and anything knocking it askew): the same turn the kit draws it with. The Carnegie frame.
 */
export function onCymbal(s: Cymbal, dx: number, extra: number): Pt {
  const a = s.tilt + extra
  const up = dome(s, dx) + R
  return [KIT_AT[0] + s.x + dx * Math.cos(a) + up * Math.sin(a), KIT_AT[1] + s.y + dx * Math.sin(a) - up * Math.cos(a)]
}

/** The crash's seat under his weight, with its swing since `since` and how askew it hangs. */
export const onCrash = (dx: number, since: number, askew: number): Pt => onCymbal(CRASH, dx, cymbalSwing(since, 0.16, 1.2) + askew)
/** The ride's seat, with its swing. */
export const onRide = (dx: number, since: number): Pt => onCymbal(RIDE, dx, cymbalSwing(since, 0.08, 1.4))
/** The hi-hat, closed: on its top cymbal a little left of the rod. */
export const HAT_SEAT: Pt = [KIT_AT[0] + HAT.x - 0.28, KIT_AT[1] + HAT.y - 0.02 - 0.07 * Math.sin(Math.PI * (0.5 - 0.28 / HAT.w)) - R]
export const SNARE_SEAT: Pt = land('snare')
export const RACK_SEAT: Pt = land('rack')
export const FLOOR_SEAT: Pt = land('floor')

/** Seconds since the latest of `times` at or before `T` (Infinity before the first). */
export function since(times: readonly number[], T: number): number {
  let last = -Infinity
  for (const t of times) {
    if (t > T) break
    last = t
  }
  return T - last
}
