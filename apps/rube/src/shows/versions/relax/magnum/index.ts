import recording from '../relax-demo.mp3'
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
  // No portal anywhere: every change of place is a match cut on Derek, three of them inside a press camera's flash.
  cuts: () => false,
  // The end credits' words, which the page sets over the Center's sky.
  titles: creditsAt,
  soundtrack: {
    src: recording,
    offset: 0,
    credit: 'Frankie Goes to Hollywood · Relax · Zoolander (2001)',
    href: 'https://www.youtube.com/watch?v=kpgRJSrfoic',
    // The label's upload the file was fetched from, whole: the same clock, sample for sample. The show runs on in
    // silence after it for the credits.
    youtube: [{ id: 'kpgRJSrfoic' }],
  },
}
