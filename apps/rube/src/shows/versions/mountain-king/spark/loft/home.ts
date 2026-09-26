import type { Pt } from '../../../../../parts'
import { box, carried, part, route, type Way } from '../kit'
import { CREDITS_AT, DURATION, LAST } from '../music'
import { homeLeapAt } from '../seams'
import { FIRE_MOUTH, WICK } from './layout'

/**
 * The director's: home. The spark bursts out of the loft stove's firebox door at the last return door
 * (`DOORS.back[2]`) and leaps up and left over the bench's end, settling onto its wick on the first last chord
 * (`LAST[0]`): quick out of the fire, slow onto the wick (`homeLeapAt` in `seams.ts`). On the second
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
    // The leap, sampled from the curve (in this leg's frame: the loft's cells less `HOME_AT`).
    const segs = carried((u) => {
      const [x, y] = homeLeapAt(u / leap)
      return [x - HOME_AT[0], y - HOME_AT[1]]
    }, 0, leap, 70)
    // A candle's flame on its wick: the landing settles in a small damped bob, then it is still.
    const ways: Way[] = [{ at: leap, p: ON_WICK }]
    const bob: [number, number][] = [
      [0.08, 0.04],
      [0.2, -0.012],
      [0.34, 0.006],
      [0.5, 0],
    ]
    for (const [dt, dy] of bob) ways.push({ at: leap + dt, p: [ON_WICK[0], ON_WICK[1] + dy], ease: 'inout' })
    ways.push({ at: DURATION - slot.begin, p: ON_WICK })
    segs.push(...route(ways))
    return {
      cells: box(ON_WICK[0] - 3, ON_WICK[1] - 3, 2, 2),
      exit: [ON_WICK[0] + 0.5, ON_WICK[1]],
      lane: { segs, fire: leap },
      state: null,
    }
  },
  (slot) => {
    // Home's frame is the loft's cells less `HOME_AT`: `w(x, y)` is a point of the loft.
    const w = (x: number, y: number): Pt => [x - HOME_AT[0], y - HOME_AT[1]]
    return [
      // One move, over the leap: from the dash's close frame (carried across the door, 4.4 cells) out to the two-shot,
      // the zoom quickest while the spark is in the air (about 2.3 log/s, even on both sides of the crest), so the eye
      // rides the spark and not the lens. The frame flies with it: up and left over the arc's top (this key is the arc's crest; the pull keeps going
      // through it), then down and out as it comes down onto the wick, so the spark sits near the same place on the
      // screen, about a third across and a fifth down, all the way (Zoom keeps it, 0.96 of its half-frame at most).
      { t: slot.begin + 0.39, cells: 9.0, hold: w(4.2, 2.0), w: 1 },
      // The move arrives and settles ON the first last chord, as the spark lands: a two-shot, wide and low enough that
      // both halves of the punchline are whole: the candle on the left with its flame well clear of the top (about 13%
      // down), the open firebox door in the middle, and the sleeping cat's head and shoulders on the floor below it (its
      // shut eye about four-fifths down), so its eye is seen to snap open on 149.815. As low as Zoom allows with the
      // spark in (Zoom's centre is the camera's, so it may sit no more than a third of the frame below the wick; this
      // is 0.32).
      { t: LAST[0], cells: 15.8, hold: w(1.5, 5.05), w: 1 },
      // Then all but still between the two chords (drifting out under 0.05 log/s), so each is a punch (the score's) on
      // a settled picture, and the bang lands on the same two-shot.
      { t: LAST[1], cells: 15.9, hold: w(1.5, 5.1), w: 1 },
      // Follow-through: over half a second the frame eases down a little as the cat's head comes up, so under Zoom
      // (which crops to its middle) the head rises into the bottom of the crop, whole, while the spark stays in at the
      // top; then a slow creep on out while it stares at the candle.
      { t: LAST[1] + 0.5, cells: 16.3, hold: w(1.3, 5.16), w: 1 },
      { t: LAST[1] + 2.45, cells: 16.5, hold: w(1.0, 5.2), w: 1 },
      // The cat tucks back in; the camera draws back to the whole loft in the dark for the credits, the candle its one
      // warm light, the dark of the roof above it for the cards.
      { t: CREDITS_AT + 1.4, cells: 21.5, hold: w(-3.4, 1.5), w: 1 },
      // Then one slow creep through the credits toward the candle (a steady 2% closer a second, so the room is never
      // still), ending on it a little above the middle, under the cards, the stove's glow beside it and the cat asleep
      // just below the frame.
      { t: CREDITS_AT + 3.0, cells: 20.6, hold: w(-2.9, 1.55), w: 1 },
      { t: DURATION - 2, cells: 13.0, hold: w(1.0, 2.0), w: 1 },
      { t: DURATION, cells: 12.6, hold: w(1.2, 2.0), w: 1 },
    ]
  },
)
