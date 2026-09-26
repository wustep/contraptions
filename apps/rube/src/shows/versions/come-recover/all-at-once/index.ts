import recording from '../../../../../../../docs/promo/eeaao-come-recover-demo.mp3'
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
  // No portal anywhere: every change of world is a verse-jump, a match cut on the ball.
  cuts: () => false,
  // The end credits' words, which the page sets over the frame.
  titles: creditsAt,
  soundtrack: {
    src: recording,
    offset: 0,
    credit: 'Son Lux · Come Recover (Empathy Fight) · Everything Everywhere All at Once (2022)',
    href: 'https://www.youtube.com/watch?v=IOh1H06Cx0w',
    // The upload the file was cut from (scripts/eeaao-cue.sh): from its first second to 5:32, fading over the last nine.
    youtube: [{ id: 'IOh1H06Cx0w', until: 332, fadeOut: 9 }],
  },
}
