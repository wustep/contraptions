import type { Lane, Pt, Seg } from '../../../../../parts'
import { ONSETS, tune } from '../music'
import { G_SNAP } from '../physics'

/**
 * What the practice room's two parts (`practice.ts`, `night.ts`) build their lanes and their answers from: a path
 * written in show seconds, one move after another (a flight, a hold, a roll that eases its speed, a ride on
 * something that moves), and the strokes that the kit and the room answer.
 */

/** A move's end in show seconds; the path turns it into slot seconds, so every landing is exactly where it is written. */
export class Path {
  readonly segs: Seg[] = []
  /** Slot seconds at the path's end. */
  private at = 0
  /** Where the path has got to. */
  p: Pt
  /** Its speed there, cells a second, for a roll that carries on from it. */
  v = 0

  constructor(readonly begin: number, p: Pt) {
    this.p = [p[0], p[1]]
  }

  /** Show time at the path's end. */
  get T(): number {
    return this.begin + this.at
  }

  private add(to: Pt, T: number, extra: Partial<Seg> = {}): this {
    const dur = T - this.T
    if (dur < -1e-9) throw new Error(`room path: ${T.toFixed(3)} is before ${this.T.toFixed(3)}`)
    const seg: Seg = { from: this.p, to: [to[0], to[1]], dur: Math.max(0, dur), ...extra }
    this.segs.push(seg)
    this.at += Math.max(0, dur)
    this.p = [to[0], to[1]]
    return this
  }

  /** Stay put until `T`. */
  hold(T: number): this {
    this.v = 0
    return this.add(this.p, T)
  }

  /** A flight to `to`, landing at `T`: the parabola gravity `g` draws in that time. */
  hop(to: Pt, T: number, g = G_SNAP): this {
    const d = T - this.T
    this.v = 0
    return this.add(to, T, { arc: (g * d * d) / 8 })
  }

  /** A straight move to `to` by `T`, eased as asked. */
  line(to: Pt, T: number, ease?: Seg['ease']): this {
    this.v = 0
    return this.add(to, T, ease ? { ease } : {})
  }

  /**
   * A straight roll to `to` by `T` that starts at the speed the path has and changes it evenly: it ends at the speed
   * the distance and the time leave (returned in `v`). Where that would go below nothing, the roll is eased instead.
   */
  roll(to: Pt, T: number): this {
    const dur = T - this.T
    const len = Math.hypot(to[0] - this.p[0], to[1] - this.p[1])
    if (dur <= 1e-9 || len <= 1e-9) return this.add(to, T)
    const v0 = this.v
    const v1 = (2 * len) / dur - v0
    if (v1 < 0 || v0 + v1 <= 1e-9) {
      this.v = 0
      return this.add(to, T, { ease: 'out' })
    }
    this.v = v1
    return this.add(to, T, { ramp: [v0, v1] })
  }

  /** Ridden: `at(T)` sampled from here to `T` in `n` straight pieces (the drawing reads the same function). */
  carry(at: (T: number) => Pt, T: number, n: number): this {
    const t0 = this.T
    const dt = (T - t0) / n
    for (let i = 1; i <= n; i++) this.add(at(t0 + i * dt), t0 + i * dt)
    this.v = 0
    return this
  }

  lane(fire: number): Lane {
    return { segs: this.segs, fire: fire - this.begin }
  }
}

/**
 * Beat `k` of the tune (to the eighth), at the recording's own stroke when one is within `win` of the click and at
 * least `min` strong: what a strike in the tune lands on.
 */
export function beat(k: number, win = 0.03, min = 0.3): number {
  const t = tune(k)
  let best = t
  let d = win
  for (const o of ONSETS) {
    if (o.t < t - win || o.t > t + win || o.s < min) continue
    const e = Math.abs(o.t - t)
    if (e <= d) {
      d = e
      best = o.t
    }
  }
  return best
}

/** How strong the recording is at a strike (the nearest onset within 40 ms), 0 when nothing is there. */
export function loudAt(t: number): number {
  let s = 0
  for (const o of ONSETS) if (Math.abs(o.t - t) <= 0.04) s = Math.max(s, o.s)
  return s
}

/** A stroke on something that answers it: a piece of the kit, or anything else a part names. */
export interface Hit<P extends string = string> {
  t: number
  piece: P
}

/** Seconds since `piece` was last struck at or before `T` (Infinity if it never has been). */
export function since<P extends string>(hits: readonly Hit<P>[], piece: P, T: number): number {
  let last = -Infinity
  for (const h of hits) {
    if (h.t > T) break
    if (h.piece === piece) last = h.t
  }
  return T - last
}

/**
 * A lamp on its cord, swung by blows: each blow of `amp` radians at `t` starts a swing that dies away, and the
 * swings add. The cord's length sets the period; the damping is slow, so the light keeps moving long after.
 */
export function swing(blows: readonly { t: number; amp: number }[], T: number, period = 1.34, decay = 2.4): number {
  const w = (Math.PI * 2) / period
  let a = 0
  for (const b of blows) {
    const s = T - b.t
    if (s <= 0) break
    if (s > decay * 7) continue
    a += b.amp * Math.exp(-s / decay) * Math.sin(w * s) * (1 - Math.exp(-s / 0.05))
  }
  return a
}
