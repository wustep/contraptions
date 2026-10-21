import type { Shot } from '../camera'
import { DEAD, JESSICA, LETO, PAUL, SOLDIER } from '../cast'
import { mix, smooth, type Pt } from '../paint'
import { Run, Walk } from '../path'
import type { Scene } from '../scene'
import { looking, type Actor } from '../show'
import { DUKE_SEAT } from './arrakeen/pieces'
import { HARK_IN, harkHold, harkSeat } from './arrakeen/rig'
import { ATTACK as N } from './arrakeen/times'

/**
 * The night (198.252 → 275.168): the Harkonnen attack on Arrakeen.
 *
 * Out of the erg's calm desert the city dissolves in at night, the palace under its house shield. Paul at his window,
 * his mother by the bed; the Duke alone in the great hall under the bull's head. The shield goes out from its crown
 * down; the armada comes down out of the dark over the rim, and the shells fall on the city and the palace, each a fire
 * that stays. A Harkonnen ornithopter sets down on the palace's roof. Paul's door breaks in off the terrace; four
 * soldiers come in, close round the two of them, and take them out across the terrace into the ornithopter, which
 * lifts and goes off east into the dark with them.
 *
 * The great hall: the Duke bound in a chair under the bull's head, drugged. The Baron comes down out of the dark vault,
 * floating, a blow at a time, and hangs before him. The Duke bites the tooth; the gas opens out of him; the guards go
 * grey; the Baron goes up and away into the vault; and on the cue's greatest blow the Duke's colour goes out, under his
 * father's bull, which looks down on him to the last.
 */

const rS = 0.13 * SOLDIER.size
const rP = 0.13 * PAUL.size
const rJ = 0.13 * JESSICA.size
const rL = 0.13 * LETO.size

/** The floor of Paul's room and the terrace beyond its door, and the pad's slab: where a ball of radius `r` rolls. */
const deck = (x: number, r: number): Pt => [x, (x < 113 ? -14.8 : x < 113.2 ? -14.8 - (x - 113) : -15.0) - r]
/** A roll along the deck from where a walk is to `x`, through the pad's edge if it crosses it. */
function along(w: Walk, x: number, r: number, to: number, ease: 'inout' | 'in' | 'out' | 'none' = 'inout'): Walk {
  const pts: Pt[] = []
  const x0 = w.at[0]
  for (const edge of [113, 113.2]) if ((x0 - edge) * (x - edge) < 0) pts.push(deck(edge, r))
  pts.push(deck(x, r))
  return w.roll(pts, to, ease)
}

const PAUL_AT = 95.6
const JESSICA_AT = 90.6

function paul(): Walk {
  const w = new Walk(deck(PAUL_AT, rP), N.from).wait(N.taken)
  along(w, 117.3, rP, 241.75)
  w.hop(harkHold(242.05, 0), 242.05).ride((t) => harkHold(t, 0), N.hall)
  return w
}

function jessica(): Walk {
  const w = new Walk(deck(JESSICA_AT, rJ), N.from).wait(N.taken + 0.15)
  along(w, 116.95, rJ, 242.1)
  w.hop(harkHold(242.36, 1), 242.36).ride((t) => harkHold(t, 1), N.hall)
  return w
}

function leto(): Walk {
  const w = new Walk([78.2, -rL], N.from).wait(N.hall)
  // Across the cut, bound in the chair under the bull.
  w.jump(DUKE_SEAT).wait(N.bite).hop(DUKE_SEAT, N.bite + 0.16).wait(N.to)
  return w
}

/** The Baron: down out of the vault a blow at a time, hanging before the Duke, and up and away on the flee. */
function baron(): Walk {
  const [b0, b1, b2, b3] = N.baron
  const w = new Walk([82.6, -14.2], b0 - 0.01)
  w.roll([[82.5, -5.6]], b1, 'inout').roll([[82.3, -3.1]], b2, 'inout').roll([[82.15, -1.75]], b3, 'inout').roll([[82.1, -1.3]], b3 + 1.0, 'out')
  // Hanging there, rising and falling a little on his suspensors.
  const bob = (t: number): Pt => [82.1, -1.3 - 0.06 * Math.sin((t - (b3 + 1.0)) * 2.2)]
  w.ride(bob, N.flee)
  w.roll([[82.4, -14.6]], N.flee + 1.55, 'in')
  return w
}

/** A soldier through Paul's door: in off the terrace (out of frame) at speed, through the door on `entry`, to `x`. */
function trooper(entry: number, x: number, from: number): Walk {
  const door = 99.6
  const w = new Walk(deck(from, rS), N.door - 0.1)
  const d1 = from - door
  const d2 = door - x
  const t1 = 0.6
  w.wait(entry - t1).roll([deck(door, rS)], entry, 'in').roll([deck(x, rS)], entry + (t1 * d2) / d1, 'out')
  return w
}

const S = N.soldiers
const SOLDIER_RUNS: Walk[] = [
  // S0 between them, S1 at Paul's right, S2 by Jessica, S3 at the door.
  trooper(S[0], 94.7, 101.9),
  trooper(S[1], 96.5, 102.6),
  trooper(S[2], 91.5, 103.3),
  trooper(S[3], 98.4, 104.0),
]
// Taken: S3 and S1 lead out to the ornithopter's nose and up into its seats; S0 and S2 stand guard on the pad.
along(SOLDIER_RUNS[3].wait(N.taken - 0.05), 119.45, rS, 241.3).hop(harkSeat(241.6, 0), 241.6).ride((t) => harkSeat(t, 0), N.hall)
along(SOLDIER_RUNS[1].wait(N.taken), 119.05, rS, 241.55).hop(harkSeat(241.88, 1), 241.88).ride((t) => harkSeat(t, 1), N.hall)
along(SOLDIER_RUNS[0].wait(N.taken + 0.1), 115.85, rS, 241.9).wait(N.hall)
along(SOLDIER_RUNS[2].wait(N.taken + 0.2), 115.2, rS, 242.0).wait(N.hall)

/** Soldiers as actors: gunmetal, each its own id. */
function soldier(i: number, run: Run, death?: number): Actor {
  return {
    id: SOLDIER.id + i,
    color: SOLDIER.color,
    rim: SOLDIER.rim,
    size: SOLDIER.size,
    run,
    colorAt: death === undefined ? undefined : (t) => mix(SOLDIER.color, DEAD, smooth(t, death, death + 0.15)),
  }
}

/** Two guards in the hall by its walls, facing the Duke, gone grey in the gas. */
const GUARDS: Actor[] = [
  { ...soldier(10, new Run(new Walk([77.4, -rS], N.hall).wait(N.to).segs, 'guard 0'), N.guards[0]), markAt: looking([[N.hall, N.to + 1, 0]]) },
  { ...soldier(11, new Run(new Walk([84.6, -rS], N.hall).wait(N.to).segs, 'guard 1'), N.guards[1]), markAt: looking([[N.hall, N.to + 1, Math.PI]]) },
]

const shots: Shot[] = [
  // The city at night, dissolving in: the palace under its shield, a few lamps.
  { t: N.from, cells: 52, at: [88, -24], cut: true },
  { t: N.window - 0.002, cells: 48, at: [88, -22.5] },
  // Paul at his window; his mother by the bed.
  { t: N.window, cells: 6.4, at: [94.6, -16.75], cut: true },
  { t: N.duke - 0.002, cells: 6.2, at: [94.4, -16.7] },
  // The Duke alone under the bull.
  { t: N.duke, cells: 8.0, at: [80.4, -3.25], cut: true },
  { t: N.wide - 0.002, cells: 7.7, at: [80.4, -3.35] },
  // Out: the shield goes out from its crown down.
  { t: N.wide, cells: 52, at: [88, -23], cut: true },
  { t: N.armada - 0.002, cells: 54, at: [88, -24] },
  // Up: the armada comes down out of the night over the rim, and the first shells fall.
  { t: N.armada, cells: 84, at: [88, -38], cut: true },
  { t: N.close - 0.002, cells: 74, at: [88, -33] },
  // The palace hit: fires on its roof and over Paul's window; the Harkonnen ornithopter sets down on the pad.
  { t: N.close, cells: 20, at: [102, -19.2], cut: true },
  { t: HARK_IN[1], cells: 19, at: [102.8, -18.9] },
  { t: N.room - 0.002, cells: 18.4, at: [103.2, -18.6] },
  // Paul's room: the door breaks in off the terrace.
  { t: N.room, cells: 6.6, at: [94.6, -16.75], cut: true },
  { t: N.taken, cells: 6.6, at: [94.8, -16.75] },
  // Taken: across the terrace with them, into the ornithopter, and it lifts away.
  { t: N.taken + 1.2, cells: 6.8, at: [100.5, -15.95] },
  { t: 240.0, cells: 7.0, at: [111.0, -15.95] },
  { t: 241.9, cells: 7.3, at: [116.4, -16.25] },
  { t: N.away, cells: 7.7, at: [117.6, -16.8] },
  { t: N.hall - 0.002, cells: 8.2, at: [118.4, -17.4] },
  // The great hall: the Duke bound under the bull, the guards; the Baron comes down out of the vault.
  { t: N.hall, cells: 8.0, at: [80.6, -3.2], cut: true },
  { t: N.baron[1], cells: 7.6, at: [80.8, -3.0] },
  { t: N.baron[3], cells: 5.4, at: [81.0, -2.05] },
  { t: N.bite, cells: 4.8, at: [81.0, -1.75] },
  { t: N.flee, cells: 5.0, at: [80.9, -1.9] },
  // The Duke's death, and back up and out until his father's bull is over him again.
  { t: N.death, cells: 5.3, at: [80.8, -2.15] },
  { t: N.fall, cells: 7.6, at: [80.8, -3.15] },
  { t: N.to - 0.002, cells: 8.8, at: [80.8, -3.6] },
]

export const attack: Scene = {
  key: 'attack',
  from: N.from,
  to: N.to,
  dissolves: [[N.from, N.dissolve]],
  moves: { paul: paul().segs, jessica: jessica().segs, leto: leto().segs, baron: baron().segs },
  looks: {
    // Paul out of his window at the city; his mother at him.
    paul: [[N.from, N.door, -0.95], [N.door + 0.1, N.taken, 0]],
    jessica: [[N.from, N.door, 0], [N.door + 0.1, N.taken + 0.1, 0]],
    // The Duke up at the bull; bound, slumped; up at the Baron when he comes; slumped again in death.
    leto: [[N.from, N.hall - 0.05, -1.3], [N.hall, N.baron[2], 1.45], [N.baron[2] + 0.2, N.death, -0.2], [N.death + 0.1, N.to + 1, 1.5]],
    baron: [[N.baron[0], N.to + 1, Math.PI]],
  },
  deaths: { leto: [N.death, 0.2] },
  actors: [
    soldier(0, new Run(SOLDIER_RUNS[0].segs, 'soldier 0')),
    soldier(1, new Run(SOLDIER_RUNS[1].segs, 'soldier 1')),
    soldier(2, new Run(SOLDIER_RUNS[2].segs, 'soldier 2')),
    soldier(3, new Run(SOLDIER_RUNS[3].segs, 'soldier 3')),
    ...GUARDS,
  ],
  shots,
  pieces: [],
  strikes: [
    ['Paul at his window', N.window],
    ['the Duke under the bull', N.duke],
    ['out to the city', N.wide],
    ['the shield goes out', N.shieldOut],
    ['the armada comes down', N.armada],
    ...N.hits.map((t, i): [string, number] => [`shell ${i + 1} hits`, t]),
    ['the ornithopter sets down on the pad', HARK_IN[1]],
    ['back in Paul\'s room', N.room],
    ['the door breaks', N.door],
    ...S.map((t, i): [string, number] => [`soldier ${i + 1} through the door`, t]),
    ['they are taken', N.taken],
    ['the ornithopter lifts', N.lift],
    ['and goes', N.away],
    ['the great hall', N.hall],
    ...N.baron.map((t, i): [string, number] => [`the Baron comes down, ${i + 1}`, t]),
    ['the Duke bites the tooth', N.bite],
    ...N.gas.map((t, i): [string, number] => [`the gas, ${i + 1}`, t]),
    ...N.guards.map((t, i): [string, number] => [`guard ${i + 1} goes grey`, t]),
    ['the Baron flees', N.flee],
    ['the Duke\'s colour goes out', N.death],
    ['the lamps swing', N.fall],
  ],
}

