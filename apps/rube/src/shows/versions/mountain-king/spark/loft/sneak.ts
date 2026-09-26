import type { Pt } from '../../../../../parts'
import { box, part } from '../kit'
import { LOFT_SEAM } from '../music'
import { HANDOFF } from './layout'
import { sneakOver } from './sneak-draw'
import { HITS, SHOTS, buildLane } from './sneak-plan'

/**
 * LOFT-A's part: the sneak, from the first frame to phrase 3 (`LOFT_SEAM`). The spark slips off its wick while the
 * cat sleeps and creeps west along the bench and the drying rack, touching nothing that burns. Laid at [0, 0], so its
 * frame is the loft's world cells: its entry (-0.5, 0) is the wick (`WICK`), and its lane ends at `HANDOFF`.
 *
 * The machines are drawn inside the room, before its light (`sneak-draw.ts` adds itself to `ROOM_LAYERS`), so the
 * spark's warm pool and the moon fall on them as on the walls. This part only draws what stands in front of the spark
 * while it sits in something (the lips of the pans, the socket), and builds the lane (`sneak-plan.ts`).
 *
 *   0-4.36     the horns: the loft wide, the candle burning, the cat asleep by the stove; in on the candle
 *   6.706      off the wick into the pan lift; let down a notch a note (7.28 .. 9.56), set on the bench (10.12)
 *   10.69      out onto the bench; two tiptoes; over a hank of wick (12.351)
 *   13.470     up into the balance's pan; the beam sinks; its far end trips the snuffer's latch (14.583)
 *   15.699     the snuffer's cone claps down on the other pan and flings the spark up onto the rack's pole (16.816)
 *   17-30      the tightrope across the pairs of hanging candles, a hop a figure
 *   25.653     a pair it jostled knocks together: the cat's ear flicks, the spark freezes. 28.961: again
 *   30.012     into the dish of a counterweighted candle arm, which sinks under it; 31.185 off onto the dipping wheel
 */

/** The strikes (show seconds): every landing, notch, trip, clang and knock. */
export const SNEAK_HITS: number[] = HITS

/** Where the next part's entry is: its lane ends at `HANDOFF`. */
const EXIT: Pt = [HANDOFF[0] + 0.5, HANDOFF[1]]

export const sneak = part<null>(
  {
    name: 'loft-sneak',
    draw: () => {},
    over: (p, _s, c) => sneakOver(p, c.k, c.ink, c.weight, c.t),
  },
  (slot) => {
    const { segs, fire } = buildLane()
    return {
      cells: box(-18, -2, 1, 3),
      exit: EXIT,
      lane: { segs, fire: fire - slot.begin },
      state: null,
    }
  },
  () => SHOTS.filter((s) => s.t <= LOFT_SEAM + 1e-6),
)
