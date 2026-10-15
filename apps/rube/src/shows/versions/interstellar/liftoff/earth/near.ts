import { scenery } from '../kit'

/**
 * The farm's near ground: what passes between the camera and the machine, at the frame's edges, faster than the
 * world. Drawn over everything (its `over`), so it is kept to the edges and never over the ball's way.
 */
export const near = scenery<null>({
  name: 'near',
  draw: () => {},
  over: () => {},
})
