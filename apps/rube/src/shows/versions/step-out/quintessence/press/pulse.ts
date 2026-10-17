import { at } from '../music'
import { FLING, ON_WEB, TREADLE } from './press-plan'

/**
 * The hall's pulse (the PRESS builder's): what the whole press hall does on the beats of the peak, besides the
 * machine's own strikes. The lamps switch on plane by plane from the treadle back into the dark, and the far lines run
 * up to speed.
 */

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
