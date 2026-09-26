import recording from '../../../../../../../docs/promo/interstellar-liftoff-mix-demo.mp3'
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
  // No portal anywhere: the only change of world is the rocket's, inside the cloud.
  cuts: () => false,
  // The end credits' words, which the page sets over the frame (the canvas draws their starlight).
  titles: creditsAt,
  soundtrack: {
    src: recording,
    offset: 0,
    credit: 'Hans Zimmer · Cornfield Chase, then No Time for Caution · Interstellar (2014)',
    href: 'https://www.youtube.com/watch?v=JuSsvM8B4Jc',
    // The mix (scripts/liftoff-mix.sh) as two uploads: Cornfield Chase whole, fading over its last second, and No
    // Time for Caution from one beat before its bar-26 accent, fading up over that beat. YouTube cannot lift a video
    // above its own level, so the mix's +7 dB on the cue's quiet opening is not here: the organ comes in as recorded.
    youtube: [
      { id: 'JuSsvM8B4Jc', until: 126.984, fadeOut: 1 },
      { id: 'kpK4cDk2bRs', at: 126.5, from: 103.76, fadeIn: 1 },
    ],
  },
}
