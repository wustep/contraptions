import { scenery, smooth } from '../kit'
import { mix } from '../home/pen'
import { tone } from './dawn'
import { plumes } from './far'
import { BOULDER } from './himalaya-draw'
import { GUST } from './himalaya-plan'

/**
 * What stands between the camera and the machine in this place: the air, and in it the gust on the downbeat of the
 * build, tearing the snow off the boulder over him in one veil that streams away right, lifting and thinning. Drawn
 * after the set and the parts and before Walter (`depth.ts`), so nothing here hides him or changes his colour. It is
 * handed show time as `t`. The colour of the hour is in the drawing itself (`dawn.ts`), not laid over it.
 */
export const himalayaFront = scenery<null>({
  name: 'himalaya-front',
  draw: (p, _s, c) => {
    const g = c.t - GUST
    if (g < 0 || g > 3.5) return
    const ctx = p.drawingContext as CanvasRenderingContext2D
    const veil = { x: BOULDER[0] - 0.4 + 1.2 * g, y: BOULDER[1] - 0.28 - 0.15 * g, len: 1 + 2.2 * smooth(g, 0, 1.2), thick: 0.28 * (1 + 0.5 * g), seed: 3 }
    ctx.save()
    ctx.scale(c.k, c.k)
    plumes(ctx, [veil], mix(tone(c.t).faceSnow, '#FFFFFF', 0.6), 0.7 * smooth(g, 0, 0.12) * (1 - smooth(g, 0.8, 3.2)), c.t)
    ctx.restore()
  },
})
