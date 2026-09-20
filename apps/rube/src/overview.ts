import type { Box } from './plan'

/** Machine and Shows fit the current world's cells with half a cell of margin. */
export function overviewCamera(bounds: Box, width: number, height: number) {
  return {
    x: (bounds.x0 + bounds.x1) / 2,
    y: (bounds.y0 + bounds.y1) / 2,
    scale: Math.min(width / (bounds.x1 - bounds.x0 + 2), height / (bounds.y1 - bounds.y0 + 2)),
  }
}
