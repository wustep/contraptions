import type { Beat } from '../../staging'
import { stampmill } from './stampmill'
import { manengine } from './manengine'
import { tippler } from './tippler'

/** One builder's beats for this world, each with the line the Playground says of it. */
export const batch: Beat[] = [
  [stampmill, 'a stand-in for the stampmill'],
  [manengine, 'a stand-in for the manengine'],
  [tippler, 'a stand-in for the tippler'],
]
