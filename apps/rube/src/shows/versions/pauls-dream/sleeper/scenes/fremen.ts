import type { Shot } from '../camera'
import { CHANI, FREMEN } from '../cast'
import { standing, type Pt } from '../paint'
import { JAMIS_FALLS, RIDER, WINDOWS } from '../plan'
import type { Scene } from '../scene'
import { looking } from '../show'
import { on } from './fremen/ground'
import { airAt, drawBack, drawFront, setSwell, setTilt } from './fremen/land'
import { DUEL, ON, SET_OFF, STOPS, TAKEN, TURN, troop } from './fremen/troop'
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
  // Down at the foot of the rock, the frame the storm's last glide dissolves into: the thopter, the two of them.
  { t: FROM, cells: 6.8, at: [1158.4, -1.45], cut: true },
  { t: 338.13, cells: 6.7, at: [1158.9, -1.43] },
  // The dream shot, held: her on the crest against the sky.
  { t: 338.15, cells: DREAM_CELLS, at: DREAM_AT, cut: true },
  { t: 342.66, cells: DREAM_CELLS * 0.97, at: [DREAM_AT[0] - 0.1, DREAM_AT[1]] },
  // Back to him: the Fremen are round them. Jamis comes forward.
  { t: DUEL.challenge, cells: 8.2, at: [1167.6, -1.55], cut: true },
  { t: DUEL.clash - 0.002, cells: 8.0, at: [1167.4, -1.5] },
  // The duel, side on and close.
  { t: DUEL.clash, cells: 3.7, at: [1166.25, -0.8], cut: true },
  { t: 347.0, cells: 3.6, at: [1166.15, -0.8] },
  { t: JAMIS_FALLS, cells: 3.55, at: [1166.5, -0.8] },
  { t: 350.6, cells: 3.85, at: [1167.25, -0.83] },
  { t: 352.49, cells: 4.0, at: [1167.4, -0.85] },
  // Wider: the body, Stilgar coming past it, the Fremen round, Chani down from the crest.
  { t: 352.51, cells: 8.2, at: [1169.6, -1.65], cut: true },
  { t: 356.2, cells: 6.3, at: [1168.5, -1.3] },
  { t: 364.35, cells: 6.1, at: [1168.9, -1.3] },
  // The walk, tracking him over the dunes.
  { t: 364.37, cells: 7.4, off: [1.1, -1.2], cut: true },
  { t: 372, cells: 7.8, off: [1.4, -1.3] },
  { t: 379.35, cells: 8.2, off: [1.5, -1.3] },
  // Stopped: the crest and the open erg past it, the horizon low; worm sign, then the worm.
  { t: 379.37, cells: 10.5, at: [1202.6, -7.6], cut: true },
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
  // They go on, and the camera draws back and up until they are a line of specks on the erg.
  { t: 405, cells: 11.5, at: [1207.5, -8.2] },
  { t: 413, cells: 19, at: [1216, -11.4] },
  { t: 426, cells: 23.5, at: [1224, -13.2] },
  { t: TO, cells: 24.5, at: [1227, -13.6] },
]

/** The camera's tilt for each shot: how far under the frame's middle the horizon lies. */
setTilt([
  [FROM, 0.2, true],
  [338.15, 0.22, true],
  [DUEL.challenge, 0.12, true],
  [DUEL.clash, 0.1, true],
  [352.51, 0.12, true],
  [364.37, 0.13, true],
  [379.37, 0.02, true],
  [INSERT.from, 0.3, true],
  [INSERT.to, 0.3, true],
  [395.87, 0.22, true],
  [ON, 0.22, false],
  [412, 0.07, false],
  [TO, 0.03, false],
])

// Worm sign is the far sand itself swelling over the worm.
setSwell(D, sign)

/** Where the Fremen look while they wait below the crest: up and east, toward the worm they cannot see. */
const WATCH: [number, number, number][] = [[STOPS[5] + 0.4, TURN + 0.6, -0.65]]

export const fremen: Scene = {
  key: 'fremen',
  from: FROM,
  to: TO,
  moves: people.moves,
  looks: { jessica: WATCH, stilgar: WATCH },
  deaths: { jamis: [JAMIS_FALLS, 0.15] },
  actors: people.actors.map((a) => (a.id === FREMEN.id + 2 || a.id === FREMEN.id + 3 ? { ...a, markAt: looking(WATCH) } : a)),
  shots,
  dissolves: [[FROM, 2.0]],
  pieces: [
    standing('fremen-land', { x0: 1000, y0: -400, x1: 1560, y1: 60 }, (g) => {
      if (g.t < FROM - 1e-6) return
      drawBack(g, [[D, drawFarWorm]])
      drawNearWorm(g, airAt(g.t))
    }, (g) => {
      if (g.t < FROM - 1e-6) return
      drawFront(g)
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
    ...SET_OFF.map((t, i): [string, number] => [`sets off ${i + 1}`, t]),
    ...STOPS.map((t, i): [string, number] => [`stops ${i + 1}`, t]),
    ['the worm breaches', RIDER.from],
    ['it surges', 388.64],
    ['it surges again', 391.41],
    ['and again', 393.05],
    ['and again', 394.87],
    ['Chani turns to Paul', TURN],
    ['they go on', ON],
  ],
}
