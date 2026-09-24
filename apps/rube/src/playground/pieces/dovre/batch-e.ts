import type { Beat } from '../../staging'
import { crucible } from './crucible'
import { door } from './door'
import { rockingstone } from './rockingstone'

/** One builder's beats for this world, each with the line the Playground says of it. */
export const batch: Beat[] = [
  [crucible, 'a stand-in for the crucible'],
  [door, 'a stand-in for the door'],
  [rockingstone, 'a stand-in for the rockingstone'],
]
