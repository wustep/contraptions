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
import { stageRail } from './rail'

/**
 * Music: a concert hall. Strings, brass, felt and wood. Everything here is
 * struck, plucked, blown or wound: the ball plays a glissando across a
 * harp, is thrown by a piano's hammer and carried on a trombone's slide,
 * rides an accordion down as it sighs shut, leaves a note on every line of
 * a staff, and holds an organ's pedal down while another ball is blown
 * clear of the pipes. A world staged in the Playground, not yet in the
 * loop.
 *
 * The pieces are listed in the batches their builders made them in; the
 * world's own doc block is written when it is let into Machine.
 */
const THEMES: Theme[] = [
  {
    name: 'rehearsal',
    label: 'Rehearsal',
    bg: '#E4EFE9',
    ink: '#1D2B2A',
    colors: ['#D9A33B', '#C8443C', '#2E7F86', '#7A4E8F', '#FAF6EA'],
    note: 'brass, velvet and ivory in a green room',
  },
  {
    name: 'soiree',
    label: 'Soirée',
    bg: '#F3E6EA',
    ink: '#2A1E2E',
    colors: ['#B5313F', '#D6A23A', '#3A5F9A', '#5C8F6B', '#FFF8F0'],
    note: 'an evening house: claret and gilt on blush',
  },
]

const beats = [...a, ...b, ...c, ...d, ...e, ...f]

const orchestra: World = {
  name: 'orchestra',
  label: 'Music',
  note: 'a concert hall: strings, brass, felt and wood',
  themes: THEMES,
  backdrops: ['rules', 'plain', 'dots'],
  tastes: {
    mixed: {},
    percussion: {},
    chamber: {},
    theatre: {},
  },
  pieces: [stageRail, ...beats.map(([piece]) => piece), portal],
}

export const shelf: Shelf = newWorld(orchestra, { rail: 'the front edge of a stage: a board on turned balusters, a shell footlight, a folded stand', ...Object.fromEntries(beats.map(([piece, note]) => [piece.name, note])) })
