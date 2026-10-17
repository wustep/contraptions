import { scenery } from '../kit'
import { edges } from '../iceland/vignette'
import { T0, T1 } from './home-plan'

/**
 * What lies over this place: only its grade, the corners going dark. Drawn after the set and the parts and before
 * Walter (`depth.ts`), so nothing here hides him or changes his colour. It is handed show time as `t`.
 */

const sm = (t: number, a: number, b: number): number => {
  const u = Math.max(0, Math.min(1, (t - a) / (b - a)))
  return u * u * (3 - 2 * u)
}

export const homeFront = scenery<null>({
  name: 'home-front',
  draw: (p, _s, c) => {
    const t = c.t
    if (t < T0 - 1 || t > T1 + 1.2) return
    edges(p.drawingContext as CanvasRenderingContext2D, 0.55 * sm(t, T0 - 1, T0 + 0.5))
  },
})
