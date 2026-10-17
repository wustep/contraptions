import type { Performance } from '../../../registry'
import { CREDITS_OK, DURATION, creditsAt } from './credits'
import { FRAME } from './geo'
import { drawPegs } from './grid'
import { drawFlights, drawLauncher } from './launcher'
import { ComposureShow } from './show'

export { CREDITS_OK, DURATION }

/** The YouTube video the show is timed to: Universal Music Group's upload of Karajan's Andante. */
export const YOUTUBE = '14G_PDZWXVE'

const half = (FRAME.cells * 16) / 9 / 2
const bounds = { x0: FRAME.x - half, y0: FRAME.y - FRAME.cells / 2, x1: FRAME.x + half, y1: FRAME.y + FRAME.cells / 2 }

export const show = new ComposureShow(
  (b, t) => {
    drawLauncher(b, t)
    drawPegs(b, t)
    drawFlights(b, t)
  },
  DURATION,
  bounds,
  () => [FRAME.x, FRAME.y],
)

export const performance: Performance = {
  show,
  duration: DURATION,
  // One frame, held: the board and the launcher, the whole show.
  camera: () => ({ ...FRAME, zoomDrop: 0.45 }),
  overview: () => bounds,
  // One place and nothing to cut.
  cuts: () => false,
  // The end credits' words, which the page sets under the board after the last chord.
  titles: creditsAt,
  soundtrack: {
    offset: 0,
    credit: 'Joseph Haydn · Symphony No. 94 “Surprise”, II. Andante · Berliner Philharmoniker, Herbert von Karajan · Deutsche Grammophon, 1982',
    href: `https://www.youtube.com/watch?v=${YOUTUBE}`,
    // Universal Music Group's own upload, from its first second: the show's clock. The recording is copyrighted, so
    // none is shipped. The show runs on in silence after it for the credits.
    youtube: [{ id: YOUTUBE }],
  },
}
