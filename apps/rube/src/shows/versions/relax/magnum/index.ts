import type { Performance } from '../../../registry'
import { creditsAt } from './credits'
import { DURATION } from './music'
import { compose } from './score'
import { warmLead } from './derelicte/tower-plan'

const { show, camera } = compose()
// The lead that whips loose on the plug is simulated once; do it while loading, not on the plug's own frame.
warmLead()

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
    offset: 0,
    credit: 'Frankie Goes to Hollywood · Relax · Zoolander (2001)',
    href: 'https://www.youtube.com/watch?v=kpgRJSrfoic',
    // The label's upload the file was fetched from, whole: the same clock, sample for sample. The show runs on in
    // silence after it for the credits.
    youtube: [{ id: 'kpgRJSrfoic' }],
  },
}
