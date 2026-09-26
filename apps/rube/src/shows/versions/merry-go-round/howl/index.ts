import recording from '../merry-go-round-demo.mp3'
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
  // No portal anywhere: every change of place is a match cut on Sophie, nearly always through the castle's door.
  cuts: () => false,
  // The end credits' words, which the page sets over the sky.
  titles: creditsAt,
  soundtrack: {
    src: recording,
    offset: 0,
    credit: 'Joe Hisaishi · Merry-Go-Round of Life · Howl’s Moving Castle (2004)',
    href: 'https://www.youtube.com/watch?v=f7SS57LFPco',
    // The upload the file was fetched from, whole: the same clock, sample for sample. The show runs on in silence
    // after it for the credits.
    youtube: [{ id: 'f7SS57LFPco' }],
  },
}
