import recording from '../grieg-mountain-king-musopen.mp3'
import type { Performance } from '../../../registry'
import { creditsAt } from './credits'
import { DURATION, MUSIC_END } from './music'
import { compose } from './score'

const { show, camera } = compose()

export { show }

export const performance: Performance = {
  show,
  duration: DURATION,
  camera,
  // No portal is drawn: every change of world is a fire-door, a match cut on the spark inside a veil of flame.
  cuts: () => false,
  // The end credits' words, which the page sets over the frame, in the silence after the music.
  titles: creditsAt,
  soundtrack: {
    src: recording,
    offset: 0,
    credit: 'Edvard Grieg · In the Hall of the Mountain King · Czech National Symphony Orchestra, for Musopen (public domain)',
    href: 'https://www.youtube.com/watch?v=k8HCJS4FflY',
    // The orchestra's label upload is the same recording, sample for sample (scripts/shows/mountain-king-cue.sh).
    youtube: [{ id: 'k8HCJS4FflY', until: MUSIC_END }],
  },
}
