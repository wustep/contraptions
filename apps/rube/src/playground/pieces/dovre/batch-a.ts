import type { Beat } from '../../staging'
import { heads } from './heads'
import { nose } from './nose'
import { sunbeam } from './sunbeam'

/** One builder's beats for this world, each with the line the Playground says of it. */
export const batch: Beat[] = [
  [heads, 'a stand-in for the heads'],
  [nose, 'a stand-in for the nose'],
  [sunbeam, 'a stand-in for the sunbeam'],
]
