import recording from './premiere-arabesque-prati.mp3'
import type { Performance } from '../../registry'
import { StockShow } from '../../stock/show'
import type { StockScore } from '../../stock/types'
import data from './take-b.generated.json'

export const score = data as unknown as StockScore
export const show = new StockShow(score)
export const performance: Performance = {
  show, duration: score.duration, camera: (t) => show.camera(t),
  soundtrack: {
    src: recording, offset: score.audioOffset,
    credit: 'Performed by Patrizia Prati · CC BY-SA 4.0',
    href: 'https://commons.wikimedia.org/wiki/File:Claude_Debussy_-_Première_Arabesque_-_Patrizia_Prati.ogg',
  },
}
