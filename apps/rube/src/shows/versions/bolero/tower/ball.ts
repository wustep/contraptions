import type { Pt } from '../../../../parts'
import { BEAT, STATEMENTS } from './music'
import { ARC, FOOT, INTO_CUP, LOOPS, R, RIDES, TOWER, lapOf, onLoop, rideAt, sOf, type Ride } from './plan'
import { FINALE_FROM, finaleAt } from './finale'

/**
 * Where the ball is: a pure function of show time, so any moment can be drawn, checked or filmed on its own.
 *
 * - **Bars 1 and 2**: in the lift's lowest cup, by the drum, while the drum plays alone.
 * - **Bars 3 and 4**: up the lift to the first storey, a step on every stroke, while the storey unfolds over it.
 * - **Each statement**: once round its storey, a key a note (`plan.ts`).
 * - **Between statements**: two bars on the lift, a step a stroke, to the upper rail again or to the next storey.
 * - **The finale**: from the last statement's end (`finale.ts`).
 */

export type Phase = 'wait' | 'ride' | 'lap' | 'finale'
export interface Where {
  p: Pt
  /** The way it is going, radians (for the stage's streak; it is never stretched here). */
  angle: number
  phase: Phase
  /** The statement whose lap it is on, or whose lift ride follows it (-1 for the intro's). */
  k: number
  /** How far it has turned, radians: rolling along a rail, still in a cup. */
  turned: number
  /** 1 in the open; the finale may shrink it into something. */
  scale?: number
}

/** How far the ball has turned rolling round a storey by arc length `s`: forward (clockwise) going right, back going left. */
function rolled(n: number, s: number): number {
  const [lin, lu, lt, ll, lout] = LOOPS[n].lengths
  const out = lin + lu + lt / 2
  if (s <= out) return s / R
  return out / R - Math.min(s - out, lt / 2 + ll + lout) / R
}
/** Turned by the end of each lap, carried on so the mark never jumps (a cup carries it without turning it). */
const BASE: number[] = (() => {
  const out: number[] = []
  let acc = 0
  for (let k = 0; k < STATEMENTS.length; k++) {
    out.push(acc)
    const n = lapOf(k).storey
    acc += rolled(n, LOOPS[n].knots[LOOPS[n].knots.length - 1][1])
  }
  out.push(acc)
  return out
})()

function onRide(r: Ride, t: number, k: number): Where {
  const p = rideAt(r, t)
  const q = rideAt(r, t + 0.02)
  return { p, angle: Math.atan2(q[1] - p[1], q[0] - p[0]), phase: 'ride', k, turned: BASE[Math.max(0, k + 1)] }
}

export function where(t: number): Where {
  if (t >= FINALE_FROM) return finaleAt(t, BASE[STATEMENTS.length])
  const first = RIDES[0]
  if (t < first.from) return { p: FOOT, angle: 0, phase: 'wait', k: -1, turned: 0 }
  if (t < first.to) return onRide(first, t, -1)
  for (let k = 0; k < STATEMENTS.length; k++) {
    const begin = sOf(k, -0.25)
    const end = sOf(k, INTO_CUP)
    if (t < begin) return onRide(RIDES[k], t, k - 1)
    if (t <= end) {
      const n = lapOf(k).storey
      const q = (t - STATEMENTS[k].t) / BEAT
      const s = ARC[n](q)
      const at = onLoop(TOWER[n], LOOPS[n], s)
      return { p: at.p, angle: at.angle, phase: 'lap', k, turned: BASE[k] + rolled(n, s) }
    }
  }
  const k = STATEMENTS.length - 1
  const n = lapOf(k).storey
  return { p: TOWER[n].A, angle: 0, phase: 'lap', k, turned: BASE[k + 1] }
}
