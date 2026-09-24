import type { Beat } from '../../staging'
import { handcar } from './handcar'
import { ropebridge } from './ropebridge'
import { boulder } from './boulder'

/** One builder's beats for this world, each with the line the Playground says of it. */
export const batch: Beat[] = [
  [handcar, 'a stand-in for the handcar'],
  [ropebridge, 'a stand-in for the ropebridge'],
  [boulder, 'a stand-in for the boulder'],
]
