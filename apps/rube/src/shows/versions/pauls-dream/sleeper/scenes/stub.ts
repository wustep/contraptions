import { cover, type Pt } from '../paint'
import { standing } from '../paint'
import { Walk } from '../path'
import type { Scene } from '../scene'

/** A stand-in for a scene not built yet: its place in one flat colour, Paul resting in it, a still camera. */
export function stub(key: string, from: number, to: number, color: string, at: Pt): Scene {
  return {
    key,
    from,
    to,
    moves: { paul: new Walk(at, from).wait(to).segs },
    shots: [{ t: from, cells: 10, at: [at[0], at[1] - 1], cut: from > 0 }],
    pieces: [standing(`${key}-stub`, { x0: at[0] - 60, y0: at[1] - 60, x1: at[0] + 60, y1: at[1] + 60 }, (g) => {
      if (g.t < from - 3 || g.t >= to + 3) return
      cover(g, color)
    })],
  }
}
