import type { Beat } from '../../staging'
import { curtain } from './curtain'
import { stool } from './stool'

/** One builder's beats for this world, in the order they were made, each with the line the Playground says of it. */
export const batch: Beat[] = [
  [curtain, 'from the wings onto the footlight plate and up against the house curtain; the plate tips, a sandbag drops in the flies, and the curtain goes up in swags on its cords; under the scallops as soon as the hem will let it, and out past the far column; later the curtain comes down again, for nobody'],
  [stool, 'onto the round seat of a piano stool wound right down; the seat turns, slowly then fast, and winds itself up its screw a floor with the ball on its axis; at the top it rocks back, then over, and the ball rolls out of the dimple onto the rail up there, on or back'],
]
