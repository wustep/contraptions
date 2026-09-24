import type { Beat } from '../../staging'
import { tankards } from './tankards'
import { tablecloth } from './tablecloth'
import { boar } from './boar'

/** One builder's beats for this world, each with the line the Playground says of it. */
export const batch: Beat[] = [
  [tankards, 'a stand-in for the tankards'],
  [tablecloth, 'a stand-in for the tablecloth'],
  [boar, 'a stand-in for the boar'],
]
