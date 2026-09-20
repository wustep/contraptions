import recording from '../../../../../../docs/promo/clair-de-lune-goedhart.ogg'
import type { Performance } from '../../registry'
import { StockShow } from '../../stock/show'
import type { StockScore } from '../../stock/types'
import data from './take-a.generated.json'

export const score = data as unknown as StockScore
export const show = new StockShow(score)
export const performance: Performance = {
  show, duration: score.duration, camera: (t) => show.camera(t),
  soundtrack: {
    src: recording, offset: score.audioOffset,
    credit: 'Performed by Laurens Goedhart · CC BY 3.0',
    href: 'https://commons.wikimedia.org/wiki/File:Clair_de_lune_(Claude_Debussy)_Suite_bergamasque.ogg',
  },
}
