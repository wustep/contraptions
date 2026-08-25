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
/** Height at which pushes are delivered: a rod, a toppling bar's shoulder. */
export const PY = 0.12
