import type { Pt } from '../../../../../parts'
import { drawEruption } from './erupt'
import { CX0, CY0, PLANE, type Frame } from './far'
import { ERUPT } from './geo'
import { drawLand } from './land'
import { drawFar, drawGlacier, drawMid, drawWater } from './ranges'
import { ctxOf, sm, type Pen } from './pen'
import { drawSky } from './sky'

export { HZ } from './sky'
export { plumeMid, plumeTop } from './erupt'

/**
 * Iceland's standing set, handed show time, far to near: the sky and its weather (`sky.ts`); the far range with the
 * volcano, smoking from the start and bursting on the band's last hit (`erupt.ts`); the fjord, the glacier's massif
 * and the mountains across the water (`ranges.ts`); and near to, the mountain the road is cut into
 * (`land.ts`). The far planes are drawn in the frame's own measure (`far.ts`), each sliding at its own pace.
 */

export const FAR_P = PLANE.far

/**
 * A point far off, given in frame heights from the frame's centre (`sx` right, `sy` down) as seen from the camera's
 * resting place, moved by a little parallax (`px`, `py`, frame heights a cell) as the camera goes elsewhere.
 */
export const farFn = (f: Frame, px: number, py: number) => {
  const H = f.y1 - f.y0
  return (sx: number, sy: number): Pt => [f.cx + (sx - px * (f.cx - CX0)) * H, f.cy + (sy - py * (f.cy - CY0)) * H]
}

/** How much the ash has taken the light: from the eruption, slowly, to the cut. */
export const ashLight = (t: number): number => 0.55 * sm(t, ERUPT + 1, 133.3)

export function drawSet(pen: Pen, t: number, f: Frame): void {
  const ctx = ctxOf(pen.p)
  const k = pen.k
  const dim = ashLight(t)
  drawSky(ctx, f, k, t, dim)
  drawFar(ctx, f, k, dim)
  drawEruption(ctx, f, k, t)
  drawWater(ctx, f, k, t, dim)
  drawGlacier(ctx, f, k, dim)
  drawMid(ctx, f, k, t, dim)
  drawLand(ctx, f, k, t, dim)
}
