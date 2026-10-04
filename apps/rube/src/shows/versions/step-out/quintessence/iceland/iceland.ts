import type { Pt } from '../../../../../parts'
import { box, carried, frame, part, scenery, type PartShot } from '../kit'
import { WALTER_WARM } from '../worlds'
import { SEAMS } from '../seams'
import {
  ABOARD,
  APEX,
  BIKE_CRESTS,
  BOARD_DOWN,
  CRASH,
  CRESTS,
  ERUPT,
  FINAL,
  FLAKES,
  HOP,
  LANDS,
  LEFT_X,
  RIGHT_X,
  POSTS,
  SADDLE,
  STOPS,
  STRETCH,
  walter,
  walterSpin,
} from './geo'
import { drawAsh, drawBike, drawBirds, drawBoard, drawCarves, drawHaze, drawKids, drawLanding, drawPlane, drawPosts, drawSign } from './props'
import type { Pen } from './pen'
import { drawSet } from './set'

/**
 * Iceland (95.226 → 133.278, bars 52 to 74): the film's own Step Out. A bicycle at the top of a road; the ride down
 * the ridge; the sign; the trade with three kids, a stretchy toy for a longboard; the long road down the mountain's
 * face in four hairpins to the fjord, a crest and a turn on every downbeat and a post going by on every beat; the
 * volcano on the band's last hit; then the hush: the plume climbing, a small plane flying into it, Walter rolling to a
 * stop on the shore road, and the ash coming down on him. See `geo.ts` for the clock and the ground, `set.ts` for the
 * place, `props.ts` for what is in it.
 *
 * The frame's origin is the place's (ICELAND_AT is [0, 0]): the set and the part draw in the same cells.
 */

export const ICELAND_AT: Pt = [0, 0]
export const ICELAND_CELLS = box(-16, -12, 48, 16, 2)

export const icelandSet = scenery<null>({
  name: 'iceland-set',
  draw: (p, _s, c) => drawSet({ p, k: c.k, ink: c.ink, w: c.weight }, c.t, frame(p, c.k)),
})

/** Every strike, in order. */
export const ICELAND_HITS: readonly number[] = [
  // Off the road onto the saddle; over the ridge's crests; into the sign; down past it.
  HOP,
  SADDLE,
  ...BIKE_CRESTS,
  CRASH,
  LANDS,
  // The trade.
  STRETCH,
  BOARD_DOWN,
  ABOARD,
  // The posts going by, the crests and the turns, all the way down.
  ...POSTS.map((q) => q.t),
  ...CRESTS,
  ...APEX,
  // The volcano, and the ash on the guitar's soft onsets.
  ERUPT,
  ...FLAKES.map((f) => f.t),
]
  .filter((t, i, all) => all.findIndex((u) => Math.abs(u - t) < 1e-6) === i)
  .sort((a, b) => a - b)

/** The one wide: the long road down the mountain's face, the fjord below and the volcano across it (bars 61 to 64). */
const WIDE_IN = APEX[1] + 0.25
const WIDE_OUT = CRESTS[2] + 0.4
export const ICELAND_WIDE: [number, number][] = [[WIDE_IN, WIDE_OUT]]

interface IcelandState {
  begin: number
}

export const road = part<IcelandState>(
  {
    name: 'iceland-road',
    draw: (p, s, c) => {
      const t = s.begin + c.t
      const f = frame(p, c.k)
      const pen: Pen = { p, k: c.k, ink: c.ink, w: c.weight }
      p.push()
      drawBirds(pen, t, f)
      drawPlane(pen, t, f)
      drawPosts(pen, t, f)
      drawSign(pen, t)
      drawKids(pen, t)
      drawBike(pen, t)
      drawBoard(pen, t)
      drawCarves(pen, t)
      drawLanding(pen, t, false)
      p.pop()
    },
    over: (p, s, c) => {
      const t = s.begin + c.t
      const f = frame(p, c.k)
      const pen: Pen = { p, k: c.k, ink: c.ink, w: c.weight }
      p.push()
      drawLanding(pen, t, true)
      drawAsh(pen, t, f)
      drawHaze(pen, t, f)
      p.pop()
    },
  },
  (slot) => {
    const begin = slot.begin
    // Sixty pieces a second: the lane and the drawing read the same function, so he never slides off what carries him.
    const n = Math.round((slot.end - begin) * 60)
    const segs = carried(walter, begin, slot.end, n)
    // Exactly the slot, and exactly to its exit.
    segs[0].from = [-0.5, 0]
    segs[segs.length - 1].to = FINAL
    const exit: Pt = [FINAL[0] + 0.5, FINAL[1]]
    return {
      cells: ICELAND_CELLS,
      exit,
      lane: { segs, fire: CRASH - begin },
      state: { begin },
      // He is Life's red here, as he has been since Nuuk: said again, so the place holds it whatever comes before.
      changes: [{ at: 0, color: WALTER_WARM, over: 0 }],
      // On the saddle and on the board he does not roll: his mark looks where he is going.
      riders: (t, hero) => [{ ...hero, spin: walterSpin(t) }],
    }
  },
  (slot) => shotsFor(slot.begin, slot.end),
)

/**
 * The camera: from the seam's framing, with him as he sets off along the ridge, the sky and the far range over it;
 * holding on the sign and the kids for the trade; with him again, a little ahead, as he goes; drawn right back off
 * the mountain's face for the Step Out moment (the wide), the road below him in its hairpins and the volcano across
 * the fjord; in with him for the last turns; and in the hush settling to hold him low on the left with the plume
 * climbing on the right, closing slowly to the seam's framing under the ash.
 */
function shotsFor(begin: number, end: number): PartShot[] {
  const follow = (t: number, cells: number, off: Pt): PartShot => ({ t, cells, off, w: 0 })
  const hold = (t: number, cells: number, at: Pt): PartShot => ({ t, cells, hold: at, w: 1 })
  const seam = SEAMS.home
  const at = (t: number) => walter(t)
  const trade = at(STRETCH)
  // The zigzag's middle, and a little to the right so the cliff and the valley beyond it are in.
  const WIDE_X = (LEFT_X + RIGHT_X) / 2 + 1.2
  return [
    hold(begin + 0.9, 3.7, [at(begin)[0] + 0.62, at(begin)[1] - 0.45]),
    follow(SADDLE + 1.6, 4.3, [0.95, -0.55]),
    follow(CRASH - 0.9, 4.5, [1.0, -0.6]),
    hold(LANDS + 0.2, 4.4, [trade[0] + 0.45, trade[1] - 0.6]),
    hold(BOARD_DOWN, 4.2, [trade[0] + 0.55, trade[1] - 0.55]),
    follow(APEX[0] - 0.4, 4.8, [0.95, -0.3]),
    follow(APEX[0] + 0.8, 5.1, [-0.95, -0.15]),
    // The wide: the mountain's face, the hairpins, the fjord, the volcano.
    hold(WIDE_IN + 1.7, 10.2, [WIDE_X, 4.3]),
    hold(WIDE_OUT - 1.7, 10.4, [WIDE_X, 4.6]),
    follow(WIDE_OUT, 5.4, [-0.9, -0.25]),
    follow(APEX[3] - 0.5, 5.2, [-0.5, -0.45]),
    follow(APEX[3] + 0.9, 5.4, [1.3, -0.6]),
    follow(ERUPT - 0.2, 5.6, [1.5, -0.75]),
    hold(STOPS - 0.4, 5.0, [FINAL[0] + 0.9, FINAL[1] - 0.75]),
    hold(end, seam.cells, [FINAL[0] + seam.frame[0], FINAL[1] + seam.frame[1]]),
  ]
}
