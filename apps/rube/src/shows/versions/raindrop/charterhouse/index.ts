import recording from '../chopin-raindrop-ilic.mp3'
import type { Performance } from '../../../registry'
import { makeCamera } from './camera'
import { DURATION, creditsAt } from './credits'
import { ballScale, route } from './route'
import { scenery } from './scene'
import { RaindropShow } from './show'

export { DURATION }

const path = route(DURATION)
export const show = new RaindropShow(scenery(DURATION), path, DURATION, { x0: -40, y0: -60, x1: 300, y1: 110 }, ballScale)
export const camera = makeCamera((t) => show.where(t), DURATION)

export const performance: Performance = {
  show,
  duration: DURATION,
  camera,
  // One place and one ball: the camera cuts, but there is no portal, and no iris.
  cuts: () => false,
  // The end credits' words, which the page sets in the night beside the cell after the last chord.
  titles: creditsAt,
  soundtrack: {
    src: recording,
    offset: 0,
    credit: 'Frédéric Chopin · Prelude in D-flat major, Op. 28 No. 15 · played by Ivan Ilić · CC BY 3.0',
    href: 'https://commons.wikimedia.org/wiki/File:Ivan_Ili%C4%87-Chopin_-_Prelude_no._15_in_D_flat_major.ogg',
  },
}
