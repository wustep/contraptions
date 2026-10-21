import type { Scene } from '../scene'
import { T, END } from '../timeline'
import { drawing } from '../paint'
import { desert } from './desert'

/** Placeholders while the scenes are built: a plain field of colour for each window. */
function blank(key: string, from: number, to: number, x: number, color: string): Scene {
  return {
    key,
    from,
    to,
    shots: [{ t: from, cells: 20, at: [x, -5], cut: from > 0 }],
    back: [drawing(`${key}-blank`, END, (b) => {
      if (b.t < from || b.t >= to) return
      b.ctx.fillStyle = b.c(color)
      b.ctx.fillRect(b.view.x0 - 1, b.view.y0 - 1, b.view.w + 2, b.view.h + 2)
    })],
    overview: { x0: x - 20, y0: -20, x1: x + 20, y1: 10 },
  }
}

/** The scenes, in order. */
export const SCENES: Scene[] = [
  desert,
  blank('ride', T.thumper, T.arena, 1000, '#C98A50'),
  blank('arena', T.arena, T.charge, 6000, '#BBBBBB'),
  blank('charge', T.charge, END, 9000, '#8A4A2A'),
]
