import { view } from '../depth'
import { scenery } from '../kit'
import { drawDeepFront } from './deep'
import { W } from './sea-plan'
import { drawTopside } from './topside'

/**
 * What stands between the camera and the machine in this place, and the light over all of it: the near plane, the
 * air, the grade. Drawn after the set and the parts and before Walter (`depth.ts`), so nothing here hides him or
 * changes his colour. It is handed show time as `t`.
 *
 * Under: the near rays and the near snow, and a jellyfish nearer than he is (the dark below is the water's own
 * gradient: a vignette over all this would cost as much as the rays). Above, once he is out: gulls, spray, the sun on
 * the deck.
 */
export const seaFront = scenery<null>({
  name: 'sea-front',
  draw: (p, _s, c) => {
    const g = p.drawingContext as CanvasRenderingContext2D
    const v = view(p, c.k)
    const t = c.t
    if (v.y1 > W) {
      g.save()
      // Only under the skin.
      g.beginPath()
      g.rect((v.x0 - 1) * c.k, W * c.k, (v.w + 2) * c.k, (v.y1 - W + 1) * c.k)
      g.clip()
      drawDeepFront(g, v, t)
      g.restore()
    }
    // Above: the gulls, the spray, the sun through the cloud onto the deck, the cake's warmth (`topside.ts`).
    drawTopside(g, v, t)
  },
})
