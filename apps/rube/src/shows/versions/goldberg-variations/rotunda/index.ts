import type { Piece } from '../../../../parts'
import type { Placed } from '../../../../plan'
import type { Performance } from '../../../registry'
import { camera } from './camera'
import { ALBUM, CUES, PERIOD } from './music'
import { air, colonnade, everywhere, floor, glow } from './scene'
import { GoldbergShow } from './show'
import { titlesAt } from './titles'

/** A drawing that stands for the whole period, claiming the cells round the room so it is drawn whenever any of it is in view. */
function standing(piece: Piece<null>, cells: [number, number][]): Placed {
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

export const show = new GoldbergShow([standing(air, everywhere), standing(floor, everywhere), standing(colonnade, everywhere), standing(glow, everywhere)])

export const performance: Performance = {
  show,
  duration: PERIOD,
  camera,
  // One room, no portal and no cut.
  cuts: () => false,
  titles: titlesAt,
  loop: true,
  soundtrack: {
    // Copyrighted: from the label's own YouTube uploads only, and no recording in the build.
    credit: 'Johann Sebastian Bach · Goldberg Variations, BWV 988 · Víkingur Ólafsson, Deutsche Grammophon (2023), from the album’s own YouTube uploads',
    href: ALBUM,
    loop: PERIOD,
    youtube: CUES,
  },
}
