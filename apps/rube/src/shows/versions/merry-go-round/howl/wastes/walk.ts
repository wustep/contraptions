import { FLOOR, type Pt, type Seg } from '../../../../../parts'
import { box, part, type PartShot } from '../kit'
import { SEAM } from '../music'
import { G } from '../physics'
import { CASTLE, drawCastle } from './castle'
import { laneThrough, TURNIP_TO_WALK } from './hills'
import { drawFog, drawPlume, drawTurnipAt } from './hills-land'
import {
  ABOARD_KEYS, castleAt, CATCH, CLIMB, DROP, HILLTOP, LAST, LATCH, onCastle, ROAR, SETTLE, sophieAboard, TAKEOFF,
  TURNIP_LANDINGS, W, WIDE,
} from './walk-plan'

/**
 * The castle walking (121.15 → 151.998): the castle builder's. The castle comes up out of the fog over the hill she
 * stands on, a footfall on every downbeat of the waltz, steam from its knees and dust from its feet; its body
 * passes over her and a great foot swings over her head. On bar 66 its stair drops out of the porch, section after
 * section, and swings; on bar 68 she jumps for its foot as it comes by, and climbs, a hop a beat, tread to tread,
 * onto the porch. On bar 71 Calcifer roars: fire out of the chimney, two bursts of black smoke, and the castle
 * lurches and lengthens its stride; Turnip Head, who hopped after it, falls behind. Big strides across the wastes
 * into the dusk (131.4, 133.7, 135.9 the loudest), the stair wound up; night comes, the windows light one by one.
 * It slows, and on the waltz's last note (148.8) it sits down on its folded legs. In the stop the door's latch
 * lifts, a crack of firelight; on the pickup (151.5) it swings wide, and on the flow's first note she is over the
 * threshold, walking in.
 *
 * The frame's origin is the hills part's exit (`HILLTOP` plus half a cell); everything is worked out in the
 * wastes' own cells (`walk-plan.ts`) and moved.
 */

/** This part's origin in the wastes' cells. */
const O: Pt = [HILLTOP[0] + 0.5, HILLTOP[1]]
const w = (p: Pt): Pt => [p[0] - O[0], p[1] - O[1]]

/** The first and last footfall it strikes (bars 65 → 88). */
const FEET = Array.from({ length: 24 }, (_, i) => W(65 + i))

export const walk = part<null>(
  {
    name: 'walk',
    draw: (p, _s, c) => {
      const T = SEAM.walk + c.t
      const { k } = c
      p.push()
      p.translate(-O[0] * k, -O[1] * k)
      const cs = castleAt(T)
      if ((cs.pose.haze ?? 0) < 0.985) {
        p.push()
        p.translate(cs.at[0] * k, cs.at[1] * k)
        drawCastle(p, k, c.weight, c.ink, cs.pose)
        p.pop()
        drawPlume(p, k, T)
      }
      drawFog(p, k, T)
      if (T >= TURNIP_TO_WALK) drawTurnipAt(p, k, c.weight, c.ink, T)
      p.pop()
    },
  },
  (slot) => {
    const start: Pt = [-0.5, 0]
    const onPlate = w(sophieAboard(CATCH))
    const T = CATCH - TAKEOFF
    const segs: Seg[] = [
      { from: start, to: start, dur: TAKEOFF - slot.begin },
      { from: start, to: onPlate, dur: T, arc: (G * T * T) / 8 },
      ...laneThrough(sophieAboard, ABOARD_KEYS, CATCH, slot.end, O),
    ]
    const end = w(sophieAboard(slot.end))
    return {
      cells: box(-52 - O[0], -36 - O[1], 132 - O[0], 8 - O[1], 2),
      exit: [end[0] + 0.5, end[1]] as Pt,
      lane: { segs, fire: CATCH - slot.begin },
      state: null,
    }
  },
  (slot): PartShot[] => {
    const at = (T: number, dx: number, dy: number): Pt => {
      const her = sophieAboard(T)
      return w([her[0] + dx, her[1] + dy])
    }
    const door = (T: number, dx: number, dy: number): Pt => {
      const [x, y] = onCastle(T, CASTLE.door)
      return w([x + dx, y - FLOOR + dy])
    }
    // Where the camera waits for the strides (the castle crosses it on the loudest), and for the stop.
    const mid = castleAt(W(76)).at
    const cross = w([mid[0] - 1.5, mid[1] - 10.2])
    const stop = castleAt(LAST).at
    const rest = w([stop[0] - 1.5, stop[1] - 10.4])
    return [
      // The castle over her on the hill, its stair dropping; in on her as she jumps for it and climbs.
      { t: DROP, cells: 27, hold: w([HILLTOP[0] - 1.6, -8.0]) },
      { t: 123.5, cells: 15, hold: w([HILLTOP[0] + 0.5, -4.6]) },
      { t: CATCH, cells: 10.5, hold: w([HILLTOP[0] + 1.1, -2.9]) },
      { t: CLIMB[2] + 0.2, cells: 10, off: [1.2, -1.6] },
      { t: CLIMB[5], cells: 13, off: [1.8, -3.2] },
      // Out for the roar. Then locked off wide: the castle strides across the frame past the thorn tree on the three
      // great strides, a silhouette on the dusk; the camera takes it up again into the night, and waits for it where
      // it will stop, so it walks into the picture and sits down.
      { t: ROAR[0], cells: 26, off: [3.5, -6.9] },
      { t: 129.6, cells: 31, off: [4.6, -8.6] },
      { t: 130.9, cells: 33, hold: cross },
      { t: 136.3, cells: 33, hold: cross },
      { t: 142.2, cells: 29, hold: rest },
      { t: LAST, cells: 26, hold: [rest[0] + 0.6, rest[1] + 0.9] },
      // It sits; in on the door.
      { t: SETTLE + 0.1, cells: 15, hold: door(SETTLE + 0.1, 0.4, -2.6) },
      { t: LATCH, cells: 6.4, hold: door(LATCH, 0.1, -0.95) },
      { t: slot.end, cells: 4, hold: at(slot.end, 0.9, -0.7) },
    ]
  },
)

/**
 * Every strike of this part, in show seconds: every footfall from bar 65 to 88, the stair's drop, her jump onto it
 * and her climb, the roar, Turnip Head's landings behind it, the belly on the ground, the latch and the door.
 */
export const WALK_HITS: number[] = [...new Set([...FEET, DROP, TAKEOFF, CATCH, ...CLIMB, ...ROAR, ...TURNIP_LANDINGS.filter((t) => t > SEAM.walk), SETTLE, LATCH, WIDE])].sort((a, b) => a - b)
