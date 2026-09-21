import type { Beat } from '../../staging'
import { jackbox } from './jackbox'
import { timpani } from './timpani'

/** One builder's beats for this world, in the order they were made, each with the line the Playground says of it. */
export const batch: Beat[] = [
  [timpani, 'off the stage\u2019s edge onto a kettledrum in the pit; the head takes it down and throws it back, a high arc onto the far stage or a shelf a floor up; the head rings on'],
  [jackbox, 'onto the lid of a jack-in-the-box; the crank comes round three times by itself; pop: the leaves fly back and Jack comes up under the ball on his spring and throws it a floor or two up; he stays out, nodding'],
]
