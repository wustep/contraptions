import recording from '../bolero-omega13a.mp3'
import type { Performance } from '../../../registry'
import { camera } from './camera'
import { scenery } from './scene'
import { OstinatoShow } from './show'
import { RECORDING } from './music'

export const DURATION = Math.ceil(RECORDING + 8)

export const show = new OstinatoShow(scenery(DURATION), DURATION)

export const performance: Performance = {
  show,
  duration: DURATION,
  camera,
  // One tower, one path, one take: no portal and no cut.
  cuts: () => false,
  soundtrack: {
    src: recording,
    offset: 0,
    credit: 'Maurice Ravel · Boléro · played from the score by Omega13a (MuseScore 4, Muse Sounds) · CC BY 4.0',
    href: 'https://commons.wikimedia.org/wiki/File:Bol%C3%A9ro_%E2%80%93_Maurice_Ravel.ogg',
  },
}
