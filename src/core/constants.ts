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

/** Default canvas edge, in CSS pixels. */
export const CANVAS = 900

/** Fraction of the canvas the composition occupies, leaving a margin. */
export const ART_INSET = 0.9
