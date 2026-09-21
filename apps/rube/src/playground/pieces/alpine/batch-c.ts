import type { Beat } from '../../staging'
import { bough } from './bough'
import { cuckoo } from './cuckoo'
import { halfpipe } from './halfpipe'
import { icicles } from './icicles'
import { slalom } from './slalom'
import { thinice } from './thinice'

/** One builder's beats for this world, in the order they were made, each with the line the Playground says of it. */
export const batch: Beat[] = [
  [halfpipe, 'a halfpipe cut in the snow: up a bank onto the near coping at a creep, over it and down the wall, across the flat, up the far wall and off its lip, a little air, and down on the far deck in a puff of powder'],
  [slalom, 'three sprung slalom poles across the ball’s way: it shoulders each flat along the snow and rolls on over it, and each whips upright again behind it, quivering, once the ball is out of its reach'],
  [icicles, 'four icicles under a rock brow: the ball’s rumble shakes them loose one after another, each spearing into the snow a radius off its heels; the last, the big one, bursts on the rail behind it and kicks it on'],
  [bough, 'a fir bough bent across the rail under a load of snow: the ball shoves it, the load slides off the tip and whumps into the snow, and the bough whips up out of the way and nods'],
  [cuckoo, 'a cuckoo clock as tall as a sentry box: the ball rolls onto a plate, the hands jump to the hour, the shutters fly open, and the cuckoo shoots out on a lazy-tongs and punches it on; then it is drawn back in'],
  [thinice, 'a frozen tarn cut through, two cells or three: the sheet cracks across on the ball’s heels all the way over and breaks into floes that tip, slop and bob; the ball stays ahead of the break and makes the far bank'],
]
