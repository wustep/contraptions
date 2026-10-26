import { view, type View } from '../depth'
import { scenery } from '../kit'
import { rgba } from '../negatives/hand'
import { whiteAt } from './light'

/**
 * The light over everything in this place: the grade, the frame's edges falling away warm, thinning as the morning
 * whitens through the credits. Drawn after the set and the parts and before Walter (`depth.ts`), so nothing here hides
 * him or changes his colour. It is handed show time as `t`.
 */

type C2 = CanvasRenderingContext2D

/**
 * The grade: the frame's edges falling away warm, in a band up each side and along the foot (so the street's foot is
 * a little deeper than the sky, and the lower corners deepest), thinning as the morning whitens.
 */
function grade(ctx: C2, v: View, w: number): void {
  const k = v.k
  const a = 1 - 0.45 * w
  const ink = '#4A3B2C'
  // One band: from `depth` at the edge (x0, y0) to nothing at (x1, y1), over the box it spans.
  const band = (x0: number, y0: number, x1: number, y1: number, depth: number, box: [number, number, number, number]) => {
    const g = ctx.createLinearGradient(x0 * k, y0 * k, x1 * k, y1 * k)
    g.addColorStop(0, rgba(ink, depth * a))
    g.addColorStop(0.5, rgba(ink, depth * 0.3 * a))
    g.addColorStop(1, rgba(ink, 0))
    ctx.fillStyle = g
    ctx.fillRect(box[0] * k, box[1] * k, (box[2] - box[0]) * k, (box[3] - box[1]) * k)
  }
  const bh = v.h * 0.17
  const bw = v.w * 0.08
  const [x0, y0, x1, y1] = [v.x0 - 0.5, v.y0 - 0.5, v.x1 + 0.5, v.y1 + 0.5]
  band(0, v.y1, 0, v.y1 - bh, 0.2, [x0, v.y1 - bh, x1, y1])
  band(v.x0, 0, v.x0 + bw, 0, 0.16, [x0, y0, v.x0 + bw, y1])
  band(v.x1, 0, v.x1 - bw, 0, 0.16, [v.x1 - bw, y0, x1, y1])
}

export const streetFront = scenery<null>({
  name: 'street-front',
  draw: (p, _s, c) => {
    const ctx = p.drawingContext as C2
    const v = view(p, c.k)
    const t = c.t
    const w = whiteAt(t)
    ctx.save()
    // The grade: the edges falling away warm, less so as the morning whitens.
    grade(ctx, v, w)
    ctx.restore()
  },
})
