import { mixHex } from '../../../../parts'
import { rgba, viewOf } from './canvas'
import { draughtAt, fairyGlowAt } from './decor'
import { lensIn } from './lens'
import { smooth } from './music'
import { rimAt } from './rim'
import { hash, lampAt } from './world'

/**
 * What is nearest the camera: a pothos trailing down into the top left of the picture from a pot hung just above it,
 * close enough to be out of focus. A soft dark frame for the room, its leaves edged by the window's light and, warmer,
 * the fairy lights', stirring in the draught off the glass as the curtain does. It hangs by the one at the desk, so it
 * keeps to the corner of whatever the camera looks at, drifting against the room a little as the camera moves (it is
 * nearer than anything), which is what makes the room behind it deep.
 */

type Ctx = CanvasRenderingContext2D

/** The vines: where each hangs from (across the corner, a share of the frame's height), how long, which way it bows. */
const VINES: [number, number, number][] = [
  [0.04, 0.3, 0.5],
  [0.12, 0.2, -0.5],
  [0.19, 0.16, 0.3],
]
/** The share of the frame's height a leaf is, nearest the camera: large, as what is close is. */
const LEAF = 0.1

let pad: HTMLCanvasElement | null = null
const PAD_W = 96
const PAD_H = 96
/** The corner the plant is drawn into, in shares of the frame's height. */
const BOX = { w: 0.4, h: 0.4 }

/** A pothos leaf: a heart, its point down, from its stalk at the origin, `s` long. */
function leaf(g: Ctx, s: number): void {
  g.beginPath()
  g.moveTo(0, 0)
  g.bezierCurveTo(-s * 0.55, -s * 0.08, -s * 0.62, s * 0.55, 0, s)
  g.bezierCurveTo(s * 0.62, s * 0.55, s * 0.55, -s * 0.08, 0, 0)
  g.closePath()
}

/** The plant, over the room and under the vignette and the grain. */
export function foreground(ctx: Ctx, t: number): void {
  if (typeof document === 'undefined') return
  const v = viewOf(ctx)
  const lens = lensIn(ctx)
  // Not in the stage's overview of the whole room: it is the camera's, not the room's.
  const shown = 1 - smooth(lens.size, 7.4, 8.6)
  if (shown < 0.01) return
  // The scale: the height of a 16:9 frame of what is shown (a phone held upright sees taller, not nearer).
  const S = lens.size
  // In the top left corner, a little against the room as the camera moves across it (nearer than anything).
  const ox = v.x0 - 0.015 * S - Math.max(-0.08 * S, Math.min(0.08 * S, 0.12 * (lens.x - 0.91)))
  const oy = v.y0
  pad ??= Object.assign(document.createElement('canvas'), { width: PAD_W, height: PAD_H })
  const g = pad.getContext('2d') as Ctx
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.clearRect(0, 0, PAD_W, PAD_H)
  // Drawn in shares of the frame's height, into the small canvas, so laying it back large softens it: out of focus.
  g.setTransform(PAD_W / BOX.w, 0, 0, PAD_H / BOX.h, 0, 0)
  const rim = rimAt(t)
  const glow = fairyGlowAt(t)
  const lamp = lampAt(t)
  const dark = mixHex('#17221D', '#26382C', 0.35 * lamp)
  const dark2 = mixHex('#1B2A22', '#2E4434', 0.35 * lamp)
  const blow = draughtAt(t)
  for (const [i, [x0, len, bow]] of VINES.entries()) {
    // Each swings from where it hangs, slowly, on the draught, each a little out of step.
    const sway = 0.05 * Math.sin(t * (0.33 + 0.07 * i) + i * 1.7) + 0.6 * blow * (0.5 + 0.5 * Math.sin(t * 0.4 + i))
    const pt = (u: number) => {
      const a = sway * u * u
      const bx = bow * 0.06 * Math.sin(Math.PI * u)
      return { x: x0 + bx + Math.sin(a) * len * u, y: -0.03 + Math.cos(a) * len * u }
    }
    g.beginPath()
    for (let k = 0; k <= 24; k++) {
      const p = pt(k / 24)
      if (k === 0) g.moveTo(p.x, p.y)
      else g.lineTo(p.x, p.y)
    }
    g.strokeStyle = dark
    g.lineWidth = 0.009
    g.stroke()
    // The leaves along it, alternating side to side, smaller toward its tip.
    const n = Math.max(2, Math.round(len / 0.085))
    for (let k = 1; k <= n; k++) {
      const u = k / (n + 0.4)
      const p = pt(u)
      const q = pt(Math.min(1, u + 0.02))
      const along = Math.atan2(q.y - p.y, q.x - p.x) - Math.PI / 2
      const side = (k + i) % 2 ? 1 : -1
      const s = LEAF * (1 - 0.4 * u) * (0.85 + 0.3 * hash(i, k, 501))
      g.save()
      g.translate(p.x, p.y)
      g.rotate(along + side * (0.75 + 0.25 * hash(i, k, 502)))
      leaf(g, s)
      g.fillStyle = (k + i) % 3 ? dark : dark2
      g.fill()
      // The window's light along its upper edge, cool; and here and there the fairy lights, warm.
      g.strokeStyle = rgba(rim.color, 0.5 * rim.a)
      g.lineWidth = s * 0.1
      g.beginPath()
      g.moveTo(0, 0)
      g.bezierCurveTo(-s * 0.55 * side, -s * 0.08, -s * 0.62 * side, s * 0.55, 0, s)
      g.stroke()
      if (hash(i, k, 503) < 0.3 && glow > 0.05) {
        g.fillStyle = rgba('#FFC890', 0.35 * glow)
        g.beginPath()
        g.arc(side * s * 0.15, s * 0.35, s * 0.12, 0, Math.PI * 2)
        g.fill()
      }
      g.restore()
    }
  }
  // The pot's foot, just showing at the top edge, and its cords.
  g.fillStyle = dark
  g.beginPath()
  g.ellipse(0.12, -0.03, 0.14, 0.045, 0, 0, Math.PI)
  g.fill()
  ctx.save()
  ctx.globalAlpha = 0.96 * shown
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(pad, ox, oy, BOX.w * S, BOX.h * S)
  ctx.restore()
}
