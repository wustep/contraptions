import type { Placed } from '../../../../../../plan'
import { END } from '../../credits'
import { BATH, BRIDGE } from '../../geo'
import { light } from '../../light'
import { region, standing, type Paint } from '../../paint'
import { drawBathhouse, drawDoorLight, drawSmoke, WHOLE, type Cut } from './building'
import { drawBridge, drawGorge } from './bridge'
import { roomCut } from './cuts'

/**
 * The bathhouse as a standing set for the whole show: the gorge, the building, the bridge, the smoke. Where a scene
 * goes inside it, the scene says so here (`openings`): how far the front is away over the great bath's hall, her room
 * and the boiler room at a moment. Each is the most any scene asks for then.
 *
 * The hall's front is the one that people go behind: she walks in at the door and the hands stand on its gallery. So
 * it is not drawn with the building but over the balls (`hallFront`), and while it stands whole nobody inside is seen
 * through it.
 */

export interface Openings {
  hall: ((t: number) => number)[]
  room: ((t: number) => number)[]
  boiler: ((t: number) => number)[]
}

// Her room is open from the dawn to the train (`cuts.ts`); the bathhouse scene adds the hall and the boiler room.
export const openings: Openings = { hall: [], room: [roomCut], boiler: [] }

const most = (fs: ((t: number) => number)[], t: number) => fs.reduce((m, f) => Math.max(m, f(t)), 0)

/** How far each front is away at `t`. */
export function cutAt(t: number): Cut {
  return { hall: most(openings.hall, t), room: most(openings.room, t), boiler: most(openings.boiler, t) }
}

export const gorge: Placed = standing('bath-gorge', region(BRIDGE.x0 - 3, -2, BRIDGE.x1 + 1, 6, 1.5), END, (g) => drawGorge(g, light(g.t)))

/** The building, with the hall's front always away: the hall's front is `hallFront`'s. */
export const building: Placed = standing('bath-building', region(BATH.x0 - 2, BATH.peak - 4, BATH.x1 + 3, 5, 1.5), END, (g) => {
  const L = light(g.t)
  const c = cutAt(g.t)
  drawBathhouse(g, L, { ...c, hall: 1 })
  drawSmoke(g, L)
})

export const bridge: Placed = standing('bath-bridge', region(BRIDGE.x0 - 1, -2, BRIDGE.x1 + 1, 5, 1.5), END, (g) => {
  const L = light(g.t)
  drawBridge(g, L)
  drawDoorLight(g, L)
})

/** A canvas the fading front is painted whole into, then laid on at its alpha: layered paint faded layer by layer shows its lower layers through. */
let spare: HTMLCanvasElement | null = null

/** `fn` painted at `a`: straight on when whole, else whole on a spare canvas and laid on at `a`. */
export function faded(g: Paint, a: number, fn: (g: Paint) => void): void {
  if (a >= 0.998 || typeof document === 'undefined') {
    fn(g)
    return
  }
  const main = g.ctx.canvas
  spare ??= document.createElement('canvas')
  if (spare.width !== main.width || spare.height !== main.height) {
    spare.width = main.width
    spare.height = main.height
  }
  const s = spare.getContext('2d') as CanvasRenderingContext2D
  s.setTransform(1, 0, 0, 1, 0, 0)
  s.clearRect(0, 0, spare.width, spare.height)
  s.setTransform(g.ctx.getTransform())
  fn({ ...g, ctx: s })
  g.ctx.save()
  g.ctx.setTransform(1, 0, 0, 1, 0, 0)
  g.ctx.globalAlpha = a
  g.ctx.drawImage(spare, 0, 0)
  g.ctx.restore()
}

/**
 * The hall's front, over everything inside it: the building drawn again inside the hall's box, as much of it as is
 * not away. Whole, it hides the hall and whoever is in it; as the scene goes in it fades off.
 */
export const hallFront: Placed = standing('bath-hall-front', region(BATH.hall.x0, BATH.hall.y0, BATH.hall.x1, BATH.hall.y1, 1), END, null, (g) => {
  const a = 1 - cutAt(g.t).hall
  if (a <= 0.002) return
  const h = BATH.hall
  faded(g, a, (q) => {
    q.ctx.save()
    q.ctx.beginPath()
    q.ctx.rect(h.x0, h.y0, h.x1 - h.x0, h.y1 - h.y0)
    q.ctx.clip()
    drawBathhouse(q, light(q.t), WHOLE)
    q.ctx.restore()
  })
})
