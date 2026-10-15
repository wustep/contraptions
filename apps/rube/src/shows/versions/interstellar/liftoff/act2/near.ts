import type { Pt } from '../../../../../parts'
import { scenery } from '../kit'

/**
 * Cooper Station's near layer: what hangs in the air between the camera and the ring, faster than the world. Drawn
 * over everything (its `over`), so it is kept to the edges and never over the ball's way.
 */
export interface NearState {
  /** The axis, in world cells. */
  axis: Pt
  /** Show time the lights come up (the organ's accent). */
  lights: number
}

export const stationNear = scenery<NearState>({
  name: 'station-near',
  draw: () => {},
  over: () => {},
})
