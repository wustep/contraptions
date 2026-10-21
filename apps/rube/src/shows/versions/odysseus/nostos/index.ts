import type { Performance } from '../../../registry'
import { DURATION, compose } from './score'
import { YOUTUBE } from './music'

const { show, camera, blend, titles } = compose()

export { show }

export const performance: Performance = {
  show,
  duration: DURATION,
  camera,
  // No portal anywhere: the voyage is one sea, and every change of place is the camera's.
  cuts: () => false,
  blend,
  titles,
  soundtrack: {
    offset: 0,
    credit: 'Ludwig Göransson · Odysseus · The Odyssey (2026)',
    href: `https://www.youtube.com/watch?v=${YOUTUBE}`,
    // Back Lot Music's own upload, from its first second: the show's clock. Copyrighted, so there is no local recording
    // at all. The show runs on in silence after it for the last of the credits.
    youtube: [{ id: YOUTUBE }],
  },
}
