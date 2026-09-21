import { workshop } from '../../../pieces/workshop'
import { additions, type Shelf } from '../../staging'
import { bellows } from './bellows'
import { fuse } from './fuse'
import { mousetrap } from './mousetrap'
import { phasegate } from './phasegate'
import { scales } from './scales'
import { slinky } from './slinky'
import { steplift } from './steplift'
import { tapemeasure } from './tapemeasure'
import { wringer } from './wringer'

/**
 * Waiting to join Regular. New pieces first, in the order they were made;
 * then the ones a craft pass took out of the workshop, newest cut first,
 * each as it stood on the day it went.
 */
export const shelf: Shelf = additions(workshop, [
  [slinky, 'new', 'into the top coil of a slinky stood at the head of two wide stairs, a snug fit, like an egg into a cup; the stack sinks, comes back and tips, and the coils pour over in an arch onto the stair below with the ball in their end, then over again to the next, where the stack nods till its rim meets the rail and the ball rolls out; let go of the weight, it springs back, sways and stands'],
  [steplift, 'new', 'onto the first step of a step lift, against the next step\u2019s flank; a wheel turns, a rod raises and lowers a comb of three steps between two fixed ones, and the ball is handed up a stair at a time, tick, tick, tick, onto the rail a floor above; three turns, and the comb stops down'],
  [mousetrap, 'new', 'into the bowl of a spoon lashed to the hammer of a mousetrap the size of a bench; its weight rocks the bait plate, the hold-down bar slips its catch and flies up, and the hammer snaps over and throws the ball from the spoon in a high arc, over a gap or up a floor; the hammer slaps the board and the whole trap jumps'],
  [wringer, 'new', 'over a switch in the rail, and two rubber rollers wind up, one over the other, turning in; the ball meets both at once, is drawn into the nip, wrung flat through the slot between them and shot out the far side at twice its pace; the rollers run down'],
  [tapemeasure, 'new', 'onto the roof of a tape measure whose blade is hooked over a peg three cells on; the bump jumps the lock and the case reels itself along its own blade, faster and faster, the ball on its roof; its mouth meets the hook with a clack, it stops dead, and the ball skips the lip and rolls on'],
  [scales, 'restored', 'a pair of scales: the ball outweighs the brass, the pan sinks, tips on a rest and rolls it off a floor down. Cut in #61: cords, pans and a creeping beam were fiddly at show size; the toggle took its cells.'],
  [bellows, 'restored', 'tongue, rod, lever, a weight slips its hook onto a bellows, and the puff blows the ball on. Cut in #39: six things happened and the puff still never read as the cause.'],
  [fuse, 'restored', 'the ball lights a fuse that races it to a keg, and the keg throws it on. Retired in #21 with the phase gate; the cannon already had the better fuse.'],
  [phasegate, 'restored', 'an emitter turns the ball to a ghost, it passes through a wall, and a second makes it solid. Retired in #21; the arcade\u2019s phaser is the idea done properly.'],
])
