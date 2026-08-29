/**
 * Every contraption is periodic. LOOP is the master period in frames, and each
 * contraption's own period must be LOOP or a divisor of it (240 = 2^4 * 3 * 5,
 * so 120/80/60/48/40/30/24/20/16/12/10/8/6/5/4/3/2/1 are all fair game).
 *
 * Because a periodic animation stays periodic under any integer phase shift,
 * the whole composition loops in LOOP frames no matter how instances are
 * offset. That is what makes seamless loop export possible.
 */
export const LOOP = 240

/** Nominal frame rate. Purely for reporting loop length in seconds. */
export const FPS = 60

/**
 * Fallback canvas edge in CSS pixels. The live canvas is sized to exactly fill
 * its container instead, so it never gets resampled by CSS — see `measure()` in
 * main.ts. This is the size used for headless builds and as a floor.
 */
export const CANVAS = 900

/** Never build a composition smaller than this. */
export const MIN_CANVAS = 360

/** Fraction of the canvas the composition occupies, leaving a margin. */
export const ART_INSET = 0.9

/**
 * How far a machine's ink may spill past its own footprint by default, as a
 * fraction of a cell. Ink lands within its cell or it lands on the machine
 * next door; a stroke's worth of slack is the difference between a rail that
 * meets the edge and one that crosses it. Machines that reach on purpose
 * declare a larger `reach`.
 */
export const REACH = 0.06

/**
 * The widest range of cell sizes one piece may hold, as largest / smallest.
 * A layout that mixes tempos is the point; a layout that puts a 500px machine
 * beside a 60px one is two artworks on one sheet. One octave is the whole
 * budget, and `npm run check` holds every layout to it.
 */
export const SCALE_OCTAVE = 2

/**
 * The least of its footprint a machine may ever span, as a fraction, on its
 * widest axis at its widest moment. A machine that never crosses this is a
 * mark on a large sheet of paper rather than a machine in a cell, which is
 * exactly what a toy designed at one scale looks like when it is handed four
 * times the room.
 */
export const FILL = 0.6

/**
 * Reach granted across a seam two cells share — an elevator shaft running
 * from the rail above to the rail below. Both cells draw the same car at the
 * same place, so the ink that crosses lands on its own other half.
 */
export const SEAM_REACH = 0.5
