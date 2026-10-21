import { composed, type View } from '../../paint'
import { A } from './geo'

/**
 * Where the camera stands in the arena, shot by shot. The world is side on, so a change of where the camera stands is a
 * change of how the stands behind the floor are drawn, and what stands in the sky:
 *
 * - `wide`: from the floor's middle, the whole bowl: the stands big behind it, their rim dipping to the black sun.
 * - `close`: in among the fighters: the nearest tiers of the crowd just behind them, heads and all.
 * - `low`: down on the sand: the crowd a dark band low behind them, the black sun in the white sky over it.
 * - `high`: from the rim, looking down on the floor: only the pale sand, the fighters on it, their long shadows.
 *
 * Each changes on a cut, never inside a shot.
 */
export type Mode = 'wide' | 'close' | 'low' | 'high'

export const VIEWS: [number, Mode][] = [
  [A.in, 'wide'],
  [A.floor, 'low'],
  [A.above, 'high'],
  [A.clash2, 'close'],
  [A.circle, 'high'],
  [A.clash3, 'close'],
  [A.close, 'low'],
  [A.breath, 'high'],
  [A.sky, 'wide'],
]

export function modeAt(t: number): Mode {
  let m: Mode = VIEWS[0][1]
  for (const [at, mode] of VIEWS) if (t >= at) m = mode
  return m
}

/** The top of the stands, rim and all, in their own layer (cells, up negative): `set.ts` builds them to it. */
export const STANDS_TOP = 18

/** In a low shot, where the rim stands in the composed frame (a share of its height from the top). */
const LOW_RIM = 0.53

/**
 * How the stands are drawn in a frame: how big against the floor's plane (`f`), the world y they shrink toward
 * (`pivot`, the eye), and how much of the bowl's rise toward the frame's edges shows (`rise`). Down low the eye is at a
 * fighter's height, and the stands are made as small as puts their rim at `LOW_RIM` of the frame, so the crowd is a band
 * low behind them however close the shot.
 */
export function standsOf(mode: Mode, view: View): { f: number; pivot: number; rise: number } {
  if (mode === 'close') return { f: 0.3, pivot: -1.5, rise: 1 }
  if (mode === 'low') {
    const c = composed(view)
    const pivot = -0.35
    const rim = c.cy + (LOW_RIM - 0.5) * c.h
    // Seen from so low, through so long a lens, the bowl's far side is nearly level: little of its rise to the sides.
    return { f: Math.max(0.03, Math.min(0.6, (rim - pivot) / (-STANDS_TOP - pivot))), pivot, rise: 0.3 }
  }
  return { f: 0.6, pivot: -3.5, rise: 1 }
}

/** The black sun as shares of the composed frame: where the eclipse left it, and just over the rim when low. */
export function sunOf(mode: Mode): { x: number; y: number; r: number } {
  if (mode === 'low') return { x: 0.5, y: LOW_RIM - 0.075, r: 0.05 }
  return { x: 0.5, y: 0.34, r: 0.05 }
}
