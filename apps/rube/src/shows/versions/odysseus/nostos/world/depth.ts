import type { View } from '../draw'
import { horizonOf } from './sea'

/**
 * Things far behind the waterline's plane: islands on the horizon, a city's far side, clouds. A layer `d` cells behind
 * the plane the action is in is seen smaller and moves slower as the camera moves, as it would through a lens set back
 * from the plane by about the frame's height: its scale is `h / (h + d)`, so a far layer barely changes size while the
 * camera pushes in or pulls back, and drifts by less as it pans. Heights in a layer are measured up from the horizon,
 * where everything far goes down to.
 */
export interface Layer {
  /** How much smaller than in the action's plane. */
  s: number
  /** A layer x (cells, as if in the plane) to the frame's world x. */
  x(x: number): number
  /** A height over the layer's sea level (cells, negative up) to the frame's world y. */
  y(y: number): number
  /** The horizon, in the frame's world y. */
  hy: number
}

export function layer(view: View, d: number): Layer {
  const h = Math.max(1, view.h)
  const s = h / (h + Math.max(0, d))
  const hy = horizonOf(view)
  // The waterline of a layer at depth d sits between the action's waterline (y = 0) and the horizon, as the sea's
  // surface does going away.
  const sea = hy * (1 - s)
  return {
    s,
    x: (x) => view.cx + (x - view.cx) * s,
    y: (y) => sea + y * s,
    hy,
  }
}
