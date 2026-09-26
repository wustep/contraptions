import recording from '../grieg-mountain-king-musopen.mp3'
import type { Performance } from '../../../registry'
import { compose } from './score'
import { creditsAt, DURATION } from './credits'

const { show, camera } = compose()

export { show }

export const performance: Performance = {
  show,
  duration: DURATION,
  camera,
  // No portal anywhere: one mountain, one path, one take.
  cuts: () => false,
  // The end credits' words, which the page sets over the dawn after the last chord.
  titles: creditsAt,
  soundtrack: {
    src: recording,
    offset: 0,
    credit: 'Edvard Grieg · In the Hall of the Mountain King · Peer Gynt · Czech National Symphony Orchestra, for Musopen · public domain',
    href: 'https://www.youtube.com/watch?v=k8HCJS4FflY',
    // The same recording as the file, sample for sample (the orchestra's label upload): one clock. The show runs on
    // past its end, in silence, for the credits.
    youtube: [{ id: 'k8HCJS4FflY' }],
  },
}
