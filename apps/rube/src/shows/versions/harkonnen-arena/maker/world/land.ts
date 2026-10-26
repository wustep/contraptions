import { clamp01, composed, lerp, type Brush, type View } from '../paint'
import { paintRange, type DuneLook, type Range } from './dunes'
import { paintSky, skyOf, type SkyKey } from './sky'

/**
 * The deep desert seen from where the action is: the sky, and range after range of dunes going away to the horizon, each
 * paler and smaller than the one before, over a flat (y = 0) that runs out to them.
 *
 * The horizon is at the eye: it stands in the frame (a share `tilt` of the frame's height below its middle), so a
 * camera that rises sees the far ranges stay put while the near sand drops away, as from a crane. Ranges are layers
 * (`paint.ts`), so they drift by less the further they are when the camera pans.
 *
 * The camera is a dolly, not a zoom: a range `d` cells behind the action's plane is drawn at `h / (h + d)` of its size,
 * `h` the frame's height in cells (the camera stands about a frame's height back from what it frames). So close on the
 * two of them the far desert is a low line behind them, and pulled back over the flat it comes up nearer their size,
 * and in a push in the background grows less than the subject, as through a lens that moves.
 */

/** How big a layer `d` cells behind the action's plane is drawn, in a frame `h` cells high. */
export const depthScale = (h: number, d: number): number => h / (h + Math.max(0, d))

/** The horizon in world y for a frame: `tilt` of the composed frame's height below its middle. */
export const horizonOf = (view: View, tilt: number): number => {
  const f = composed(view)
  return f.cy + f.h * tilt
}

/** The composed frame's height in cells: what a far layer's depth is measured against (`depthScale`). */
export const frameH = (view: View): number => composed(view).h

export interface Far {
  range: Range
  /** How far behind the action's plane, cells. */
  d: number
  look: DuneLook
}

/** The day's air the far ranges pale into, and the sand's two faces. */
export const SAND = { lit: '#D9965A', shade: '#9E5A34', air: '#EAD2B4' }

/** The usual far desert: four ranges, from the horizon in. */
export function farDesert(seed: number): Far[] {
  return [
    { range: { seed: seed + 1, spacing: 420, height: 34, vary: 0.6, soft: true }, d: 1200, look: { lit: SAND.lit, shade: SAND.shade, air: SAND.air, pale: 0.7 } },
    { range: { seed: seed + 2, spacing: 260, height: 30, vary: 0.7, soft: true }, d: 560, look: { lit: SAND.lit, shade: SAND.shade, air: SAND.air, pale: 0.5 } },
    { range: { seed: seed + 3, spacing: 150, height: 22, vary: 0.85, gap: 0.25 }, d: 250, look: { lit: SAND.lit, shade: SAND.shade, air: SAND.air, pale: 0.32 } },
    { range: { seed: seed + 4, spacing: 90, height: 16, vary: 0.85, gap: 0.3 }, d: 100, look: { lit: SAND.lit, shade: SAND.shade, air: SAND.air, pale: 0.15 } },
  ]
}

/** The sky and the far ranges, for a frame at `t`, under the sky keys given, horizon tilted by `tilt`. */
export function paintFar(b: Brush, sky: SkyKey[], ranges: Far[], tilt: number): void {
  const hy = horizonOf(b.view, tilt)
  paintSky(b, skyOf(sky, b.t), hy)
  for (const r of ranges) paintRange(b, r.range, depthScale(frameH(b.view), r.d), hy, r.look)
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
