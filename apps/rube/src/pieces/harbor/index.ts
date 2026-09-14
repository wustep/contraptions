import type { Theme } from '../../../../../src/core/themes'
import type { World } from '../../worlds'
import { portal } from '../portal'
import { pierRail } from './rail'

/**
 * The harbor: a pier over water, tide and salt. Everything here floats,
 * sinks, splashes or is hauled: the ball rides a buoy, a wave, a crab's
 * claw and a pelican's pouch; goes up inside a lighthouse and up a column
 * of kelp; goes down on an anchor and down a whirlpool; is inked by an
 * octopus and swapped for a pearl by an oyster.
 */

/** Sea and sky: the palettes the harbor is painted in. */
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
  {
    name: 'abyss',
    label: 'Abyss',
    bg: '#0B2027',
    ink: '#CFE8E4',
    colors: ['#2EC4B6', '#41B3A3', '#E8F1F2', '#F6AE2D', '#5C7AEA'],
    note: 'bioluminescence',
  },
]

export const harbor: World = {
  name: 'harbor',
  label: 'Harbor',
  note: 'the pier: water, tide and salt',
  themes: THEMES,
  backdrops: ['waves', 'plain', 'waves'],
  tastes: {
    tidal: {},
    quay: {},
    surf: {},
  },
  pieces: [pierRail, portal],
}
