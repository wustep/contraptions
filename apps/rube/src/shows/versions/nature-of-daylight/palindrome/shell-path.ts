import { HALF, RELEASE } from './music'

/**
 * The shell's one journey, shared by everything that shows it: it comes down out of the cloud from the lament's half
 * cadence (first on the television, then, from the double bass, over the valley itself) and comes to rest at its
 * height; at the end it goes back up the same way, backwards, and is gone into the cloud when the high violins stop.
 *
 * `shellDown(t)` is how far down it has come: 0 up in the cloud, 1 hanging at its height. It eases out of the cloud and
 * eases to a stop at its height (so it leaves slowly and is fastest on its way): the television shows only its slow
 * start, and most of the descent is over the valley itself, after the double bass. The television and the valley both
 * read it; nothing else moves the shell.
 */
const DOWN_FOR = 12
export const SHELL_DOWN: [number, number] = [HALF, HALF + DOWN_FOR]
export const SHELL_UP: [number, number] = [RELEASE - DOWN_FOR, RELEASE]

/** 0 to 1 over a span, easing out of the start and settling into the end (a heavy thing lowered, coming to rest). */
const settle = (u: number): number => {
  const v = Math.max(0, Math.min(1, u))
  return v * v * v * (v * (6 * v - 15) + 10)
}

export function shellDown(t: number): number {
  if (t <= SHELL_DOWN[0]) return 0
  if (t < SHELL_DOWN[1]) return settle((t - SHELL_DOWN[0]) / DOWN_FOR)
  if (t <= SHELL_UP[0]) return 1
  if (t < SHELL_UP[1]) return settle((SHELL_UP[1] - t) / DOWN_FOR)
  return 0
}
