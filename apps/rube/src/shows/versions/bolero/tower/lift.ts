import type p5 from 'p5'
import { outline, solid } from '../../../../../../../src/core/draw'
import type { Pt } from '../../../../parts'
import { STROKES, lastIndex } from './music'
import { FOOT, LIFT_LINE, R, RIDES, TOWER, liftA, liftB, onLift, rideAt, type Ride } from './plan'
import { BRASS, INK, IRON, deep, pale, smooth } from './look'
import { LAST_RIDE } from './finale'
import { openOf } from './storey'

/**
 * The lift: a toothed rack up the tower's left flank, and one cup that climbs it. The cup climbs a tooth on each
 * stroke of the drum with the ball in it (two bars a ride, `plan.ts`), lets the ball roll out onto the upper rail,
 * and while the ball goes round, slides back down to the lower rail's end to wait for it.
 */

const ALL: Ride[] = [...RIDES, LAST_RIDE]

/** Where the cup is along the rack, arc length, at `t`. */
function cupS(t: number): number {
  if (t < ALL[0].from) return 0
  for (let i = 0; i < ALL.length; i++) {
    const r = ALL[i]
    if (t < r.from) {
      // Back down from the last ride's top to this one's foot, a second after the ball has gone.
      const prev = ALL[i - 1]
      return prev.s1 + (r.s0 - prev.s1) * smooth(t, prev.to + 0.9, prev.to + 4.5)
    }
    if (t <= r.to) return sAlong(r, t)
  }
  return ALL[ALL.length - 1].s1
}
function sAlong(r: Ride, t: number): number {
  const p = rideAt(r, t)
  // rideAt gives a point: find its arc length back by projecting on the ride's own stretch of line.
  let best = r.s0
  let bestD = Infinity
  for (let j = 0; j <= 40; j++) {
    const s = r.s0 + ((r.s1 - r.s0) * j) / 40
    const q = onLift(s)
    const d = Math.hypot(q[0] - p[0], q[1] - p[1])
    if (d < bestD) {
      bestD = d
      best = s
    }
  }
  return best
}

/** The cup: where it is (its middle, under the ball's) at `t`. */
export function cupAt(t: number): Pt {
  const r = ALL.find((q) => t >= q.from && t <= q.to)
  if (r) {
    const p = rideAt(r, t)
    return [p[0], p[1] + R + 0.02]
  }
  const p = onLift(cupS(t))
  return [p[0], p[1] + R + 0.02]
}

/** How far up the rack is built at `t`: to the highest storey that has unfolded far enough to hold it. */
function rackTop(t: number): number {
  let top = liftA(0)
  for (const st of TOWER) {
    const o = openOf(st.n, t)
    if (o <= 0) break
    top = liftA(st.n) + (liftB(st.n) - liftA(st.n)) * smooth(o, 0.26, 0.5)
    if (st.n > 0) {
      const prevB = liftB(st.n - 1)
      top = prevB + (top - prevB) * smooth(o, 0.1, 0.5)
    }
  }
  return top
}

/** The rack for storey `n`'s stretch (and, for storey 0, from the foot), drawn in that storey's frame. */
export function drawRack(p: p5, k: number, weight: number, n: number, t: number): void {
  const from = n === 0 ? 0 : liftB(n - 1)
  const to = Math.min(liftB(n), rackTop(t))
  if (to <= from) return
  const pts: Pt[] = []
  for (let s = from; s < to; s += 0.08) pts.push(onLift(s))
  pts.push(onLift(to))
  // The rack: an iron bar, its teeth a fine comb along the cup's side.
  p.noFill()
  outline(p, INK, weight * 0.55)
  p.stroke(IRON)
  for (let s = from + 0.03; s < to; s += 0.07) {
    const [x, y] = onLift(s)
    p.line((x - 0.1) * k, y * k, (x - 0.06) * k, (y - 0.02) * k)
  }
  outline(p, INK, weight * 1.5)
  p.stroke(deep(IRON, 0.25))
  p.beginShape()
  for (const [x, y] of pts) p.vertex((x - 0.12) * k, y * k)
  p.endShape()
  void LIFT_LINE
}

/** The cup, back half (behind the ball) or front lip (over it). */
export function drawCup(p: p5, k: number, weight: number, t: number, front: boolean): void {
  const [x, y] = cupAt(t)
  const i = lastIndex(STROKES, t)
  const jolt = i >= 0 ? Math.exp(-(t - STROKES[i]) / 0.05) * 0.012 : 0
  p.push()
  p.translate(x * k, (y - jolt) * k)
  if (!front) {
    // The carriage on the rack, with its pawl.
    solid(p, INK, weight, pale(IRON, 0.25))
    p.rectMode(p.CORNER)
    p.rect(-0.17 * k, -0.02 * k, 0.1 * k, 0.16 * k, 0.02 * k)
    solid(p, INK, weight * 0.8, BRASS)
    p.arc(0, -0.02 * k, 0.36 * k, 0.28 * k, 0, Math.PI, p.CHORD)
  } else {
    outline(p, INK, weight)
    p.noFill()
    p.arc(0, -0.02 * k, 0.36 * k, 0.28 * k, 0.15, Math.PI - 0.15)
  }
  p.pop()
  void FOOT
}
