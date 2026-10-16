import { at, BEATS, type Beat } from '../music'
import { FLING, ON_WEB, T0, T1, TREADLE } from './press-plan'

/**
 * The hall's pulse (the PRESS builder's): what the whole press hall does on the beats of the peak, besides the
 * machine's own strikes. The lamps switch on plane by plane from the treadle back into the dark, the far lines run up
 * to speed, and from then on every beat is a thump through the hall's iron, harder where the band hits harder.
 */

const PB: readonly Beat[] = BEATS.filter((b) => b.t > T0 - 3 && b.t < T1 + 3)

/** The beat at or before `t` (null before the first), and how long ago it was. */
export function lastBeat(t: number): { b: Beat | null; ago: number } {
  let lo = 0
  let hi = PB.length - 1
  if (!PB.length || t < PB[0].t) return { b: null, ago: Infinity }
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (PB[mid].t <= t) lo = mid
    else hi = mid - 1
  }
  return { b: PB[lo], ago: t - PB[lo].t }
}

/** How hard a beat lands in the picture: never nothing, and more where the band leans on it. */
const weight = (b: Beat): number => 0.45 + 0.55 * Math.min(1.3, b.s)

/** The press's own clock: nothing before the treadle. */
const running = (t: number): number => (t < TREADLE ? 0 : 1)

/** A thump on every beat once the press runs: 1 on the beat (more on a hard one), decaying. */
export function thump(t: number, decay = 0.12): number {
  if (!running(t)) return 0
  const { b, ago } = lastBeat(t)
  if (!b || b.t < TREADLE - 1e-6) return 0
  return Math.exp(-ago / decay) * weight(b)
}

/**
 * The lamps coming up, plane by plane from the treadle back into the dark, a beat apart: the machine's own plane on
 * the treadle, then the near line, the middle line, the far line. Index 0 is the nearest.
 */
export const CASCADE = [TREADLE, FLING, at(114, 3), ON_WEB]

/** How lit plane `i`'s lamps are at `t`, 0.22 to 1: a low work light before; on its beat they switch on. */
export function lampsOn(t: number, i: number): number {
  const c = CASCADE[Math.min(i, CASCADE.length - 1)]
  if (t < c) return 0.22
  return 0.22 + 0.78 * Math.min(1, (t - c) / 0.08)
}

/** How far a line of plane `i` has run (its own cells) by `t`: idling before its lamps come up, then up to speed over a second and a half. */
export function runOf(t: number, i: number, speed: number): number {
  const c = CASCADE[Math.min(i, CASCADE.length - 1)]
  const idle = 0.12
  const D = 1.5
  if (t < c) return speed * idle * t
  const u = t - c
  const ramp = u < D ? (u * u) / (2 * D) : D / 2 + (u - D)
  return speed * (idle * t + (1 - idle) * ramp)
}
