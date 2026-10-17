import { view } from '../depth'
import { scenery } from '../kit'
import { drawTopside } from './topside'

/**
 * What stands between the camera and the machine in this place, and the light over all of it: the near plane, the
 * air, the grade. Drawn after the set and the parts and before Walter (`depth.ts`), so nothing here hides him or
 * changes his colour. It is handed show time as `t`.
 *
 * Under, nothing: the water in front of him is left open for him and the shark. Above, once he is out: gulls.
 */
export const seaFront = scenery<null>({
  name: 'sea-front',
  draw: (p, _s, c) => {
    const g = p.drawingContext as CanvasRenderingContext2D
    // Above: the gulls (`topside.ts`).
    drawTopside(g, view(p, c.k), c.t)
  },
})
