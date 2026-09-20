import type { Theme } from '../../../../../src/core/themes'
import type { World } from '../../worlds'
import { portal } from '../portal'
import { anchor } from './anchor'
import { anemone } from './anemone'
import { barrel } from './barrel'
import { blowhole } from './blowhole'
import { breakwater } from './breakwater'
import { buoy } from './buoy'
import { chest } from './chest'
import { crab } from './crab'
import { creel } from './creel'
import { dinghy } from './dinghy'
import { dolphin } from './dolphin'
import { flags } from './flags'
import { floats } from './floats'
import { foghorn } from './foghorn'
import { funnels } from './funnels'
import { hawser } from './hawser'
import { jellyfish } from './jellyfish'
import { kelp } from './kelp'
import { lighthouse } from './lighthouse'
import { oar } from './oar'
import { octopus } from './octopus'
import { oyster } from './oyster'
import { paddlewheel } from './paddlewheel'
import { pelican } from './pelican'
import { puffer } from './puffer'
import { pierRail } from './rail'
import { rod } from './rod'
import { sandcastle } from './sandcastle'
import { seal } from './seal'
import { serpent } from './serpent'
import { slipway } from './slipway'
import { spyglass } from './spyglass'
import { springboard } from './springboard'
import { submarine } from './submarine'
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
 *   submarine   off the deck's end into the hatch of a surfaced submarine's tower; the hatch slams and she dives to periscope depth; the periscope crosses two cells of sea, a feather at its foot, wake and bubbles behind; she comes up at the far pier and the ball pops out onto the deck
 *   spyglass    in at the big end of a brass spyglass shut up short on a stand; its way shoves the small tube out ahead of it, clack, then the middle one, slower, clack, across open water, the nose sinking into a crutch on the far pier; the cap flips up and the ball rolls out of the eyepiece
 *   barrel      into the mouth of a cask balanced on the deck's corner; its weight tips the cask off the end, head first, turning as it falls; it lands on the pier a floor down the other way round, slaps level and rocks; the ball trundles out of the same mouth, which now faces on
 *   springboard out along a diving board that bends under it; at the tip it dips and springs and the ball dives in a high arc into the sea; a string of bubbles runs to the far pier's slip; up the slip out of the water with a second splash, slowing, and over onto the deck
 *   rod         off the deck's end into the sea by the float of a rod in a holder; the float ducks, the rod bends double and whips up, and the line hauls the ball out in an arc onto the deck a cell on or a floor up; the line swings from the tip after
 *   sandcastle  onto a sandbank into a sandcastle: the towers slump, lumps hop off, the flag keels over, and the ball ploughs through the heap slowed by the sand
 *   chest       onto the gold in a treasure chest let into the deck, brim-full, its lid thrown back; it beds down between two heaps; the lid slams over it; gold light out of the seam and the keyhole; the lid flies back, coins jump, and the ball rolls off gilded, the palette's yellowest colour
 *   paddlewheel off the deck's end onto a paddle of a steamer's side wheel turning in the water; up the near side and over the top onto the deck a floor up; the funnel puffs behind
 *   creel       into the funnel mouth of a lobster pot at the rail's end; the knock hops it off its hook and a lead weight on the rope's other end goes down into the sea and hauls it up a floor; the davit swings it inboard and sets it down; the ball shoulders the far mouth's flap aside and rolls out
 *   oar         off the deck's end onto the blade of an oar across a rowlock; the blade dips, the handle lifts the bail of a full bucket off its hook, the bucket drops into the sea and the blade whips the ball up onto the deck a floor above
 *   funnels     off the deck's end onto the after funnel of a steam launch moored low between the piers, like a cork; she toots, and the puff pops it on to the forward funnel, which toots it up onto the far deck; she ducks and bobs under each
 *   breakwater  off the pier's end down the face of a heap of boulders two floors high, boulder to boulder, a splash off the one awash, up onto the stage at the water's edge, short or long
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
  label: 'Aqua',
  note: 'the pier: water, tide and salt',
  themes: THEMES,
  backdrops: ['waves', 'plain', 'waves'],
  tastes: {
    tidal: {
      lighthouse: 1.6, kelp: 1.6, anchor: 1.6, whirlpool: 1.5, slipway: 1.4, jellyfish: 1.4, blowhole: 1.3, hawser: 1.2, seal: 1.2, 'lift-tall': 2, 'drop-deep': 2,
      breakwater: 1.6, paddlewheel: 1.5, creel: 1.4, barrel: 1.3, submarine: 1.2, oar: 1.2, funnels: 1.2,
      crab: 0.7, pelican: 0.7, floats: 0.7, flags: 0.7, foghorn: 0.7, serpent: 0.7, sandcastle: 0.7, chest: 0.7,
    },
    quay: {
      buoy: 1.7, flags: 1.6, crab: 1.6, foghorn: 1.5, dinghy: 1.5, hawser: 1.5, pelican: 1.5, slipway: 1.4, oyster: 1.3, octopus: 1.3, floats: 1.3, anchor: 1.2, lighthouse: 1.2,
      creel: 1.6, barrel: 1.6, spyglass: 1.5, rod: 1.5, chest: 1.4, oar: 1.4, funnels: 1.4, submarine: 1.3, paddlewheel: 1.3,
      seal: 0.8, blowhole: 0.7, whirlpool: 0.7, dolphin: 0.6, jellyfish: 0.6, serpent: 0.6, sandcastle: 0.7, springboard: 0.7,
    },
    surf: {
      blowhole: 1.8, dolphin: 1.8, dinghy: 1.4, crab: 1.4, pelican: 1.4, whirlpool: 1.3, floats: 1.3, serpent: 1.3, buoy: 1.2, seal: 1.2,
      springboard: 1.8, rod: 1.4, submarine: 1.3, spyglass: 1.3, breakwater: 1.2, sandcastle: 1.2,
      anchor: 0.7, slipway: 0.7, oyster: 0.6, lighthouse: 0.6, flags: 0.6, anemone: 0.7, creel: 0.7, chest: 0.6, barrel: 0.7,
    },
    reef: {
      anemone: 1.6, puffer: 1.7, jellyfish: 1.7, seal: 1.6, serpent: 1.6, octopus: 1.5, oyster: 1.4, kelp: 1.5, crab: 1.3, dolphin: 1.2, whirlpool: 1.1,
      sandcastle: 1.3, chest: 1.2,
      funnels: 0.6, flags: 0.6, foghorn: 0.6, slipway: 0.6, hawser: 0.7, dinghy: 0.7, lighthouse: 0.7, barrel: 0.6, creel: 0.7, paddlewheel: 0.6, submarine: 0.7, spyglass: 0.8,
    },
  },
  pieces: [
    pierRail, buoy, lighthouse, crab, kelp, octopus, anchor, pelican, blowhole, oyster, whirlpool,
    dinghy, seal, flags, slipway, jellyfish, floats, puffer, hawser, dolphin, foghorn, serpent, anemone,
    submarine, spyglass, barrel, springboard, rod, sandcastle, chest, paddlewheel, creel, oar, funnels, breakwater,
    portal,
  ],
}
