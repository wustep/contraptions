import type { Key } from '../camera'
import { region, smooth, smoother, standing } from '../draw'
import type { Move } from '../path'
import type { Scene } from '../scene'
import { k, strokeAt } from './giants/beats'
import { drawCliff, drawFar, drawFlights, drawFogBand, drawGiant, drawLowFog, drawPines, drawSplashes, fogAt } from './giants/fjord'
import { CLIFF, FROM, GIANTS, HIT, SINK, TO, TOP, X, fateOf, sinking } from './giants/plan'

/**
 * Telepylus (187.23 → 222.4): the beat arrives and everything climbs on it.
 *
 * The three ships come out of the open sea into the giants' fjord in fog, sails taken in, rowing on the beat. Under the
 * cliff the fog thickens and the giants come out of it over the pines, one and then another, in armour like poured
 * steel. The first boulder comes down in the water ahead of them as a warning; on the third phrase's downbeat ship 2
 * is struck amidships and goes down with its men; one comes down beside his own ship; on the fourth phrase's hardest
 * beat ship 1 is struck and goes down; and his own ship pulls out of the fjord with the last boulder falling into its
 * wake as the music climbs into everything (`giants/plan.ts` has the clock, `giants/fjord.ts` the drawing).
 */

const ALL = region(CLIFF.x0 - 40, TOP - 16, CLIFF.x1 + 40, 20, 3)
const END = 250

/** The sails come in as they row into the fog; the struck ships' oars stop where the blow finds them. */
const furled = (t: number): number => 1 - smooth(t, 189.2, 193.6)
const lookOf = (i: 0 | 1 | 2) => (t: number) => {
  const hit = i === 0 ? Infinity : HIT[i]
  return {
    sail: furled(t),
    stroke: strokeAt(Math.min(t, hit)),
    // Cracked at the mast where it was struck, and the mast down; it goes down whole, by one end.
    broken: i === 0 ? 0 : 0.1 * smoother(t, hit, hit + 0.5),
    mastDown: i === 0 ? 0 : smoother(t, hit, hit + 0.9),
  }
}

const men: Partial<Record<number, Move[]>> = {}
const deaths: Partial<Record<number, number>> = {}
for (let m = 6; m < 14; m++) {
  const fate = fateOf(m, m < 10 ? 1 : 2)
  men[m] = fate.moves
  deaths[m] = fate.death
}

/** The middle of the fleet at `t`, between the first ship and the last still afloat. */
const fleetAt = (t: number): number => {
  const last = t < HIT[2] ? 2 : t < HIT[1] ? 1 : 0
  return (X[0](t) + X[last](t)) / 2
}

/**
 * The camera: close on his own ship rowing in on the beat with the others behind it in the fog; a cut, on the second
 * phrase, to the whole cliff, where the giants come out; cuts in, on the beat before each strike, to the ship it is
 * coming for, so the boulder falls into the frame and through the deck; and out with his own ship as it gets away.
 */
const shots: Key[] = [
  { t: k(2), cells: 12, off: [-2.6, -1.5], w: 0 },
  { t: k(10), cells: 13, off: [-2.2, -1.9], w: 0 },
  // The cliff, the wood on it, and the fog: the giants come out of it here.
  { t: k(12), cells: 25, at: [fleetAt(k(12)) + 9, -9.8], cut: true },
  { t: k(22), cells: 25, at: [fleetAt(k(22)) + 4.5, -9.8] },
  // Ship 2: the boulder falls into the frame and through it; then down into the water with its men.
  { t: k(23), cells: 13, at: [X[2](k(24)) + 0.6, -2.4], cut: true },
  { t: k(26), cells: 12.5, at: [X[2](k(24)) + 1.2, -1.6] },
  // His own ship, and the boulder that comes down by it.
  { t: k(29), cells: 12, off: [1.8, -1.9], w: 0, cut: true },
  { t: k(31), cells: 12.5, off: [0.6, -2.0], w: 0 },
  // The whole cliff again: the next one coming.
  { t: k(32), cells: 25, at: [X[1](k(32)) + 4, -9.8], cut: true },
  { t: k(36), cells: 25, at: [X[1](k(36)) + 3, -9.8] },
  // Ship 1.
  { t: k(37), cells: 13, at: [X[1](k(38)) + 0.6, -2.4], cut: true },
  { t: k(39.5), cells: 12.5, at: [X[1](k(38)) + 1.4, -1.6] },
  // His own ship pulling out, the last boulder into its wake.
  { t: k(40), cells: 14, off: [-1.6, -2.4], w: 0, cut: true },
  { t: TO - 1.05, cells: 14, off: [1.6, -2.0], w: 0 },
]

export const giants: Scene = {
  key: 'giants',
  from: FROM,
  to: TO,
  // Sheltered under the cliff, the sea goes down a little; it rises again outside.
  weather: [
    [196, 0.3],
    [216, 0.3],
  ],
  ships: {
    0: { x: X[0], look: lookOf(0) },
    1: { pose: sinking(1), look: lookOf(1), gone: HIT[1] + SINK },
    2: { pose: sinking(2), look: lookOf(2), gone: HIT[2] + SINK },
  },
  men,
  deaths,
  shots,
  back: [
    standing('giants-far', ALL, END, drawFar),
    standing('giants-cliff', ALL, END, (g) => {
      drawCliff(g)
      drawPines(g, 'back')
      drawLowFog(g, 0.75 * fogAt(g.t))
    }),
    standing('giants-giants', ALL, END, (g) => {
      // The fog that hides them until they come out of it, high over the cliff.
      drawFogBand(g, TOP - 7.0, 3.6, 0.5 * fogAt(g.t) * (1 - 0.6 * smooth(g.t, 199, 210)), 0.04, 4.2)
      for (let i = 0; i < GIANTS.length; i++) drawGiant(g, i)
      drawPines(g, 'front')
    }),
  ],
  mid: [
    standing('giants-boulders', ALL, END, (g) => {
      drawSplashes(g)
      drawFlights(g)
    }),
  ],
}
