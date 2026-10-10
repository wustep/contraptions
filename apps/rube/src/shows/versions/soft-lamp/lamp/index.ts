import type { Pt } from '../../../../parts'
import type { Placed } from '../../../../plan'
import type { Performance } from '../../../registry'
import type { Piece } from '../../../../parts'
import { camera } from './camera'
import { MUSIC_END, YOUTUBE } from './music'
import { room, things } from './scene'
import { SoftLampShow } from './show'
import { LAST_GONE, titlesAt } from './titles'

/** Seconds of show: the music, the lamp going down, and the last card gone. */
export const DURATION = Math.max(MUSIC_END + 7, LAST_GONE + 1)

/** A drawing that stands for the whole show, claiming the cells of the room so it is drawn whenever any of it is in view. */
function standing(piece: Piece<null>, cells: Pt[]): Placed {
  return {
    piece,
    state: null,
    col: 0,
    row: 0,
    mirror: 1,
    cells,
    lane: { segs: [{ from: [0, 0], to: [0, 0], dur: DURATION }], fire: 0 },
    start: 0,
    span: DURATION,
    ballIn: { color: '#000000', ghost: false, id: 0 },
    changes: [],
    points: 0,
  }
}

const all: Pt[] = []
for (let x = -12; x <= 12; x += 1) for (let y = -9; y <= 3; y += 1) all.push([x, y])
const nothing = { name: 'anchor', weight: 0, place: () => null, draw: () => {} } as Piece<null>

export const show = new SoftLampShow([standing(nothing, []), standing(room, all), standing(things, all)], DURATION)

export const performance: Performance = {
  show,
  duration: DURATION,
  camera,
  // One room, one night: no portal and no cut.
  cuts: () => false,
  titles: titlesAt,
  soundtrack: {
    offset: 0,
    credit: 'Lofi Girl · Best of lofi hip hop 2021, the first twelve tracks (Kanisan, Wishes and Dreams, Kupla, amies, Tenno, Peak Twilight, Prithvi, Krynoze, Diiolme, No Spirit, kyu, Purrple Cat, stream_error, Casiio, Sleepermane)',
    href: `https://www.youtube.com/watch?v=${YOUTUBE}`,
    // The label's own upload, from its first second: show time is the video's time. It stops as the twelfth track's
    // fade reaches the floor, before the thirteenth comes in under it.
    youtube: [{ id: YOUTUBE, until: MUSIC_END, fadeOut: 2 }],
  },
}

/**
 * The still take: the same night, the same room, the same machine and moments, seen from one place the whole half hour,
 * as the streams are. The room's home frame (the window and its curtain, the kitten, the books, the headphones and the
 * whole lamp), held from the first second to the last. Everything the first take plays to its camera happens in it too.
 */
export const HOME = { x: 0.91, y: -2.05, cells: 5.7 }
/**
 * Held, but not frozen: it drifts a little over minutes (a tenth of a cell across, a twentieth up and down, a hair nearer
 * and back, kept between the plant, the lamp's foot and the print at the frame's edges), too slow to see as a move, enough that the city past the glass shifts faintly against the
 * window's bars, as it does to anyone sitting at a desk.
 */
export function stillCamera(t: number): { x: number; y: number; cells: number } {
  const T = Math.PI * 2
  return {
    x: HOME.x + 0.09 * Math.sin((T * t) / 610),
    y: HOME.y + 0.05 * Math.sin((T * t) / 430 + 1.3),
    cells: HOME.cells * (1 + 0.004 * Math.sin((T * t) / 890 + 2.1)),
  }
}
export const stillPerformance: Performance = { ...performance, camera: stillCamera }
