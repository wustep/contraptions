import type p5 from 'p5'
import type { PieceCtx } from '../../../../parts'
import type { Show } from '../../../../show'

/**
 * The one door of the show, drawn in the night's colour rather than the field's ink: the stage's iris, closing on the
 * portal the ball goes into at sunset and opening on the one it comes out of under the stars, so the cut is the dark
 * coming down over the field. The stage's own iris is turned off for it (`cuts`), between `door`'s two show times;
 * this keeps its timing exactly.
 */
export function nightfall(p: p5, c: PieceCtx, col: number, line: number, show: Show, t: number, night: string, door: [number, number]): void {
  // Only this door: the last portal holds the ball inside it for the whole decay, and the photograph stays open.
  if (t < door[0] || t > door[1]) return
  const here = show.at(t)
  const seg = here.placed.lane.segs[here.seg]
  if (here.placed.piece.name !== 'portal' || !seg?.portal) return
  const f = seg.portal === 'out' ? here.raw : 1 - here.raw
  if (f <= 0) return
  const W = p.width
  const H = p.height
  const radius = Math.hypot(W, H) * 0.6 * (1 - f)
  const rim = Math.hypot(W, H)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  // The stage has the canvas at the scenery's cell, in the canvas's own pixels, as its iris is drawn.
  const x = (here.x - col) * c.k
  const y = (here.y - line) * c.k
  ctx.save()
  ctx.strokeStyle = night
  ctx.lineWidth = rim
  ctx.beginPath()
  ctx.arc(x, y, radius + rim / 2, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}
