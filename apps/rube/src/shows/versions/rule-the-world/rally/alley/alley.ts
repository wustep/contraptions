import type { Pt } from '../../../../../parts'
import { box, frame, part, scenery, type PartShot } from '../kit'
import type { Pen } from '../pen'
import { SEAMS } from '../seams'
import { drawAlley, drawSet } from './draw'
import { ALLEY_STRIKES, HATS, LANE_LAND, POP, SEAT, T0, T1, WAY } from './geo'

/**
 * The bowling alley in Queens after midnight (121.018 → 138.142, bars 57 to 64), as the band drops out and the synth
 * plays alone over the shuffle. He comes in at the glass door behind Wally, bounces up off the ball rack into the pan
 * of his own sprung bat, clamped to the end of the table-tennis table in the back, and the hustle starts: he gives the
 * first point away (a limp, wobbling pop into the net), the marks laugh and the bet goes up, and then he plays for
 * real, every beat a bat and every "a" the table. The winner skims the net, beats the mark's late swing, drops onto
 * the near lane and runs down it into the pins: a strike. The marks' hats come off; Wally grins and pockets the cash
 * on his way out; the ball return brings Marty back under the lanes and pops him out of the rack, out of the door,
 * over the cab's nose and onto its back seat, as Wally drops in at the wheel and the headlights come on.
 *
 * See `geo.ts` for the clock and the ground, `draw.ts` for the drawing.
 */

export const ALLEY_AT: Pt = [0, 0]
export const ALLEY_CELLS = box(-30, -12, 30, 8, 2)

const penOf = (p: Parameters<typeof frame>[0], k: number, ink: string, w: number): Pen => ({ p, k, ink, w, tone: (h) => h })

/** The street, the room, the lanes and the floor in section: drawn first, on show time. */
export const alleySet = scenery<null>({
  name: 'alley-set',
  draw: (p, _s, c) => {
    const pen = penOf(p, c.k, c.ink, c.weight)
    p.push()
    drawSet(pen, c.t, frame(p, c.k))
    p.pop()
  },
})

interface AlleyState {
  begin: number
}

/** The hustle: from the door to the back table, the given point, the real one, the strike, and out to the cab. */
export const hustle = part<AlleyState>(
  {
    name: 'hustle',
    dynamic: true,
    draw: (p, s, c) => {
      const pen = penOf(p, c.k, c.ink, c.weight)
      p.push()
      drawAlley(pen, s.begin + c.t)
      p.pop()
    },
  },
  (slot) => ({
    cells: box(-12, -8, 24, 4),
    exit: [SEAT[0] + 0.5, SEAT[1]] as Pt,
    lane: { segs: WAY.segs, fire: LANE_LAND - slot.begin },
    state: { begin: slot.begin },
  }),
  () => shots(),
)

/**
 * The camera: on the cut, held where the hotel left him, just inside the door; out to the whole table in the back,
 * the players and the bettors in it, the lanes below; a little in on the given point; out again for the real rally,
 * held; after the winner down the lane, and held on the pins for the strike; a cut back to the marks as their hats come
 * off, while he shoots back under the floor; on the pop out of the rack, a cut to the door; and after him to the cab, to the seam's framing on the back seat.
 */
function shots(): PartShot[] {
  const hold = (t: number, cells: number, at: Pt, cut = false): PartShot => ({ t, cells, hold: at, w: 1, ...(cut ? { cut } : {}) })
  const seam = SEAMS.jersey
  const MASTER: Pt = [5.85, -2.2]
  return [
    hold(T0 + 2.9, 8.4, MASTER),
    hold(125.2, 8.4, MASTER),
    hold(126.0, 7.0, [4.7, -2.35]),
    hold(127.0, 7.0, [4.7, -2.35]),
    hold(127.9, 8.4, MASTER),
    hold(133.35, 8.4, MASTER),
    hold(134.42, 6.8, [12.2, -1.2]),
    hold(134.93, 6.2, [17.3, -1.15]),
    hold(135.4, 6.0, [17.5, -1.15]),
    hold(HATS, 6.8, [4.3, -2.35], true),
    hold(POP - 0.05, 6.6, [4.2, -2.3]),
    hold(POP, 6.2, [-0.75, -1.0], true),
    hold(137.15, 4.4, [-5.0, -1.05]),
    hold(T1, seam.cells, [SEAT[0] + seam.frame[0], SEAT[1] + seam.frame[1]]),
  ]
}

export const ALLEY_HITS: readonly number[] = ALLEY_STRIKES

/** The ride back under the floor, through the cut to the marks: too quick for any camera to keep him. */
export const ALLEY_WIDE: [number, number][] = [[135.36, POP]]
