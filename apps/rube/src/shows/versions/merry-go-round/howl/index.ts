import type { Performance } from '../../../registry'
import { creditsAt } from './credits'
import { TALL } from './kit'
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
  // On a phone the picture goes up over the sets, not down into more floor (`kit.ts`).
  tall: TALL,
  // The end credits' words, which the page sets over the sky.
  titles: creditsAt,
  soundtrack: {
    offset: 0,
    credit: 'Joe Hisaishi · Merry-Go-Round of Life · Howl’s Moving Castle (2004)',
    href: 'https://www.youtube.com/watch?v=f7SS57LFPco',
    // The upload the file was fetched from, whole: the same clock, sample for sample. The show runs on in silence
    // after it for the credits.
    youtube: [{ id: 'f7SS57LFPco' }],
  },
}
