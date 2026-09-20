import { workshop } from '../../../pieces/workshop'
import { additions, type Shelf } from '../../staging'
import { bellows } from './bellows'
import { fuse } from './fuse'
import { phasegate } from './phasegate'
import { scales } from './scales'

/**
 * Waiting to join Regular. New pieces first, in the order they were made;
 * then the ones a craft pass took out of the workshop, newest cut first,
 * each as it stood on the day it went.
 */
export const shelf: Shelf = additions(workshop, [
  [scales, 'restored', 'a pair of scales: the ball outweighs the brass, the pan sinks, tips on a rest and rolls it off a floor down. Cut in #61: cords, pans and a creeping beam were fiddly at show size; the toggle took its cells.'],
  [bellows, 'restored', 'tongue, rod, lever, a weight slips its hook onto a bellows, and the puff blows the ball on. Cut in #39: six things happened and the puff still never read as the cause.'],
  [fuse, 'restored', 'the ball lights a fuse that races it to a keg, and the keg throws it on. Retired in #21 with the phase gate; the cannon already had the better fuse.'],
  [phasegate, 'restored', 'an emitter turns the ball to a ghost, it passes through a wall, and a second makes it solid. Retired in #21; the arcade\u2019s phaser is the idea done properly.'],
])
