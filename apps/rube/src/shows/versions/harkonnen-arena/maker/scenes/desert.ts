import { R } from '../../../../../parts'
import { hold } from '../motion'
import { drawing, poly, type Brush, type Pt } from '../paint'
import type { Scene } from '../scene'
import { T } from '../timeline'
import { farDesert, paintFar, SAND, tiltOf } from '../world/land'
import type { SkyKey } from '../world/sky'

/**
 * The deep desert, by day: two on a rock over the flat, and far off on the flat the harvester at work.
 */

const DAY: SkyKey[] = [
  { t: 0, top: '#CDBDA6', low: '#EFDCC2', sun: { x: 0.86, y: 0.1, r: 0.03, color: '#FFF6E6' }, eclipse: 0 },
  { t: 104, top: '#CBB79C', low: '#F0D8B8', sun: { x: 0.9, y: 0.06, r: 0.03, color: '#FFF3DE' }, eclipse: 0 },
]

/** The rock the two of them watch from: an outcrop of dark stone over the flat. */
export const ROCK: Pt[] = [
  [-26, 0.5], [-24, -2.2], [-21.5, -3.1], [-19, -5.6], [-15.5, -6.4], [-11, -6.9], [-6, -7.2], [-1.5, -7.0], [2.5, -7.05],
  [4.6, -6.6], [5.6, -5.2], [6.8, -4.6], [8.2, -2.4], [10.5, -1.1], [13, 0.5],
]
/** Where they sit: on the lip of its top, looking east over the flat. */
export const PAUL_SEAT: Pt = [2.2, -7.05 - R]
export const CHANI_SEAT: Pt = [1.25, -7.1 - R * 0.96]

const tilt = tiltOf([[0, 0.12], [104, 0.12]])
const FAR = farDesert(10)

function paintRock(b: Brush): void {
  const { ctx } = b
  poly(ctx, ROCK)
  ctx.fillStyle = b.c('#5C3B28')
  ctx.fill()
  // The lit top and its east shoulder, where the sun is.
  poly(ctx, [[-19, -5.6], [-15.5, -6.4], [-11, -6.9], [-6, -7.2], [-1.5, -7.0], [2.5, -7.05], [4.6, -6.6], [5.6, -5.2], [4.2, -5.6], [1.5, -6.3], [-4, -6.5], [-10, -6.2], [-15, -5.6]])
  ctx.fillStyle = b.c('#7E5236')
  ctx.fill()
  poly(ctx, [[5.6, -5.2], [6.8, -4.6], [8.2, -2.4], [10.5, -1.1], [13, 0.5], [9.5, 0.5], [7.4, -1.6], [6.1, -3.6]])
  ctx.fillStyle = b.c('#74492F')
  ctx.fill()
}

function paintFlat(b: Brush): void {
  const { ctx, view } = b
  ctx.fillStyle = b.c(SAND.lit)
  ctx.fillRect(view.x0 - 1, 0, view.w + 2, Math.max(0, view.y1) + 1)
}

/** The harvester: a long crawler of dark iron on four tracks, its intake down, its plume going up and away downwind. */
export const HARVESTER = { x: 62, w: 18, h: 6.5 }
function paintHarvester(b: Brush): void {
  const { ctx } = b
  const { x, w, h } = HARVESTER
  ctx.fillStyle = b.c('#3B322C')
  poly(ctx, [[x, -1.2], [x + 0.6, -h * 0.72], [x + 2.5, -h], [x + w - 3, -h], [x + w, -h * 0.66], [x + w, -1.2]])
  ctx.fill()
  ctx.fillStyle = b.c('#241D19')
  for (let i = 0; i < 4; i++) {
    const tx = x + 0.4 + i * (w - 0.8) / 4
    poly(ctx, [[tx, 0], [tx + (w - 0.8) / 4 - 0.4, 0], [tx + (w - 0.8) / 4 - 0.4, -1.6], [tx, -1.6]])
    ctx.fill()
  }
}

export const desert: Scene = {
  key: 'desert',
  from: T.open,
  to: T.thumper,
  paul: [hold(PAUL_SEAT, T.open, T.thumper, 0)],
  chani: [hold(CHANI_SEAT, T.open, T.thumper, 0)],
  shots: [
    { t: 0, cells: 40, at: [30, -14] },
    { t: T.sign, cells: 30, at: [40, -10] },
  ],
  back: [
    drawing('desert-far', 400, (b) => {
      if (b.t >= T.thumper + 2) return
      paintFar(b, DAY, FAR, tilt(b.t))
      paintFlat(b)
      paintHarvester(b)
      paintRock(b)
    }),
  ],
  overview: { x0: -40, y0: -40, x1: 120, y1: 10 },
}
