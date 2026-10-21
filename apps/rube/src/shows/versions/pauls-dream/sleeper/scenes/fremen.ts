import type { Shot } from '../camera'
import { CHANI, FREMEN } from '../cast'
import { ellipse, fill, mix, rgba, smooth, standing, type Paint, type Pt } from '../paint'
import { JAMIS_FALLS, RIDER, WINDOWS } from '../plan'
import type { Scene } from '../scene'
import { looking } from '../show'
import { ground, on } from './fremen/ground'
import { BASIN_D, airAt, drawBack, drawBasin, drawFront, setSwell, setTilt } from './fremen/land'
import { DUEL, ON, SET_OFF, STOPS, TAKEN, THROWN, TURN, WALK_FROM, troop } from './fremen/troop'
import { D, INSERT, drawFarWorm, drawNearWorm, drawRopes, riderAt, sign } from './fremen/worm'

/**
 * The Fremen (336 to the end): the deep desert at dawn after the storm. The stolen thopter down at the foot of a great
 * rock; the girl from the dream on the crest above, turning to look down at him; the Fremen up out of the sand round
 * them; Jamis's challenge, fought side on, and his fall on the blow; Stilgar's taking him in; the walk east over the
 * dunes with Chani beside him; worm sign, and on the climb the worm and its rider crossing toward the rocks; Chani
 * turning to him on the last blow; and the long way on toward the sun under the credits, into the quiet.
 */

const [FROM, TO] = WINDOWS.fremen
const people = troop()

/**
 * The dream shot: Chani at about 60% across and 55% down (where the Caladan dream's opening is), the horizon well under
 * her, the sky over her.
 */
const DREAM_CELLS = 5.4
const chaniCrest = on(1186, CHANI.size)
const DREAM_AT: Pt = [chaniCrest[0] - 0.1 * ((DREAM_CELLS * 16) / 9), chaniCrest[1] - 0.05 * DREAM_CELLS]

/** Paul on the crest, for the reaction and the answer to the dream. */
const PAUL_CREST = on(1199.95, 1)
const CHANI_CREST = on(1200.6, CHANI.size)

const shots: Shot[] = [
  // Down at the foot of the rock, the frame the storm's last glide dissolves into: the thopter, the two of them, the dune
  // behind the basin rising over them.
  { t: FROM, cells: 6.8, at: [1158.4, -1.8], cut: true },
  { t: 338.13, cells: 6.7, at: [1158.9, -1.78] },
  // The dream shot, held: her on the crest against the sky.
  { t: 338.15, cells: DREAM_CELLS, at: DREAM_AT, cut: true },
  { t: 342.66, cells: DREAM_CELLS * 0.97, at: [DREAM_AT[0] - 0.1, DREAM_AT[1]] },
  // Back to him, close and from a little above: the sand rising behind them to the skyline, the Fremen coming up out of
  // it round them, Jamis stepping forward.
  { t: DUEL.challenge, cells: 4.9, at: [1165.0, -1.35], cut: true },
  { t: DUEL.clash - 0.002, cells: 4.8, at: [1165.15, -1.33] },
  // The duel, side on and close.
  { t: DUEL.clash, cells: 3.7, at: [1166.25, -0.95], cut: true },
  { t: 347.0, cells: 3.6, at: [1166.15, -0.94] },
  { t: JAMIS_FALLS, cells: 3.55, at: [1166.5, -0.93] },
  // On without a cut: Paul over the man he killed; Stilgar walking in from the ring to his man, and over him to Paul on
  // the boom; Jessica coming to her son.
  { t: 350.8, cells: 3.9, at: [1167.35, -1.0] },
  { t: 353.6, cells: 4.7, at: [1168.7, -1.18] },
  { t: 356.4, cells: 4.2, at: [1167.9, -1.1] },
  { t: 358.0, cells: 3.9, at: [1167.2, -1.05] },
  { t: 361.2, cells: 4.3, at: [1166.9, -1.12] },
  { t: WALK_FROM - 0.002, cells: 4.2, at: [1166.8, -1.1] },
  // The walk, on the dune beyond: close on him and Chani side by side, the line ahead of them and behind.
  { t: WALK_FROM, cells: 4.1, off: [0.35, -0.7], cut: true },
  { t: 371, cells: 4.0, off: [0.4, -0.72] },
  { t: 377.968, cells: 4.0, off: [0.4, -0.72] },
  // On the fill, wide: the crest and the open erg past it, the troop stopping one by one; worm sign, then the worm.
  { t: 377.97, cells: 10.5, at: [1202.6, -7.6], cut: true },
  { t: 388.62, cells: 10.0, at: [1203.0, -7.7] },
  // The insert: the rider on its back, the back curving away under him, the sky over him.
  { t: INSERT.from, cells: 7.0, on: riderAt, off: [0.4, 0.75], cut: true },
  { t: INSERT.to - 0.002, cells: 6.7, on: riderAt, off: [0.3, 0.75] },
  // Paul, close, watching.
  { t: INSERT.to, cells: 3.3, at: [PAUL_CREST[0] + 1.6, PAUL_CREST[1] - 0.45], cut: true },
  { t: 395.85, cells: 3.15, at: [PAUL_CREST[0] + 1.55, PAUL_CREST[1] - 0.45] },
  // The answer to the dream: the two of them on the crest against the sky.
  { t: 395.87, cells: DREAM_CELLS, at: [CHANI_CREST[0] - 0.1 * ((DREAM_CELLS * 16) / 9), CHANI_CREST[1] - 0.05 * DREAM_CELLS], cut: true },
  { t: ON, cells: DREAM_CELLS * 0.98, at: [CHANI_CREST[0] - 0.1 * ((DREAM_CELLS * 16) / 9) + 0.1, CHANI_CREST[1] - 0.05 * DREAM_CELLS] },
  // They go on: the camera goes with them a while, a line of balls over the sand, then lets them go and draws back
  // and up until they walk out of the frame toward the sun.
  { t: 401.5, cells: 6.0, off: [0.9, -1.5] },
  { t: 410, cells: 6.7, off: [1.0, -1.9] },
  { t: 415, cells: 8.8, off: [1.3, -2.7] },
  { t: 424, cells: 16, at: [1236.5, -10.4] },
  { t: 432, cells: 21, at: [1239.5, -12.0] },
  { t: TO, cells: 22, at: [1240.5, -12.3] },
]

/** Where Jamis comes down, and bounces: a skirt of sand kicked up and settling, flat, low, gone in under a second. */
function kicked(g: Paint): void {
  for (const [x, at, size] of [[THROWN.land, THROWN.at, 1], [THROWN.bounce, THROWN.at + 0.2, 0.6]] as const) {
    const u = (g.t - at) / 0.75
    if (u < 0 || u > 1) continue
    const air = airAt(g.t)
    const y = ground(x)
    ellipse(g.ctx, x, y - 0.03 - 0.05 * u * size, (0.12 + 0.42 * Math.sqrt(u)) * size, (0.05 + 0.06 * u) * size)
    fill(g.ctx, rgba(mix(air.sand, '#FFF4E2', 0.28), 0.55 * (1 - smooth(u, 0.2, 1))))
  }
}

/** The camera's tilt for each shot: how far under the frame's middle the horizon lies. */
setTilt([
  [FROM, -0.02, true],
  [338.15, 0.22, true],
  [DUEL.challenge, -0.05, true],
  [DUEL.clash, -0.02, true],
  [353.6, -0.04, false],
  [WALK_FROM, 0.16, true],
  [377.97, 0.02, true],
  [INSERT.from, 0.3, true],
  // The reaction and the answer from a little lower, so the worm stands up over the crest behind them, not a hump.
  [INSERT.to, -0.12, true],
  [395.87, 0.08, true],
  [ON, 0.22, false],
  [415, 0.16, false],
  [430, 0.05, false],
  [TO, 0.04, false],
])

// Worm sign is the far sand itself swelling over the worm.
setSwell(D, sign)

/** Where the Fremen look while they wait below the crest: up and east, toward the worm they cannot see. */
const WATCH: [number, number, number][] = [[STOPS.together + 0.4, TURN + 0.6, -0.65]]

export const fremen: Scene = {
  key: 'fremen',
  from: FROM,
  to: TO,
  moves: people.moves,
  looks: { jessica: WATCH, stilgar: WATCH },
  deaths: { jamis: [JAMIS_FALLS, 0.15] },
  actors: people.actors.map((a) => (a.id > FREMEN.id && a.id <= FREMEN.id + 4 ? { ...a, markAt: looking(WATCH) } : a)),
  shots,
  dissolves: [[FROM, 2.0], [WALK_FROM, 1.6]],
  pieces: [
    standing('fremen-land', { x0: 1000, y0: -400, x1: 1560, y1: 60 }, (g) => {
      if (g.t < FROM - 1e-6) return
      // The dune behind the basin only while the camera is down in it: not in the dream shot, not after the walk begins.
      const basin = g.t < 338.15 || (g.t >= DUEL.challenge && g.t < WALK_FROM)
      drawBack(g, basin ? [[D, drawFarWorm], [BASIN_D, drawBasin]] : [[D, drawFarWorm]])
      drawNearWorm(g, airAt(g.t))
    }, (g) => {
      if (g.t < FROM - 1e-6) return
      drawFront(g)
      kicked(g)
      drawRopes(g)
    }),
  ],
  strikes: [
    ['Chani turns', 339.9],
    ['Jamis comes forward', DUEL.challenge],
    ['the first clash', DUEL.clash],
    ['Jamis lunges', DUEL.lunges[0]],
    ['Paul lunges', DUEL.lunges[1]],
    ...DUEL.fill.map((t, i): [string, number] => [`exchange ${i + 1}`, t]),
    ['Paul\'s blow: Jamis falls', JAMIS_FALLS],
    ['Stilgar takes him in', TAKEN],
    ...Object.entries(SET_OFF).map(([who, t]): [string, number] => [`${who} sets off`, t]),
    ...Object.entries(STOPS).map(([who, t]): [string, number] => [`${who} stops`, t]),
    ['the worm breaches', RIDER.from],
    ['it surges', 388.64],
    ['it surges again', 391.41],
    ['and again', 393.05],
    ['and again', 394.87],
    ['Chani turns to Paul', TURN],
    ['they go on', ON],
  ],
}
