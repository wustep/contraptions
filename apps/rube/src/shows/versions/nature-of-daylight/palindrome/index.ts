import recording from '../nature-of-daylight-demo.mp3'
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
  // No portal anywhere: every change of place is a cut (a match cut on Louise, one on the shell, one in a white-out).
  cuts: () => false,
  // The end credits' words, which the page sets over the lake house.
  titles: creditsAt,
  soundtrack: {
    src: recording,
    offset: 0,
    credit: 'Max Richter · On the Nature of Daylight · The Blue Notebooks (2004), heard in Arrival (2016)',
    href: 'https://www.youtube.com/watch?v=rVN1B-tUpgs',
    // The label's upload the file was fetched from, whole: the same clock, sample for sample. The show runs on in
    // silence after it for the credits.
    youtube: [{ id: 'rVN1B-tUpgs' }],
  },
}
