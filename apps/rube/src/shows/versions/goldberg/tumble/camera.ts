import type { Framing } from '../../../registry'
import { FLUSH, MIDDLE, POCKET, ROWS, screen } from './geo'
import { bar } from './music'

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

export function cameraAt(t: number): Framing {
  const u = ease((t - bar(61)) / (bar(64, 3) + 1.2 - bar(61)))
  return {
    x: WHOLE.x + (COLUMN.x - WHOLE.x) * u,
    y: WHOLE.y + (COLUMN.y - WHOLE.y) * u,
    cells: WHOLE.cells + (COLUMN.cells - WHOLE.cells) * u,
  }
}
