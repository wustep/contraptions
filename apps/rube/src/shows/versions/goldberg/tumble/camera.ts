import type { Framing } from '../../../registry'
import { FLUSH, MIDDLE, PLANK, POCKET, ROWS, screen } from './geo'
import { CUBES } from './machine'
import { bar } from './music'
import { MACHINE } from './score'

/**
 * The camera is a person standing at the table: it holds the toy whole all through, and only in the last phrase,
 * while the planks swing and come flush, leans in toward the column of pockets, and stays there.
 */

/** The toy whole, a little room round it, for a 16:9 frame. */
const WHOLE: Framing = { x: MIDDLE.x, y: MIDDLE.y, cells: Math.max(MIDDLE.h * 1.08, (MIDDLE.w * 1.04 * 9) / 16) }

/** Closer on the column: its middle, the tray still all but whole round it. */
const COLUMN = (() => {
  const [x, y] = screen(FLUSH + POCKET + 0.5, ROWS / 2, -0.3)
  return { x, y, cells: WHOLE.cells * 0.86 }
})()

const ease = (u: number): number => {
  const v = Math.max(0, Math.min(1, u))
  return v * v * v * (v * (v * 6 - 15) + 10)
}

/**
 * What is happening at `t`, on the picture: the coloured cube or the plank whose move is nearest in time, within a
 * couple of seconds; else the black cube on its rim. It jumps from one to the next; `focusAt` smooths it.
 */
function busy(t: number): [number, number] {
  const m = MACHINE
  let best = 2.5
  let at: [number, number] | null = null
  for (const f of m.flops) {
    if (f.cube === 'black') continue
    const d = t < f.t0 ? f.t0 - t : t > f.t1 ? t - f.t1 : 0
    if (d < best) {
      best = d
      const s = m.cubeAt(f.cube, t)
      const [x, y] = m.cellNow(s.flop ? s.flop.move.to : s.spot, t)
      at = screen(x + 0.5, y + 0.5, 0.5)
    }
  }
  for (const mv of m.moves) {
    const d = t < mv.t0 ? mv.t0 - t : t > mv.t1 ? t - mv.t1 : 0
    if (d < best) {
      best = d
      at = screen(m.plankAt(mv.row, t) + PLANK / 2, mv.row + 0.5, 0)
    }
  }
  if (at) return at
  const [x, y] = m.cellNow(m.cubeAt(CUBES[0], t).spot, t)
  return screen(x + 0.5, y + 0.5, 0.5)
}

/** What the shot is about, for Zoom: what is happening, averaged over a second and a half either side. */
function focusAt(t: number): [number, number] {
  let x = 0
  let y = 0
  let w = 0
  const n = 10
  for (let i = -n; i <= n; i++) {
    const k = 1 - Math.abs(i) / (n + 1)
    const [px, py] = busy(t + (i / n) * 1.5)
    x += px * k
    y += py * k
    w += k
  }
  return [x / w, y / w]
}

export function cameraAt(t: number): Framing {
  const u = ease((t - bar(61)) / (bar(64, 3) + 1.2 - bar(61)))
  return {
    x: WHOLE.x + (COLUMN.x - WHOLE.x) * u,
    y: WHOLE.y + (COLUMN.y - WHOLE.y) * u,
    cells: WHOLE.cells + (COLUMN.cells - WHOLE.cells) * u,
    focus: focusAt(t),
  }
}
