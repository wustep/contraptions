import { scenery, smooth } from '../kit'
import { motes, view, type View } from '../depth'
import { mix, rgba } from '../home/pen'
import { SEAM } from '../music'
import { tone, wind, type Tone } from './dawn'

/**
 * What stands between the camera and the machine in this place: the air, with the wind in it, a little spindrift
 * streaming across and more as the build climbs. Drawn after the set and the parts and before Walter (`depth.ts`), so
 * nothing here hides him or changes his colour. It is handed show time as `t`. The colour of the hour is in the drawing
 * itself (`dawn.ts`), not laid over it.
 */

type C2 = CanvasRenderingContext2D

/** Spindrift in the air on the machine's plane: fine streaks close to, coarser ones far off, so it reads at any distance. */
function air(ctx: C2, v: View, t: number, tn: Tone): void {
  const w = wind(t)
  const close = 1 - smooth(v.h, 7, 13)
  const col = mix('#FFFFFF', tn.faceLit, 0.4 * tn.light)
  const a = 0.08 + 0.07 * Math.min(1, w)
  if (close > 0.02) motes(ctx, v, t, { n: Math.round(1 + 3 * w), seed: 3, tile: [4, 3], r: [0.005, 0.009], v: [3.2 + 1.5 * w, 0.35], spread: 0.35, sway: [0.12, 0.6], color: rgba(col, a * close), streak: 0.06 })
  if (close < 0.98) motes(ctx, v, t, { n: Math.round(1 + 2 * w), seed: 4, tile: [14, 9], r: [0.012, 0.022], v: [9 + 3 * w, 0.8], spread: 0.35, sway: [0.3, 0.4], color: rgba(col, a * (1 - close)), streak: 0.07 })
}

export const himalayaFront = scenery<null>({
  name: 'himalaya-front',
  draw: (p, _s, c) => {
    const t = c.t
    if (t < SEAM.himalaya - 0.4 || t > SEAM.press + 0.6) return
    const ctx = p.drawingContext as CanvasRenderingContext2D
    const v = view(p, c.k)
    const tn = tone(t)
    air(ctx, v, t, tn)
  },
})
