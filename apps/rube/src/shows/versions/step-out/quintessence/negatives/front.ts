import { scenery } from '../kit'
import { layer, motes, rgbaOf, view, type View } from '../depth'
import { lampAt, tubeAt } from './draw'
import { clamp01 } from './hand'
import { ENLARGER, GLASS, LAMP, NUUK, PICTURE } from './plan'

/**
 * What stands between the camera and the machine in this place, and the light over all of it: the near plane, the
 * air, the grade. Drawn after the set and the parts and before Walter (`depth.ts`), so nothing here hides him or
 * changes his colour. It is handed show time as `t`.
 *
 * The room's air: a little dust going up slowly through the table's light, warm close to the glass and cool above
 * it; the enlarger's throw, faint, once its lamp is on. Nearest of all, out of focus along the bottom of the frame,
 * the desk's edge and what is left on it: a reel, a mug, a short stack of cans. Over everything, a cold teal and the
 * top of the frame falling away into the dark.
 */

type C2 = CanvasRenderingContext2D

const ANCHOR: [number, number] = [2.6, -0.6]
const REF = 3.4

/* ------------------------------------------------------------------ the air */

function air(ctx: C2, v: View, t: number, light: number): void {
  // A few motes going up slowly through the table's light: warm close to the glass, cooler higher up. They come up
  // with the tubes, on an eased curve of their light, as the eye finds them.
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
  ctx.globalAlpha = clamp01(0.4 * eased)
  motes(ctx, v, t, {
    n: 5,
    seed: 4,
    tile: [3.1, 2.3],
    r: [0.005, 0.011],
    v: [-0.03, -0.03],
    spread: 0.6,
    sway: [0.06, 0.09],
    color: 'rgba(196, 222, 222, 0.4)',
    within: { x0: GLASS.x0 - 1.2, y0: GLASS.top - 3.2, x1: GLASS.x1 + 1.2, y1: GLASS.top - 0.6 },
  })
  ctx.restore()
}

/* ------------------------------------------------------------------ the light */

/** The enlarger's throw, once its lamp is on: a faint wedge from the lens to the picture, a few motes turning in it. */
function cone(ctx: C2, v: View, t: number): void {
  const on = lampAt(t)
  if (on <= 0) return
  const k = v.k
  const [lx, ly] = ENLARGER.lens
  const { x1, y0, y1 } = PICTURE
  const beam = new Path2D()
  beam.moveTo((lx + 0.04) * k, (ly - 0.06) * k)
  beam.lineTo(x1 * k, y0 * k)
  beam.lineTo(x1 * k, y1 * k)
  beam.lineTo((lx + 0.04) * k, (ly + 0.06) * k)
  beam.closePath()
  ctx.save()
  const g = ctx.createLinearGradient(lx * k, 0, x1 * k, 0)
  g.addColorStop(0, rgbaOf('#F4F2EA', 0.07 * on))
  g.addColorStop(1, rgbaOf('#F4F2EA', 0.015 * on))
  ctx.fillStyle = g
  ctx.fill(beam)
  ctx.clip(beam)
  motes(ctx, v, t, {
    n: 12,
    seed: 9,
    tile: [2.4, 1.6],
    r: [0.006, 0.014],
    v: [0.035, -0.02],
    spread: 0.7,
    sway: [0.05, 0.17],
    color: rgbaOf('#FFF7E6', 0.45 * on),
    within: { x0: lx, y0: y0, x1: x1, y1: y1 },
  })
  ctx.restore()
}

/* ------------------------------------------------------------------ the near plane */

/** A soft-edged out-of-focus disc, near the lens: its rim falls away rather than ending. */
function softDisc(ctx: C2, x: number, y: number, r: number, hex: string, a: number, k: number): void {
  if (a <= 0.003) return
  const g = ctx.createRadialGradient(x * k, y * k, r * 0.55 * k, x * k, y * k, r * 1.12 * k)
  g.addColorStop(0, rgbaOf(hex, a))
  g.addColorStop(1, rgbaOf(hex, 0))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x * k, y * k, r * 1.12 * k, 0, Math.PI * 2)
  ctx.fill()
}

/** What is on the desk nearest the camera, in its own plane's cells: [kind, x]. */
const NEAR_THINGS: [string, number][] = [
  ['cans', -5.8],
  ['reel', -1.9],
  ['mug', 2.25],
  ['cans', 6.7],
  ['reel', 10.6],
]
const DESK = 1.1

function nearPlane(ctx: C2, v: View, light: number): void {
  layer(ctx, v, 1.4, ANCHOR, REF, (inner) => {
    const k = inner.k
    if (inner.y1 < DESK - 0.6 || light < 0.01) return
    const lit = light
    ctx.globalAlpha = Math.min(1, light * 2.5)
    // The desk's edge, soft, its lip catching the table's light.
    const g = ctx.createLinearGradient(0, (DESK - 0.06) * k, 0, (DESK + 0.04) * k)
    g.addColorStop(0, rgbaOf('#0A0D0E', 0))
    g.addColorStop(1, rgbaOf('#0A0D0E', 0.95))
    ctx.fillStyle = g
    ctx.fillRect((inner.x0 - 0.2) * k, (DESK - 0.06) * k, (inner.w + 0.4) * k, 0.1 * k)
    ctx.fillStyle = rgbaOf('#0A0D0E', 0.95)
    ctx.fillRect((inner.x0 - 0.2) * k, (DESK + 0.04) * k, (inner.w + 0.4) * k, (inner.y1 - DESK + 0.2) * k)
    const edge = ctx.createLinearGradient(0, (DESK - 0.035) * k, 0, (DESK + 0.05) * k)
    edge.addColorStop(0, rgbaOf('#6E6758', 0))
    edge.addColorStop(0.5, rgbaOf('#6E6758', 0.35 * lit))
    edge.addColorStop(1, rgbaOf('#6E6758', 0))
    ctx.fillStyle = edge
    ctx.fillRect((inner.x0 - 0.2) * k, (DESK - 0.035) * k, (inner.w + 0.4) * k, 0.085 * k)
    for (const [kind, x] of NEAR_THINGS) {
      if (x < inner.x0 - 1 || x > inner.x1 + 1) continue
      if (kind === 'reel') {
        // A reel stood on its edge, out of focus: its dark flange, the light through its three windows, its hub.
        const r = 0.34
        const cy = DESK - r + 0.02
        softDisc(ctx, x, cy, r, '#0B0E0F', 0.96, k)
        for (let i = 0; i < 3; i++) {
          const a = -Math.PI / 2 + (i * Math.PI * 2) / 3 + 0.3
          softDisc(ctx, x + Math.cos(a) * r * 0.52, cy + Math.sin(a) * r * 0.52, r * 0.22, '#3B3E3A', 0.45 * lit, k)
        }
        softDisc(ctx, x, cy, r * 0.14, '#55524A', 0.5 * lit, k)
        // The rim's highlight where the table's light finds it.
        ctx.strokeStyle = rgbaOf('#8C836F', 0.2 * lit)
        ctx.lineWidth = 0.05 * k
        ctx.beginPath()
        ctx.arc(x * k, cy * k, r * 0.88 * k, -2.5, -0.9)
        ctx.stroke()
      } else if (kind === 'mug') {
        // A mug left on the desk, out of focus: its dark body and handle, soft at the edges, the table's light
        // along its rim.
        const w = 0.3
        const h = 0.36
        const x0 = x - w / 2
        const top = DESK + 0.01 - h
        const body = new Path2D()
        body.roundRect(x0 * k, top * k, w * k, h * k, [0.02 * k, 0.02 * k, 0.06 * k, 0.06 * k])
        const handle = new Path2D()
        handle.arc((x0 + w) * k, (top + h * 0.45) * k, 0.1 * k, -Math.PI / 2, Math.PI / 2)
        ctx.lineCap = 'round'
        for (const [a, grow] of [[0.4, 0.045], [0.95, 0]] as const) {
          ctx.fillStyle = rgbaOf('#0B0E0F', a)
          ctx.strokeStyle = rgbaOf('#0B0E0F', a)
          ctx.fill(body)
          if (grow) {
            ctx.lineWidth = grow * k
            ctx.stroke(body)
          }
          ctx.lineWidth = (0.05 + grow) * k
          ctx.stroke(handle)
        }
        ctx.strokeStyle = rgbaOf('#8C836F', 0.3 * lit)
        ctx.lineWidth = 0.025 * k
        ctx.beginPath()
        ctx.moveTo((x0 + 0.03) * k, (top + 0.008) * k)
        ctx.lineTo((x0 + w - 0.03) * k, (top + 0.008) * k)
        ctx.stroke()
      } else {
        // Cans lying flat in a short stack, out of focus: soft dark discs edge-on, their rims lit.
        for (let i = 0; i < 3; i++) {
          const cy = DESK - 0.05 - i * 0.075
          ctx.save()
          ctx.translate((x + i * 0.03) * k, cy * k)
          ctx.scale(1, 0.16)
          softDisc(ctx, 0, 0, 0.36, '#0D1011', 0.95, k)
          ctx.restore()
          const g2 = ctx.createLinearGradient(0, (cy - 0.03) * k, 0, (cy + 0.01) * k)
          g2.addColorStop(0, rgbaOf('#7E7666', 0))
          g2.addColorStop(0.5, rgbaOf('#7E7666', 0.16 * lit))
          g2.addColorStop(1, rgbaOf('#7E7666', 0))
          ctx.fillStyle = g2
          ctx.fillRect((x + i * 0.03 - 0.3) * k, (cy - 0.03) * k, 0.6 * k, 0.04 * k)
        }
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
    if (t > LAMP - 0.1 && t < NUUK + 1.5) cone(ctx, v, t)
    air(ctx, v, t, light)
    nearPlane(ctx, v, light)
    // A cold teal over the room's darks, and the top of the frame going into them.
    ctx.fillStyle = 'rgba(30, 64, 66, 0.07)'
    ctx.fillRect((v.x0 - 0.1) * c.k, (v.y0 - 0.1) * c.k, (v.w + 0.2) * c.k, (v.h + 0.2) * c.k)
    ceiling(ctx, v, '#060A0B', 0.6)
    ctx.restore()
  },
})
