import type { Theme } from '../../../../../../src/core/themes'
import { portal } from '../../../pieces/portal'
import type { World } from '../../../worlds'
import { newWorld, type Shelf } from '../../staging'
import { batch as a } from './batch-a'
import { batch as b } from './batch-b'
import { batch as c } from './batch-c'
import { batch as d } from './batch-d'
import { batch as e } from './batch-e'
import { batch as f } from './batch-f'
import { snowRail } from './rail'

/**
 * Snow: a mountain in winter. Snow, ice, timber and rope. Everything here
 * slides, drifts, cracks or is hauled: the ball rides a chairlift and a
 * drag lift, is flung by a fir bent under snow and butted by an ibex,
 * leaves a ski jump, gathers a snowball round itself down a slope, rides a
 * cornice down when it breaks, and comes through a glacier as ice. A world
 * staged in the Playground, not yet in the loop.
 *
 * The pieces are listed in the batches their builders made them in; the
 * world's own doc block is written when it is let into Machine.
 */
const THEMES: Theme[] = [
  {
    name: 'powder',
    label: 'Powder',
    bg: '#DCE9F2',
    ink: '#1F3550',
    colors: ['#D8433B', '#2E86C1', '#F2B233', '#2F7D5B', '#FFFFFF'],
    note: 'ski red, glacier blue and fir on a cold morning',
  },
  {
    name: 'alpenglow',
    label: 'Alpenglow',
    bg: '#EDE3F1',
    ink: '#33284A',
    colors: ['#E26D5C', '#F2B84B', '#5B7DB1', '#3E8E7E', '#FFFDF8'],
    note: 'the last light on the snow',
  },
]

const beats = [...a, ...b, ...c, ...d, ...e, ...f]

const alpine: World = {
  name: 'alpine',
  label: 'Snow',
  note: 'a mountain in winter: snow, ice, timber and rope',
  themes: THEMES,
  backdrops: ['flakes', 'plain', 'flakes'],
  tastes: {
    mixed: {},
    piste: {},
    backcountry: {},
    village: {},
  },
  pieces: [snowRail, ...beats.map(([piece]) => piece), portal],
}

export const shelf: Shelf = newWorld(alpine, { rail: 'a track over the snow: a trail wand, a small fir, a snow fence, or the drift alone', ...Object.fromEntries(beats.map(([piece, note]) => [piece.name, note])) })
