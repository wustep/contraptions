import type { Shot } from '../camera'
import { DEAD, SOLDIER } from '../cast'
import { seat } from '../craft/thopter'
import { bell, lerp, mix, ring, smooth, standing, type Pt } from '../paint'
import { Run, Walk } from '../path'
import { PLACES } from '../plan'
import type { Dream, Scene } from '../scene'
import type { Actor } from '../show'
import { HOLD, craftAt, drawCraft, drawCraftOver, drawDoorway, heaveAt, onCraft, pose, wobble } from './storm/craft'
import { FROM, JAMIS_IN_VISION, LANDING, T, TENT, TO, VISIONS, ground, keyed, onFloor } from './storm/geo'
import { drawHunters, drawHuntersOver } from './storm/hunters'
import { drawLand } from './storm/land'
import { drawTent, drawTentOver } from './storm/tent'
import { drawInside, drawVeil, drawWall } from './storm/wall'

/**
 * Put down in the night desert, the visions, and the storm (275.17 to 336).
 *
 * The great blow has fallen in Arrakeen. A Harkonnen ornithopter carries Paul and Jessica out over the dark dunes,
 * bound in its hold, the city burning low on the horizon behind. On the second low boom Jessica's Voice turns the guard
 * on the pilot; they go still together, and the ornithopter, flown by no one, comes down on a dune. The hold's door
 * slides back and the two of them come out into the night, go up into the lee of the dune and pitch the stilltent, and
 * the camera goes back and back in the hush until they are nothing in the desert.
 *
 * On the high voice the tent, close: the spice thick in its still air, and Paul's visions open out of him one after the
 * other through soft openings in the dark: the girl on the crest he dreamed on Caladan; the duel with Jamis, its blows
 * on this phrase's own drums, fifty seconds early; the worm rising with a rider on it. They close, and the dawn greys
 * the cloth.
 *
 * At dawn the hunters come over the dunes behind. Paul and Jessica run to the ornithopter (Paul at its controls now),
 * up on the drum fill, and on its boom the storm stands ahead from the sand to the sky. The chase east to it; into it on
 * a boom; the wings folded and the drop through the dust; the hunters torn apart, one on each of two booms; the wings
 * open on the last fill and out of the storm's back into the morning, gliding down.
 */

const R = 0.13

const hold = (who: 'paul' | 'jessica') => (t: number): Pt => onCraft(pose(t), HOLD[who])

/** Rolling along the floor from `a` to `b` (x), as points a ball's radius above it. */
function along(a: number, b: number, r = R): Pt[] {
  const n = Math.max(2, Math.ceil(Math.abs(b - a) / 0.25))
  return Array.from({ length: n + 1 }, (_, i) => onFloor(lerp(a, b, i / n), r))
}

/** Where they lie in the tent. */
const IN_TENT = { paul: TENT - 0.2, jessica: TENT + 0.22 }

/**
 * Paul: bound in the hold, out at the back onto the sand; across the dissolve, beside the tent pitched in the lee of the
 * dune, and into it; in it through the night, and back to the controls at dawn.
 */
function paulMoves() {
  const edge = (t: number): Pt => onCraft(pose(t), [-0.98, 0.02])
  const w = new Walk(hold('paul')(FROM), FROM)
    .ride(hold('paul'), T.hatch + 0.65)
    .roll([edge(T.hatch + 1.1)], T.hatch + 1.1, 'in')
    .hop(onFloor(LANDING - 1.55, R), T.hatch + 1.45)
    .wait(T.pitched)
    .jump(onFloor(TENT + 0.9, R))
    .wait(T.inside[0] + 0.25)
    .roll(along(TENT + 0.9, IN_TENT.paul).slice(1), T.inside[1])
    .wait(T.out + 0.3)
  // Out of the tent at dawn, down to the ornithopter, and up into the pilot's seat on the fill.
  const sideX = LANDING + 1.0
  w.roll(along(IN_TENT.paul, sideX).slice(1), T.board - 0.38, 'in')
  const seat0 = (t: number): Pt => seat(pose(t), 0)
  w.hop(seat0(T.board), T.board)
  w.ride(seat0, TO)
  return w.segs
}

/** Jessica: the same, a little ahead of him out of the hold (she is nearer its door), and behind him at dawn. */
function jessicaMoves() {
  const edge = (t: number): Pt => onCraft(pose(t), [-0.98, 0.02])
  const w = new Walk(hold('jessica')(FROM), FROM)
    .ride(hold('jessica'), T.hatch + 0.45)
    .roll([edge(T.hatch + 0.75)], T.hatch + 0.75, 'in')
    .hop(onFloor(LANDING - 1.95, R), T.hatch + 1.1)
    .roll(along(LANDING - 1.95, LANDING - 2.35).slice(1), T.pitched - 0.1, 'out')
    .wait(T.pitched)
    .jump(onFloor(TENT + 1.25, R))
    .wait(T.inside[0])
    .roll(along(TENT + 1.25, IN_TENT.jessica).slice(1), T.inside[1] - 0.2)
    .wait(T.out)
  const sideX = LANDING + 0.55
  w.roll(along(IN_TENT.jessica, sideX).slice(1), 312.78, 'in')
  const seat1 = (t: number): Pt => seat(pose(t), 1)
  w.hop(seat1(313.15), 313.15)
  w.ride(seat1, TO)
  return w.segs
}

/**
 * The two Harkonnen soldiers in the cabin: on the Voice the guard lunges at the pilot, and on the same note they go
 * still together, the colour gone out of them. They ride the wreck down, and are gone from it by dawn (taken off it
 * while the camera is in the tent).
 */
function soldiers(): Actor[] {
  const lunge = (t: number) => smooth(t, T.voice, T.voice + 0.09)
  // The guard throws himself forward into the pilot, and both are knocked back a little off the blow and come to rest.
  const knock = (t: number) => 0.04 * ring(t, T.voice + 0.09, 3, 0.18)
  const pilot = new Walk(seat(pose(FROM), 0), FROM).ride((t) => onCraft(pose(t), [1.02 + 0.07 * lunge(t) + knock(t), -0.1 - 0.03 * lunge(t)]), 293)
  const guard = new Walk(seat(pose(FROM), 1), FROM).ride((t) => onCraft(pose(t), [0.6 + 0.24 * lunge(t) - knock(t), -0.1 + 0.01 * lunge(t)]), 293)
  const dead = (t: number) => mix(SOLDIER.color, DEAD, smooth(t, T.voice, T.voice + 0.16))
  return [
    { id: SOLDIER.id + 50, color: SOLDIER.color, rim: SOLDIER.rim, size: SOLDIER.size, run: new Run(pilot.segs, 'pilot'), colorAt: dead },
    { id: SOLDIER.id + 51, color: SOLDIER.color, rim: SOLDIER.rim, size: SOLDIER.size, run: new Run(guard.segs, 'guard'), colorAt: dead },
  ]
}

/* ---------------------------------------------------------------- the camera */

const LAND_Y = ground(LANDING)
const TENT_Y = ground(TENT)
/** Inside the storm: a little behind it, and slower than it to follow it down, so the drop is seen as a drop. */
const levelY = keyed([[323.5, -5.4], [326.0, -5.0], [329.5, -3.7], [332.5, -3.3]])
/** The camera rides with it a beat behind: some of its heave, some of its roll, so the ride is felt and nothing shakes. */
const level = (t: number): Pt => [craftAt(t)[0] - 0.6, levelY(t) + 0.5 * heaveAt(t - 0.3)]
const sway = (t: number): number => 0.4 * wobble(t - 0.35)

/**
 * The tent, in two framings, each a slow push in from one held framing to another, eased from rest to rest (as the
 * lens moves between two held shots that a cut bounds). The openings of the visions are placed by the same curve, so
 * each opens over its subject wherever the camera is.
 *
 * - The first, through the first two visions: the tent low at the left, Paul at about a sixth of the way across and
 *   low, the night over and right of them where the girl on the crest and the duel are.
 * - Cut, between the second vision and the third, to the two of them close, low in the middle, the rider over them.
 */
interface Push {
  t0: number
  t1: number
  c0: number
  c1: number
  /** Where Paul sits in the frame (shares across and down). */
  paul: Pt
}
const WIDE: Push = { t0: T.voiceIn, t1: 300.48, c0: 2.65, c1: 2.3, paul: [0.17, 0.85] }
const TWO: Push = { t0: T.vision3[0], t1: 309.4, c0: 1.62, c1: 1.5, paul: [0.42, 0.86] }
const PAUL_IN: Pt = [TENT - 0.2, TENT_Y - 0.13]

/** The held framing that puts Paul at `push.paul` in a frame `cells` tall. */
const holding = (push: Push, cells: number): Pt => [
  PAUL_IN[0] + (0.5 - push.paul[0]) * ((cells * 16) / 9),
  PAUL_IN[1] + (0.5 - push.paul[1]) * cells,
]

/** The camera through a push, as the lens moves it: position and log size on the same ease, from rest to rest. */
function through(push: Push, t: number): { at: Pt; cells: number } {
  const u = Math.max(0, Math.min(1, (t - push.t0) / (push.t1 - push.t0)))
  const e = u * u * (3 - 2 * u)
  const a = holding(push, push.c0)
  const b = holding(push, push.c1)
  return { at: [lerp(a[0], b[0], e), lerp(a[1], b[1], e)], cells: Math.exp(lerp(Math.log(push.c0), Math.log(push.c1), e)) }
}

const shots: Shot[] = [
  // The night flight, coming out of the dissolve: in on the cabin.
  { t: FROM, cells: 4.2, on: craftAt, off: [0.6, -0.4], cut: true },
  // Close on the cabin for the Voice: the guard goes for the pilot, and the colour goes out of both.
  { t: 276.75, cells: 2.5, on: craftAt, off: [0.86, -0.12] },
  { t: 277.5, cells: 2.4, on: craftAt, off: [0.86, -0.12] },
  // It falls; the camera lets it down onto the dune.
  { t: 278.85, cells: 4.6, on: craftAt, off: [0.2, -0.5] },
  { t: 279.5, cells: 5.0, at: [LANDING - 1.0, LAND_Y - 1.45] },
  // The hold opens and they come out onto the sand.
  { t: T.pitched - 0.002, cells: 5.3, at: [LANDING - 1.3, LAND_Y - 1.45] },
  // A dissolve, and the tent is pitched in the lee of the dune: they go into it, and the camera goes back and back in the
  // hush until they are nothing in the desert, the city burning on the horizon.
  { t: T.pitched, cells: 13, at: [LANDING - 4.6, -5.4], cut: true },
  { t: 288.07, cells: 20, at: [LANDING - 4.3, -7.2] },
  // The high voice: the tent, and a slow push in through the first two visions.
  { t: WIDE.t0, cells: WIDE.c0, at: holding(WIDE, WIDE.c0), cut: true },
  { t: WIDE.t1, cells: WIDE.c1, at: holding(WIDE, WIDE.c1) },
  // Between the second vision and the third, on a note: the two of them, close.
  { t: TWO.t0, cells: TWO.c0, at: holding(TWO, TWO.c0), cut: true },
  { t: TWO.t1, cells: TWO.c1, at: holding(TWO, TWO.c1) },
  { t: T.out - 0.05, cells: 3.1, at: [TENT + 0.55, TENT_Y - 1.1] },
  // Dawn: out of the tent, and back down to the ornithopter.
  { t: T.out, cells: 6.4, at: [719.7, -2.0], cut: true },
  { t: 312.4, cells: 6.5, at: [720.3, -2.05] },
  { t: T.board, cells: 6.6, on: craftAt, off: [-0.7, -0.7] },
  { t: T.wall - 0.002, cells: 7.4, on: craftAt, off: [0.4, -0.9] },
  // The fill's boom: the storm ahead, from the sand to the sky.
  { t: T.wall, cells: 46, at: [760, -18], cut: true },
  { t: 317.6, cells: 38, at: [758, -15] },
  { t: 320.6, cells: 22, on: craftAt, off: [7.5, -3.2] },
  { t: 322.578, cells: 15, on: craftAt, off: [5.5, -2.3] },
  // Close behind, the face of the storm filling the frame: in.
  { t: 322.58, cells: 7, on: craftAt, off: [0.7, -0.3], cut: true },
  // Inside, the camera flies level while the wings fold and it drops, so the drop is seen; the hunters behind it.
  { t: 324.2, cells: 6.8, on: level, roll: sway },
  { t: 330.6, cells: 6.6, on: level, roll: sway },
  { t: 332.5, cells: 6.6, on: craftAt, off: [0.4, -0.2], roll: sway },
  { t: T.burst - 0.002, cells: 6.6, on: craftAt, off: [0.4, -0.2], roll: sway },
  // Out of the storm's back into the morning.
  { t: T.burst, cells: 17, at: [842, -6.6], cut: true },
  { t: T.glide, cells: 16, at: [844.6, -6.1] },
  { t: TO, cells: 14.5, on: craftAt, off: [1.4, -2.1] },
]

/* ---------------------------------------------------------------- the visions */

/**
 * An opening onto a later moment, over its subject: the later frame is laid over this one where the opening is on the
 * screen, so it must stand where the subject stands in that frame (`at`, shares of the frame across and down), and be
 * a little under half the frame's height across. It grows out of Paul's head and moves up to its place as it opens,
 * and goes back into him as it closes. Its edge is soft, but narrow.
 */
function opening(push: Push, from: number, to: number, at: Pt, r: number, open: number, close: number) {
  return (t: number) => {
    const cam = through(push, t)
    const w = (cam.cells * 16) / 9
    const place: Pt = [cam.at[0] + (at[0] - 0.5) * w, cam.at[1] + (at[1] - 0.5) * cam.cells]
    const head: Pt = [PAUL_IN[0], PAUL_IN[1] - 0.15]
    const g = smooth(t, from, from + open) * (1 - smooth(t, to - close, to))
    return { x: lerp(head[0], place[0], g), y: lerp(head[1], place[1], g), r: (0.02 + (r - 0.02) * g) * cam.cells, soft: 0.035 * cam.cells }
  }
}

const dreams: Dream[] = [
  // The girl on the crest, from Caladan's dream: she stands at (0.60, 0.55) of her own frame.
  {
    from: T.vision1[0],
    to: T.vision1[1],
    at: VISIONS.chani.at,
    rate: VISIONS.chani.rate,
    a: (t) => 0.9 * bell(t, T.vision1[0], T.vision1[0] + 1.8, T.vision1[1] - 1.1, T.vision1[1]),
    iris: opening(WIDE, T.vision1[0], T.vision1[1], [0.6, 0.5], 0.22, 2.2, 1.1),
  },
  // The duel, on the fill: Paul and Jamis at (0.45 to 0.51, 0.68) of theirs.
  {
    from: T.vision2[0],
    to: T.vision2[1],
    at: VISIONS.duel.at,
    rate: VISIONS.duel.rate,
    a: (t) => 0.92 * bell(t, T.vision2[0], T.vision2[0] + 0.75, T.vision2[1] - 0.75, T.vision2[1]),
    iris: opening(WIDE, T.vision2[0], T.vision2[1], [0.48, 0.6], 0.32, 0.85, 0.75),
  },
  // The worm and its rider: the rider at (0.48, 0.39) of the worm's shot, over the two of them.
  {
    from: T.vision3[0],
    to: T.vision3[1],
    at: VISIONS.rider.at,
    rate: VISIONS.rider.rate,
    a: (t) => 0.92 * bell(t, T.vision3[0], T.vision3[0] + 1.2, T.vision3[1] - 1.6, T.vision3[1]),
    iris: opening(TWO, T.vision3[0], T.vision3[1], [0.49, 0.4], 0.32, 1.8, 1.6),
  },
]

/* ---------------------------------------------------------------- the drawings */

const BOX = { x0: PLACES.night.x0, y0: -160, x1: PLACES.night.x1, y1: 40 }
const live = (t: number) => t >= FROM - 3 && t < TO + 3

const pieces = [
  standing('storm-land', BOX, (g) => {
    if (!live(g.t)) return
    drawLand(g)
    drawWall(g)
    drawInside(g)
    drawTent(g)
    drawHunters(g)
    drawCraft(g)
    drawDoorway(g)
  }, (g) => {
    if (!live(g.t)) return
    drawTentOver(g)
    drawCraftOver(g)
    drawHuntersOver(g)
    drawVeil(g)
  }),
]

export const storm: Scene = {
  key: 'storm',
  from: FROM,
  to: TO,
  moves: { paul: paulMoves(), jessica: jessicaMoves() },
  // In the tent they look at each other; through the visions he looks up into them and she looks at him; in the air he
  // looks ahead, and she back at the hunters until the wall is close.
  looks: {
    paul: [[286.5, 287.95, 0], [T.voiceIn + 0.3, T.vision3[1] - 0.2, -1.0], [T.vision3[1] + 0.2, T.out + 0.25, 0], [T.wall, T.enter - 0.1, 0], [T.burst + 0.3, TO, 0.12]],
    jessica: [[286.5, 287.95, Math.PI], [T.voiceIn + 1.5, T.out - 0.05, Math.PI], [315.0, 319.4, Math.PI], [320.4, TO, 0]],
  },
  actors: soldiers(),
  shots,
  dissolves: [[T.dissolve, T.dissolveFor], [T.pitched, 1.8]],
  dreams,
  pieces,
  strikes: [
    ['the Voice: the guard turns on the pilot, and they go still', T.voice],
    ['the first vision opens on the high voice', T.voiceIn],
    ['the duel, on the fill', T.vision2[0]],
    ['Jamis goes down, in the vision', JAMIS_IN_VISION],
    ['the worm and its rider', T.vision3[0]],
    ['the visions close', T.vision3[1]],
    ['out of the tent at dawn', T.out],
    ['Paul in the pilot\'s seat', T.board],
    ['Jessica aboard', 313.15],
    ['the wings beat, up', T.lift],
    ['the storm ahead', T.wall],
    ['into the wall', T.enter],
    ['the wings folded', T.fold],
    ['the first hunter torn apart', T.breaks[0]],
    ['the second hunter torn apart', T.breaks[1]],
    ['the wings open', T.open],
    ['out of the storm', T.burst],
    ['the glide', T.glide],
  ],
}
