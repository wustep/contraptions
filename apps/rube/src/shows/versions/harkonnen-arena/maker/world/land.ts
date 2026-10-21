import { clamp01, lerp, type Brush, type View } from '../paint'
import { paintRange, type DuneLook, type Range } from './dunes'
import { paintSky, skyOf, type SkyKey } from './sky'

/**
 * The deep desert seen from where the action is: the sky, and range after range of dunes going away to the horizon, each
 * paler and smaller than the one before, over a flat (y = 0) that runs out to them.
 *
 * The horizon is at the eye: it stands in the frame (a share `tilt` of the frame's height below its middle), so a
 * camera that rises sees the far ranges stay put while the near sand drops away, as from a crane. Ranges are layers
 * (`paint.ts`), so they drift by less the further they are when the camera pans.
 */

/** The horizon in world y for a frame: `tilt` of the frame's height below its middle. */
export const horizonOf = (view: View, tilt: number): number => view.cy + view.h * tilt

export interface Far {
  range: Range
  /** How big against the action's plane. */
  f: number
  look: DuneLook
}

/** The day's air the far ranges pale into, and the sand's two faces. */
export const SAND = { lit: '#D9965A', shade: '#9E5A34', air: '#EAD2B4' }

/** The usual far desert: four ranges, from the horizon in. */
export function farDesert(seed: number): Far[] {
  return [
    { range: { seed: seed + 1, spacing: 60, height: 9, vary: 0.5 }, f: 0.05, look: { lit: SAND.lit, shade: SAND.shade, air: SAND.air, pale: 0.72 } },
    { range: { seed: seed + 2, spacing: 48, height: 10, vary: 0.55 }, f: 0.11, look: { lit: SAND.lit, shade: SAND.shade, air: SAND.air, pale: 0.5 } },
    { range: { seed: seed + 3, spacing: 40, height: 11, vary: 0.6 }, f: 0.22, look: { lit: SAND.lit, shade: SAND.shade, air: SAND.air, pale: 0.3 } },
    { range: { seed: seed + 4, spacing: 34, height: 10, vary: 0.6 }, f: 0.42, look: { lit: SAND.lit, shade: SAND.shade, air: SAND.air, pale: 0.14 } },
  ]
}

/** The sky and the far ranges, for a frame at `t`, under the sky keys given, horizon tilted by `tilt`. */
export function paintFar(b: Brush, sky: SkyKey[], ranges: Far[], tilt: number): void {
  const hy = horizonOf(b.view, tilt)
  paintSky(b, skyOf(sky, b.t), hy)
  for (const r of ranges) paintRange(b, r.range, r.f, hy, r.look)
}

/** A tilt keyed through time: [t, tilt] pairs, eased between. */
export function tiltOf(keys: [number, number][]): (t: number) => number {
  return (t) => {
    if (t <= keys[0][0]) return keys[0][1]
    for (let i = 1; i < keys.length; i++) {
      if (t <= keys[i][0]) {
        const u = clamp01((t - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0]))
        return lerp(keys[i - 1][1], keys[i][1], u * u * (3 - 2 * u))
      }
    }
    return keys[keys.length - 1][1]
  }
}
