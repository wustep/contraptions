import type { Theme } from '../../../../../src/core/themes'
import type { World } from '../../worlds'
import { portal } from '../portal'
import { appletree } from './appletree'
import { bamboo } from './bamboo'
import { birdbath } from './birdbath'
import { flowerBloom } from './bloom'
import { bumblebee } from './bumblebee'
import { burrow } from './burrow'
import { cocoon } from './cocoon'
import { croquet } from './croquet'
import { dandelion } from './dandelion'
import { fern } from './fern'
import { footbridge } from './footbridge'
import { fountain } from './fountain'
import { frog } from './frog'
import { gate } from './gate'
import { hammock } from './hammock'
import { hose } from './hose'
import { maple } from './maple'
import { pinwheel } from './pinwheel'
import { pod } from './pod'
import { pond } from './pond'
import { pumpkin } from './pumpkin'
import { gardenRail } from './rail'
import { scarecrow } from './scarecrow'
import { slide } from './slide'
import { snail } from './snail'
import { spade } from './spade'
import { sprinkler } from './sprinkler'
import { sunflower } from './sunflower'
import { swing } from './swing'
import { toadstools } from './toadstools'
import { vine } from './vine'
import { wateringcan } from './wateringcan'
import { well } from './well'
import { windchime } from './windchime'
import { wheelbarrow } from './wheelbarrow'

/**
 * The garden: a greenhouse, soil and bloom. Everything here grows, pours,
 * wilts or burrows: the ball is watered on, carried up a vine and down a
 * flower's throat, wheeled in a barrow and on a snail's back, flung by a
 * sprinkler, through a hose, let through a gate that shuts on its heels,
 * dusted by a sunflower, swapped for a seed, and lost down a mole's
 * tunnel. A frog's tongue
 * takes it, a bumblebee labours off with it, a dandelion seed floats it
 * up and a falling leaf brings it down; it bounces up three toadstools,
 * goes down a well in the bucket, is tipped by a bamboo rocker, thrown by
 * a spade, tocked through croquet hoops, spins a
 * scarecrow, comes out of a cocoon another colour, and knocks an apple
 * out of a tree that rolls on in its place.
 *
 *   rail         a path edge on stakes, between tufts and pots
 *   wateringcan  tongue → cord → the can tips → a shower washes the ball on faster
 *   vine         onto a leaf in a pot; the vine shoots up the trellis with it; the leaf droops and spills it, one or two floors up
 *   bloom        over the near petals, round and down the inside of a trumpet flower, down the stem into its pot, out at the root
 *   wheelbarrow  into the tray; the barrow trundles two cells to a chock and pitches forward; the ball rides the tip out over the lip
 *   sprinkler    onto the head; the tap opens and the nozzles go round; spun off across a flowerbed
 *   sunflower    over a root; the head nods and dusts the ball with pollen; a new colour
 *   pod          into a seed pod's mouth; it swells and bursts; a seed in the plant's own colour shoots out between the flaps and takes the thread
 *   burrow       over the lip of a hole and down it; a ridge runs down the soil; up out of a molehill's top a floor down, over its foot
 *   hose         into a hose's mouth, and the hose swallows it like a snake: a bulge the ball's size in its skin goes round the loop two and a half times, gathering pace; out of the nozzle
 *   gate         into a picket gate; the knock hops the latch and the gate gives; the ball shoulders through, hauling a flowerpot up on a cord; the pot hauls the gate shut and its edge catches the ball on the back; it shoots off; the latch drops in
 *   snail        up the tail's curl and over the shell; carried in three slow pulls; a look up, a bow, and the heave throws it off over the head
 *   frog         onto a flat stone under a frog on a lily pad; it leans out, its throat swells, the tongue comes down the whole drop, sticks and snaps back with the ball; cheeks full; ptui, out along the rail one or two floors up
 *   toadstools   off the path's end onto three toadstools, each taller than the last; every cap squashes, springs and puffs spores; pum, pum, pum, onto the rail a floor up
 *   appletree    the ball bonks the trunk and stops dead; the crown shudders, a leaf or two falls; the ripe apple on the far bough drops, bounces once and rolls on with the thread; the ball stays at the tree's foot
 *   spade        onto the blade of a spade across a log; the grip kicks the twig out from under a flowerpot; the pot comes down on the handle; up off the blade and over the log, one or two floors, always on
 *   well         over the coping into the bucket; the pawl slips, the crank whirls; down the shaft two or three floors; the bucket topples on a stone and the ball rolls out through an arch
 *   bamboo       onto the scoop of a shishi-odoshi; its weight brings the mouth down onto the terrace's coping; off the tip and down a floor, heading back; the tail cracks on its stone
 *   cocoon       into one mouth of a silk tunnel slung between two twigs; it rocks and flushes with colour, the seam splits, three butterflies come out; the ball rolls out the far mouth their colour
 *   bumblebee    onto a daisy's face; a bumblebee comes over from its flower, takes hold, heaves twice, and labours up and across the bed with it to a shelf a floor up; sets it down rolling and goes home
 *   croquet      onto the mark, nose against a flap; the hook lets go and a hung mallet tocks it through two hoops; it clips the striped peg
 *   scarecrow    loose on its pole, one straw hand hanging in the way; the ball shoulders it round till the arm points out at us, and the figure is flung round nearly two turns; the crow on its other arm goes up and flies off
 *   dandelion    into the cup of a seed the size of a parasol; the tether slips its peg; up on the air, swinging, one or two floors, small seeds drifting after; the stalk snags in a twig's fork and the cup tips the ball out
 *   maple        out onto a big leaf held level on a sapling's twig; the stalk snaps; leaf and ball swoop down side to side, one or two floors; the ball rolls off the way the last swoop went
 *   fern         onto the coil of a fiddlehead; the frond unfurls and grows under it, pinnae opening as the curl leaves them; the tip hooks a floor up, bows, and lets it roll onto a shelf
 *   pinwheel     into a vane's tip; the knock spins the wheel and the next vane round scoops the ball up its far side and flips it onto a shelf a floor up; the wheel spins down
 *   windchime    shoulders through four wooden tubes on strings from a bough; each rides up over the ball and swings, clacking on its neighbour; rings off each; a touch slower out
 *   hammock      off the path's end into a hammock slung across a gap; it sags deep, springs, and tosses the ball in an arc onto the far path; then flaps itself still
 *   birdbath     over the near rim of a dish of water on a pedestal and down its inside; a splash; across half sunk, slowing, the water heaping up ahead of it; carried up the far side on the swell and out over the pouring lip, a slop of water after it
 *   footbridge   up the hump of an arched footbridge over a brook, slowing to the top and gathering pace down the far side; the planks give a little
 *   pumpkin      off the path's end onto a pumpkin's dome in the cell below; it squashes a hair, the stem bobs; down the far flank onto the path a floor down, on or back
 *   fountain     into the cup on a fountain's standpipe, corking it; the pipe shudders and the jet comes on under the ball; up a floor on a wobbling column of water; a bob at the top, the jet leans and it slides off the crown onto a shelf; the jet falls back to a bubble
 *   pond         off a stone wall across a raised lily pool on three pads; each ducks and tips under the ball and bobs up behind it, a ripple running out along the water's line; a hop over the open water between them, and up onto the far wall
 *   slide        onto the deck at the top of a playground slide's ladder, slowing to a crawl; a creep over the brink; down the lip and the chute gathering pace, round the foot and out along the flat a floor down
 *   swing        onto the seat of a swing hooked back at the path's end; the hook slips and it swings across a two-cell gap to a stop on the far post; the seat tips and pitches the ball onto the far path
 *   portal       the door at either end of a map; the far side is always a new map
 */

/**
 * Leaf, terracotta and marigold: the palettes the garden is painted in.
 * Cream under glass and kraft out on the plot; things grow in daylight,
 * and night is the arcade's.
 */
const THEMES: Theme[] = [
  {
    name: 'greenhouse',
    label: 'Greenhouse',
    bg: '#F3F1E4',
    ink: '#233A1F',
    colors: ['#5C9E4A', '#C9643B', '#F0B429', '#9A7BC4', '#E5647E'],
    note: 'leaf and terracotta under glass',
  },
  {
    name: 'allotment',
    label: 'Allotment',
    bg: '#E9DCC4',
    ink: '#3A2B1E',
    colors: ['#6B8E3D', '#B6452C', '#DDA63A', '#8FBBD9', '#F4EEE2'],
    note: 'kraft paper, soil and radish',
  },
]

export const garden: World = {
  name: 'garden',
  label: 'Forest',
  note: 'the greenhouse: soil, water and bloom',
  themes: THEMES,
  backdrops: ['sprigs', 'plain', 'dots'],
  tastes: {
    greenhouse: {
      vine: 1.7, bloom: 1.6, fern: 1.6, wateringcan: 1.5, sunflower: 1.4, cocoon: 1.4, dandelion: 1.4, pod: 1.3, bumblebee: 1.3, pond: 1.3, birdbath: 1.3, fountain: 1.3, sprinkler: 1.2, maple: 1.2, 'lift-tall': 1.8,
      well: 0.8, footbridge: 0.8, wheelbarrow: 0.7, croquet: 0.7, hammock: 0.7, pumpkin: 0.7, hose: 0.6, gate: 0.6, scarecrow: 0.6, slide: 0.6,
    },
    allotment: {
      wheelbarrow: 1.7, gate: 1.7, spade: 1.7, pumpkin: 1.7, well: 1.6, scarecrow: 1.6, burrow: 1.5, wateringcan: 1.4, appletree: 1.4, snail: 1.3, hose: 1.3, sprinkler: 1.2, pinwheel: 1.2, hammock: 1.2, footbridge: 1.2, 'drop-deep': 1.8,
      vine: 0.8, birdbath: 0.8, pod: 0.7, frog: 0.7, dandelion: 0.7, cocoon: 0.7, fern: 0.7, pond: 0.7, bloom: 0.6, toadstools: 0.6,
    },
    wild: {
      frog: 1.7, toadstools: 1.7, pod: 1.7, burrow: 1.6, snail: 1.6, bumblebee: 1.6, fern: 1.6, pond: 1.6, sprinkler: 1.5, maple: 1.5, dandelion: 1.4, hose: 1.4, cocoon: 1.3, vine: 1.2, sunflower: 1.2,
      gate: 0.7, bamboo: 0.7, windchime: 0.7, wateringcan: 0.6, spade: 0.6, birdbath: 0.6, fountain: 0.6, swing: 0.6, hammock: 0.6, pinwheel: 0.6, slide: 0.5, wheelbarrow: 0.5, croquet: 0.5,
    },
    lawn: {
      croquet: 1.8, swing: 1.8, slide: 1.8, bamboo: 1.7, hammock: 1.7, appletree: 1.5, sprinkler: 1.5, birdbath: 1.5, fountain: 1.5, hose: 1.4, windchime: 1.4, pinwheel: 1.4, wateringcan: 1.3, maple: 1.3, footbridge: 1.3, scarecrow: 1.2, sunflower: 1.2, well: 1.2,
      burrow: 0.7, toadstools: 0.7, snail: 0.7, wheelbarrow: 0.7, fern: 0.7, pumpkin: 0.7, pod: 0.6, frog: 0.6,
    },
  },
  pieces: [
    gardenRail, wateringcan, vine, flowerBloom, wheelbarrow, sprinkler, sunflower, pod, burrow, hose, gate, snail,
    frog, toadstools, appletree, spade, well, bamboo, cocoon, bumblebee, croquet, scarecrow, dandelion, maple,
    fern, pinwheel, windchime, hammock, birdbath, footbridge, pumpkin, fountain, pond, slide, swing,
    portal,
  ],
}
