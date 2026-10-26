import { R } from '../../../../../../parts'
import { CHANI_SIZE, FREMEN, FREMEN_ID, FREMEN_RIM, FREMEN_SIZE } from '../../cast'
import { beat, COMBS } from '../../music'
import { hold, hop, over, ride, Path, type Move } from '../../motion'
import { hash, type Pt } from '../../paint'
import type { Actor } from '../../show'
import { chaniEnding, paulEnding } from './ending'
import { B, FROM, RISE, TO, ground, leadWorm } from './plan'

/**
 * Who rides and runs in the charge.
 *
 * Paul and Chani ride the lead worm's back from the moment it comes out of the storm, through the camp, over the rearing
 * and the crash; it lowers them to the sand, and they get down, and go up onto the rise between the ranks and the great
 * ship. Then the last image (`ending.ts`): on a dune above the field, he looks east over it; after the music she goes,
 * alone, west toward the low sun, and he turns to look after her.
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

/** Paul: on the back, down onto the sand on the beat after the worm lowers him, up the rise; then the last image. */
export const paulMoves: Move[] = (() => {
  const land = onSand(RISE.x - 3.6)
  return [
    ride(seat(PAUL_S, 1), FROM, B.off),
    hop(seat(PAUL_S, 1)(B.off), land, B.off, bt(70)),
    hold(land, bt(70), bt(72), 0),
    over(ground, land[0], RISE.x - 0.25, bt(72), bt(77), 'inout'),
    hold(onSand(RISE.x - 0.25), bt(77), B.last, -0.08),
    ...paulEnding,
  ]
})()

export const chaniMoves: Move[] = (() => {
  const land = onSand(RISE.x - 7, CHANI_SIZE)
  const top = RISE.x - 2.4
  return [
    ride(seat(CHANI_S, CHANI_SIZE), FROM, bt(70)),
    hop(seat(CHANI_S, CHANI_SIZE)(bt(70)), land, bt(70), bt(71)),
    hold(land, bt(71), bt(73), 0),
    over(ground, land[0], top, bt(73), bt(78), 'inout', CHANI_SIZE),
    hold(onSand(top, CHANI_SIZE), bt(78), B.last, 0.1),
    ...chaniEnding(CHANI_SIZE),
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
 * The Fremen on foot: thirty of them, waiting in the dust of the skirt, who burst out of it in a wave over six beats and
 * run east across the floor a stride on every beat, the line of them going on past the blocks and the rise to the great
 * ship. Each one's stride is a little his own; every one is past the rise before Paul and Chani get down onto it, and the
 * first away go furthest: they stop by the wreck in a few close knots, as people gather, not spaced out evenly along the
 * flat (from far off an even row of them read as a dotted line).
 */
const RUNNERS: { x0: number; go: number; stop: number; stride: number }[] = (() => {
  const out: { x0: number; go: number; stop: number; stride: number }[] = []
  const n = 30
  for (let i = 0; i < n; i++) {
    const go = 9 + Math.floor((i * 6) / n)
    const stride = 2.85 + 0.3 * hash(i, 41)
    const x0 = Math.max(8946 + 4 * hash(i, 42), 9100 - stride * (68 - go))
    // Four knots, the first away furthest east; within a knot each a ball and a little apart.
    const knot = Math.floor((i * 4) / n)
    const within = i - Math.ceil((knot * n) / 4)
    const centre = [9126.5, 9119.2, 9111.6, 9104.4][knot]
    out.push({ x0, go, stride, stop: centre - within * 0.31 + 0.06 * (hash(i, 43) - 0.5) })
  }
  return out
})()

function runner(i: number): Actor {
  const { x0, go, stop, stride } = RUNNERS[i]
  const beats = COMBS.charge.beats
  const moves: Move[] = []
  let x = x0
  let n = go
  moves.push(hold(onSand(x, FREMEN_SIZE), FROM, bt(n), 0))
  while (x < stop - 1e-6 && n + 1 < beats.length) {
    const nx = Math.min(stop, x + stride)
    moves.push(hop(onSand(x, FREMEN_SIZE), onSand(nx, FREMEN_SIZE), bt(n), bt(n + 1), 4.5))
    x = nx
    n++
  }
  moves.push(hold(onSand(x, FREMEN_SIZE), bt(n), TO, (hash(i, 44) - 0.5) * 0.9))
  return { id: FREMEN_ID + 60 + i, color: FREMEN, rim: FREMEN_RIM, size: FREMEN_SIZE, path: new Path(moves, `runner ${i}`, FREMEN_SIZE), turn: hashTurn(i) }
}

const hashTurn = (i: number) => ((i * 2.399) % (Math.PI * 2)) - Math.PI

/** The beats the wave sets off on: every stride is a beat of the comb by construction; these are its first. */
export const STRIDE_BEATS = [...new Set(RUNNERS.map((r) => r.go))].map((g) => bt(g + 1))

const runners = RUNNERS.map((_, i) => runner(i))
export const fremen: Actor[] = [...[0, 1].map(rider), ...runners]

/** The middle of the runners on foot, on the sand: what the camera runs with as they pour out of the dust. */
export const crowdAt = (t: number): Pt => {
  let x = 0
  for (const a of runners) x += a.path.where(t)[0]
  return [x / runners.length, -R]
}
