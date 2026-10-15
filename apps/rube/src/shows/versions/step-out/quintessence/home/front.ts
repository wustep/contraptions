import type { Pt } from '../../../../../parts'
import { layer, motes, rgbaOf, view, type View } from '../depth'
import { hash, scenery } from '../kit'
import { edges } from '../iceland/vignette'
import { SHADE, lampLight } from './home-draw'
import { T0, T1 } from './home-plan'

/**
 * What stands between the camera and the machine in this place, and the light over all of it: the near plane, the
 * air, the grade. Drawn after the set and the parts and before Walter (`depth.ts`), so nothing here hides him or
 * changes his colour. It is handed show time as `t`.
 *
 * Near, out of focus at the frame's lower corners as the camera goes along the piano: the edge of a box, the leaves
 * of a plant by the boxes, the back of a chair. In the air: dust turning in the lamp's cone. Over all of it, the
 * lamp's flicker, and the corners going dark.
 */

const sm = (t: number, a: number, b: number): number => {
  const u = Math.max(0, Math.min(1, (t - a) / (b - a)))
  return u * u * (3 - 2 * u)
}

const ANCHOR: Pt = [1.8, -1.2]
const REF = 3.5
const Z = 1.5

/** A near thing, out of focus: its shape spread soft at its edge, then its body, then the lamp's light along one side. */
function soft(ctx: CanvasRenderingContext2D, k: number, pts: Pt[], body: string, rim: string, rimSide: Pt[]): void {
  const path = new Path2D()
  pts.forEach(([x, y], i) => (i ? path.lineTo(x * k, y * k) : path.moveTo(x * k, y * k)))
  path.closePath()
  ctx.save()
  ctx.lineJoin = 'round'
  ctx.strokeStyle = rgbaOf(body, 0.45)
  ctx.lineWidth = 0.07 * k
  ctx.stroke(path)
  ctx.fillStyle = body
  ctx.fill(path)
  ctx.strokeStyle = rgbaOf(rim, 0.35)
  ctx.lineWidth = 0.05 * k
  ctx.lineCap = 'round'
  ctx.beginPath()
  rimSide.forEach(([x, y], i) => (i ? ctx.lineTo(x * k, y * k) : ctx.moveTo(x * k, y * k)))
  ctx.stroke()
  ctx.restore()
}

function near(ctx: CanvasRenderingContext2D, inner: View, t: number): void {
  const k = inner.k
  const foot = inner.y1 + 0.1
  // A box's corner, close, at the lower left as he sets off.
  soft(ctx, k, [[-5.4, foot], [-3.6, foot], [-3.6, foot - 0.5], [-3.4, foot - 0.64], [-5.4, foot - 0.64]], '#140E0B', '#C08A52', [[-3.6, foot], [-3.6, foot - 0.5], [-3.4, foot - 0.64]])
  // A plant by the boxes: long leaves on their stems, stirring in the draught from the window.
  const stir = 0.04 * Math.sin(t * 0.8) + 0.02 * Math.sin(t * 1.9)
  for (let i = 0; i < 4; i++) {
    const bx = -2.6 + 0.22 * i
    const a = -0.9 - 0.3 * (i - 3) + stir * (1 + i * 0.1)
    const len = 0.5 + 0.35 * hash(i, 1, 901)
    const tip: Pt = [bx + Math.cos(a) * len, foot - 0.15 + Math.sin(a) * len]
    const mid: Pt = [(bx + tip[0]) / 2, (foot - 0.15 + tip[1]) / 2]
    const nx = -Math.sin(a) * 0.12
    const ny = Math.cos(a) * 0.12
    soft(ctx, k, [[bx, foot], [mid[0] + nx, mid[1] + ny], tip, [mid[0] - nx, mid[1] - ny]], '#11130C', '#A88A4E', [[bx, foot], [mid[0] + nx, mid[1] + ny], tip])
  }
  // The back of a chair at the lower right, as he comes to the curve.
  soft(ctx, k, [[7.5, foot], [7.62, foot - 1.25], [7.75, foot - 1.4], [8.9, foot - 1.4], [8.9, foot], [8.5, foot], [8.5, foot - 1.0], [7.92, foot - 1.0], [7.92, foot]], '#130D0A', '#C08A52', [[7.5, foot], [7.62, foot - 1.25], [7.75, foot - 1.4], [8.9, foot - 1.4]])
}

export const homeFront = scenery<null>({
  name: 'home-front',
  draw: (p, _s, c) => {
    const t = c.t
    if (t < T0 - 1 || t > T1 + 1.2) return
    const ctx = p.drawingContext as CanvasRenderingContext2D
    const v = view(p, c.k)
    const k = c.k
    const light = lampLight(t)
  
    // The lamp's flicker over the whole room: where its light dips, the room dims with it.
    const dip = Math.min(0.12, (1 - light.power) * 0.9)
    if (dip > 0.004) {
      ctx.fillStyle = rgbaOf('#000000', dip)
      ctx.fillRect((v.x0 - 0.5) * k, (v.y0 - 0.5) * k, (v.w + 1) * k, (v.h + 1) * k)
    }

    // Dust turning in the lamp's cone, caught in its light.
    const [sx, sy] = [light.at[0], SHADE[1] + 0.2]
    ctx.save()
    ctx.beginPath()
    ctx.moveTo((sx - 0.36) * k, sy * k)
    ctx.lineTo((sx + 0.36) * k, sy * k)
    ctx.lineTo((sx + 1.25) * k, 0.5 * k)
    ctx.lineTo((sx - 1.45) * k, 0.5 * k)
    ctx.closePath()
    ctx.clip()
    ctx.globalCompositeOperation = 'lighter'
    ctx.globalAlpha = 0.75 * light.power
    motes(ctx, v, t, { n: 60, seed: 911, tile: [2.4, 2.6], r: [0.006, 0.014], v: [0.035, -0.05], spread: 0.6, sway: [0.06, 0.25], color: '#FFE2A8', twinkle: 0.7 })
    ctx.restore()

    // The near plane.
    layer(ctx, v, Z, ANCHOR, REF, (inner) => near(ctx, inner, t))

    // The corners go dark, more than anywhere.
    edges(ctx, 0.55 * sm(t, T0 - 1, T0 + 0.5))
  },
})
