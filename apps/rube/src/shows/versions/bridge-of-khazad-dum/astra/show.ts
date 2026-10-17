import type { Theme } from '../../../../../../../src/core/themes'
import type { Pt } from '../../../../parts'
import type { Box, Placed } from '../../../../plan'
import { Show, type ShowPoint } from '../../../../show'
import type { Universe } from '../../../../universe'
import type { World } from '../../../../worlds'
import type { Framing } from '../../../registry'
import { ART } from './drawing'
import { curve, route } from './math'
import { CAST, castAt, DURATION, frodoAt } from './motion'

const THEME: Theme = { name: 'burden', label: 'Stone and moss', bg: '#DAD6BD', ink: '#28302C', colors: Object.values(CAST).map(c => c.color), weight: 0.7 }
const WORLD: World = { name: 'burden', label: 'Middle-earth', note: 'A small fellowship crossing a very large machine.', themes: [THEME], backdrops: ['plain'], pieces: ART, tastes: { arranged: {} } }
const bounds: Box = { x0: -11, y0: -23, x1: 205, y1: 39 }
const EXTENTS: [number, number, number, number][] = [
  [-50, -60, 250, 80], [-9, -5, 9, 4], [7, -8, 29, 7], [26, -5, 42, 20],
  [43, -22, 60, 17], [60, -18, 67, 3], [73, -7, 94, 35], [103, -3, 134, 85],
  [140, -9, 152, 14], [148, -7, 190, 19], [-8, -23, 190, 39],
]
const placements: Placed[] = ART.map((piece, i) => {
  const [x0, y0, x1, y1] = EXTENTS[i], cells: Pt[] = []
  for (let x = x0; x <= x1; x += 3) for (let y = y0; y <= y1; y += 3) cells.push([x, y])
  return { piece, state: null, col: 0, row: 0, mirror: 1, cells, lane: { segs: [{ from: [-2, 0], to: [181, 10.7], dur: DURATION }], fire: 0 }, start: 0, span: DURATION, ballIn: { ...CAST.frodo, ghost: false }, changes: [], points: 0 }
})

const SHOTS: [number, number, number, number][] = [
  [0, -2.8, -0.9, 6.2], [8, -2.8, -0.9, 6.2], [16, 1, -0.7, 7],
  [24, 7.5, -0.5, 8], [37, 14, -0.6, 9], [56, 24, -0.2, 10],
  [68, 33, -0.4, 11], [89, 34.5, 0.1, 10.5], [99, 39, -1, 11],
  [112, 48, -2, 13], [130, 51, -5, 17], [140, 54, -8, 12], [146, 58, -6.5, 11],
  [158, 65.5, -4, 13], [174, 74, -4.5, 17], [186, 78, 0.5, 11],
  [198, 84, 2.8, 13], [212, 91, 2.5, 16], [226, 103, 2, 18],
  [240, 111, 4.5, 18], [250, 117, 6, 22], [263.4, 119, 7, 22],
  [274.2, 120, 9, 23], [280, 133, 5, 18], [289, 142, 0, 18],
  [300, 147, 5, 12], [310, 152, 8.4, 7.5], [319, 156, 8.8, 9],
  [326, 157.8, 8.3, 9], [330, 160.5, 8.5, 9], [339, 169, 4, 18],
  [357, 179, 3.1, 20], [383, 181, 3.1, 20],
]
const aim = route(SHOTS.map(([t, x, y]) => [t, x, y]))
const lens = curve(SHOTS.map(([t, , , cells]) => [t, Math.log(cells)]))
export const cameraAt = (t: number): Framing => {
  const [x, y] = aim(t)
  return { x, y, cells: Math.exp(lens(t)), focus: frodoAt(t), zoomFull: t >= 339 ? 0 : 1 }
}

/** No simulation state: forward playback, 2×, reverse scrubbing and video all ask the same score. */
export class BurdenShow extends Show {
  private readonly stage: Universe = { index: 0, seed: 'burden-astra', world: WORLD, theme: THEME, taste: 'arranged', ballColor: CAST.frodo.color, backdrop: 'plain', pieces: placements, box: bounds, bounds, journey: DURATION }
  constructor() { super('burden-astra') }
  override universe(): Universe { return this.stage }
  override indexAt(): number { return 0 }
  override begin(): number { return 0 }
  override worldAt(): World { return WORLD }
  override trailOff(): boolean { return true }
  override at(time: number): ShowPoint {
    const t = Math.max(0, Math.min(DURATION, Number.isFinite(time) ? time : 0))
    const [x, y] = frodoAt(t), prev = frodoAt(Math.max(0, t - 0.002)), next = frodoAt(Math.min(DURATION, t + 0.002))
    const i = t < 24 ? 1 : t < 64 ? 2 : t < 99 ? 3 : t < 151 ? 4 : t < 164 ? 5 : t < 234 ? 6 : t < 280 ? 7 : t < 307 ? 8 : 9
    return { x, y, seg: 0, s: t / DURATION, raw: t / DURATION, angle: Math.atan2(next[1] - prev[1], next[0] - prev[0]), scale: 1, stretch: 1, hidden: false, placed: placements[i], ball: { ...CAST.frodo, ghost: false }, balls: castAt(t), universe: this.stage, local: t, begin: 0 }
  }
}

/** Overview is the current act, not 200 empty cells around a tiny cast. */
export const overviewAt = (t: number): Box => {
  if (t < 60) return { x0: -8, x1: 29, y0: -8, y1: 10 }
  if (t < 105) return { x0: 25, x1: 44, y0: -6, y1: 13 }
  if (t < 158) return { x0: 40, x1: 67, y0: -21, y1: 5 }
  if (t < 234) return { x0: 63, x1: 104, y0: -14, y1: 16 }
  if (t < 280) return { x0: 100, x1: 140, y0: -5, y1: 24 }
  return { x0: 138, x1: 199, y0: -12, y1: 20 }
}
