import type { Performance } from '../../../registry'
import { creditsAt } from './credits'
import { DURATION } from './music'
import { compose } from './score'

const { show, camera } = compose()

export { show }

export const performance: Performance = {
  show,
  duration: DURATION,
  camera,
  // No portal anywhere: every change of place is a match cut on Louise, two of them inside a white-out.
  cuts: () => false,
  // The end credits' words, which the page sets over the lake house.
  titles: creditsAt,
  soundtrack: {
    offset: 0,
    credit: 'Jóhann Jóhannsson · Heptapod B · Arrival (2016)',
    href: 'https://www.youtube.com/watch?v=KzaqrQuwr1k',
    // The label's upload the file was fetched from, whole: the same clock, sample for sample. The show runs on in
    // silence after it for the credits.
    youtube: [{ id: 'KzaqrQuwr1k' }],
  },
}
