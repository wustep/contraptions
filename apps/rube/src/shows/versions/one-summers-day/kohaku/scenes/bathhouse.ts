import { light } from '../light'
import { M } from '../music'
import { region, standing } from '../paint'
import { rest } from '../path'
import type { Scene } from '../scene'
import { END } from '../credits'
import { BATH, BRIDGE } from '../geo'
import { drawBathhouse, drawDoorLight, drawSmoke } from './bathhouse/building'
import { drawBridge, drawGorge } from './bathhouse/bridge'
import { roomCut } from './bathhouse/cuts'

/**
 * The bathhouse (M.swell → M.breath): a placeholder until its builder lands: the reveal, and the building held.
 */

export const FROM = M.swell
export const TO = M.breath

const L = (t: number) => light(t)
const gorge = standing('bath-gorge', region(BRIDGE.x0 - 3, -2, BRIDGE.x1 + 1, 6, 1.5), END, (g) => drawGorge(g, L(g.t)))
const building = standing('bath-building', region(BATH.x0 - 2, BATH.peak - 4, BATH.x1 + 3, 5, 1.5), END, (g) => {
  drawBathhouse(g, L(g.t), { hall: 0, room: roomCut(g.t), boiler: 0 })
  drawSmoke(g, L(g.t))
})
const bridge = standing('bath-bridge', region(BRIDGE.x0 - 1, -2, BRIDGE.x1 + 1, 5, 1.5), END, (g) => {
  drawBridge(g, L(g.t))
  drawDoorLight(g, L(g.t))
})

export const bathhouse: Scene = {
  key: 'bathhouse',
  from: FROM,
  to: TO,
  hero: [rest([41.4, -1.33], FROM, TO)],
  shots: [
    { t: FROM + 0.4, cells: 9, at: [46, -3.4] },
    { t: FROM + 8, cells: 18, at: [58, -5.6] },
    { t: 59.9, cells: 18, at: [58.5, -5.6] },
    { t: 60, cells: 18, at: [62.5, -5.2], cut: true },
    { t: 70, cells: 9, at: [66.5, -4.2] },
  ],
  mid: [gorge, building, bridge],
}
