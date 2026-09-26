import recording from '../../../../../../../docs/promo/satie-gymnopedie.mp3'
import type { Pt } from '../../../../parts'
import type { Placed } from '../../../../plan'
import type { Performance } from '../../../registry'
import { camera } from './camera'
import { MARGIN, PERIOD } from './music'
import { RADIUS } from './path'
import { glints, sea, sky, stones } from './scene'
import { GymnopedieShow } from './show'
import { titlesAt } from './titles'
import type { Piece } from '../../../../parts'

/** A drawing that stands for the whole period, claiming the cells round the planet so it is drawn whenever any of it is in view. */
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

const reach = Math.ceil(RADIUS + 8)
const all: Pt[] = []
for (let x = -reach; x <= reach; x += 2) for (let y = -reach; y <= reach; y += 2) all.push([x, y])
const nothing = { name: 'spin', weight: 0, place: () => null, draw: () => {} } as Piece<null>

export const show = new GymnopedieShow(
  [standing(nothing, []), standing(sky, all), standing(stones, all), standing(sea, all), standing(glints, all)],
  PERIOD,
)

export const performance: Performance = {
  show,
  duration: PERIOD,
  camera,
  // No portal and no cut: one world, and one day on it.
  cuts: () => false,
  titles: titlesAt,
  loop: true,
  soundtrack: {
    src: recording,
    offset: MARGIN,
    loop: PERIOD,
    credit: 'Erik Satie · Gymnopédie No. 1, Gnossiennes Nos. 1 and 3 (public domain) · played for this show on the Salamander Grand Piano (Alexander Holm, CC BY 3.0) from the Mutopia Project’s engravings · recording CC BY-SA 4.0',
    href: 'https://www.mutopiaproject.org/cgibin/make-table.cgi?Composer=SatieE',
  },
}
