import recording from '../../../../../../docs/promo/cornfield-chase-zimmer.mp3'
import type { Performance } from '../../registry'
import { StockShow } from '../../stock/show'
import type { StockScore } from '../../stock/types'
import data from './tech-demo.generated.json'

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
const halfW = Math.max(...finalCells.map(([x]) => Math.abs(x - center.x)))
const halfH = Math.max(...finalCells.map(([, y]) => Math.abs(y - center.y)))
/** Cells tall enough that Zoom still holds the photograph and the payout. */
const souvenirCells = Math.max(8.4, (halfW + 0.7) * 1.5 * 9 / 8, (halfH + 0.7) * 3)

/** Settle on the booth during the rails after the flash, and stay there through the decay. */
function camera(t: number) {
  const follow = show.camera(t)
  const span = Math.max(0.4, ticket.begin - booth.end)
  const u = Math.max(0, Math.min(1, (t - booth.end) / span))
  const blend = u * u * (3 - 2 * u)
  return {
    x: follow.x + (center.x - follow.x) * blend,
    y: follow.y + (center.y - follow.y) * blend,
    cells: follow.cells + (souvenirCells - follow.cells) * blend,
  }
}

export const performance: Performance = {
  show, duration: score.duration, camera,
  // The closing portal would iris the souvenirs away. The decay keeps them.
  cuts: (t) => t < finale.pieces.at(-1)!.begin,
  soundtrack: {
    src: recording,
    offset: score.audioOffset,
    credit: 'Hans Zimmer · Cornfield Chase · Interstellar (2014) · tech demo only, not for release',
    href: 'https://www.youtube.com/watch?v=JuSsvM8B4Jc',
    youtube: [{ id: 'JuSsvM8B4Jc', from: score.audioOffset }],
  },
}
