import recording from '../whiplash-caravan-demo.mp3'
import type { Performance } from '../../../registry'
import { DURATION } from './music'
import { compose } from './score'
import { creditsAt } from './credits'

const { show, camera } = compose()

export { show }

export const performance: Performance = {
  show,
  duration: DURATION,
  camera,
  // No portal anywhere: the changes of place (Shaffer, the road, Carnegie Hall) are match cuts on the ball, on the music.
  cuts: () => false,
  // The end credits' words, which the page sets over the dark hall after the cut-off.
  titles: creditsAt,
  soundtrack: {
    src: recording,
    offset: 0,
    credit: 'Juan Tizol and Duke Ellington, arranged by John Wasson · Caravan · Whiplash (2014)',
    href: 'https://www.youtube.com/watch?v=38CRu1rCaKg',
    // The upload the file was fetched from, whole: the same clock, sample for sample. The show runs on past its end,
    // in silence, for the credits.
    youtube: [{ id: '38CRu1rCaKg' }],
  },
}
