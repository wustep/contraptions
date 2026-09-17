import type { Theme } from '../../../../../src/core/themes'
import type { World } from '../../worlds'
import { portal } from '../portal'
import { anchor } from './anchor'
import { anemone } from './anemone'
import { blowhole } from './blowhole'
import { buoy } from './buoy'
import { crab } from './crab'
import { dolphin } from './dolphin'
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
import { wave } from './wave'
import { whirlpool } from './whirlpool'

/**
 * The harbor: a pier over water, tide and salt. Everything here floats,
 * sinks, splashes or is hauled: the ball rides a buoy, a wave, a crab's
 * claw and a pelican's pouch; goes up inside a lighthouse and up a column
 * of kelp; goes down on an anchor and down a whirlpool; is inked by an
 * octopus and swapped for a pearl by an oyster.
 *
 *   rail        a pier: deck on pilings over still water
 *   buoy        the deck stops; a bell buoy leans to meet the ball, which rides its deck; it rocks over, clangs, and runs it off faster
 *   wave        a swell curling over, never still: the crest heaves, froth rolls over it and off the lip, streaks climb the face; the ball rides the face two cells over and a floor down
 *   lighthouse  in through the door behind the jamb, a lit window climbs the tower, out of the lantern room's door onto the gallery one or two up
 *   crab        rolls into the claw; lifted, aimed, pitched across a cell of water over the other claw, braced low
 *   kelp        into a tank at the bottom, bending upward; rises between two stalks of kelp on its own bubbles; out at the rim
 *   octopus     eyes follow the ball; the funnel on its head puckers and squirts ink up at it; a splat, and it leaves a new colour
 *   anchor      onto the stock; the pawl trips; down one to three floors on the chain; the seabed
 *   pelican     off the deck's end into the open beak of a pelican bent down from its post; it hops round, flies to the far post, tips its head and the ball rolls out
 *   blowhole    onto a whale's back, into the dip over its blowhole; a rumble; it blows, and the spout throws it a floor up, past a shelf and down onto it
 *   oyster      into the open shell; snap; a beat; a pearl rolls out and takes the thread
 *   whirlpool   onto a brim-full tank; round the near side and round and down the vortex to the drain, out a floor down facing back
 *   seal        off the deck's end onto the nose of a seal on a rock; it rears up, balances, bounces it twice, winds back and tosses it up past the end of the deck above and down onto it, on or back; then it claps
 *   jellyfish   off the deck's end onto the crown of a jellyfish's bell, which dimples deep and springs back; a high arc onto the deck a floor up; the bell rings on, the lights round its rim running out from the middle
 *   dolphin     off the deck's end, and a dolphin comes up under it, takes it on its beak and leaps a whole arc; at the top it flicks the ball on to the deck above and dives in under that deck's end; a fin cruises before and after
 *   puffer      onto the back of a pufferfish asleep in a gap in the deck; it blows up with a start to a ball of spines and pops the ball over onto the far deck; then sighs itself small again
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
    tidal: { lighthouse: 1.6, kelp: 1.6, anchor: 1.6, whirlpool: 1.5, blowhole: 1.3, wave: 1.2, 'lift-tall': 2, 'drop-deep': 2, crab: 0.7, pelican: 0.7 },
    quay: { buoy: 1.7, crab: 1.6, pelican: 1.5, oyster: 1.3, octopus: 1.3, anchor: 1.2, lighthouse: 1.2, wave: 0.6, blowhole: 0.7, whirlpool: 0.7 },
    surf: { wave: 2, blowhole: 1.8, crab: 1.4, pelican: 1.4, whirlpool: 1.3, buoy: 1.2, oyster: 0.6, lighthouse: 0.6, anchor: 0.7 },
  },
  pieces: [pierRail, buoy, wave, lighthouse, crab, kelp, octopus, anchor, pelican, blowhole, oyster, whirlpool, seal, jellyfish, dolphin, puffer, serpent, anemone, portal],
}
