import { scenery } from '../kit'
import { layer, motes, rgbaOf, view, type View } from '../depth'
import { tubeAt } from './draw'
import { clamp01 } from './hand'
import { GLASS } from './plan'

/**
 * What stands between the camera and the machine in this place, and the light over all of it: the near plane, the
 * air, the grade. Drawn after the set and the parts and before Walter (`depth.ts`), so nothing here hides him or
 * changes his colour. It is handed show time as `t`.
 *
 * The room's air: a little dust going up slowly through the table's light, close over the glass. Nearest of all, in
 * silhouette along the bottom of the frame, the desk's edge and what is left on it: a mug, short stacks of film cans.
 * Over everything, a cold teal and the top of the frame falling away into the dark.
 */

type C2 = CanvasRenderingContext2D

const ANCHOR: [number, number] = [2.6, -0.6]
const REF = 3.4

/* ------------------------------------------------------------------ the air */

function air(ctx: C2, v: View, t: number, light: number): void {
  // A few motes going up slowly through the table's light, close over the glass. They come up with the tubes, on an
  // eased curve of their light, as the eye finds them.
  const eased = 1 - (1 - light) * (1 - light)
  if (eased <= 0.02) return
  ctx.save()
  ctx.globalAlpha = clamp01(0.6 * eased)
  motes(ctx, v, t, {
    n: 8,
    seed: 3,
    tile: [2.6, 1.9],
    r: [0.006, 0.013],
    v: [0.02, -0.06],
    spread: 0.5,
    sway: [0.05, 0.13],
    color: 'rgba(255, 236, 206, 0.5)',
    within: { x0: GLASS.x0 - 0.6, y0: GLASS.top - 1.6, x1: GLASS.x1 + 0.6, y1: GLASS.top + 0.05 },
  })
  ctx.restore()
}

/* ------------------------------------------------------------------ the near plane */

/** What is on the desk nearest the camera, in its own plane's cells: [kind, x, cans in the stack]. */
const NEAR_THINGS: [string, number, number][] = [
  ['cans', -5.8, 3],
  ['cans', -1.9, 5],
  ['mug', 2.25, 0],
  ['cans', 6.7, 3],
]
const DESK = 1.1
const NEAR = '#0B0E0F'
const RIM = '#8C836F'

function nearPlane(ctx: C2, v: View, light: number): void {
  layer(ctx, v, 1.4, ANCHOR, REF, (inner) => {
    const k = inner.k
    if (inner.y1 < DESK - 0.6 || light < 0.01) return
    ctx.globalAlpha = Math.min(1, light * 2.5)
    // The desk's edge in silhouette, and its lip catching the table's light.
    ctx.fillStyle = rgbaOf(NEAR, 0.95)
    ctx.fillRect((inner.x0 - 0.2) * k, DESK * k, (inner.w + 0.4) * k, (inner.y1 - DESK + 0.2) * k)
    ctx.fillStyle = rgbaOf('#6E6758', 0.3 * light)
    ctx.fillRect((inner.x0 - 0.2) * k, DESK * k, (inner.w + 0.4) * k, 0.02 * k)
    for (const [kind, x, n] of NEAR_THINGS) {
      if (x < inner.x0 - 1 || x > inner.x1 + 1) continue
      ctx.fillStyle = rgbaOf(NEAR, 0.95)
      ctx.strokeStyle = rgbaOf(RIM, 0.3 * light)
      if (kind === 'mug') {
        // A mug left on the desk: its dark body and handle, the table's light along its rim.
        const w = 0.3
        const h = 0.36
        const x0 = x - w / 2
        const top = DESK + 0.01 - h
        ctx.beginPath()
        ctx.roundRect(x0 * k, top * k, w * k, h * k, [0.02 * k, 0.02 * k, 0.06 * k, 0.06 * k])
        ctx.fill()
        ctx.strokeStyle = rgbaOf(NEAR, 0.95)
        ctx.lineWidth = 0.05 * k
        ctx.beginPath()
        ctx.arc((x0 + w) * k, (top + h * 0.45) * k, 0.1 * k, -Math.PI / 2, Math.PI / 2)
        ctx.stroke()
        ctx.fillStyle = rgbaOf(RIM, 0.3 * light)
        ctx.fillRect((x0 + 0.03) * k, top * k, (w - 0.06) * k, 0.02 * k)
      } else {
        // Film cans lying flat in a short stack, a little askew, the top one's lid seen from a little above and its
        // rim catching the table's light.
        const r = 0.33
        const h = 0.065
        const cans = new Path2D()
        let lx = x
        let ly = DESK
        for (let i = 0; i < n; i++) {
          const cx = x + [0, 0.035, -0.02, 0.02, -0.01][i]
          const bot = DESK + 0.005 - i * (h + 0.006)
          cans.moveTo((cx - r) * k, (bot - h) * k)
          cans.lineTo((cx - r) * k, bot * k)
          cans.ellipse(cx * k, bot * k, r * k, 0.05 * k, 0, Math.PI, 0, true)
          cans.lineTo((cx + r) * k, (bot - h) * k)
          cans.closePath()
          lx = cx
          ly = bot - h
        }
        ctx.fill(cans)
        ctx.fillStyle = rgbaOf('#1C2224', 0.95)
        ctx.beginPath()
        ctx.ellipse(lx * k, ly * k, r * k, 0.05 * k, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.lineWidth = 0.02 * k
        ctx.beginPath()
        ctx.ellipse(lx * k, ly * k, r * k, 0.05 * k, 0, Math.PI * 1.05, Math.PI * 1.95)
        ctx.stroke()
      }
    }
  })
}

/* ------------------------------------------------------------------ the grade */

/** The frame's top falling away into the dark over the room (its bottom is the desk's, its sides the room's own dark). */
function ceiling(ctx: C2, v: View, hex: string, a: number): void {
  const k = v.k
  const h = v.h * 0.22
  const g = ctx.createLinearGradient(0, v.y0 * k, 0, (v.y0 + h) * k)
  g.addColorStop(0, rgbaOf(hex, a))
  g.addColorStop(1, rgbaOf(hex, 0))
  ctx.fillStyle = g
  ctx.fillRect((v.x0 - 0.05) * k, (v.y0 - 0.05) * k, (v.w + 0.1) * k, (h + 0.05) * k)
}

export const negativesFront = scenery<null>({
  name: 'negatives-front',
  draw: (p, _s, c) => {
    const t = c.t
    const ctx = p.drawingContext as C2
    const v = view(p, c.k)
    const light = tubeAt(t)
    ctx.save()
    air(ctx, v, t, light)
    nearPlane(ctx, v, light)
    // A cold teal over the room's darks, and the top of the frame going into them.
    ctx.fillStyle = 'rgba(30, 64, 66, 0.07)'
    ctx.fillRect((v.x0 - 0.1) * c.k, (v.y0 - 0.1) * c.k, (v.w + 0.2) * c.k, (v.h + 0.2) * c.k)
    ceiling(ctx, v, '#060A0B', 0.4)
    ctx.restore()
  },
})
