import type { Pt } from '../../../../../parts'
import { box, part, type PartShot } from '../kit'
import { FIX, H_BACK, H_WALK, KNOCK, LET_GO } from './conductor'
import { DOWN, H_SEATED, H_UNSEAT, HUSH_HITS, HUSH_KIT, SETTLE } from './hush-score'
import { Path, RACK_SEAT, SNARE_SEAT } from './path'
import { headAt } from './solo-rig'
import { CLOSE, JIM_WINGS, KIT_AT } from './stage'

/**
 * Carnegie Hall, the hush (323.27 → 369.98): the solo drops to soft cymbals, with bursts. The director's.
 *
 * The film's moment: Andrew knocks a cymbal loose, and Fletcher, who a minute ago was trying to destroy him, steps
 * to the kit and sets it straight, and looks at him. Here the solo's drummer's frame does not fly out: it hangs limp
 * over the kit, and the hush is played on it, soft.
 *
 * - He comes down out of the solo onto the snare and plays soft there alone, under the frame hanging limp; on a firm
 *   stroke (327.35) he leaps back up into its cup, and as he lands the frame wakes and its right stick knocks the
 *   crash askew (327.84).
 * - The hush's pulse: the right arm on the hi-hat, its elbow tucked under, while Fletcher comes down off the podium,
 *   crosses, rises on his column and sets the crash straight with one hand (on the stroke at 337.63); a look,
 *   close, the two heads either side of the crash; he goes back.
 * - The bursts: both arms round the kit, the crash again (it holds now).
 * - The ride's soft pulse on the left arm, and a slow move across the stage to his father at the stage door, the
 *   frame and his son small in their pool beyond him; back to the kit.
 * - Out of the cup on the ride's last stroke, down onto the rack tom and the snare for the build; the frame goes limp
 *   and flies out as the build's engine rises.
 *
 * The score is `hush-score.ts` (the frame's drawing reads it too); the frame is `solo-rig.ts`, drawn by the solo's
 * part (all Carnegie parts share one frame). Fletcher and the crash's tilt keep the conductor's clock.
 */

export { HUSH_HITS, HUSH_KIT }

/** A point of the kit's frame in the part's. */
const at = (p: Pt): Pt => [KIT_AT[0] + p[0], KIT_AT[1] + p[1]]
/** His head in the frame's cup, in the part's frame. */
const cup = (T: number): Pt => at(headAt(T))

/* ------------------------------------------------------------------ the lane */

function lane(begin: number, end: number): Path {
  const path = new Path(begin, SNARE_SEAT)
  // Soft on the snare: a small bounce a stroke.
  for (const l of SETTLE) path.hop(SNARE_SEAT, l.t, 12, 0, l.lift ?? 0.12)
  // The leap: up off the snare into the cup, a real throw that tops out just over it and drops in on the knock.
  path.hop(cup(H_SEATED), H_SEATED, 22, 0.95)
  // Riding the frame through the hush: his head, sampled sixty times a second.
  path.ride(cup, H_UNSEAT)
  // Out of the cup on the ride's last stroke: a small pop up, and down onto the rack tom; the snare for the build.
  path.fall(RACK_SEAT, DOWN, 12)
  path.hop(SNARE_SEAT, end, 12, 0.2, 0.4)
  return path
}

/* ------------------------------------------------------------------ the camera */

/** Jim at the stage door, in the part's frame (his ball sits on the floor). */
const JIM: Pt = JIM_WINGS

function shots(slot: { begin: number; end: number }): PartShot[] {
  const k = (t: number, cells: number, hold: Pt, w = 1): PartShot => ({ t, cells, hold, w })
  return [
    { t: slot.begin, cells: CLOSE.cells, hold: CLOSE.hold, w: 1 },
    // Up from the snare to take in the frame hanging over it, and the cup he leaps for; the knock.
    k(325.4, 5.2, [-0.9, -1.35]),
    k(KNOCK, 5.4, [-0.6, -1.7]),
    k(330.2, 5.0, [-0.3, -1.75]),
    // Back to see Fletcher come down off his podium and across; in on the hand on the crash, and the two heads
    // either side of it.
    k(H_WALK[0] + 1.6, 8.4, [1.9, -1.55]),
    k(H_WALK[1] + 0.4, 5.8, [0.5, -1.95]),
    k(FIX[0] + 0.5, 4.5, [0.25, -2.2]),
    k(LET_GO + 0.9, 4.1, [0.2, -2.15]),
    // He goes back; the bursts round the kit, both arms, his head over them at the top of the frame. In close on the
    // rack tom and the snare, along to the floor tom; out on the crash (it holds now), with Fletcher back on his
    // podium watching; in again on the snare, a breath wider, and close for its little roll.
    k(H_BACK[0] + 1.2, 6.2, [0.7, -1.4]),
    k(344.7, 3.5, [-1.2, -1.25], 0.6),
    k(346.8, 3.6, [-2.0, -1.1], 0.6),
    k(348.95, 6.4, [0.9, -1.5], 0.7),
    k(351.6, 3.5, [-0.8, -1.25], 0.6),
    k(354.0, 4.6, [-1.3, -1.2], 0.55),
    k(356.1, 3.3, [-0.9, -1.25]),
    // To the ride; then across the stage to his father at the stage door, alone in the wings' light under its lit
    // window (the solo's and the build's looks at him are closer, and keep the window out),
    // leaning toward the stage (`conductor.ts` `jimAt`, `hall.ts` `jimLit`); and out from him across the whole width
    // of the stage to his son, small in the frame in their pool at the right: the look from father to son. Back to
    // the kit for the ride's last stroke.
    k(357.9, 5.4, [-2.1, -1.4]),
    k(358.9, 5.3, [-2.45, -1.3]),
    k(361.0, 3.9, [JIM[0] - 0.1, JIM[1] - 1.7]),
    k(362.6, 3.75, [JIM[0] + 0.0, JIM[1] - 1.7]),
    k(364.8, 6.5, [(JIM[0] + KIT_AT[0] - 0.8) / 2 - 0.15, -0.3]),
    k(366.0, 6.4, [(JIM[0] + KIT_AT[0] - 0.8) / 2 + 0.05, -0.35]),
    k(367.4, 5.6, [-2.0, -1.2]),
    k(368.6, 5.2, [-1.1, -1.35]),
    { t: slot.end, cells: CLOSE.cells, hold: CLOSE.hold, w: 1 },
  ]
}

export const hush = part<{ begin: number }>(
  { name: 'hush', draw: () => {} },
  (slot) => {
    const path = lane(slot.begin, slot.end)
    // The lane in slot seconds, ending exactly on the snare.
    const segs = path.segs
    segs[segs.length - 1] = { ...segs[segs.length - 1], to: SNARE_SEAT }
    return {
      cells: box(-5, -3, 3, 3),
      exit: [0, 0] as Pt,
      lane: { segs, fire: SETTLE[0].t - slot.begin },
      state: { begin: slot.begin },
    }
  },
  shots,
)
