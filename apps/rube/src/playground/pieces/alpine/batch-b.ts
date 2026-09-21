import type { Beat } from '../../staging'
import { bank } from './bank'
import { cornice } from './cornice'
import { crevasse } from './crevasse'
import { skijump } from './skijump'
import { sled } from './sled'
import { snowball } from './snowball'

/** One builder's beats for this world, in the order they were made, each with the line the Playground says of it. */
export const batch: Beat[] = [
  [bank, 'down a roll-in and off its lip onto the snow, up a wall of snow as far as its way will take it, a hang, and back down, under the lip and out a floor lower, heading back'],
  [cornice, 'out along a lip of snow that overhangs a crag; a crack runs down behind the ball and the block breaks off and falls with it, two or three floors, into a burst of powder; the ball rolls off the heap'],
  [crevasse, 'onto a crust of snow over a crack in the ice; the crust dips and gives way, and the ball falls a floor or two between walls of blue ice, glancing off one and then the other, onto the snow at the bottom, and out under an arch, on or back'],
  [skijump, 'down the in-run of a ski jump and off the table\u2019s lip, long and low over the knoll of a hill built to the shape of the flight; a glancing touch-down in powder on the landing slope, and out along the out-run a floor down'],
  [sled, 'onto the deck of a sledge at the head of a slope, up against its horns; the thump sends it over the brink and down, faster all the way, into a soft heap at the foot, which stops it dead and pitches the ball out over its bow, a floor down'],
  [snowball, 'down a slope gathering a snowball round itself, the ball its coloured heart; it breaks on a stump at the foot and the ball hops on bare, a floor down'],
]
