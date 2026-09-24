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
import { dovreRail } from './rail'

/**
 * Troll: the mountain of the Dovre King, after Grieg's hall and the
 * Norwegian tales. Mine galleries cut by trolls and worked by troll
 * machines, a feasting hall under the mountain, and the trolls themselves,
 * asleep in the rock until something wakes them. Everything here keeps
 * time (`tempo.ts`): the ball comes in on a beat and every blow lands on
 * one, so the same pieces play the Show at whatever tempo the music takes.
 * A world staged in the Playground, not yet in the loop.
 *
 * The pieces are listed in the batches their builders made them in; the
 * world's own doc block is written when it is let into Machine.
 */
const THEMES: Theme[] = [
  {
    name: 'lantern',
    label: 'Lantern',
    bg: '#ECE6D8',
    ink: '#23262E',
    colors: ['#5E7F45', '#B4472C', '#E1A73B', '#3E6D8E', '#F6F0E2'],
    note: 'lamplight on bone-white rock: moss, rust and fjord blue',
  },
  {
    name: 'feast',
    label: 'Feast',
    bg: '#F3E4D4',
    ink: '#2C1A16',
    colors: ['#B3302A', '#D8A03A', '#1F6B67', '#44683A', '#FBF1E0'],
    note: 'the King’s hall: rosemaling red and gold on scrubbed pine',
  },
]

const beats = [...a, ...b, ...c, ...d, ...e, ...f]

const dovre: World = {
  name: 'dovre',
  label: 'Troll',
  note: 'the troll king’s mountain: galleries, a feasting hall, and trolls asleep in the rock',
  themes: THEMES,
  backdrops: ['plain', 'dots', 'plain'],
  tastes: {
    mixed: {},
    mine: { stampmill: 2, manengine: 2, tippler: 2, handcar: 2, ropebridge: 1.5, crucible: 1.5, rockingstone: 1.5 },
    hall: { tablecloth: 2, tankards: 2, boar: 2, boulder: 1.5, threeheads: 1.5, bear: 1.5, door: 1.5 },
    trolls: { heads: 2, nose: 2, tail: 2, threeheads: 2, sunbeam: 2, bear: 1.5 },
  },
  pieces: [dovreRail, ...beats.map(([piece]) => piece), portal],
}

export const shelf: Shelf = newWorld(dovre, {
  rail: 'a gallery floor of troll-sawn planks: on a pit prop, under a miner’s lamp, over a clump of moss, or the plank alone',
  ...Object.fromEntries(beats.map(([piece, note]) => [piece.name, note])),
})
