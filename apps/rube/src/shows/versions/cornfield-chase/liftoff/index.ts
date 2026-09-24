import recording from '../../../../../../../docs/promo/interstellar-liftoff-mix-demo.mp3'
import type { Performance } from '../../../registry'
import { DURATION } from './music'
import { compose } from './score'

const { show, camera } = compose()

export { show }

export const performance: Performance = {
  show,
  duration: DURATION,
  camera,
  // No portal anywhere: the only change of world is the rocket's, inside the cloud.
  cuts: () => false,
  soundtrack: {
    src: recording,
    offset: 0,
    credit: 'Hans Zimmer · Cornfield Chase, then No Time for Caution · Interstellar (2014) · tech demo only, not for release',
    href: 'https://www.youtube.com/watch?v=JuSsvM8B4Jc',
  },
}
