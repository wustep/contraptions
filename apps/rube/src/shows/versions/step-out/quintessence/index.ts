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
  // No portal anywhere: every change of place is a match cut on Walter, one of them under the volcano's ash.
  cuts: () => false,
  // The end credits' words, which the page sets over the street.
  titles: creditsAt,
  soundtrack: {
    offset: 0,
    credit: 'José González · Step Out · The Secret Life of Walter Mitty (2013)',
    href: `https://www.youtube.com/watch?v=${YOUTUBE}`,
    // Republic Records' own upload, from its first second: the show's clock. Copyrighted, so there is no local
    // recording at all. The show runs on in silence after it for the credits.
    youtube: [{ id: YOUTUBE }],
  },
}
