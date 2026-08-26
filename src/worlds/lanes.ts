/**
 * Where tokens travel inside a cell, shared by both worlds so a ball that
 * leaves one machine's floor lands on the next machine's floor. Units of the
 * cell, y down.
 */

/** Ball diameter. */
export const D = 0.24
/** The floor line a rolling ball sits on. */
export const FLOOR = 0.34
/** A rolling ball's centre. */
export const BY = FLOOR - D / 2
/** Half-width of a vertical tube. A hair wider than the ball. */
export const TW = 0.13
/** Height at which pushes are delivered: a rod, a toppling bar's shoulder. */
export const PY = 0.12
/** Half-width of a lift shaft. */
export const LIFT_W = 0.26

/**
 * Speeds, in cells per loop fraction. Every horizontal edge is crossed at
 * ROLL_V and every vertical one at FALL_V, so the two cells either side of a
 * seam draw the ball in the same place whatever else they do with it.
 */
export const ROLL_V = 10
export const FALL_V = 16
/** Loop fraction to roll across one cell, and to fall through one. */
export const ROLL = 1 / ROLL_V
export const FALL = 1 / FALL_V

/**
 * A quarter-pipe turning a fall into a run. The ball's centre sweeps a
 * quarter circle of radius BY about (BY, 0) — from the tube's axis at (0, 0)
 * to the floor at (BY, BY) — and the outer wall is that arc pushed out by the
 * ball's radius, which is what lets the tube wall run straight into it.
 */
export const ARC_R = BY
export const ARC_WALL = BY + D / 2
/** Loop fraction the arc takes: its length at a speed between fall and roll. */
export const ARC_T = ((Math.PI / 2) * ARC_R) / ((ROLL_V + FALL_V) / 2)
