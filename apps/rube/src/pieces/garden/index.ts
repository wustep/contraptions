import type { Theme } from '../../../../../src/core/themes'
import type { World } from '../../worlds'
import { portal } from '../portal'
import { gardenRail } from './rail'

/**
 * The garden: a greenhouse, soil and bloom. Everything here grows, pours,
 * wilts or burrows: the ball is watered on, carried up a vine and down a
 * flower's throat, wheeled in a barrow and on a snail's back, flung by a
 * sprinkler, through a hose, whacked by a rake, dusted by a sunflower,
 * swapped for a seed, and lost down a mole's tunnel.
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
    greenhouse: {},
    allotment: {},
    wild: {},
  },
  pieces: [gardenRail, portal],
}
