import type { Pt, Seg } from '../../../../../parts'
import { box, carried, part, type PartShot } from '../kit'
import { SEAM } from '../music'
import { drawHedge, drawLand, drawTurnipAt } from './hills-land'
import { AT_POLE, HILLS_KEYS, HILLTOP, LANDS, POP, sophieHills, THUD, TUG, TURNIP_LANDINGS } from './walk-plan'

/**
 * Old Sophie up the hills (107.9 → 121.15): the castle builder's. She comes in on the cut walking slowly out of
 * town, old now, and stops at a hedge with a stick poking out of it at her height. She pulls: two tugs on the
 * swell's beats and a long strain, and on bar 56 it comes free. It is Turnip Head: the hedge throws him up over her
 * head, turning a whole somersault, and he lands on his foot behind her on bar 57, rocking on his pole. She turns
 * up the hill and he hops after her, a hop a bar (up on the one, down by the three). On bar 61 he stops, looks back
 * over his shoulder, and hops back the way they came, into a fog rolling up the lane. The ground shakes on bar 63:
 * she stops. Out of the fog behind her, huge and dim, something is walking (its eye lit); on bar 64 it thuds again,
 * closer, and she backs away from it up the knoll. The castle's own part (`walk.ts`) draws it; this part draws the
 * land, the hedge, and Turnip Head until he goes into the fog.
 *
 * The frame is the wastes' own: she comes in at (-0.5, 0) and ends at rest on the hilltop (`HILLTOP`), where the
 * walk takes her.
 */

/** Who draws Turnip Head: this part until he has gone back into the fog, then the walk (over the castle). */
export const TURNIP_TO_WALK = 116.6

const HZ = 60

/** A lane through timed keys, each piece `fn` sampled finely, so every change of motion is exactly on its key. */
export function laneThrough(fn: (T: number) => Pt, keys: number[], from: number, to: number, shift: Pt = [0, 0]): Seg[] {
  const ts = [from, ...keys.filter((t) => t > from + 1e-9 && t < to - 1e-9), to].sort((a, b) => a - b)
  const at = (T: number): Pt => {
    const [x, y] = fn(T)
    return [x - shift[0], y - shift[1]]
  }
  const out: Seg[] = []
  for (let i = 1; i < ts.length; i++) {
    const a = ts[i - 1]
    const b = ts[i]
    if (b - a < 1e-9) continue
    out.push(...carried(at, a, b, Math.max(1, Math.ceil((b - a) * HZ))))
  }
  return out
}

export const hills = part<null>(
  {
    name: 'hills',
    draw: (p, _s, c) => {
      const T = SEAM.hills + c.t
      drawLand(p, c.k, c.weight, c.ink, T)
      drawHedge(p, c.k, c.weight, c.ink, T, true)
      const inside = T < POP
      if (inside) drawTurnipAt(p, c.k, c.weight, c.ink, T)
      drawHedge(p, c.k, c.weight, c.ink, T, false)
      if (!inside && T < TURNIP_TO_WALK) drawTurnipAt(p, c.k, c.weight, c.ink, T)
    },
  },
  (slot) => {
    const segs = laneThrough(sophieHills, HILLS_KEYS, slot.begin, slot.end)
    return {
      cells: box(-52, -36, 132, 8, 2),
      exit: [HILLTOP[0] + 0.5, HILLTOP[1]] as Pt,
      lane: { segs, fire: POP - slot.begin },
      state: null,
    }
  },
  (slot): PartShot[] => [
    // Walking in from the cut; the hedge and the stick; the flip over her head; up the hill with him behind her.
    { t: slot.begin + 0.7, cells: 4.5, off: [0.9, -0.8] },
    { t: 109.9, cells: 4.1, hold: [AT_POLE + 0.3, -0.72] },
    { t: POP + 0.1, cells: 4.5, hold: [0.1, -1.05] },
    { t: LANDS + 0.3, cells: 4.6, hold: [-0.35, -0.95] },
    // Locked off on the hill: she climbs up across the frame, and he hops past her to the top, and back down into
    // the fog.
    { t: 114.3, cells: 5.8, hold: [1.0, -1.55] },
    { t: 117.3, cells: 6.4, hold: [1.1, -1.8] },
    // The fog, and what is in it: wider on each thud.
    { t: THUD[0], cells: 9.5, hold: [HILLTOP[0] - 2.6, -3.3] },
    { t: THUD[1], cells: 17, hold: [HILLTOP[0] - 3.8, -4.7] },
    { t: slot.end, cells: 30, hold: [HILLTOP[0] - 3.4, -9.0] },
  ],
)

/** Every strike of this part, in show seconds: the tugs, the pole coming free, his landing and his hops, the castle's thuds in the fog. */
export const HILLS_HITS: number[] = [...TUG, POP, ...TURNIP_LANDINGS.filter((t) => t >= LANDS && t < SEAM.walk), ...THUD].sort((a, b) => a - b)
