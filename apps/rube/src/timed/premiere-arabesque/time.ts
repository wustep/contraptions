import type { TimedPiece } from './types'

/** C1 monotone interpolation: no clock-rate step at a strike or a piece seam. */
export function pieceTime(piece: TimedPiece, time: number): number {
  const knots = piece.timing
  const first = knots[0], last = knots[knots.length - 1]
  if (time <= first.time) return (time - first.time) * first.slope
  if (time >= last.time) return last.native + (time - last.time) * last.slope
  let i = 1
  while (knots[i].time < time) i++
  const a = knots[i - 1], b = knots[i]
  const dt = b.time - a.time, u = (time - a.time) / dt
  const u2 = u * u, u3 = u2 * u
  return (2 * u3 - 3 * u2 + 1) * a.native + (u3 - 2 * u2 + u) * dt * a.slope
    + (-2 * u3 + 3 * u2) * b.native + (u3 - u2) * dt * b.slope
}

