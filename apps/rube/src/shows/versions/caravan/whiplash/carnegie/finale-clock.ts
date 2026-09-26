import { BREAK, BURST, FINAL, LAST_CHORD } from '../music'

/**
 * The finale's clock (503.995 → the end), in show seconds: what the finale's lane, its drummer's frame
 * (`finale-rig.ts`), the hall (the roll on the snare, the choked cymbals) and the conductor all keep to.
 *
 * - 504.0 the burst: he lands on the snare. Alone on the kit through the kick drum's march while the metronome sinks.
 * - The drummer's frame (the solo's) comes down out of the flies again; he leaps into its cup and it plays.
 * - The long roll: both sticks on the snare, too fast to count. Fletcher comes to the kit; the nod.
 * - The last fill round the kit; the last stroke; the sticks held up through the silence.
 * - The band's last chord: everything at once. Held, a cymbal roll under it. The fist: the last stroke, and stop.
 */

/** The frame flies in (out of the flies as the metronome goes down into the stage), and is in place, hanging limp. */
export const F_FLY: [number, number] = [507.55, 509.95]
/** He leaps from the snare up into its cup on a big kick, and lands as the arms take up the march. */
export const F_LEAP = 510.34
export const F_SEATED = 510.97
/** The long roll: from the march's last big kick to the last fill. */
export const ROLL: [number, number] = [518.8, 534.86]
/** The last stroke before the silence: the sticks come up off it and are held there, high, until the chord. */
export const STICKS_UP = BREAK
/** The band's last chord, and the cut-off. */
export const CHORD_HIT = LAST_CHORD
export const CUT = FINAL
export const BEGIN = BURST

/** Whether the snare is being rolled on at `T` (the hall draws its head trembling; nothing is struck). */
export const rolling = (T: number): boolean => T > ROLL[0] && T < ROLL[1]
