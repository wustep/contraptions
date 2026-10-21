import type { Performance } from '../../../registry'
import { DURATION, compose } from './score'
import { YOUTUBE } from './music'

const { show, camera, blend, titles, overview } = compose()

export { show }

export const performance: Performance = {
  show,
  duration: DURATION,
  camera,
  // No portal anywhere: every change of place is the camera's, a cut or a dissolve.
  cuts: () => false,
  blend,
  titles,
  overview,
  // A phone held upright sees more sky over the desert than sand under it.
  tall: 0.7,
  soundtrack: {
    offset: 0,
    credit: 'Hans Zimmer · Harkonnen Arena · Dune: Part Two (2024)',
    href: `https://www.youtube.com/watch?v=${YOUTUBE}`,
    // WaterTower Music's own upload, from its first second: the show's clock. Copyrighted, so there is no local
    // recording at all. The show runs on in quiet after it for the last of the credits.
    youtube: [{ id: YOUTUBE }],
  },
}
