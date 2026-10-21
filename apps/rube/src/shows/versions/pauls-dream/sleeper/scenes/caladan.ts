import type { Shot } from '../camera'
import { JESSICA, LETO, MOTHER, PAUL } from '../cast'
import { bell, kick, ring, standing, type Pt } from '../paint'
import { Walk } from '../path'
import { DREAM_SHOT, FOLD, PLACES, WINDOWS } from '../plan'
import type { Scene } from '../scene'
import { castle, castleOver, faceAt, painAt } from './caladan/castle'
import { BED, BOX, HALL, RAMP, ROOM, SEAT, TEST, T } from './caladan/geo'
import { clouds, field, frigateAt, frigateOver, frigateUnder, heighliner, heights, holdLip } from './caladan/leaving'
import { cliff, headlands, nearWater, rain, sea, sky, spray } from './caladan/sea'

/**
 * Caladan (0 → the drop): the sea, the dream, the box, the bull, the leaving. Grey-green and wet, in the old scope
 * picture; the only warm things are the castle's lamps.
 *
 * - The sea: long swells running in from the west under rain, breaking on the cliff on the figure every five seconds,
 *   the great wave on the first low swell; the camera comes in off the sea and up the cliff to one lit window.
 * - The dream: Paul asleep; on the lament he stirs; on the call an opening grows from him onto a desert at dawn and a
 *   girl on a crest turning toward him (the Fremen scene's dream shot, the show's own future); he wakes on the swell.
 * - The box: the Reverend Mother's test. His hand in the box, the gom jabbar at his neck; the box's seam burns on every
 *   blow of the lament while Jessica waits outside the door; it ends on the figure.
 * - The bull: Leto at the hall's window over the sea; the bull's head that killed his father comes down off the wall
 *   into its crate, a pull a note: the house is leaving.
 * - The leaving: up the ramp, the lift on the build's swell, the climb through the cloud, the heighliner's hold, and
 *   the frigate at rest in it on the drop, where the fold hands it to Arrakis.
 */

const [from, to] = WINDOWS.caladan
const R = 0.13
const floorOf = (y: number, size = 1): number => y - R * size

/** Paul. */
const asleep: Pt = [(BED.x0 + BED.x1) / 2 - 0.25, floorOf(BED.top)]
const atWindow: Pt = [ROOM.x0 + 1.15, floorOf(ROOM.floor)]
const inPassage: Pt = [TEST.x1 + 1.25, floorOf(TEST.floor)]
const nearBox: Pt = [BOX.x + BOX.w / 2 + 0.55, floorOf(TEST.floor)]
const inBox: Pt = [BOX.x + BOX.w / 2 + R - 0.11, floorOf(TEST.floor)]
const hallIn: Pt = [HALL.x1 + 0.6, floorOf(HALL.floor)]
const byLeto: Pt = [HALL.x0 + 1.45, floorOf(HALL.floor)]
const underHead: Pt = [-553.55, floorOf(HALL.floor)]
const rampFoot = (i: number): Pt => [RAMP.foot[0] - 0.8 - i * 0.75, floorOf(-12)]
const aboard: Pt = [RAMP.top[0] + 0.5, RAMP.top[1] - 0.05]

const paul = new Walk(asleep, from)
  .wait(T.stir)
  // He stirs on the lament: a turn in his sleep and back.
  .roll([[asleep[0] + 0.09, asleep[1]]], T.stir + 0.9)
  .roll([asleep], T.stir + 2.2)
  .wait(T.wake)
  // He wakes on the swell, off the bed onto the floor, and goes to his window.
  .hop([BED.x0 - 0.3, floorOf(ROOM.floor)], T.wake + 0.42)
  .roll([atWindow], T.look + 1.4, 'inout')
  .wait(T.door)
  // The test room: in from the passage behind his mother, to the box; his hand into it; out of it when it is over.
  .jump([inPassage[0] + 0.7, inPassage[1]])
  .wait(T.door + 0.6)
  .roll([nearBox], T.atBox, 'inout')
  .wait(T.hand - 0.55)
  .roll([inBox], T.hand, 'in')
  // The pain: he shakes on every blow of the lament, and shivers while it lasts, and does not take his hand out.
  .ride((t) => [inBox[0] + tremble(t), inBox[1]], T.over)
  .roll([[nearBox[0] + 0.25, nearBox[1]]], T.over + 0.9, 'out')
  .wait(T.open + 0.4)
  .roll([[TEST.x1 - 0.7, nearBox[1]]], 85.04, 'inout')
  .wait(T.hall)
  // The hall: in to his father at the window over the sea; then under the head as it comes down.
  .jump(hallIn)
  .roll([byLeto], T.hall + 2.0, 'out')
  .wait(T.inside + 0.8)
  .roll([underHead], T.lower[0] - 0.2, 'inout')
  .wait(T.field)
  // The field: last up the ramp, into the ship.
  .jump(rampFoot(2))
  .wait(T.field + 0.6)
  .roll([RAMP.foot, aboard], T.field + 1.5, 'in')
  .ride(() => aboard, to, undefined, { hidden: true })

const jessica = new Walk([inPassage[0] - 0.2, inPassage[1]], T.door)
  .wait(T.door + 0.35)
  .roll([[TEST.x1 - 0.55, inPassage[1]]], T.test, 'inout')
  .wait(T.sent)
  // Sent out: she goes, the door shuts, and she waits against it.
  .roll([[TEST.x1 + 0.55, inPassage[1]]], T.shut - 0.4, 'inout')
  // Against the door she flinches on the same blows he does, and is still between them.
  .ride((t) => [TEST.x1 + 0.55 + flinch(t), inPassage[1]], T.open)
  .roll([[TEST.x1 - 0.35, inPassage[1]]], T.open + 0.9, 'inout')
  .wait(T.hall)
  .jump(rampFoot(1))
  .wait(T.field)
  .wait(T.field + 0.3)
  .roll([RAMP.foot, aboard], T.field + 1.2, 'in')
  .ride(() => aboard, to, undefined, { hidden: true })
// Her segments in the hall's window would be none: she is not there. Between the box and the field she is off the
// stage, so her run has a gap from the hall's cut to the field's (`Run.covers`).
const jessicaSegs = jessica.segs.filter((s) => !(s.t0 >= T.hall - 1e-6 && s.t1 <= T.field + 1e-6 && s.kind === 'rest'))

const leto = new Walk([HALL.x0 + 0.85, floorOf(HALL.floor, LETO.size)], T.hall)
  .wait(T.inside + 0.4)
  .roll([[underHead[0] - 0.5, floorOf(HALL.floor, LETO.size)]], T.lower[0] - 0.4, 'inout')
  .wait(T.field)
  .jump(rampFoot(0))
  .roll([RAMP.foot, aboard], T.field + 0.9, 'in')
  .ride(() => aboard, to, undefined, { hidden: true })

const mother = new Walk([SEAT[0], floorOf(TEST.floor - 0.2, MOTHER.size)], T.door).wait(T.hall)

/** His shaking in the box: a start on each blow, ringing down, and a small shiver under it while the pain lasts. */
function tremble(t: number): number {
  const blows = T.blows.reduce((sum, b) => sum + ring(t, b, 7, 0.22), 0)
  return 0.016 * blows + 0.0035 * painAt(t) * Math.sin(2 * Math.PI * 6.5 * t)
}

/** Her flinch outside the door, on his blows: toward the door and back. */
function flinch(t: number): number {
  return -0.03 * T.blows.reduce((sum, b) => sum + kick(t, b, 0.08, 0.7), 0)
}

/** The camera: the sea, the cliff and the window; the room; the test; the hall; the field and the climb. */
const shots: Shot[] = [
  // The sea, the cliff, the castle on it, one window lit; slowly in.
  { t: 0, cells: 48, at: [-584, -17.5] },
  { t: T.rise, cells: 40, at: [-576, -19.5] },
  // Up the cliff and in to the window, through the wall.
  { t: 21, cells: 11, at: [-559.5, -25.5] },
  { t: T.window, cells: 3.2, at: [-556.15, -26.98] },
  { t: T.wake, cells: 3.0, at: [-556.1, -26.95] },
  { t: T.door - 0.002, cells: 2.95, at: [-556.4, -26.92] },
  // The test room: the door slides, they come in.
  { t: T.door, cells: 3.3, at: [-543.4, -20.05], cut: true },
  { t: T.atBox, cells: 3.0, at: [-544.0, -19.95] },
  { t: T.neck, cells: 2.6, at: [-544.3, -19.8] },
  { t: T.outside - 0.002, cells: 2.2, at: [-544.35, -19.7] },
  // Outside the door: Jessica waits against it.
  { t: T.outside, cells: 2.3, at: [-540.55, -19.8], cut: true },
  { t: T.back - 0.002, cells: 2.15, at: [-540.55, -19.75] },
  { t: T.back, cells: 1.95, at: [-544.35, -19.62], cut: true },
  { t: T.over, cells: 1.9, at: [-544.35, -19.6] },
  { t: T.open + 1.6, cells: 3.2, at: [-543.3, -20.0] },
  { t: T.hall - 0.002, cells: 3.2, at: [-543.3, -20.0] },
  // The hall: Leto at the window over the sea, the head on the wall.
  { t: T.hall, cells: 5.1, at: [-555.2, -14.05], cut: true },
  { t: T.sea - 0.002, cells: 4.9, at: [-555.4, -14.0] },
  // From the sea: the two of them small in a window of the tower on its cliff.
  { t: T.sea, cells: 19, at: [-565.5, -16.0], cut: true },
  { t: T.inside - 0.002, cells: 17.5, at: [-565.0, -15.8] },
  // Back in: the head comes down into its crate.
  { t: T.inside, cells: 4.7, at: [-554.6, -14.0], cut: true },
  { t: T.lid, cells: 4.4, at: [-554.4, -13.95] },
  { t: T.field - 0.002, cells: 4.4, at: [-554.4, -13.95] },
  // The field, the lift, the climb, the heighliner, the hold.
  { t: T.field, cells: 15, at: [-498.5, -15.6], cut: true },
  { t: T.lift, cells: 16, at: [-497.5, -16.2] },
  { t: T.lift + 1.4, cells: 22, on: frigateAt, off: [0, -2] },
  { t: T.clouds, cells: 70, on: frigateAt, off: [0, -14] },
  { t: 107.4, cells: 240, on: frigateAt, off: [0, -55] },
  { t: T.hold, cells: 80, on: frigateAt, off: [0, -8] },
  { t: T.fold - 0.002, cells: FOLD.cells, on: frigateAt },
]

/** The dream: from the call, an opening grows from him onto the dream shot, holds, and closes before he wakes. */
const dream = {
  from: T.dream,
  to: T.wake - 0.3,
  at: DREAM_SHOT.from,
  rate: (DREAM_SHOT.to - DREAM_SHOT.from - 0.2) / (T.wake - 0.3 - T.dream),
  a: (t: number) => bell(t, T.dream, T.dream + 1.6, T.wake - 3.4, T.wake - 0.4),
  iris: (t: number) => {
    const grow = bell(t, T.dream, T.dream + 5.5, T.wake - 3.6, T.wake - 0.6)
    return { x: asleep[0] + 0.15, y: asleep[1] - 0.25, r: 0.25 + 1.75 * grow, soft: 0.9 }
  },
}

const box = { x0: PLACES.caladan.x0, y0: -260, x1: PLACES.caladan.x1, y1: 40 }

export const caladan: Scene = {
  key: 'caladan',
  from,
  to,
  moves: { paul: paul.segs, jessica: jessicaSegs, leto: leto.segs, mother: mother.segs },
  looks: {
    // At his window, at the sea; at the box, toward her; with his father, at the sea; under the head, up at it.
    paul: [[T.look + 1.0, T.door - 0.05, Math.PI], [T.atBox - 0.3, T.over + 0.8, Math.PI], [T.hall + 1.6, T.inside + 0.6, Math.PI], [T.lower[0] - 0.1, T.lid + 0.6, -Math.PI / 2 - 0.45]],
    leto: [[T.hall, T.inside + 0.3, Math.PI], [T.lower[0] - 0.3, T.lid + 0.6, -Math.PI / 2 - 0.3]],
    jessica: [[T.shut - 0.3, T.open, Math.PI]],
  },
  shots,
  dreams: [dream],
  scope: [[0, 1]],
  pieces: [
    standing('caladan-air', box, (g) => {
      if (g.t >= to) return
      sky(g)
      headlands(g)
      sea(g)
      clouds(g, false)
    }),
    standing('caladan-land', box, (g) => {
      if (g.t >= to) return
      field(g)
      castle(g)
      cliff(g)
      nearWater(g)
      // Above the cloud, all of that goes under the sky of the heights; the heighliner hangs in it.
      heights(g)
      heighliner(g)
      frigateUnder(g)
    }, (g) => {
      if (g.t >= to) return
      castleOver(g, paul.segs.length ? whereAt(g.t) : asleep)
      spray(g)
      frigateOver(g)
      holdLip(g)
      clouds(g, true)
      // Rain is outside: it goes as the camera comes in through the wall, and stops above the cloud.
      rain(g, faceAt(g.t) * (1 - Math.min(1, Math.max(0, (g.view.cy + 40) / -30))))
    }),
  ],
  strikes: [
    ...T.waves.map((t, i): [string, number] => [`wave ${i}`, t]),
    ['the great wave', T.great],
    ['he stirs', T.stir],
    ['the dream opens', T.dream],
    ['he wakes', T.wake],
    ['the door', T.door],
    ['at the box', T.atBox],
    ['sent out', T.sent],
    ['the door shuts', T.shut],
    ['his hand in the box', T.hand],
    ['the needle at his neck', T.neck],
    ...T.blows.map((t, i): [string, number] => [`blow ${i}`, t]),
    ['it is over', T.over],
    ['the door opens', T.open],
    ['the hall', T.hall],
    ['the sea', T.sea],
    ...T.lower.map((t, i): [string, number] => [`the head comes down ${i}`, t]),
    ['the lid', T.lid],
    ['the field', T.field],
    ['the lift', T.lift],
    ['the hold', T.hold],
    ['the fold', T.fold],
  ],
  // They go into the frigate behind its hull.
  covered: [[T.field + 0.9, LETO.id], [T.field + 1.2, JESSICA.id], [T.field + 1.5, PAUL.id]],
}

/** Where Paul is, for the gom jabbar's point. */
function whereAt(t: number): Pt {
  let at: Pt = asleep
  for (const s of paul.segs) if (t >= s.t0) at = s.at(Math.min(t, s.t1))
  return at
}

