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
  // No portal anywhere: every change of world is a match cut on Cobb (going under inside a blink, home through a veil
  // of morning), and inside the dream he goes down and back up on one path.
  cuts: () => false,
  // The end credits' words, which the page sets over the dark after the last chord.
  titles: creditsAt,
  soundtrack: {
    offset: 0,
    credit: 'Hans Zimmer · Time · Inception (2010)',
    href: 'https://www.youtube.com/watch?v=c56t7upa8Bk',
    // The label's upload the file was fetched from, whole: the same clock, sample for sample. The show runs on in
    // silence after it for the credits.
    youtube: [{ id: 'c56t7upa8Bk' }],
  },
}
