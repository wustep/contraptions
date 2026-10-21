import type { Shot } from '../camera'
import { DEAD, JESSICA, LETO, PAUL, SOLDIER } from '../cast'
import { mix, smooth, type Pt } from '../paint'
import { Run, Walk } from '../path'
import type { Scene } from '../scene'
import { looking, type Actor } from '../show'
import { DUKE_SEAT } from './arrakeen/pieces'
import { harkHold, harkSeat } from './arrakeen/rig'
import { ATTACK as N } from './arrakeen/times'

/**
 * The night (198.252 → 275.168): the Harkonnen attack on Arrakeen.
 *
 * Out of the erg's calm desert the city dissolves in at night. Paul at his window; the Duke alone in the great hall
 * under his father's bull. In close on the palace's crown, its shield goes out from the top down. The armada comes in:
 * two of its ships pass low over the roof, so big only their bellies cross the frame, and then all of it over the
 * city; in close, a shell lands on the palace's roof and the fire runs along it. Paul at his window, in the burning
 * city's light, his mother coming to him; the blast over the window. A Harkonnen ornithopter comes down out of the
 * smoke onto the terrace. In close in Paul's room: the door breaks in, four soldiers close round the two of them and
 * take them up between them, out across the terrace into the ornithopter, which lifts and goes off east.
 *
 * The great hall: the Duke bound in a chair under the bull. The Baron comes down out of the vault a blow a step and
 * hangs before him, face to face, bobbing on his suspensors. The Duke bites the tooth; the gas blooms out of him toward
 * the Baron; the guards go grey; the Baron goes up and away; and on the cue's greatest blow, in close, the Duke's colour
 * goes out. Back out: the bull over him in the gas.
 */

const rS = 0.13 * SOLDIER.size
const rP = 0.13 * PAUL.size
const rJ = 0.13 * JESSICA.size
const rL = 0.13 * LETO.size

/** The floor of Paul's room and the terrace beyond its door, and the pad's slab: where a ball of radius `r` rolls. */
const deck = (x: number, r: number, up = 0): Pt => [x, (x < 113 ? -14.8 : x < 113.2 ? -14.8 - (x - 113) : -15.0) - r - up]
/** A roll along the deck from where a walk is to `x` (held `up` off it), through the pad's edge if it crosses it. */
function along(w: Walk, x: number, r: number, to: number, up = 0, ease: 'inout' | 'in' | 'out' | 'none' = 'inout'): Walk {
  const pts: Pt[] = []
  const x0 = w.at[0]
  for (const edge of [113, 113.2]) if ((x0 - edge) * (x - edge) < 0) pts.push(deck(edge, r, up))
  pts.push(deck(x, r, up))
  return w.roll(pts, to, ease)
}

/** How high the soldiers hold Paul and Jessica as they carry them. */
const HELD = 0.11

function paul(): Walk {
  const w = new Walk(deck(95.6, rP), N.from).wait(N.taken)
  w.hop(deck(95.75, rP, HELD), N.taken + 0.24)
  along(w, 117.3, rP, 241.75, HELD)
  w.hop(harkHold(242.05, 0), 242.05).ride((t) => harkHold(t, 0), N.hall)
  return w
}

function jessica(): Walk {
  const w = new Walk(deck(90.6, rJ), N.from).wait(N.mother)
  // She comes from the bed to him at the window.
  w.roll([deck(94.7, rJ)], N.mother + 2.3, 'inout').wait(N.taken + 0.15)
  w.hop(deck(94.85, rJ, HELD), N.taken + 0.39)
  along(w, 116.95, rJ, 242.1, HELD)
  w.hop(harkHold(242.36, 1), 242.36).ride((t) => harkHold(t, 1), N.hall)
  return w
}

function leto(): Walk {
  const w = new Walk([79.6, -rL], N.from).wait(N.hall)
  // Across the cut, bound in the chair under the bull; the bite is a jolt in it.
  w.jump(DUKE_SEAT).wait(N.bite).hop(DUKE_SEAT, N.bite + 0.16).wait(N.to)
  return w
}

/** The Baron: down out of the vault a blow a step, hanging before the Duke bobbing on his suspensors, and up and away. */
const BARON_AT: Pt = [82.05, -1.25]
function baron(): Walk {
  const [b0, b1, b2, b3] = N.baron
  const w = new Walk([82.3, -6.6], b0 - 0.01)
  w.roll([[82.2, -3.95]], b1, 'inout').roll([[82.1, -2.4]], b2, 'inout').roll([[82.05, -1.5]], b3, 'inout').roll([BARON_AT], b3 + 0.9, 'out')
  const t0 = b3 + 0.9
  const bob = (t: number): Pt => [BARON_AT[0] + 0.04 * Math.sin((t - t0) * 0.9), BARON_AT[1] - 0.09 * Math.sin((t - t0) * 2.1)]
  w.ride(bob, N.flee)
  w.roll([[82.4, -6.9]], N.flee + 1.25, 'in')
  return w
}

/** A soldier through Paul's door: in off the terrace (out of frame) at speed, through the door on `entry`, to `x`. */
function trooper(entry: number, x: number, from: number): Walk {
  const door = 99.6
  const w = new Walk(deck(from, rS), N.door - 0.1)
  const d1 = from - door
  const d2 = door - x
  const t1 = 0.55
  w.wait(entry - t1).roll([deck(door, rS)], entry, 'in').roll([deck(x, rS)], entry + (t1 * d2) / d1, 'out')
  return w
}

const S = N.soldiers
const SOLDIER_RUNS: Walk[] = [
  // S0 between the two of them, S1 and S2 at Paul's right, S3 at the door.
  trooper(S[0], 95.15, 101.6),
  trooper(S[1], 96.15, 102.2),
  trooper(S[2], 96.65, 102.8),
  trooper(S[3], 98.7, 103.4),
]
// Taken: S3 and S1 lead out to the ornithopter's nose and up into its seats; S2 stands at its nose, S0 behind them.
along(SOLDIER_RUNS[3].wait(N.taken - 0.05), 119.45, rS, 241.3).hop(harkSeat(241.6, 0), 241.6).ride((t) => harkSeat(t, 0), N.hall)
along(SOLDIER_RUNS[1].wait(N.taken), 119.05, rS, 241.55).hop(harkSeat(241.88, 1), 241.88).ride((t) => harkSeat(t, 1), N.hall)
along(SOLDIER_RUNS[2].wait(N.taken + 0.05), 120.3, rS, 241.7).wait(N.hall)
along(SOLDIER_RUNS[0].wait(N.taken + 0.1), 115.2, rS, 242.1).wait(N.hall)

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

/** Two guards in the hall either side of the Duke, facing him, gone grey in the gas. */
const GUARDS: Actor[] = [
  { ...soldier(10, new Run(new Walk([78.05, -rS], N.hall).wait(N.to).segs, 'guard 0'), N.guards[0]), markAt: looking([[N.hall, N.to + 1, 0]]) },
  { ...soldier(11, new Run(new Walk([83.95, -rS], N.hall).wait(N.to).segs, 'guard 1'), N.guards[1]), markAt: looking([[N.hall, N.to + 1, Math.PI]]) },
]

/** The framings the hall is cut between: the two of them face to face, the Baron alone, the Duke alone. */
const TWO: Pt = [80.9, -1.7]
const BARON_CLOSE: Pt = [82.4, -0.95]
const DUKE_CLOSE: Pt = [79.9, -1.0]
/** Paul at his window, close. */
const WINDOW_CLOSE: Pt = [95.3, -16.1]

const shots: Shot[] = [
  // The palace at night, dissolving in, low: its lamps, the shield's line over it.
  { t: N.from, cells: 34, at: [92, -15], cut: true },
  { t: N.window - 0.002, cells: 31, at: [92, -14.5] },
  // Paul at his window.
  { t: N.window, cells: 3.6, at: WINDOW_CLOSE, cut: true },
  { t: N.duke - 0.002, cells: 3.5, at: [95.2, -16.05] },
  // The Duke alone under his father's bull.
  { t: N.duke, cells: 3.9, at: [80.6, -1.75], cut: true },
  { t: N.dome - 0.002, cells: 3.8, at: [80.55, -1.8] },
  // Out over the whole city under its shield; the shield goes out from its crown down across the sky.
  { t: N.dome, cells: 70, at: [70, -31], cut: true },
  { t: N.armada - 0.002, cells: 66, at: [72, -30] },
  // Two of the armada's ships come in low over the roof.
  { t: N.armada, cells: 18, at: [74, -31], cut: true },
  { t: N.sky - 0.002, cells: 18, at: [77, -31] },
  // All of it over the city, and the first fires.
  { t: N.sky, cells: 80, at: [88, -38], cut: true },
  { t: N.roof - 0.002, cells: 77, at: [88, -36.5] },
  // In close on the roof: the shell, and the fire running along it.
  { t: N.roof, cells: 7, at: [88.5, -25.2], cut: true },
  { t: N.watch - 0.002, cells: 7.4, at: [89, -25.5] },
  // Paul at his window in the burning city's light; his mother comes to him; the blast over the window.
  { t: N.watch, cells: 3.6, at: WINDOW_CLOSE, cut: true },
  { t: N.mother + 2.3, cells: 3.8, at: [95.0, -16.1] },
  { t: N.terrace - 0.002, cells: 3.8, at: [95.0, -16.1] },
  // The terrace: the Harkonnen ornithopter comes down out of the smoke onto the pad.
  { t: N.terrace, cells: 9, at: [115.5, -17.6], cut: true },
  { t: N.room - 0.002, cells: 8.6, at: [116, -17.4] },
  // In close in Paul's room: the door breaks, the soldiers, the two of them taken up and carried out.
  { t: N.room, cells: 4.0, at: [96.3, -16.1], cut: true },
  { t: N.taken, cells: 4.0, at: [96.4, -16.1] },
  { t: N.across - 0.002, cells: 4.1, at: [97.4, -16.05] },
  // Across the terrace with them, into the ornithopter's hold.
  { t: N.across, cells: 4.2, at: [114.6, -15.95], cut: true },
  { t: N.lift - 0.002, cells: 4.3, at: [115.2, -16.1] },
  // It lifts and goes.
  { t: N.lift, cells: 8.6, at: [118.5, -17.8], cut: true },
  { t: N.hall - 0.002, cells: 9, at: [119, -18.4] },
  // The great hall: the Duke bound under the bull, the guards either side.
  { t: N.hall, cells: 5.4, at: [80.6, -2.3], cut: true },
  { t: N.baron[0] - 0.002, cells: 5.2, at: [80.7, -2.2] },
  // Face to face: the Baron comes down to him.
  { t: N.baron[0], cells: 3.9, at: TWO, cut: true },
  { t: N.baron[3] - 0.002, cells: 3.8, at: TWO },
  // The Baron, bobbing before him.
  { t: N.baron[3], cells: 2.6, at: BARON_CLOSE, cut: true },
  { t: N.bite - 0.002, cells: 2.5, at: BARON_CLOSE },
  // The Duke: the tooth.
  { t: N.bite, cells: 2.5, at: DUKE_CLOSE, cut: true },
  { t: N.gas[0] - 0.002, cells: 2.4, at: [79.95, -1.0] },
  // The gas between them; the guards go grey; the Baron goes up and away.
  { t: N.gas[0], cells: 3.9, at: TWO, cut: true },
  { t: N.last - 0.002, cells: 3.7, at: [80.85, -1.7] },
  // The Duke, close, as his colour goes out.
  { t: N.last, cells: 2.4, at: DUKE_CLOSE, cut: true },
  { t: N.fall - 0.002, cells: 2.3, at: [79.9, -1.05] },
  // Back out: the bull over him in the gas.
  { t: N.fall, cells: 5.0, at: [80.6, -2.2], cut: true },
  { t: N.to - 0.002, cells: 6.4, at: [80.6, -2.6] },
]

export const attack: Scene = {
  key: 'attack',
  from: N.from,
  to: N.to,
  dissolves: [[N.from, N.dissolve]],
  moves: { paul: paul().segs, jessica: jessica().segs, leto: leto().segs, baron: baron().segs },
  looks: {
    // Paul out at the burning city; at his mother as she comes; at the door when it breaks.
    paul: [[N.from, N.mother + 1.2, -0.9], [N.mother + 1.5, N.door, Math.PI * 0.92], [N.door + 0.05, N.taken, 0]],
    jessica: [[N.from, N.mother, 0], [N.mother + 2.4, N.door, 0], [N.door + 0.05, N.taken + 0.1, 0]],
    // The Duke up at the bull; bound, slumped; at the Baron when he comes; slumped again in death.
    leto: [[N.from, N.hall - 0.05, -1.2], [N.hall, N.baron[1], 1.45], [N.baron[1] + 0.2, N.death, -0.12], [N.death + 0.1, N.to + 1, 1.5]],
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
    ['the shield over the city', N.dome],
    ['the shield goes out', N.shieldOut],
    ['the armada comes in low', N.armada],
    ['all of it over the city', N.sky],
    ['close on the roof', N.roof],
    ...N.hits.map((t, i): [string, number] => [`shell ${i + 1} lands`, t]),
    ['Paul watching', N.watch],
    ['his mother comes to him', N.mother],
    ['the terrace', N.terrace],
    ['the ornithopter sets down on the pad', N.landed],
    ['back in Paul\'s room', N.room],
    ['the door breaks', N.door],
    ...S.map((t, i): [string, number] => [`soldier ${i + 1} through the door`, t]),
    ['they are taken', N.taken],
    ['across the terrace', N.across],
    ['the ornithopter lifts', N.lift],
    ['and goes', N.away],
    ['the great hall', N.hall],
    ...N.baron.map((t, i): [string, number] => [`the Baron comes down, ${i + 1}`, t]),
    ['the Duke bites the tooth', N.bite],
    ...N.gas.map((t, i): [string, number] => [`the gas, ${i + 1}`, t]),
    ...N.guards.map((t, i): [string, number] => [`guard ${i + 1} goes grey`, t]),
    ['the Baron flees', N.flee],
    ['the Duke, close', N.last],
    ['the Duke\'s colour goes out', N.death],
    ['back out; the lamps swing', N.fall],
  ],
}
