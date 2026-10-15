import { view } from '../depth'
import { edgeDark } from './grade'
import { scenery } from '../kit'
import { drawDeepFront, underAt } from './deep'
import { W } from './sea-plan'

/**
 * What stands between the camera and the machine in this place, and the light over all of it: the near plane, the
 * air, the grade. Drawn after the set and the parts and before Walter (`depth.ts`), so nothing here hides him or
 * changes his colour. It is handed show time as `t`.
 *
 * Under: the near rays and the near snow, a jellyfish nearer than he is, and the dark closing in from the frame's
 * edges and from below, deeper the deeper the frame is.
 */
export const seaFront = scenery<null>({
  name: 'sea-front',
  draw: (p, _s, c) => {
    const g = p.drawingContext as CanvasRenderingContext2D
    const v = view(p, c.k)
    const t = c.t
    const under = underAt(t)
    if (v.y1 > W) {
      g.save()
      // Only under the skin.
      g.beginPath()
      g.rect((v.x0 - 1) * c.k, W * c.k, (v.w + 2) * c.k, (v.y1 - W + 1) * c.k)
      g.clip()
      drawDeepFront(g, v, t)
      g.restore()
      // The dark closing in from the edges, and gathering below the deeper the frame is.
      const deep = Math.max(0, Math.min(1, (v.cy - W - 1) / 4))
      edgeDark(g, v, '#020B0E', (0.55 + 0.2 * deep) * under, 0.42, 0.12 + 0.12 * deep)
    }
  },
})
