import recording from '../../../../../../../docs/promo/lalaland-epilogue-demo.mp3'
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
  // No portal anywhere: the changes of world are the kiss and the set being struck, both on the music.
  cuts: () => false,
  // The end credits' words, which the page sets over the frame as the last chords ring.
  titles: creditsAt,
  soundtrack: {
    src: recording,
    offset: 0,
    credit: 'Justin Hurwitz · Epilogue · La La Land (2016)',
    href: 'https://www.youtube.com/watch?v=jQVvT_UKZ6w',
    // The upload the file was fetched from, whole: the same clock, sample for sample.
    youtube: [{ id: 'jQVvT_UKZ6w' }],
  },
}
