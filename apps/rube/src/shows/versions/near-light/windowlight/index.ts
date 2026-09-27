import recording from '../near-light-demo.mp3'
import type { Piece, Pt } from '../../../../parts'
import type { Placed } from '../../../../plan'
import type { Performance } from '../../../registry'
import { camera } from './camera'
import { GLASS } from './layout'
import { light } from './light'
import { fronts, machine } from './machine'
import { MARGIN, PERIOD } from './music'
import { room } from './room'
import { WindowlightShow } from './show'
import { titlesAt } from './titles'

/** A drawing that stands for the whole period, claiming the cells round the window so it is drawn whenever any of it is in view. */
function standing(piece: Piece<null>, cells: Pt[]): Placed {
  return {
    piece,
    state: null,
    col: 0,
    row: 0,
    mirror: 1,
    cells,
    lane: { segs: [{ from: [0, 0], to: [0, 0], dur: PERIOD }], fire: 0 },
    start: 0,
    span: PERIOD,
    ballIn: { color: '#000000', ghost: false, id: 0 },
    changes: [],
    points: 0,
  }
}

const all: Pt[] = []
for (let x = Math.floor(GLASS.x0) - 40; x <= Math.ceil(GLASS.x1) + 40; x += 2) for (let y = Math.floor(GLASS.y0) - 30; y <= 30; y += 2) all.push([x, y])
const nothing = { name: 'spin', weight: 0, place: () => null, draw: () => {} } as Piece<null>

export const show = new WindowlightShow(
  [standing(nothing, []), standing(room, all), standing(machine, all), standing(fronts, all), standing(light, all)],
  PERIOD,
)

export const performance: Performance = {
  show,
  duration: PERIOD,
  camera,
  // No portal and no cut: one room, and one night in it.
  cuts: () => false,
  titles: titlesAt,
  loop: true,
  soundtrack: {
    src: recording,
    offset: MARGIN,
    loop: PERIOD,
    credit: 'Ólafur Arnalds · Near Light, from Living Room Songs (Erased Tapes, 2011) · private tech demo only; the label’s own upload, looped round 101 bars',
    href: 'https://www.youtube.com/watch?v=ejaaxLeUQd4',
  },
}
