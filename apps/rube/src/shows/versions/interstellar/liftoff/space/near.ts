import { scenery } from '../kit'

/**
 * The dark's near layer, Act I: what drifts between the camera and the machine in orbit, faster than the world.
 * Drawn over everything (its `over`), so it is kept to the edges and never over the ball's way.
 */
export const spaceNear = scenery<null>({
  name: 'space-near',
  draw: () => {},
  over: () => {},
})
