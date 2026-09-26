import { CODA, DOORS, FESTIVAL, ROLL, SILENCE, strongEighths } from '../music'
import { stub } from '../stub'

/**
 * FIREWORKS's part (a stub until built): the festival, from `FESTIVAL` (phrase 16) to the first door home
 * (`DOORS.back[0]`, in the roll). The spark lands in the fireworks field by the river, runs the quick-match along the
 * racks lighting them (the last two phrases, 188 to 198 bpm), and the whole finale goes up on the coda's 23 chords
 * (`CODA`): the crash. In the silence (`SILENCE`) the smoke drifts and the spark lies in the ash, all but out. On the
 * roll (`ROLL`) it flares, and darts up and left into a fire: the way home. Laid at the express's exit, in the same
 * world.
 */

/** The strikes (show seconds). A stub's guess: the last two phrases' backbeats, every coda chord, and the roll. Replace with yours. */
export const FIREWORKS_HITS: number[] = [
  ...strongEighths(FESTIVAL + 0.1, CODA[0].t - 0.2, 1.9).map((e) => e.t),
  ...CODA.map((c) => c.t),
  ROLL,
].filter((t) => t < DOORS.back[0] - 0.02 && !(t > SILENCE && t < ROLL))

export const fireworks = stub('fireworks', { exit: [16, -2], hits: FIREWORKS_HITS, cells: 8, lift: 0.5 })
