import { arcade } from '../../../pieces/arcade'
import { additions, type Shelf } from '../../staging'
import { balloonpop } from './balloonpop'
import { flume } from './flume'
import { mirrors } from './mirrors'
import { prizewheel } from './prizewheel'
import { swingboat } from './swingboat'
import { targets } from './targets'
import { tubeman } from './tubeman'

/**
 * Waiting to join the Arcade. New pieces first, in the order they were
 * made; then the ones a craft pass took out of the arcade, newest cut
 * first, each as it stood on the day it went. The shelf borrows the ticket
 * machine with the rail and the door, so a run of staged beats is still
 * paid out.
 */
export const shelf: Shelf = additions(arcade, [
  [swingboat, 'new', 'off the rail\u2019s end into the dish of a swing boat hung from an A-frame, and its way shoves the boat off: forward a little, back further, forward further still, the ball bedded in the deck the whole time; the brake bites at the bottom of the third swing and the boat stops dead; the ball does not, and runs on up the bow and off its tip to the far rail; the boat creeps back to plumb and its lamps go out'],
  [balloonpop, 'new', 'a balloon stall: the ball shoves a needle carriage along under three pinned balloons, pop, pop, pop, a rag left on each pin; the carriage\u2019s finger rides up over the ball at the bar\u2019s end.'],
  [prizewheel, 'new', 'a prize wheel: the ball knocks its handle on and waits at a stop pin while it spins, the flapper ticking over the pegs, slower and slower; the wedge it stops on pays a hundred, two or five, and the pin drops.'],
  [mirrors, 'new', 'a hall of mirrors: three funhouse glasses behind the lane, and in each as the ball passes a thing that is and is not the ball, squat in the barrel, a thin candle in the hourglass, rippling in the ribbon; each frame’s lamp lights while it has somebody in it.'],
  [tubeman, 'new', 'onto the slack head of a tube man lying limp along the rail\u2019s end, and the pad under it gives; the blower kicks in, a swell runs along the sleeve, and it stands up from the foot in a whip, the head last with the ball on its crown, past plumb and back; arms out, it bows over the deck one or two floors up and the ball rolls off its head; let go, it dances a second, then the blower cuts and it folds down flat as it lay'],
  [flume, 'restored', 'a log flume: the ball rides a log down a chute and is pitched out at the splash. Cut in #61: a log on trestles, fiddly and hard to read; the helter-skelter took its cells.'],
  [targets, 'restored', 'a bank of three drop targets knocked down in turn, and reset. Cut in #37 as not among the arcade\u2019s best.'],
])
