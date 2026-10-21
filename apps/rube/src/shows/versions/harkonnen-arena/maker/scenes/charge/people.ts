import { R } from '../../../../../../parts'
import { CHANI_SIZE, FREMEN, FREMEN_ID, FREMEN_RIM, FREMEN_SIZE } from '../../cast'
import { beat, COMBS } from '../../music'
import { hold, hop, over, ride, Path, type Move } from '../../motion'
import type { Pt } from '../../paint'
import type { Actor } from '../../show'
import { B, FROM, RISE, TO, ground, leadWorm } from './plan'

/**
 * Who rides and runs in the charge.
 *
 * Paul and Chani ride the lead worm's back from the moment it comes out of the storm, through the camp, over the rearing
 * and the crash; it lowers them to the sand, and they get down, and go up onto the rise between the ranks and the great
 * ship. He stays there, looking east over the field. After the music she goes, alone, west back into the desert, and
 * he turns to look after her.
 *
 * Two Fremen ride ahead of them on the back and get down east of the rise. A dozen more run out of the storm's skirt on
 * foot, a stride on every beat of the charge, and stop in knots by the wreck, east of the rise.
 */

/** Where each sits on the lead worm's back, cells behind its head. */
const PAUL_S = 31.4
const CHANI_S = 33
const RIDERS_S = [28.8, 30.0]

const seat = (s: number, size: number) => (t: number): Pt => leadWorm(t).backAt(s, R * size)
const onSand = (x: number, size = 1): Pt => [x, ground(x) - R * size]

/** The charge's beats, by number. */
const bt = (n: number) => beat('charge', n)

/** When Paul turns from the field to look after Chani. */
const PAUL_TURNS = 327.5

/** Paul: on the back, down onto the sand on the beat after the worm lowers him, up the rise, and there. */
export const paulMoves: Move[] = (() => {
  const land = onSand(RISE.x - 3.6)
  return [
    ride(seat(PAUL_S, 1), FROM, B.off),
    hop(seat(PAUL_S, 1)(B.off), land, B.off, bt(70)),
    hold(land, bt(70), bt(72), 0),
    over(ground, land[0], RISE.x - 0.25, bt(72), bt(77), 'inout'),
    hold(onSand(RISE.x - 0.25), bt(77), PAUL_TURNS, -0.08),
    // When she has gone a little way, he turns to look after her.
    hold(onSand(RISE.x - 0.25), PAUL_TURNS, TO, Math.PI - 0.25),
  ]
})()

/** When Chani leaves him, and how far she goes. */
export const CHANI_GOES = 321.6
/** Where she has got to by the end: west, alone, back into the desert. */
export const CHANI_AWAY = RISE.x - 24
export const chaniMoves: Move[] = (() => {
  const land = onSand(RISE.x - 7, CHANI_SIZE)
  const top = RISE.x - 2.4
  return [
    ride(seat(CHANI_S, CHANI_SIZE), FROM, bt(70)),
    hop(seat(CHANI_S, CHANI_SIZE)(bt(70)), land, bt(70), bt(71)),
    hold(land, bt(71), bt(73), 0),
    over(ground, land[0], top, bt(73), bt(78), 'inout', CHANI_SIZE),
    hold(onSand(top, CHANI_SIZE), bt(78), CHANI_GOES, 0.1),
    over(ground, top, CHANI_AWAY, CHANI_GOES, TO - 1.5, 'inout', CHANI_SIZE),
    hold(onSand(CHANI_AWAY, CHANI_SIZE), TO - 1.5, TO, Math.PI),
  ]
})()

/** The four Fremen who ride with them: down onto the sand on the beats after them, and standing there. */
function rider(i: number): Actor {
  const s = RIDERS_S[i]
  const down = 69 + [1, 2][i]
  // They are ahead of Paul on the back, and get down east of the rise, away from him.
  const tOff = bt(down)
  const from = seat(s, FREMEN_SIZE)(tOff)
  const land = onSand(RISE.x + [7.2, 10.6][i], FREMEN_SIZE)
  const moves: Move[] = [
    ride(seat(s, FREMEN_SIZE), FROM, tOff),
    hop(from, land, tOff, bt(down + 1)),
    hold(land, bt(down + 1), TO, [0.1, -0.2][i]),
  ]
  return { id: FREMEN_ID + 50 + i, color: FREMEN, rim: FREMEN_RIM, size: FREMEN_SIZE, path: new Path(moves, `rider ${i}`, FREMEN_SIZE), turn: [0.4, 2.2][i] }
}

/**
 * Where each runner waits in the skirt, the beat he sets off on, and where he stops. The first away go furthest, and
 * every one is past the rise before Paul and Chani get down onto it. They stop in three knots, near the wreck.
 */
const RUNNERS: { x0: number; go: number; stop: number }[] = [
  { x0: 8932, go: 2, stop: 9122.4 },
  { x0: 8926, go: 2, stop: 9121.8 },
  { x0: 8936, go: 3, stop: 9121.1 },
  { x0: 8921, go: 3, stop: 9120.5 },
  { x0: 8929, go: 4, stop: 9114.6 },
  { x0: 8917, go: 4, stop: 9113.9 },
  { x0: 8934, go: 5, stop: 9113.3 },
  { x0: 8924, go: 5, stop: 9112.6 },
  { x0: 8930, go: 6, stop: 9106.8 },
  { x0: 8933, go: 6, stop: 9106.2 },
  { x0: 8936, go: 7, stop: 9105.4 },
  { x0: 8928, go: 7, stop: 9104.8 },
]
/** A stride, cells: one a beat. */
const STRIDE = 3

function runner(i: number): Actor {
  const { x0, go, stop } = RUNNERS[i]
  const beats = COMBS.charge.beats
  const moves: Move[] = []
  let x = x0
  let n = go
  moves.push(hold(onSand(x, FREMEN_SIZE), FROM, bt(n), 0))
  while (x < stop - 1e-6 && n + 1 < beats.length) {
    const nx = Math.min(stop, x + STRIDE)
    moves.push(hop(onSand(x, FREMEN_SIZE), onSand(nx, FREMEN_SIZE), bt(n), bt(n + 1), 4.5))
    x = nx
    n++
  }
  moves.push(hold(onSand(x, FREMEN_SIZE), bt(n), TO, [0, -0.25, 0.3, -0.1, 0.15, 0.4, -0.35, 0.05, 0.25, -0.2, 0.1, -0.4][i]))
  return { id: FREMEN_ID + 60 + i, color: FREMEN, rim: FREMEN_RIM, size: FREMEN_SIZE, path: new Path(moves, `runner ${i}`, FREMEN_SIZE), turn: hashTurn(i) }
}

const hashTurn = (i: number) => ((i * 2.399) % (Math.PI * 2)) - Math.PI

/** The beats the runners land on, for the strikes: every one is a beat of the comb by construction; a few to name. */
export const STRIDE_BEATS = RUNNERS.map((r) => bt(r.go + 1))

export const fremen: Actor[] = [...[0, 1].map(rider), ...RUNNERS.map((_, i) => runner(i))]
