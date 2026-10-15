import type { Framing, Performance } from '../../registry'
import type { StockScore } from '../../stock/types'
import { expose, exposure, finale, flash, pull, type Exposure } from './music-sync/finale'
import { dayLand, frontField, nightLand } from './music-sync/land'
import { beatAt } from './music-sync/music'
import { scenery } from './music-sync/screen'
import { nightfall } from './music-sync/nightfall'
import { DressedShow } from './music-sync/show'
import { follow, spot, type Spot } from './music-sync/spot'
import data from './opus55-music-sync.generated.json'

/** Written by `npm run generate:cornfield:opus55`. Stock placements only; nothing here moves a machine. */
export const score = data as unknown as StockScore

export const fair = score.maps.at(-1)!
export const booth = fair.pieces.find((p) => p.spec.name === 'booth')!
const ticket = fair.pieces.find((p) => p.spec.name === 'ticket')!
export const door = fair.pieces.at(-1)!
/** The portal out of the field at sunset, and the one into the fair: the door the night comes down through. */
export const sunset = score.maps[0].pieces.at(-1)!
export const arrival = fair.pieces[0]
const NIGHT = '#0D0B20'
/** The fair's last stretch, from the slingshot that drops the ball to its last floors: what the photograph frames. */
const STRETCH = 97
/** The photograph: the booth's flash, then once the ball is through the last portal, the long draw back. */
export const photo = finale(fair, booth.begin + booth.lane.fire, door.end + 0.1, score.duration - 0.6, STRETCH)
/** The run through the fair, taken once, the first time the photograph is drawn; the follow spot, the first time it is. */
let run: Exposure | null = null
let lit: Spot | null = null

/** The machine in a cornfield: the afternoon over the Forest, the night round the Arcade (`music-sync/`). */
export const show: DressedShow = new DressedShow(score, (i, u) => {
  const map = score.maps[i]
  const { col, row } = u.pieces[0]
  const dusk = scenery('nightfall', () => {}, (p, c) => nightfall(p, c, col, row, show, map.begin + c.t, NIGHT, [sunset.begin, arrival.end]))
  if (map.world === 'garden') return { behind: [scenery('field', (p, c) => dayLand(p, c, col, row, map.begin))], over: [dusk] }
  return {
    behind: [scenery('fair', (p, c) => nightLand(p, c, col, row, map.begin, photo.horizon))],
    over: [scenery('photograph', () => {}, (p, c) => {
      const t = map.begin + c.t
      // On the full organ the house lights come up: every floor lit on the beat, the spot easing back after.
      lit ??= spot(show, map, booth.begin, [beatAt(132)])
      follow(p, c, row, t, lit, NIGHT)
      flash(p, c, col, row, t, photo.flash, [booth.col, booth.row])
      if (t <= photo.from) return
      // The corn comes up in front of the fair as the camera draws back across it.
      frontField(p, c, col, row, map.begin, photo.horizon, smooth((t - photo.from) / 2.5))
      // The run from a little before the stretch the photograph frames, so the line comes in from past its edge.
      run ??= expose(show, STRETCH - 7, door.begin + 0.3)
      exposure(p, c, col, row, t, run, photo)
    }), dusk],
  }
})
const souvenirs = [...booth.cells, ...ticket.cells]
const xs = souvenirs.map(([x]) => x), ys = souvenirs.map(([, y]) => y)
const still = { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 }
/** Tall enough for the photograph and the payout, with a cell to spare, even under Zoom. */
const stillCells = Math.max(7.5, (Math.max(...xs) - Math.min(...xs) + 2) * 1.5 * 9 / 16, (Math.max(...ys) - Math.min(...ys) + 2) * 1.5)

const smooth = (u: number): number => { const v = Math.max(0, Math.min(1, u)); return v * v * (3 - 2 * v) }

/**
 * Follow the ball; once the photograph is taken, ease onto the booth and the ticket; once the ball is through the last
 * portal, draw back across the field until the fair's last stretch stands on the horizon.
 */
function camera(t: number): Framing {
  const ride = show.camera(t)
  const blend = smooth((t - booth.end) / Math.max(0.5, ticket.begin - booth.end))
  const close = {
    x: ride.x + (still.x - ride.x) * blend,
    y: ride.y + (still.y - ride.y) * blend,
    cells: ride.cells + (stillCells - ride.cells) * blend,
  }
  const back = photo.back(t)
  return back > 0 ? pull(close, photo.wide, back) : close
}

export const performance: Performance = {
  show, duration: score.duration, camera,
  // The last portal would iris the photograph away; the decay keeps it. The door from the field to the fair is the
  // night's, drawn by the show (`music-sync/nightfall.ts`).
  cuts: (t) => t < door.begin && !(t >= sunset.begin && t <= arrival.end),
  soundtrack: {
    offset: score.audioOffset,
    credit: 'Hans Zimmer · Cornfield Chase · Interstellar (2014)',
    href: 'https://www.youtube.com/watch?v=JuSsvM8B4Jc',
    youtube: [{ id: 'JuSsvM8B4Jc', from: score.audioOffset }],
  },
}
