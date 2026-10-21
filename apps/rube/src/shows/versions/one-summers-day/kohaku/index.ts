import type { Performance } from '../../../registry'
import { DURATION, compose } from './score'
import { YOUTUBE } from './music'

const { show, camera, blend, titles, overview } = compose()

export { show }

export const performance: Performance = {
  show,
  duration: DURATION,
  camera,
  // No portal anywhere: the spirit town is one place, and every change of place is the camera's.
  cuts: () => false,
  blend,
  titles,
  overview,
  // On a phone held upright the extra picture goes mostly above the frame: sky, the bathhouse's upper floors.
  tall: 0.7,
  soundtrack: {
    offset: 0,
    credit: 'Joe Hisaishi · One Summer’s Day · Spirited Away (2001) · London Symphony Orchestra',
    href: `https://www.youtube.com/watch?v=${YOUTUBE}`,
    // The official upload on Joe Hisaishi's own channel, from its first second: the show's clock. Copyrighted, so there
    // is no local recording at all. The show runs on in quiet after it for the last of the credits.
    youtube: [{ id: YOUTUBE }],
  },
}
