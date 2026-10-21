import type { Light } from '../../light'
import { clamp01, ellipse, fill, lit, mix, poly, type Paint, type Pt } from '../../paint'

/**
 * No-Face's mask, over his dark ball: a white oval, two small dark eyes, a thin mouth, and the purple marks over and
 * under the eyes. It turns a little the way he is looking (`look`, -1 west to 1 east), sliding across his face.
 */
export function drawMask(g: Paint, L: Light, at: Pt, r: number, look: number): void {
  const { ctx } = g
  const k = clamp01(Math.abs(look)) * Math.sign(look)
  const x = at[0] + k * r * 0.28
  const y = at[1] - r * 0.04
  const rx = r * 0.5 * (1 - 0.18 * Math.abs(k))
  const ry = r * 0.66
  const white = lit('#F1EEE6', mix(L.ambient, '#FFFFFF', 0.5))
  ellipse(ctx, x, y, rx, ry)
  fill(ctx, white)
  const dark = '#1E1A22'
  const purple = lit('#7E5E9E', mix(L.ambient, '#FFFFFF', 0.5))
  for (const s of [-1, 1]) {
    const ex = x + s * rx * 0.42
    // The marks: a small purple point over each eye and a longer one under it.
    poly(ctx, [[ex - rx * 0.12, y - ry * 0.32], [ex + rx * 0.12, y - ry * 0.32], [ex, y - ry * 0.52]])
    fill(ctx, purple)
    poly(ctx, [[ex - rx * 0.13, y + ry * 0.05], [ex + rx * 0.13, y + ry * 0.05], [ex, y + ry * 0.36]])
    fill(ctx, purple)
    ellipse(ctx, ex, y - ry * 0.12, rx * 0.15, ry * 0.08)
    fill(ctx, dark)
  }
  poly(ctx, [[x - rx * 0.25, y + ry * 0.55], [x + rx * 0.25, y + ry * 0.55]], false)
  ctx.strokeStyle = dark
  ctx.lineWidth = Math.max(1.25 * g.px, r * 0.05)
  ctx.stroke()
}
