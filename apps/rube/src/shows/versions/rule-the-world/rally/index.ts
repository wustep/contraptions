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
  // No portal anywhere: every change of place is a match cut on Marty.
  cuts: () => false,
  // The end credits' words, which the page sets over the ward.
  titles: creditsAt,
  soundtrack: {
    offset: 0,
    credit: 'Tears for Fears · Everybody Wants to Rule the World · Marty Supreme (2025)',
    href: `https://www.youtube.com/watch?v=${YOUTUBE}`,
    // Universal Music Group's own upload, from its first second: the show's clock. Copyrighted, so there is no local
    // recording at all. The show runs on in silence after it for the last of the credits.
    youtube: [{ id: YOUTUBE }],
  },
}
