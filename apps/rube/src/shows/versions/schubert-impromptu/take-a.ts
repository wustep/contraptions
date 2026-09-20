import recording from '../../../../../../docs/promo/schubert-impromptu-bertoglio.ogg'
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
    credit: 'Franz Schubert · Performed by Chiara Bertoglio · CC BY 3.0',
    href: 'https://commons.wikimedia.org/wiki/File:Schubert%27s_Impromptu_no._2_in_E-flat_major,_D.899_-_Chiara_Bertoglio.ogg',
  },
}
