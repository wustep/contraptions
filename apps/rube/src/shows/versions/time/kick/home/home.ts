import type { Pt } from '../../../../../parts'
import { box, part, scenery, type PartShot } from '../kit'
import { drawHome, drawHomeOver } from './home-draw'
import { HOLD, KNOCK, LANE, MEET, OUT, SPIN, STOP_X, T0, TICKS, TOP_AT, TURN, kids, laneFor } from './home-plan'

/**
 * HOME: home, from the piano's first chord (244.187) to the end. The piano alone, a chord a bar, each struck clear.
 *
 * In at his own front door through the veil of morning, the door knocking against its stop as the veil clears; down
 * the hall to the kitchen table (his size, as the table in limbo is), where the top lies on its side at the end he
 * comes to; on the loudest chord (247.990) he comes up against the table under it, and it stands up spinning from
 * where he touched it. He does not wait to watch it: on past the table to the glass doors, and through them on the
 * next chord into the garden, where the children play on the lawn by the swing, their backs to him, dark against the
 * low sun, as he remembers them. On bar 67 they turn round, and the light comes round onto them: their own colours.
 * On bar 68 they come to him (a little space); on bar 69 they close it, and the camera leaves them, back in through the
 * doors to the table, and holds on the top, close, as it slows and begins to wobble: its tip catches on each chord. On
 * the last chord (274.617) the director's black cuts over it, still turning.
 *
 * The set draws everything (`home-draw.ts`) from show time; the numbers are in `home-plan.ts`.
 */

/** The house and garden are the home world's own cells, and the part's frame is the world's. */
export const HOME_AT: Pt = [0, 0]

export const homeSet = scenery<null>({
  name: 'home-set',
  draw: (p, _s, c) => drawHome(p, c),
  over: (p, _s, c) => drawHomeOver(p, c),
})

/** Everything the set draws: the porch to the far end of the garden, the roof's ridge to the soil under the lawn. */
export const HOME_CELLS: Pt[] = box(-8, -8, 30, 4, 2)

/** A framing held on a point of the house or the garden. */
const on = (t: number, cells: number, at: Pt): PartShot => ({ t, cells, hold: at, w: 1 })

export const home = part<null>(
  { name: 'home', draw: () => {} },
  (slot) => {
    const lane = Math.abs(slot.begin - T0) < 1e-9 ? LANE : laneFor(slot.begin, slot.end)
    return {
      cells: box(-1.5, -2, STOP_X + 3, 1),
      exit: [STOP_X + 0.5, 0],
      lane,
      state: null,
      riders: (t, hero) => [hero, ...kids(t)],
    }
  },
  () => [
    // From the door (the score opens on the seam's framing, following him in), down the hall to the table.
    on(T0 + 2.0, 3.35, [2.0, -0.7]),
    // The touch, close: the top standing up and spinning, him beside it.
    on(SPIN, 2.9, [3.1, -0.66]),
    // He goes at once, on past the table toward the doors, and the garden comes into view: the children on the lawn by
    // the swing, dark against the sun.
    on(SPIN + 1.7, 3.3, [4.35, -0.82]),
    on(OUT - 0.5, 4.4, [6.2, -1.15]),
    // Out onto the lawn with him, toward them.
    on(OUT + 1.9, 3.7, [7.55, -1.02]),
    // They turn: close on them, him at the edge of it. Held a little low on the lawn, so the tighter Zoom keeps them
    // clear of the frame's foot too.
    on(TURN, 2.95, [8.42, -0.7]),
    on(TURN + 1.9, 2.95, [8.12, -0.68]),
    // They come to him, and he and they are together: a slow push in on the three of them.
    on(MEET, 2.85, [7.86, -0.6]),
    on(HOLD, 2.55, [7.76, -0.55]),
    // The camera leaves them, back in through the glass doors to the table, and does not stop: from the first of the
    // top's chords it pushes in on it, slowly and all the way to the last chord, where the top fills a fifth of the
    // frame's height, a little below its middle.
    on(TICKS[0], 2.5, [TOP_AT[0] + 0.4, TOP_AT[1] - 0.44]),
    on(TICKS[1], 1.92, [TOP_AT[0] + 0.2, TOP_AT[1] - 0.37]),
    on(TICKS[2], 1.45, [TOP_AT[0] + 0.1, TOP_AT[1] - 0.3]),
  ],
)

/**
 * Every strike (show seconds, exact measured times): the chord of the cut (the front door swinging wide as he comes
 * in) and the door knocking against its stop on a soft note; the top set spinning on the loudest chord; the glass door
 * pushed open on bar 66 and knocking against the house on a soft note; the children turning on 67, coming to him on
 * 68 and the embrace on 69; the top's tip catching on 70 and 71; the last chord, and the black.
 */
export const HOME_HITS: number[] = [T0, KNOCK.front, SPIN, OUT, KNOCK.glass, TURN, MEET, HOLD, ...TICKS]
