import type { Beat } from '../../staging'
import { threeheads } from './threeheads'
import { tail } from './tail'
import { bear } from './bear'

/** One builder's beats for this world, each with the line the Playground says of it. */
export const batch: Beat[] = [
  [threeheads, 'a stand-in for the threeheads'],
  [tail, 'a stand-in for the tail'],
  [bear, 'a stand-in for the bear'],
]
