import type { Theme } from '../../../../../src/core/themes'
import type { World } from '../../worlds'
import { portal } from '../portal'
import { laneRail } from './rail'

/**
 * The arcade: neon night. Everything here flashes, scores or pays out:
 * the ball is popped by a bumper, spun through a spinner, kicked up a
 * skee-ball lane, slapped across an air-hockey table, dropped through a
 * pachinko field and down a ticket machine, lifted by a claw and by a
 * high striker, and swapped for a token by a change machine.
 */

/** Signs after rain: the palettes the arcade is painted in. All of them dark. */
const THEMES: Theme[] = [
  {
    name: 'neon',
    label: 'Neon',
    bg: '#0D0B1E',
    ink: '#F4F0FF',
    colors: ['#FF2A6D', '#05D9E8', '#FFE900', '#7CFF6B', '#B967FF'],
    note: 'signs after rain',
  },
  {
    name: 'cabinet',
    label: 'Cabinet',
    bg: '#160E1A',
    ink: '#F7E9F0',
    colors: ['#FF7A1A', '#2BD1C4', '#FFD23F', '#FF4F9A', '#7B61FF'],
    note: 'the side art of an old cabinet',
  },
  {
    name: 'crt',
    label: 'CRT',
    bg: '#07110D',
    ink: '#D8F3DC',
    colors: ['#39FF88', '#F9F871', '#FF6E6E', '#5FD3FF', '#FFB86B'],
    note: 'phosphor green and a burnt-in score',
  },
]

export const arcade: World = {
  name: 'arcade',
  label: 'Arcade',
  note: 'neon night: lights, scores and payouts',
  themes: THEMES,
  backdrops: ['stars', 'grid', 'stars'],
  tastes: {
    pinball: {},
    midway: {},
    jackpot: {},
  },
  pieces: [laneRail, portal],
}
