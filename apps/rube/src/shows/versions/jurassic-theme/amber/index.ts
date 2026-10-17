import type { Performance } from '../../../registry'
import { creditsAt } from './credits'
import { DURATION, YOUTUBE } from './music'
import { compose } from './score'

const { show, camera } = compose()

export { show }

export const performance: Performance = {
  show,
  duration: DURATION,
  camera,
  // No portal: every change of world is a match cut on Grant.
  cuts: () => false,
  tall: 0.62,
  titles: creditsAt,
  soundtrack: {
    offset: 0,
    credit: 'John Williams · Theme from Jurassic Park · Jurassic Park (1993)',
    href: `https://www.youtube.com/watch?v=${YOUTUBE}`,
    youtube: [{ id: YOUTUBE }],
  },
}
