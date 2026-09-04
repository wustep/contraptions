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

/**
 * Tracks mode. A carved circuit is longer than a single classic cell-loop, so
 * the world runs three of them (12s at 60fps). Keep this as `3 * LOOP`; do
 * not pick a new number independently of LOOP.
 */
export const TRACKS_LOOP = 3 * LOOP

/** Nominal frame rate. Purely for reporting loop length in seconds. */
export const FPS = 60

/**
 * Longest WebM we will encode. Tracks is 720 frames — exactly 12s at FPS —
 * and that is the ceiling: a longer period must not become a longer file.
 * Scale is not applied (current canvas size only), so a tracks piece stays
 * a 12s loop of what you see, not a 4K 12s monster.
 */
export const LOOP_EXPORT_MAX_SECONDS = 12

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
