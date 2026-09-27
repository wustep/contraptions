import { R } from '../../../../parts'
import { ballOnChute, CHUTE_ON, LAND } from './chute'
import { ballInCups, CATCHES, cupSquash } from './cups'
import type { Pt } from './kit'
import { PERIOD, wrap } from './music'
import { ballOnRail, BOARD } from './rail'
import { AT_TOP, ballInScrew, SPOUT } from './screw'
import { ballInTrough, CATCH, INTO_SCREW, troughSquash } from './trough'
import { ballOnWheel, wheelSquash } from './wheel'

/**
 * The ball's one way round, once a period: the six legs of the machine laid end to end in show time, from the first
 * cup's catch on the first chord to the same catch a period on. Each leg is its part's (`cups.ts`, `trough.ts`,
 * `screw.ts`, `rail.ts`, `wheel.ts`, `chute.ts`), and each starts where and as fast as the one before it ends.
 */

export interface Leg {
  name: string
  from: number
  to: number
}

/** From the first catch (unwrapped: the last leg runs on past the period's end, into the next). */
export const START = CATCHES[0]
export const LEGS: Leg[] = [
  { name: 'cups', from: START, to: CATCH },
  { name: 'trough', from: CATCH, to: INTO_SCREW },
  { name: 'screw', from: INTO_SCREW, to: AT_TOP + SPOUT },
  { name: 'rail', from: AT_TOP + SPOUT, to: BOARD },
  { name: 'wheel', from: BOARD, to: CHUTE_ON },
  { name: 'chute', from: CHUTE_ON, to: LAND },
]

export interface Where {
  p: Pt
  /** In the air: dropped, poured or flung. */
  flying: boolean
  /** Its speed rolling along a surface, cells a second (positive to the right); 0 riding in something. */
  rolling: number
  leg: string
}

/** Show time `t` as the route counts it: in [START, START + PERIOD). */
const onRoute = (t: number): number => START + wrap(t - START)

/** Where the ball is at show time `t`. */
export function where(t: number): Where {
  const u = onRoute(t)
  if (u < CATCH) {
    const c = ballInCups(u)
    return { p: c.p, flying: c.flying, rolling: 0, leg: 'cups' }
  }
  if (u < INTO_SCREW) return { ...ballInTrough(u), leg: 'trough' }
  if (u < AT_TOP + SPOUT) return { ...ballInScrew(u), flying: false, leg: 'screw' }
  if (u < BOARD) return { ...ballOnRail(u), leg: 'rail' }
  if (u < CHUTE_ON) return { ...ballOnWheel(u), flying: false, leg: 'wheel' }
  return { ...ballOnChute(u), leg: 'chute' }
}

/** The ball's squash at `t`: a little of its height given up as it is caught, as hard as the music there is played. */
export const squash = (t: number): number => cupSquash(t) + troughSquash(t) + wheelSquash(t)

/**
 * How far the ball has turned about itself by `t`, radians: rolling where it rolls (its speed over its radius),
 * spinning on through the air as it left, and slowing to a stop in whatever carries it. A period holds a whole number
 * of turns, so the dot on it is where it was when the period comes round.
 */
export const spin: (t: number) => number = (() => {
  const STEP = 0.005
  const n = Math.round(PERIOD / STEP)
  const out = new Float64Array(n + 1)
  let w = 0
  let a = 0
  for (let i = 0; i < n; i++) {
    const here = where(i * STEP)
    if (!here.flying) {
      const want = here.rolling / R
      // Riding, it stops turning over a quarter of a second; rolling, it turns as it rolls.
      w = here.rolling === 0 ? w * Math.exp(-STEP / 0.25) : want
    }
    a += w * STEP
    out[i + 1] = a
  }
  const whole = 2 * Math.PI * Math.round(out[n] / (2 * Math.PI))
  const fix = (whole - out[n]) / n
  for (let i = 0; i <= n; i++) out[i] += fix * i
  return (t: number) => {
    const x = wrap(t) / STEP
    const i = Math.min(n - 1, Math.floor(x))
    return out[i] + (out[i + 1] - out[i]) * (x - i)
  }
})()
