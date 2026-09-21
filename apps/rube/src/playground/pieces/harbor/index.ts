import { harbor } from '../../../pieces/harbor'
import { additions, type Shelf } from '../../staging'
import { bottle } from './bottle'
import { breach } from './breach'
import { breakwater } from './breakwater'
import { coral } from './coral'
import { deckchair } from './deckchair'
import { lock } from './lock'
import { plughole } from './plughole'
import { skimmer } from './skimmer'
import { waterspout } from './waterspout'
import { wave } from './wave'

/**
 * Waiting to join Aqua. New pieces first, in the order they were made;
 * then the ones a craft pass took out of the harbor, newest cut first,
 * each as it stood on the day it went.
 */
export const shelf: Shelf = additions(harbor, [
  [breach, 'new', 'off the deck\u2019s end into deep water and down onto the head of a marker buoy held under by a slip hook on the bed of the sea; the buoy ducks, the hook falls open, and it goes up like a cork, a whole length clear of the water with the ball on its head, and the ball goes on up onto the deck a floor above; the buoy falls back, bobs and settles afloat'],
  [skimmer, 'new', 'out along the last plank of the deck, which is the arm of a clay trap lying flush in it on a drawn spring; the thump hops the latch and the arm whips up and over and lets the ball go low, flat and fast; it skips the open water three times, each skip shorter, a ring at every touch, and runs up the far pier\u2019s slip onto the deck'],
  [plughole, 'new', 'off the deck into a tub afloat on a walled pool, brim-full; the tub\u2019s chain goes over a davit to a bath plug in the pool\u2019s bed, and the plug comes out; the pool runs away down the hole and the tub goes down on it with the ball aboard; it grounds on a stone and topples, and the ball rolls out along the wet bed and up the far slip; the plug drops back and hauls the empty tub up over an empty pool'],
  [deckchair, 'new', 'off the deck onto the canvas of a deckchair stood in the shallows, and down into its sag; the strut jumps its notch and the chair snaps shut like a jaw; the closing pocket spits the ball out of the top like a pip, over the water onto the far deck, a cell on or two; the chair stands shut, keels over and lies folded'],
  [waterspout, 'new', 'off the deck\u2019s end the sea is open and a waterspout stands on it under its own small cloud; its foot comes across the water to meet the ball, takes it off the deck and winds it up, round the front, round the back, wider and higher every turn, and lets it go off its front onto the deck two floors up or three; then the funnel thins to a thread from the foot up and is gone, and the cloud is only a cloud'],
  [breakwater, 'restored', 'the ball tumbles two floors down a heap of boulders to a landing stage. Cut in #61: a bead-string of stones, fiddly to draw and to follow; the sail took its cells.'],
  [bottle, 'restored', 'a floating bottle swallows the ball, drifts across and pours it out on the far pier. Cut in #59: it never read as a bottle and hid the ball in a teal blob; the spyglass took its cells.'],
  [coral, 'restored', 'the ball bounces across two heads of brain coral. Cut in #59: nothing moved but the ball; the funnels took its cells and its hop timings.'],
  [lock, 'restored', 'a lock chamber fills and floats the ball up a floor on a raft. Cut in #41: the sluice had no visible cause.'],
  [wave, 'restored', 'a standing wave: the ball rides its face down a floor. Cut in #37 as not among the harbor\u2019s best.'],
])
