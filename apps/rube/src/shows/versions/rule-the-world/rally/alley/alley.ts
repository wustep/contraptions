import type { Pt } from '../../../../../parts'
import { box, frame, part, scenery, type PartShot } from '../kit'
import type { Pen } from '../pen'
import { SEAMS } from '../seams'
import { drawAlley, drawSet } from './draw'
import { ALLEY_STRIKES, CURB_KICK, HATS, HITS, LANE_LAND, POP, RAISE, SEAT, SMASH, STRIKE, T0, T1, TAPS, WAY, WINNER } from './geo'

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
      drawAlley(pen, s.begin + c.t, frame(p, c.k))
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
 * the players and the bettors in it, the lanes below; a little in on the given point; on the raise, a cut to the
 * money, slapped into Wally's palm; then the real rally cut the way a fight is, on its strikes: the table, leaning to
 * whoever is striking; in tight on Marty's bat as the mark's push comes in and goes back out hard; the table again for
 * the lob and the smash; in tight on the mark, driven back and stretched out low for the one that kicks away; the table
 * for the winner. After the winner down the lane, and held on the pins for the strike; a cut back to the marks as their
 * hats come off, while he shoots back under the floor; on the pop out of the rack, a cut to the door; and after him to
 * the cab, to the seam's framing on the back seat.
 */
function shots(): PartShot[] {
  const hold = (t: number, cells: number, at: Pt, cut = false): PartShot => ({ t, cells, hold: at, w: 1, ...(cut ? { cut } : {}) })
  const seam = SEAMS.jersey
  const MASTER: Pt = [5.85, -2.2]
  const TABLE = 6.4
  const marty: Pt = [5.7, -2.4]
  const mark: Pt = [6.3, -2.4]
  return [
    hold(T0 + 2.9, 8.4, MASTER),
    hold(125.2, 8.4, MASTER),
    hold(126.0, 7.0, [4.7, -2.35]),
    hold(RAISE - 0.2, 7.0, [4.7, -2.35]),
    // The money.
    hold(RAISE, 4.2, [0.75, -2.6], true),
    hold(TAPS[1] - 0.02, 4.0, [0.8, -2.62]),
    // The rally.
    hold(TAPS[1], TABLE, [5.8, -2.4], true),
    hold(HITS[0], TABLE, marty),
    hold(HITS[1], 4.0, [3.4, -2.45], true),
    hold(HITS[2], 3.9, [3.45, -2.45]),
    hold(HITS[3], 6.6, [6.1, -2.6], true),
    hold(HITS[4], 6.2, marty),
    hold(HITS[5], 6.2, mark),
    hold(HITS[6], 4.2, [9.25, -2.7], true),
    hold(HITS[7], 4.1, [9.4, -2.62]),
    hold(HITS[8], TABLE, marty, true),
    hold(HITS[9], 6.2, mark),
    hold(WINNER, 6.0, [5.6, -2.35]),
    hold(134.42, 6.8, [12.2, -1.2]),
    hold(134.93, 6.2, [17.3, -1.15]),
    hold(135.4, 6.0, [17.5, -1.15]),
    hold(HATS, 6.8, [4.3, -2.35], true),
    hold(POP - 0.05, 6.6, [4.2, -2.3]),
    hold(POP, 6.2, [-0.75, -1.0], true),
    hold(136.6, 5.6, [-3.6, -0.7]),
    hold(CURB_KICK, 4.8, [-7.2, -0.75]),
    hold(T1, seam.cells, [SEAT[0] + seam.frame[0], SEAT[1] + seam.frame[1]]),
  ]
}

export const ALLEY_HITS: readonly number[] = ALLEY_STRIKES

/**
 * Where he may be out of the Zoom frame: the rally's two tight shots, each from the strike it cuts on to the cut away
 * (he flies in and out of them), and the ride back under the floor, through the cut to the marks: too quick for any
 * camera to keep him.
 */
export const ALLEY_WIDE: [number, number][] = [[HITS[1], HITS[3]], [HITS[6], HITS[8]], [135.36, POP]]

/** The camera's punches in on this place's big moments (`score.ts`): the smash, the winner, the strike. */
export const ALLEY_PUNCHES: [number, number][] = [
  [SMASH, 0.45],
  [WINNER, 0.6],
  [STRIKE, 0.7],
]
