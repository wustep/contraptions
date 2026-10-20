import type { Key } from '../camera'
import { region, smooth, standing } from '../draw'
import { BEAT } from '../music'
import type { Scene } from '../scene'
import { k, strokeAt } from './giants/beats'
import { ABOARD, ASHORE, BEACH, CHARGE, FROM, HANDS, RUN, SHADE_ACTORS, SHIP, STOP, TO, TRENCH, heroMoves } from './hades/plan'
import { drawHands, drawRanks, drawShore, drawTrench } from './hades/shore'

/**
 * The shore of the dead (222.4 → 251.36), on the tutti: his ship comes down from Telepylus to a beach of black sand
 * under a low sun that never sets; he leaps ashore and cuts a trench along the water's edge; the dead come up out of
 * it, and out of the whole shore behind, rank on rank into the haze; they charge him a surge a beat; he runs and
 * leaps back aboard, and they stop at the water's edge and stand, all of them, as the ship goes (`hades/plan.ts` has
 * the clock, `hades/shore.ts` the drawing).
 */

const ALL = region(BEACH.x0 - 30, -24, BEACH.x1 + 20, 16, 3)
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
  // Out of the fog and down the coast: the black shore ahead, the low sun.
  { t: 225.9, cells: 16, off: [6, -2.6], w: 0 },
  { t: k(55), cells: 15, at: [SHIP(k(55)) + 8, -2.6] },
  // Ashore: close on him, and the trench he cuts.
  { t: ASHORE, cells: 8.5, off: [0.8, -1.7], w: 0, cut: true },
  { t: k(64), cells: 8, off: [0.5, -1.6], w: 0 },
  // The hands, coming up out of it behind him.
  { t: HANDS, cells: 7.5, at: [(TRENCH.x0 + TRENCH.x1) / 2 + 0.2, -1.75] },
  // The dead up, rank on rank behind him; he runs, and they come.
  { t: k(69), cells: 10, at: [TRENCH.x1 - 3, -2.3] },
  { t: RUN, cells: 11, off: [-2.6, -1.9], w: 0 },
  { t: CHARGE, cells: 11.5, off: [-3.2, -2.0], w: 0 },
  { t: ABOARD, cells: 12, off: [-3.6, -2.0], w: 0 },
  // The shore lined with them at the water's edge, watching him go.
  { t: STOP, cells: 13.5, at: [SHIP(STOP) - 5.5, -2.4] },
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
