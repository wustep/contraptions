import type { Theme } from '../../../../../src/core/themes'
import type { World } from '../../worlds'
import { portal } from '../portal'
import { anchor } from './anchor'
import { anemone } from './anemone'
import { blowhole } from './blowhole'
import { buoy } from './buoy'
import { crab } from './crab'
import { dinghy } from './dinghy'
import { dolphin } from './dolphin'
import { flags } from './flags'
import { floats } from './floats'
import { foghorn } from './foghorn'
import { hawser } from './hawser'
import { jellyfish } from './jellyfish'
import { kelp } from './kelp'
import { lighthouse } from './lighthouse'
import { octopus } from './octopus'
import { oyster } from './oyster'
import { pelican } from './pelican'
import { puffer } from './puffer'
import { pierRail } from './rail'
import { seal } from './seal'
import { serpent } from './serpent'
import { slipway } from './slipway'
import { whirlpool } from './whirlpool'

/**
 * The harbor: a pier over water, tide and salt. Everything here floats,
 * sinks, splashes or is hauled: the ball rides a buoy, a crab's
 * claw and a pelican's pouch; goes up inside a lighthouse and up a column
 * of kelp; goes down on an anchor and down a whirlpool; is inked by an
 * octopus and swapped for a pearl by an oyster. It sails a dinghy across
 * open water, and goes down the ways in a hull and down a hawser in a
 * breeches buoy; it runs up the signal flags and sets off the foghorn; it
 * hops a line of net floats and rolls over a sea serpent's coils; a seal
 * balances it, a jellyfish bounces it, a dolphin leaps with it, a
 * pufferfish pops it and an anemone stains it.
 *
 *   rail        a pier: deck on pilings over still water
 *   buoy        the deck stops; a bell buoy leans to meet the ball, which rides its deck; it rocks over, clangs, and runs it off faster
 *   lighthouse  in through the door behind the jamb, a lit window climbs the tower, out of the lantern room's door onto the gallery one or two up
 *   crab        rolls into the claw; lifted, aimed, pitched across a cell of water over the other claw, braced low
 *   kelp        into a tank at the bottom, bending upward; rises between two stalks of kelp on its own bubbles; out at the rim
 *   octopus     eyes follow the ball; the funnel on its head puckers and squirts ink up at it; a splat, and it leaves a new colour
 *   anchor      onto the stock; the pawl trips; down one to three floors on the chain; the seabed
 *   pelican     off the deck's end into the open beak of a pelican bent down from its post; it hops round, flies to the far post, tips its head and the ball rolls out
 *   blowhole    onto a whale's back, into the dip over its blowhole; a rumble; it blows, and the spout throws it a floor up, past a shelf and down onto it
 *   oyster      into the open shell; snap; a beat; a pearl rolls out and takes the thread
 *   whirlpool   onto a brim-full tank; round the near side and round and down the vortex to the drain, out a floor down facing back
 *   dinghy      over the transom of a moored dinghy; the shove slips her painter off the cleat, the sail fills and she sails two cells to the far pier's fender; the jolt pitches the ball off over the bow
 *   seal        off the deck's end onto the nose of a seal on a rock; it rears up, balances, bounces it twice, winds back and tosses it up past the end of the deck above and down onto it, on or back; then it claps
 *   flags       across a treadle plank; the pawl under it lets a lead weight go into the water, and three signal flags run up the mast, a pennant, a square and a swallowtail, each breaking out as it clears the ball
 *   slipway     into the cockpit of a hull on a cradle at the head of the ways; the thump jumps the chock out; down the ways, off the cradle at its stop, a belly-flop a floor below that throws the ball onto the pier
 *   jellyfish   off the deck's end onto the crown of a jellyfish's bell, which dimples deep and springs back; a high arc onto the deck a floor up; the bell rings on, the lights round its rim running out from the middle
 *   floats      the deck stops; three net floats on a line; each dunks under the ball and bobs it on to the next, a ring on the water each time
 *   puffer      onto the back of a pufferfish asleep in a gap in the deck; it blows up with a start to a ball of spines and pops the ball over onto the far deck; then sighs itself small again
 *   hawser      into a breeches buoy under a block on a mooring line; the jerk pulls the lanyard's toggle; down the line, which the load hangs in two straight parts, to a rat guard; the ring swings on and tips the ball out a floor down
 *   dolphin     off the deck's end, and a dolphin comes up under it, takes it on its beak and leaps a whole arc; at the top it flicks the ball on to the deck above and dives in under that deck's end; its fin cruises after
 *   foghorn     out along a treadle that squeezes a bellows under the deck; the horn sounds right behind the ball and the blast sends it off faster; the gull asleep on the horn goes straight up
 *   serpent     the deck stops; a sea serpent's coils come up out of the water ahead of the ball and go under behind it, and it rolls over them and down the head's brow onto the far deck; the ball never stops
 *   anemone     into the crown of an anemone in a rock pool; the tentacles close over it like a fist and squeeze twice; it leaves the anemone's colour, shouldered out by a wave of the fan
 *   portal      the door at either end of a map; the far side is always a new map
 */

/**
 * Sea and sky: the palettes the harbor is painted in. The pier by day and
 * the pier at the end of it, and no third: the harbor is a place above the
 * water in daylight, and night is the arcade's.
 */
const THEMES: Theme[] = [
  {
    name: 'harbor',
    label: 'Harbor',
    bg: '#E6F0F5',
    ink: '#14324A',
    colors: ['#1B6CA8', '#E8553F', '#F2C14E', '#2FA38A', '#F7F7F2'],
    note: 'navy, coral and sand on a sea-sky paper',
  },
  {
    name: 'sundown',
    label: 'Sundown',
    bg: '#F6E3D3',
    ink: '#3B2A3A',
    colors: ['#E0705A', '#F2B34C', '#3D6B8C', '#8C5B8A', '#FFF3E8'],
    note: 'the pier at the end of the day',
  },
]

export const harbor: World = {
  name: 'harbor',
  label: 'Harbor',
  note: 'the pier: water, tide and salt',
  themes: THEMES,
  backdrops: ['waves', 'plain', 'waves'],
  tastes: {
    tidal: {
      lighthouse: 1.6, kelp: 1.6, anchor: 1.6, whirlpool: 1.5, slipway: 1.4, jellyfish: 1.4, blowhole: 1.3, hawser: 1.2, seal: 1.2, 'lift-tall': 2, 'drop-deep': 2,
      crab: 0.7, pelican: 0.7, floats: 0.7, flags: 0.7, foghorn: 0.7, serpent: 0.7,
    },
    quay: {
      buoy: 1.7, flags: 1.6, crab: 1.6, foghorn: 1.5, dinghy: 1.5, hawser: 1.5, pelican: 1.5, slipway: 1.4, oyster: 1.3, octopus: 1.3, floats: 1.3, anchor: 1.2, lighthouse: 1.2,
      seal: 0.8, blowhole: 0.7, whirlpool: 0.7, dolphin: 0.6, jellyfish: 0.6, serpent: 0.6,
    },
    surf: {
      blowhole: 1.8, dolphin: 1.8, dinghy: 1.4, crab: 1.4, pelican: 1.4, whirlpool: 1.3, floats: 1.3, serpent: 1.3, buoy: 1.2, seal: 1.2,
      anchor: 0.7, slipway: 0.7, oyster: 0.6, lighthouse: 0.6, flags: 0.6, anemone: 0.7,
    },
    reef: {
      anemone: 1.6, puffer: 1.7, jellyfish: 1.7, seal: 1.6, serpent: 1.6, octopus: 1.5, oyster: 1.4, kelp: 1.5, crab: 1.3, dolphin: 1.2, whirlpool: 1.1,
      flags: 0.6, foghorn: 0.6, slipway: 0.6, hawser: 0.7, dinghy: 0.7, lighthouse: 0.7,
    },
  },
  pieces: [
    pierRail, buoy, lighthouse, crab, kelp, octopus, anchor, pelican, blowhole, oyster, whirlpool,
    dinghy, seal, flags, slipway, jellyfish, floats, puffer, hawser, dolphin, foghorn, serpent, anemone,
    portal,
  ],
}
