import recording from './clair-de-lune-goedhart.ogg'
import type { Performance } from '../../registry'
import { StockShow } from '../../stock/show'
import type { StockScore } from '../../stock/types'
import data from './take-b.generated.json'

export const score = data as unknown as StockScore
export const show = new StockShow(score)
const finale = score.maps.at(-1)!
const booth = finale.pieces.find((p) => p.spec.name === 'booth')!
const ticket = finale.pieces.find((p) => p.spec.name === 'ticket')!
const finalCells = [...booth.cells, ...ticket.cells]
const center = {
  x: (Math.min(...finalCells.map(([x]) => x)) + Math.max(...finalCells.map(([x]) => x))) / 2,
  y: (Math.min(...finalCells.map(([, y]) => y)) + Math.max(...finalCells.map(([, y]) => y))) / 2,
}

/** Settle during the rail after the photograph, then keep both souvenirs in the final frame. */
function camera(t: number) {
  const follow = show.camera(t)
  const u = Math.max(0, Math.min(1, (t - booth.end) / (ticket.begin - booth.end)))
  const blend = u * u * (3 - 2 * u)
  return { ...follow, x: follow.x + (center.x - follow.x) * blend, y: follow.y + (center.y - follow.y) * blend }
}

export const performance: Performance = {
  show, duration: score.duration, camera,
  // There is no next world after this portal. Let the recording's resonance keep its picture.
  cuts: (t) => t < finale.pieces.at(-1)!.begin,
  soundtrack: {
    src: recording, offset: score.audioOffset,
    credit: 'Performed by Laurens Goedhart · CC BY 3.0',
    href: 'https://commons.wikimedia.org/wiki/File:Clair_de_lune_(Claude_Debussy)_Suite_bergamasque.ogg',
  },
}
