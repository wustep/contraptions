import type { Beat } from '../../staging'
import { inkwell } from './inkwell'
import { organ } from './organ'

/** One builder's beats for this world, in the order they were made, each with the line the Playground says of it. */
export const batch: Beat[] = [
  [inkwell, 'over the rim of an inkwell let into the stage and down the inside of the bowl, under the ink, across and up the far side, slowed by it; out over the far rim the ink\u2019s colour for good; the ink slops and the quill nods'],
  [organ, 'onto an organ\u2019s pedal, and stays there holding the note; wind comes up, the balls stopping the first two pipes lift and bob on it, and the third is blown clear, over onto the stage beyond the chest with the thread; the wind runs out and the two sink back'],
]
