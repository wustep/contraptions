import type { Theme } from '../../../../../src/core/themes'
import type { World } from '../../worlds'
import { portal } from '../portal'
import { flowerBloom } from './bloom'
import { burrow } from './burrow'
import { hose } from './hose'
import { pod } from './pod'
import { gardenRail } from './rail'
import { rake } from './rake'
import { snail } from './snail'
import { sprinkler } from './sprinkler'
import { sunflower } from './sunflower'
import { vine } from './vine'
import { wateringcan } from './wateringcan'
import { wheelbarrow } from './wheelbarrow'

/**
 * The garden: a greenhouse, soil and bloom. Everything here grows, pours,
 * wilts or burrows: the ball is watered on, carried up a vine and down a
 * flower's throat, wheeled in a barrow and on a snail's back, flung by a
 * sprinkler, through a hose, whacked by a rake, dusted by a sunflower,
 * swapped for a seed, and lost down a mole's tunnel.
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
 *   rake         over the handle onto the tines; the handle comes up behind, over, and cracks it on the back; it shoots off
 *   snail        up the tail onto the shell; carried most of a cell, slowly; a shrug tips it off over the head
 *   portal       the door at either end of a map; the far side is always a new map
 */

/** Leaf, terracotta and marigold: the palettes the garden is painted in. */
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
  {
    name: 'nightgarden',
    label: 'Night Garden',
    bg: '#1E2A24',
    ink: '#E8EFE0',
    colors: ['#8FD17E', '#F5B7C4', '#F2D06B', '#B7A5E8', '#6CC6D6'],
    note: 'moths and moonflowers',
  },
]

export const garden: World = {
  name: 'garden',
  label: 'Garden',
  note: 'the greenhouse: soil, water and bloom',
  themes: THEMES,
  backdrops: ['sprigs', 'plain', 'dots'],
  tastes: {
    greenhouse: { vine: 1.7, bloom: 1.6, sunflower: 1.4, pod: 1.3, wateringcan: 1.5, sprinkler: 1.2, 'lift-tall': 1.8, hose: 0.6, rake: 0.6, wheelbarrow: 0.7 },
    allotment: { wheelbarrow: 1.7, rake: 1.7, wateringcan: 1.4, burrow: 1.5, snail: 1.3, hose: 1.3, sprinkler: 1.2, bloom: 0.6, vine: 0.8, pod: 0.7 },
    wild: { burrow: 1.6, pod: 1.7, sprinkler: 1.5, snail: 1.6, hose: 1.4, vine: 1.2, sunflower: 1.2, wheelbarrow: 0.5, wateringcan: 0.6, rake: 0.7 },
  },
  pieces: [gardenRail, wateringcan, vine, flowerBloom, wheelbarrow, sprinkler, sunflower, pod, burrow, hose, rake, snail, portal],
}
