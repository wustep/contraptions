import recording from '../../../../../../docs/promo/cornfield-chase-zimmer.mp3'
import type { Framing, Performance } from '../../registry'
import { StockShow } from '../../stock/show'
import type { StockScore } from '../../stock/types'
import data from './opus55-music-sync.generated.json'

/** Written by `npm run generate:cornfield:opus55`. Stock placements only; nothing here moves a machine. */
export const score = data as unknown as StockScore
export const show = new StockShow(score)

const finale = score.maps.at(-1)!
const booth = finale.pieces.find((p) => p.spec.name === 'booth')!
const ticket = finale.pieces.find((p) => p.spec.name === 'ticket')!
const door = finale.pieces.at(-1)!
const souvenirs = [...booth.cells, ...ticket.cells]
const xs = souvenirs.map(([x]) => x), ys = souvenirs.map(([, y]) => y)
const still = { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 }
/** Tall enough for the photograph and the payout, with a cell to spare, even under Zoom. */
const stillCells = Math.max(7.5, (Math.max(...xs) - Math.min(...xs) + 2) * 1.5 * 9 / 16, (Math.max(...ys) - Math.min(...ys) + 2) * 1.5)

const smooth = (u: number): number => { const v = Math.max(0, Math.min(1, u)); return v * v * (3 - 2 * v) }

/** Follow the ball; once the photograph is taken, ease onto the booth and the ticket and stay for the decay. */
function camera(t: number): Framing {
  const follow = show.camera(t)
  const blend = smooth((t - booth.end) / Math.max(0.5, ticket.begin - booth.end))
  return {
    x: follow.x + (still.x - follow.x) * blend,
    y: follow.y + (still.y - follow.y) * blend,
    cells: follow.cells + (stillCells - follow.cells) * blend,
  }
}

export const performance: Performance = {
  show, duration: score.duration, camera,
  // The last portal would iris the photograph away; the decay keeps it.
  cuts: (t) => t < door.begin,
  soundtrack: {
    src: recording,
    offset: score.audioOffset,
    credit: 'Hans Zimmer · Cornfield Chase · Interstellar (2014) · tech demo only, not for release',
    href: 'https://www.youtube.com/watch?v=JuSsvM8B4Jc',
  },
}
