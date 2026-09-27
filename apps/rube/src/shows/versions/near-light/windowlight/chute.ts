import { CATCHES } from './cups'
import { dir, fly, hermite, hermite1, scale, type Knot, type Pt } from './kit'
import { CHUTE_CREST, CHUTE_FROM, CHUTE_LIP, INTO_FIRST, LIP_SLOPE, LIP_SPEED, RIM_SPEED } from './layout'
import { PERIOD } from './music'
import { ALIGHT, ROLL_OUT } from './wheel'

/**
 * The chute: the coda. A short channel of felt from the wheel's foot to the first cup, rising a little and then
 * falling a little. The ball comes off the wheel on the coda's last chord and climbs the rise as the string's last
 * note is held, slower and slower, all but stops at its crest as the note dies, and rolls down over the lip into the
 * first cup as the first chord comes round again. The seam is in the middle of that: the ball is never still.
 */

/** Show time the ball is on the felt, and when it is caught in the first cup, a period on. */
const ON = ALIGHT + ROLL_OUT
export const LAND = CATCHES[0] + PERIOD
const OFF = LAND - INTO_FIRST
export const CREST = CHUTE_CREST
export const LIP = CHUTE_LIP
const LEAVE: Pt = scale(dir(LIP_SLOPE), LIP_SPEED)

/** The felt's line, as the ball's centre goes along it: two cubics, meeting level at the crest. */
const k0: Knot = { t: 0, p: CHUTE_FROM, v: [2.1, 0] }
const k1: Knot = { t: 1, p: CREST, v: [2.1, 0] }
const k1b: Knot = { t: 1, p: CREST, v: [0.9, 0] }
const k2: Knot = { t: 2, p: LIP, v: scale(dir(LIP_SLOPE), 0.9) }
const shape = (x: number): Pt => (x < 1 ? hermite(k0, k1, x) : hermite(k1b, k2, x))

/** Arc length along the felt, sampled: from a parameter to cells, and back. */
const N = 400
const XS: number[] = []
const SS: number[] = []
{
  let s = 0
  let prev = shape(0)
  for (let i = 0; i <= N; i++) {
    const x = (2 * i) / N
    const p = shape(x)
    s += Math.hypot(p[0] - prev[0], p[1] - prev[1])
    XS.push(x)
    SS.push(s)
    prev = p
  }
}
export const CHUTE_LENGTH = SS[N]
const S_CREST = SS[N / 2]

/** The ball's centre `s` cells along the felt. */
export function onChute(s: number): Pt {
  const c = Math.max(0, Math.min(CHUTE_LENGTH, s))
  let lo = 0
  let hi = N
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1
    if (SS[mid] <= c) lo = mid
    else hi = mid
  }
  const f = (c - SS[lo]) / Math.max(1e-9, SS[hi] - SS[lo])
  return shape(XS[lo] + (XS[hi] - XS[lo]) * f)
}

/**
 * How slowly it crosses the crest: whatever makes it, rolling up and down the felt as a ball does (its average speed
 * over each side the mean of the speeds at its ends), take exactly the time from the wheel to the lip.
 */
const V0 = RIM_SPEED
const V2 = LIP_SPEED
const CREST_V = (() => {
  let lo = 0.001
  let hi = 2
  for (let i = 0; i < 60; i++) {
    const v = (lo + hi) / 2
    const T = (2 * S_CREST) / (V0 + v) + (2 * (CHUTE_LENGTH - S_CREST)) / (v + V2)
    if (T > OFF - ON) lo = v
    else hi = v
  }
  return (lo + hi) / 2
})()
/** Show time it crosses the crest. */
export const OVER_CREST = ON + (2 * S_CREST) / (V0 + CREST_V)

/** How far along the felt the ball is at `t` (in [ON, OFF]). */
export function run(t: number): number {
  if (t < OVER_CREST) return hermite1(ON, 0, V0, OVER_CREST, S_CREST, CREST_V, t)
  return hermite1(OVER_CREST, S_CREST, CREST_V, OFF, CHUTE_LENGTH, V2, t)
}

/** The ball from the wheel's foot to the first cup (`t` in [ON, LAND], unwrapped: past the period's end). */
export function ballOnChute(t: number): { p: Pt; flying: boolean; rolling: number } {
  if (t < OFF) return { p: onChute(run(t)), flying: false, rolling: (run(t + 0.004) - run(t - 0.004)) / 0.008 }
  return { p: fly(LIP, LEAVE, t - OFF), flying: true, rolling: 0 }
}

export const CHUTE_ON = ON
export const CHUTE_CREST_V = CREST_V
