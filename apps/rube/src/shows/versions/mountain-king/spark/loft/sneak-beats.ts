import { LAST, inPhrase } from '../music'

/**
 * LOFT-A's two moments the room itself has to know (in a file of their own, so `set.ts` and `sneak.ts` never import
 * each other): when the spark lifts off its wick, and when it lands back on it. Between the two the candle is dark
 * and its wick smokes; outside them the candle burns.
 */

/** The spark leaves its wick: the push-off of its first hop, on phrase 0's seventh eighth (6.123). */
export const WICK_LEFT = inPhrase(0, 6)
/** Home: onto the wick on the first last chord (the director's `home` part). */
export const WICK_BACK = LAST[0]

/** True while the candle burns: the spark is on its wick. */
export const candleLit = (t: number): boolean => t < WICK_LEFT || t >= WICK_BACK
