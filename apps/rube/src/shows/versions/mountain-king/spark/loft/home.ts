import type { Pt } from '../../../../../parts'
import { box, part, route, type Way } from '../kit'
import { DURATION, LAST } from '../music'
import { G } from '../physics'
import { FIRE_MOUTH, WICK } from './layout'

/**
 * The director's: home. The spark bursts out of the loft stove's firebox door at the last return door
 * (`DOORS.back[2]`) and leaps up and left onto its wick, landing on the first last chord (`LAST[0]`). On the second
 * (`LAST[1]`) the firebox door bangs shut behind it (`hearth.ts`) and the cat wakes. Then it burns on its wick, a
 * candle's flame, through the credits. The leg is laid with its entry (-0.5, 0) at `FIRE_MOUTH`.
 */

/** The home leg's entry cell in the loft's world cells: the fire's mouth. */
export const HOME_AT: Pt = [FIRE_MOUTH[0] + 0.5, FIRE_MOUTH[1]]

/** The strikes: onto the wick on the first last chord; the door's bang on the second is the hearth's, on the spark's time. */
export const HOME_HITS: number[] = [LAST[0], LAST[1]]

/** Where the wick is from the leg's own frame. */
const ON_WICK: Pt = [-0.5 + WICK[0] - FIRE_MOUTH[0], WICK[1] - FIRE_MOUTH[1]]

export const home = part<null>(
  { name: 'loft-home', draw: () => {} },
  (slot) => {
    const leap = LAST[0] - slot.begin
    const ways: Way[] = [{ at: 0, p: [-0.5, 0] }]
    // The leap: a parabola under the loft's gravity, launched at `HOME_LEAP` (the seam's velocity) and landing on the wick.
    ways.push({ at: leap, p: ON_WICK, arc: (G * leap * leap) / 8 })
    // A candle's flame on its wick: the landing settles in a small damped bob, then it is still.
    const bob: [number, number][] = [
      [0.09, 0.05],
      [0.2, -0.018],
      [0.34, 0.01],
      [0.52, 0],
    ]
    for (const [dt, dy] of bob) ways.push({ at: leap + dt, p: [ON_WICK[0], ON_WICK[1] + dy], ease: 'inout' })
    ways.push({ at: DURATION - slot.begin, p: ON_WICK })
    return {
      cells: box(ON_WICK[0] - 3, ON_WICK[1] - 3, 2, 2),
      exit: [ON_WICK[0] + 0.5, ON_WICK[1]],
      lane: { segs: route(ways), fire: leap },
      state: null,
    }
  },
  (slot) => [
    // Out of the fire it follows the leap, drawing back.
    { t: slot.begin + 0.3, cells: 6 },
    // Out of the fire the camera draws back to hold the candle, the stove door and the cat in one frame for the two
    // chords (the frame's point is between them: the wick is at ON_WICK, the cat about [-2, 6], in this frame).
    { t: LAST[0] - 0.05, cells: 14, hold: [-4, 0.4], w: 0.9 },
    { t: LAST[1] + 1.5, cells: 14.3, hold: [-4, 0.4], w: 1 },
    // The credits: the loft, dark, the candle and the sleeping cat small in the lower part, drawing back very slowly.
    { t: DURATION, cells: 15.5, hold: [-4, -0.2], w: 1 },
  ],
)
