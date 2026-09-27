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

/**
 * The castle out of the fog: the wide from the second thud (W64) to the walk's cut in (W66), across the seam (W65).
 * Its keys in the wastes' cells, at the thud, the seam and just before the cut; the walk reads the last.
 */
export const FOG_WIDE: { cells: number; at: Pt }[] = [
  { cells: 17, at: [HILLTOP[0] + 6.4, HILLTOP[1] - 5.15] },
  { cells: 16.8, at: [HILLTOP[0] + 6.85, HILLTOP[1] - 5.1] },
  { cells: 16.6, at: [HILLTOP[0] + 7.3, HILLTOP[1] - 5.05] },
]

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
    // Walking in from the cut; the hedge and the stick, close, for the tugs on the swell; then the frame opens with
    // the flip (from the pop, easing out), so he somersaults whole against the sky over her head and lands on the bar
    // in the wide; up the hill with him behind her.
    { t: slot.begin + 0.7, cells: 4.5, off: [0.9, -0.8] },
    { t: 109.9, cells: 4.1, hold: [AT_POLE + 0.3, -0.72] },
    { t: POP, cells: 4.25, hold: [AT_POLE + 0.15, -0.82] },
    { t: LANDS + 0.25, cells: 6.3, hold: [-0.15, -1.75] },
    // On the hill, closer: she climbs up across the frame, a little under the middle (her grey is the hill's light, so
    // she is kept big), and he hops past her to the top, and back down into the fog.
    { t: 114.3, cells: 5.0, hold: [0.55, -0.95] },
    { t: 117.3, cells: 5.2, hold: [1.35, -1.2] },
    // The fog, and what is in it, framed from her: low on the crest a little left of middle, the fog rolling up the
    // lane where he went, the first thud in it; on the second thud a cut out, her small and low-left on the crest, and
    // over her the castle's face, eye and jaw whole coming out of the fog (the heap on its back cropped by the top: its
    // size is in the crop), the eye lighting on her. Held, drifting on a little with it, through its first stride out
    // of the fog (W65, the walk's seam), so that stride lands in the wide; the walk cuts in to her on the next (W66).
    { t: THUD[0], cells: 7.3, hold: [HILLTOP[0] + 0.35, -2.35] },
    { t: THUD[1] - 0.03, cells: 7.7, hold: [HILLTOP[0] + 0.55, -2.5] },
    { t: THUD[1], cells: FOG_WIDE[0].cells, hold: FOG_WIDE[0].at, cut: true },
    { t: slot.end, cells: FOG_WIDE[1].cells, hold: FOG_WIDE[1].at },
  ],
)

/** Every strike of this part, in show seconds: the tugs, the pole coming free, his landing and his hops, the castle's thuds in the fog. */
export const HILLS_HITS: number[] = [...TUG, POP, ...TURNIP_LANDINGS.filter((t) => t >= LANDS && t < SEAM.walk), ...THUD].sort((a, b) => a - b)
