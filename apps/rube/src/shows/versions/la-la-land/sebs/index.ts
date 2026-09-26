import recording from '../la-la-land-sebs-mix-demo.mp3'
import type { Performance } from '../../../registry'
import { DURATION } from './music'
import { compose } from './score'
import { creditsAt } from './credits'

const { show, camera, covers } = compose()

export { show, camera, covers }

export const performance: Performance = {
  show,
  duration: DURATION,
  camera,
  // No portal anywhere: the stage changes place under its own covers (`transitions.ts`).
  cuts: () => false,
  // The end credits' words, which the page sets over the frame.
  titles: creditsAt,
  soundtrack: {
    src: recording,
    offset: 0,
    credit: 'Justin Hurwitz · Epilogue, then The End · La La Land (2016)',
    href: 'https://www.youtube.com/watch?v=_vpCaKQXhMg',
    // The mix (scripts/shows/sebs-mix.sh) as the two uploads it was made from: the Epilogue whole, then The End at 464 s.
    youtube: [{ id: '_vpCaKQXhMg' }, { id: 'PMbrnvyLTdg', at: 464 }],
  },
}
