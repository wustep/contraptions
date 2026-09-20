import { harbor } from '../../../pieces/harbor'
import { additions, type Shelf } from '../../staging'
import { bottle } from './bottle'
import { breakwater } from './breakwater'
import { coral } from './coral'
import { lock } from './lock'
import { wave } from './wave'

/**
 * Waiting to join Aqua. New pieces first, in the order they were made;
 * then the ones a craft pass took out of the harbor, newest cut first,
 * each as it stood on the day it went.
 */
export const shelf: Shelf = additions(harbor, [
  [breakwater, 'restored', 'the ball tumbles two floors down a heap of boulders to a landing stage. Cut in #61: a bead-string of stones, fiddly to draw and to follow; the sail took its cells.'],
  [bottle, 'restored', 'a floating bottle swallows the ball, drifts across and pours it out on the far pier. Cut in #59: it never read as a bottle and hid the ball in a teal blob; the spyglass took its cells.'],
  [coral, 'restored', 'the ball bounces across two heads of brain coral. Cut in #59: nothing moved but the ball; the funnels took its cells and its hop timings.'],
  [lock, 'restored', 'a lock chamber fills and floats the ball up a floor on a raft. Cut in #41: the sluice had no visible cause.'],
  [wave, 'restored', 'a standing wave: the ball rides its face down a floor. Cut in #37 as not among the harbor\u2019s best.'],
])
