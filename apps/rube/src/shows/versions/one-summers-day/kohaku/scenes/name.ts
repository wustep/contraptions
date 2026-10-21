import type { Key } from '../camera'
import { CHIHIRO_ID } from '../cast'
import { END } from '../credits'
import { light } from '../light'
import { M } from '../music'
import { region, smooth, span, standing } from '../paint'
import { ride } from '../path'
import type { Scene } from '../scene'
import { CLOUD_TOP, GAP, drawCloudFloor, drawCloudSea } from '../world/cloudsea'
import { drawDragon, drawScales } from '../world/dragon'
import { BURST, FREE, UP, burstAt, hakuOut, heFalls, seatAt, sheFalls, spineAt } from './sky'

/**
 * The name (M.summit → M.home): the last climax.
 *
 * On the summit the picture cuts to the top of the night: the white dragon going west over a sea of cloud under the
 * moon, and she on his back. The camera draws back to the whole silver floor of it, and comes in again as a gap opens
 * in the cloud under them: far below, a river winding in the moonlight. She remembers it. On the cadence, the
 * fullest note of the cue, his name comes back to him: the white comes off him in scales from the tail forward, and
 * the last of the dragon is the boy. They fall together, coming to each other's side, turning over and over, the
 * scales going up past them.
 */

export const FROM = M.summit
export const TO = M.home

/** The boy comes out of the dragon's head as it goes: here, and whole by the time they are falling free. */
const HAKU_IN = BURST.at + BURST.dur * 0.72

const SHOTS: Key[] = [
  // Cut to the top of the night: close on her on his back.
  { t: FROM, cells: 3.7, off: [-0.7, -0.15], cut: true },
  { t: FROM + 2.2, cells: 5.4, off: [-1.1, -0.35] },
  // The whole floor of cloud under the moon.
  { t: FROM + 4.4, cells: 10.5, off: [-2.6, 1.3] },
  // Over the gap: the river far below in it, held while he comes in and down over it.
  { t: M.cadence - 2.0, cells: 8.6, at: [GAP.x + 1.6, -22.5], w: 0.8 },
  { t: M.cadence - 0.95, cells: 7.8, at: [GAP.x + 0.6, -22.3], w: 0.6 },
  // The whole of him over his river for the name: the scales come off from his tail up to her.
  { t: M.cadence - 0.1, cells: 7.0, off: [2.0, 1.1] },
  { t: M.cadence + 1.2, cells: 5.6, off: [0.8, 0.4] },
  // Falling together, close, the scales going up past them.
  { t: FREE + 0.5, cells: 3.8, off: [0.15, 0.05] },
  { t: TO - 0.05, cells: 3.3, off: [0.1, 0.05] },
]

const far = standing('name-cloud-sea', region(-40, -60, 120, 0, 6), END, (g) => {
  // The night over the cloud has the frame from the cut until the camera goes down into it.
  const a = (g.t >= FROM ? 1 : 0) * (1 - smooth(g.view.cy, CLOUD_TOP - 1.5, CLOUD_TOP + 1.0))
  if (a > 0) drawCloudSea(g, light(g.t), [40, -24], a)
})
const floor = standing('name-cloud-floor', region(-10, CLOUD_TOP - 3, 90, CLOUD_TOP + 7, 2), END, (g) => {
  if (g.t < FROM || g.t > M.home + 8) return
  drawCloudFloor(g, light(g.t))
})
const dragon = standing('name-dragon', region(-10, -34, 90, -14, 2), END, (g) => {
  if (g.t < FROM - 0.001 || g.t > BURST.at + BURST.dur + 5.4) return
  const L = light(g.t)
  if (g.t <= BURST.at + BURST.dur) drawDragon(g, spineAt(g.t), L, { up: UP, burst: burstAt(g.t), reach: 0 })
  drawScales(g, L, spineAt, BURST.at, BURST.dur, 110)
})

export const name: Scene = {
  key: 'name',
  from: FROM,
  to: TO,
  hero: [ride(seatAt, FROM, FREE), ride(sheFalls, FREE, TO)],
  haku: {
    moves: [ride(hakuOut, HAKU_IN, FREE, undefined, { scale: (t) => smooth(t, HAKU_IN, FREE) }), ride(heFalls, FREE, TO)],
    on: [[HAKU_IN, TO]],
  },
  shots: SHOTS,
  // Down at the river in the gap as they come over it; then ahead at him, as his name comes back to him.
  looks: [
    { id: CHIHIRO_ID, from: M.cadence - 2.6, to: M.cadence - 0.1, at: () => [GAP.x, CLOUD_TOP + 1.1] },
    { id: CHIHIRO_ID, from: M.cadence - 0.6, to: FREE + 0.6, at: (t) => hakuOut(t) },
  ],
  back: [far],
  mid: [floor, dragon],
  overview: { x0: 10, y0: -34, x1: 70, y1: -12 },
}

export { span }
