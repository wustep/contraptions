import { add, fly, hermite1, launch, len, ring, scale, sub, type Pt } from './kit'
import { HANG, LAMP, RAIL_TO, WHEEL_R } from './layout'
import { onset, since } from './music'
import { AT_TOP, RAIL_FROM, RAIL_V0, SPOUT } from './screw'

/**
 * The rail: after the drums. A brass wire strung under the window's head from the screw back across to the lamp,
 * sloping a little, hung on threads. From each of nine threads hangs a small bell, and the ball, rolling under the
 * window's head, knocks each as a chord of the piano sounds: the section's accents, every downbeat or two. At its end
 * the ball drops into the gondola at the top of the wheel as the arpeggios begin.
 */

/** The accents the bells are rung on (measured onsets, on the downbeats of bars 73 to 83). */
export const BELL_TIMES: number[] = [148.63, 150.67, 154.73, 156.77, 158.8, 160.83, 162.87, 166.93, 168.97].map((t) => onset(t, 'after').t)
export const BELL_WEIGHTS: number[] = BELL_TIMES.map((t) => Math.min(1.6, onset(t, 'after').s))

/** Show time the ball drops into the gondola: bar 85's downbeat, the arpeggios' first accent. */
export const BOARD = onset(173.03, 'arpeggios').t
/** The gondola's seat at the top of the wheel. */
export const TOP_SEAT: Pt = [LAMP[0], LAMP[1] - WHEEL_R + HANG]
const DROP = 0.5
const ON = AT_TOP + SPOUT
const OFF = BOARD - DROP

const RUN = sub(RAIL_TO, RAIL_FROM)
export const RAIL_LENGTH = len(RUN)
const UNIT: Pt = scale(RUN, 1 / RAIL_LENGTH)
/** The ball on the rail, `u` cells along it. */
export const onRail = (u: number): Pt => add(RAIL_FROM, scale(UNIT, u))

/** Leaving the rail's end for the gondola: how fast. */
const LEAVE: Pt = launch(RAIL_TO, TOP_SEAT, DROP)
const V0 = RAIL_V0[0] * UNIT[0] + RAIL_V0[1] * UNIT[1]
const V1 = LEAVE[0] * UNIT[0] + LEAVE[1] * UNIT[1]

/** How far along the rail the ball is at `t` (in [ON, OFF]). */
export const along = (t: number): number => hermite1(ON, 0, V0, OFF, RAIL_LENGTH, V1, t)

/** Where each bell hangs: where the ball is when its chord sounds. */
export const BELLS: number[] = BELL_TIMES.map((t) => along(t))

/** The ball from the spout's end to the gondola. */
export function ballOnRail(t: number): { p: Pt; flying: boolean; rolling: number } {
  if (t < OFF) {
    const v = (along(t + 0.004) - along(t - 0.004)) / 0.008
    return { p: onRail(along(t)), flying: false, rolling: -v }
  }
  return { p: fly(RAIL_TO, LEAVE, t - OFF), flying: true, rolling: 0 }
}

/** How far bell `i` is swung at `t`, radians (positive is the way the ball went: left), and how bright its ring. */
export function bell(i: number, t: number): { swing: number; ringing: number } {
  const s = since(t, BELL_TIMES[i])
  if (s < 0 || s > 6) return { swing: 0, ringing: 0 }
  const w = BELL_WEIGHTS[i]
  return {
    swing: 0.38 * w * ring(s, 1.1, 1.1),
    ringing: w * (1 - Math.exp(-s / 0.02)) * Math.exp(-s / 0.9),
  }
}
