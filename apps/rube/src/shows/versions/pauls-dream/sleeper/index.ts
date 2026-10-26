import type { Performance } from '../../../registry'
import { YOUTUBE } from './music'
import { compose, DURATION } from './score'

const { show, camera, blend, titles } = compose()

export { show }

export const performance: Performance = {
  show,
  duration: DURATION,
  camera,
  // No portal anywhere: Caladan and Arrakis are one world, and every change of place is the camera's.
  cuts: () => false,
  blend,
  titles,
  soundtrack: {
    offset: 0,
    credit: 'Hans Zimmer · Paul’s Dream · Dune (2021)',
    href: `https://www.youtube.com/watch?v=${YOUTUBE}`,
    // WaterTower Music's own upload, from its first second: the show's clock. Copyrighted, so there is no local
    // recording at all. The show runs on in silence after it for the last of the credits.
    youtube: [{ id: YOUTUBE }],
  },
}
