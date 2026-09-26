import type { Pt } from '../../../../../parts'
import { box, part, route, type Way } from '../kit'
import { CREDITS_AT, DURATION, LAST } from '../music'
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
  (slot) => {
    // Home's frame is the loft's cells less `HOME_AT`: `w(x, y)` is a point of the loft.
    const w = (x: number, y: number): Pt => [x - HOME_AT[0], y - HOME_AT[1]]
    return [
      // Out of the fire it follows the leap, drawing back.
      { t: slot.begin + 0.3, cells: 6 },
      // The two-shot for the two chords: the candle up and left, the stove and the cat under it, the floor in. Low
      // enough to see the cat wake and look up at the candle; high enough that Zoom keeps the wick in.
      { t: LAST[0] - 0.05, cells: 14.8, hold: w(2.0, 4.3), w: 0.92 },
      { t: LAST[1] + 1.8, cells: 14.9, hold: w(1.9, 4.25), w: 1 },
      // The cat settles; the camera draws back to the whole loft in the dark, the candle its one warm light, with the
      // dark of the roof above it for the credits, and the room's east end just out of frame.
      { t: CREDITS_AT + 2.2, cells: 20.6, hold: w(-2.6, 1.7), w: 1 },
      { t: DURATION, cells: 22.4, hold: w(-4.3, 1.0), w: 1 },
    ]
  },
)
