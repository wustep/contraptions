import type { Key } from '../camera'
import { region, smooth, standing } from '../draw'
import { BEAT } from '../music'
import type { Scene } from '../scene'
import { k, strokeAt } from './giants/beats'
import { ABOARD, ARRIVE, ASHORE, BEACH, CHARGE, FROM, HANDS, SHADE_ACTORS, SHIP, STOP, TO, TRENCH, heroMoves } from './hades/plan'
import { drawHands, drawRanks, drawShore, drawTrench } from './hades/shore'

/**
 * The shore of the dead (222.4 → 251.36), on the tutti: on its attack the fog is cut away to a beach of black sand
 * under a low sun that never sets, and his ship comes down it; he leaps ashore and cuts a trench along the water's
 * edge; hands break the sand all along it on one beat, and the dead come up between them and out of the whole shore
 * behind, back into the dark; they charge him a surge a beat; he runs and leaps back aboard, and they stop at the
 * water's edge and stand, all of them, as the ship goes (`hades/plan.ts` has the clock, `hades/shore.ts` the drawing).
 */

const ALL = region(BEACH.x0 - 30, -24, BEACH.x1 + 45, 16, 3)
const END = 300

/**
 * He rows on the beat, and as the ship gets away from the dead the sail comes down and fills. Over the last beat and a
 * half the strokes ease from the beats' own attacks onto the plain comb (one stroke a beat from 188.35), which the
 * Sirens' scene rows on from the seam, so the oars carry straight on across it.
 */
const COMB = (t: number) => (t - 188.35) / BEAT
const look = (t: number) => {
  const own = strokeAt(t)
  return { sail: smooth(t, 247.4, 250.9), stroke: own + (COMB(t) - own) * smooth(t, TO - 1.5, TO) }
}

const shots: Key[] = [
  // The tutti's attack: cut from the fog to the whole shore, wide and nearly still, the ship coming down it.
  { t: ARRIVE, cells: 21, at: [297, -4.6], cut: true },
  { t: k(59), cells: 19, at: [311, -4.2] },
  // Ashore: close on him, and the trench he cuts, behind him.
  { t: ASHORE, cells: 5.5, off: [0.9, -0.9], w: 0, cut: true },
  { t: k(63), cells: 5.5, off: [-1.2, -0.9], w: 0 },
  // The hands, all along it at once; then back, and back, as the dead come up behind them.
  { t: HANDS, cells: 5.6, at: [(TRENCH.x0 + TRENCH.x1) / 2 + 0.6, -1.0] },
  { t: k(71), cells: 10, at: [TRENCH.x1 - 0.5, -3.6] },
  // He runs, and they come.
  { t: CHARGE, cells: 9.5, off: [-4.2, -3.0], w: 0 },
  { t: ABOARD, cells: 10.5, off: [-4.4, -3.0], w: 0 },
  // The shore lined with them at the water's edge, watching him go.
  { t: STOP, cells: 12.5, at: [SHIP(STOP) - 8.5, -3.6] },
  { t: TO - 1.05, cells: 14.5, off: [1.4, -1.9], w: 0 },
]

export const hades: Scene = {
  key: 'hades',
  from: FROM,
  to: TO,
  ships: { 0: { x: SHIP, look } },
  hero: heroMoves(),
  shots,
  back: [
    standing('hades-shore', ALL, END, (g) => {
      drawShore(g)
      drawRanks(g)
      drawTrench(g)
      drawHands(g)
    }),
  ],
  actors: SHADE_ACTORS,
}
