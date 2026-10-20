import { PENELOPE, PENELOPE_ID, PENELOPE_RIM, PENELOPE_SIZE, SUITOR, SUITORS_ID, SUITOR_RIM, SUITOR_SIZE, TELEMACHUS, TELEMACHUS_ID, TELEMACHUS_RIM, TELEMACHUS_SIZE } from '../../cast'
import { END } from '../../voyage'
import { Path, fly, flightFor, rest, ride, roll, type Move, type Pt } from '../../path'
import type { Actor } from '../../show'
import { BEACH, DAIS, GATE, HALL, HOIST, HOME, JETTY, ON_TOP, R, ROOM, STAIRS, TERRACE, TRIAL, CLIFF_W } from './geo'
import { stepAt } from './palace'
import { heroBasketY, plateEnd } from './rig'
import { weaverX } from './loom'
import { skiffScale, skiffSeat } from './west'

/**
 * Who moves on Ithaca, and how: the hero from the beach to the bow and the skiff; Penelope at her loom, at the head of
 * the stairs, and down them to him; Telemachus on the terrace, at the dog, at the axes, and at his father's side; the
 * suitors at their bench, three of them up the stairs and onto the plate in turn, and all of them out into the dark.
 * Every step lands on a note (`geo.ts`, TRIAL and HOME).
 */

const FLOOR = HALL.floor
/** A ball's centre on a floor, for its size. */
const on = (floor: number, size = 1) => floor - R * size
const HERO_ON = on(FLOOR)
const ROOM_ON = (size: number) => on(ROOM.floor, size)

/** Step-hops up or down a flight: one flight a step, each landing on its note. */
function hops(points: Pt[], times: number[], lift = 0.12): Move[] {
  const out: Move[] = []
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]
    const b = points[i]
    const T = flightFor(a, b, lift)
    out.push(rest(a, times[i - 1], times[i] - T))
    out.push(fly(a, b, times[i] - T, times[i]))
  }
  return out
}

/** A hop from `a` landing at `b` exactly at `t`, peaking `lift` over the higher end. */
const hopTo = (a: Pt, b: Pt, t: number, lift = 0.15): Move => fly(a, b, t - flightFor(a, b, lift), t)

/* ------------------------------------------------------------------ the hero */

/** The hero's moves from the beach (418) to the end. */
export function heroMoves(): Move[] {
  const m: Move[] = []
  const landed: Pt = [801.5, BEACH.sand - R]
  const edge: Pt = [805.35, -0.54]
  const inBasket = (t: number): Pt => [HOIST.hero, heroBasketY(t) - R]
  // Off the sand and up the rocks to the basket's side; a breath; in.
  m.push(rest(landed, HOME.landed, 418.3))
  m.push(roll([landed, [804.4, landed[1]], edge], 418.3, 420.0))
  const into = hopTo(edge, inBasket(HOME.toBasket), HOME.toBasket, 0.3)
  m.push(rest(edge, 420.0, into.t0))
  m.push(into)
  // Up the cliff with the stones going down past him.
  m.push(ride(inBasket, HOME.toBasket, HOME.hop))
  // Out onto the top, and along to the dog.
  const top: Pt = [807.75, ON_TOP]
  const out = fly(inBasket(HOME.hop), top, HOME.hop, HOME.hop + flightFor(inBasket(HOME.hop), top, 0.22))
  m.push(out)
  const byDog: Pt = [809.45, ON_TOP]
  m.push(roll([top, byDog], out.t1, HOME.atDog))
  m.push(rest(byDog, HOME.atDog, TRIAL.touch + 0.3))
  // In with his son, through the gate and the courtyard, to the hall's threshold.
  const threshold: Pt = [818.45, HERO_ON]
  m.push(roll([byDog, [GATE.x, ON_TOP], [threshold[0], HERO_ON]], TRIAL.touch + 0.3, TRIAL.inside))
  m.push(rest(threshold, TRIAL.inside, 483.6))
  // To the stairs' foot; up them a step a note; at their head, in her room.
  const foot: Pt = [STAIRS.x0 - 0.25, HERO_ON]
  m.push(roll([threshold, foot], 483.6, 485.0))
  const steps = TRIAL.climb.map((_, i) => stepAt(i))
  m.push(...hops([foot, ...steps], [485.0, ...TRIAL.climb], 0.1))
  const head = steps[steps.length - 1]
  m.push(rest(head, TRIAL.climb[TRIAL.climb.length - 1], TRIAL.out))
  // Out of her door, along the terrace, to the well's edge; a moment there; over.
  const lip: Pt = [826.5, ROOM_ON(1)]
  m.push(roll([head, [TERRACE.x0 + 0.2, head[1]], lip], TRIAL.out, TRIAL.edge))
  const land = (t: number): Pt => {
    const [px, py] = plateEnd(t)
    return [px - 0.04, py - R]
  }
  const drop = fly(lip, land(TRIAL.sing), TRIAL.sing - flightFor(lip, land(TRIAL.sing), 0.02), TRIAL.sing)
  m.push(rest(lip, TRIAL.edge, drop.t0))
  m.push(drop)
  // On the plate while it draws the bow; off it, west, to the floor by the door: and the bow looses.
  m.push(ride(land, TRIAL.sing, TRIAL.loose))
  const byDoor: Pt = [827.05, HERO_ON]
  const off = fly(land(TRIAL.loose), byDoor, TRIAL.loose, TRIAL.loose + flightFor(land(TRIAL.loose), byDoor, 0.12))
  m.push(off)
  m.push(rest(byDoor, off.t1, TRIAL.erupts + 0.4))
  // East through the hall to her, at the stairs' foot.
  const meet: Pt = [820.66, HERO_ON]
  m.push(roll([byDoor, meet], TRIAL.erupts + 0.4, TRIAL.meet))
  m.push(rest(meet, TRIAL.meet, TRIAL.fade))
  // The west: in the skiff with her (the dissolve carries him there), going away with it.
  m.push(ride((t) => skiffSeat(t, 0), TRIAL.fade, END, undefined, { scale: skiffScale }))
  return m
}

/* ------------------------------------------------------------------ Penelope */

function penelopePath(): Path {
  const m: Move[] = []
  const y = ROOM_ON(PENELOPE_SIZE)
  // At her loom from the first, following her shuttle.
  m.push(ride((t) => [weaverX(t), y], 0, TRIAL.penelope))
  // To the head of the stairs, to watch the hall through the opening.
  const watch: Pt = [820.95, y]
  m.push(roll([[weaverX(TRIAL.penelope), y], watch], TRIAL.penelope, TRIAL.penelope + 2.4))
  m.push(rest(watch, TRIAL.penelope + 2.4, 489.4))
  // He comes up the stairs into her room: she goes a little towards him, and stops.
  const near: Pt = [821.32, y]
  m.push(roll([watch, near], 489.4, 490.43))
  m.push(rest(near, 490.43, 495.2))
  // The bow sings: to her door, to look out at the well.
  const door: Pt = [822.2, y]
  m.push(roll([near, door], 495.2, 497.0))
  m.push(rest(door, 497.0, 503.3))
  // Back to the stairs' head and down them, a step a note, and along the floor to him.
  const head = stepAt(STAIRS.steps - 1)
  const top: Pt = [head[0], y]
  m.push(roll([door, top], 503.3, 503.95))
  const down = [4, 3, 2, 1, 0].map((i) => {
    const s = stepAt(i)
    return [s[0], s[1] + R - R * PENELOPE_SIZE] as Pt
  })
  const floorFoot: Pt = [STAIRS.x0 - 0.25, on(FLOOR, PENELOPE_SIZE)]
  m.push(...hops([top, ...down, floorFoot], [503.95, 504.26, 504.66, 505.83, 506.68, 507.3, 507.79], 0.06))
  const meet: Pt = [820.66 - R - R * PENELOPE_SIZE, on(FLOOR, PENELOPE_SIZE)]
  m.push(roll([floorFoot, meet], 507.79, TRIAL.meet))
  m.push(rest(meet, TRIAL.meet, TRIAL.fade))
  m.push(ride((t) => skiffSeat(t, 1), TRIAL.fade, END, undefined, { scale: skiffScale }))
  return new Path(m, 'penelope')
}

/* ------------------------------------------------------------------ Telemachus */

function telemachusPath(): Path {
  const m: Move[] = []
  const s = TELEMACHUS_SIZE
  const ty = ROOM_ON(s)
  const fy = on(FLOOR, s)
  const ground = on(-9, s)
  // On the terrace's west end through the years, looking out to sea.
  const lookout: Pt = [827.0, ty]
  m.push(rest(lookout, 0, 424.0))
  // Down to meet the stranger: through the room, down the stairs, out of the hall and the gate (mostly out of shot).
  const head = stepAt(STAIRS.steps - 1)
  const top: Pt = [head[0], ty]
  m.push(roll([lookout, [TERRACE.x0 + 0.1, ty], top], 424.0, 426.6))
  const down = [4, 3, 2, 1, 0].map((i) => {
    const p = stepAt(i)
    return [p[0], p[1] + R - R * s] as Pt
  })
  const floorFoot: Pt = [STAIRS.x0 - 0.25, fy]
  m.push(...hops([top, ...down, floorFoot], [426.6, 427.0, 427.4, 427.8, 428.2, 428.6, 429.0], 0.05))
  const byFather: Pt = [809.45 + R + R * s, ground]
  m.push(roll([floorFoot, [HALL.x0 + 0.1, fy], [GATE.x, ground], byFather], 429.0, TRIAL.touch))
  // Into the hall ahead of his father, and to the first axe's foot.
  const inHall: Pt = [818.18 + 0.8, fy]
  m.push(rest(byFather, TRIAL.touch, TRIAL.touch + 0.3))
  m.push(roll([byFather, [GATE.x, ground], inHall], TRIAL.touch + 0.3, TRIAL.inside - 0.2))
  m.push(rest(inHall, TRIAL.inside - 0.2, 448.6))
  const atAxe: Pt = [820.31 - 0.24, fy]
  m.push(roll([inHall, atAxe], 448.6, 450.58))
  // Back to the doorway, at his father's east side.
  const doorway: Pt = [818.18, fy]
  m.push(roll([atAxe, inHall, doorway], 451.4, 453.6))
  m.push(rest(doorway, 453.6, 502.6))
  // The hall erupts: out of their way into the courtyard; back in to his parents.
  const corner: Pt = [816.7, ground]
  m.push(roll([doorway, corner], 502.6, 503.5))
  m.push(rest(corner, 503.5, 507.6))
  const beside: Pt = [820.66 - R - 2 * R * PENELOPE_SIZE - R * s, fy]
  m.push(roll([corner, [HALL.x0 + 0.1, fy], beside], 507.6, 510.4))
  m.push(rest(beside, 510.4, TRIAL.fade))
  // The west: on the jetty's end, watching them go.
  m.push(rest([JETTY.x1 - 0.4, JETTY.top - R * s], TRIAL.fade, END))
  return new Path(m, 'telemachus')
}

/* ------------------------------------------------------------------ the suitors */

/** Where each suitor sits on the dais, east to west; the last (westmost, by the bow) is Antinous. */
const SEATS = Array.from({ length: 7 }, (_, i) => DAIS.x0 + 0.2 + i * 0.41)
const SEAT_Y = DAIS.top - R * SUITOR_SIZE

/** A suitor feasting: a small bob now and then, never in step with the others. */
const feasting = (i: number) => (t: number): Pt => [SEATS[i], SEAT_Y - 0.014 * Math.max(0, Math.sin(t * (0.7 + 0.13 * i) + i * 1.9)) ** 6]

/** The three who try: the three nearest the stairs, each landing on the plate on its note, then back to the bench. */
function trier(i: number, land: number): { moves: Move[]; back: number } {
  const s = SUITOR_SIZE
  const fy = on(FLOOR, s)
  const m: Move[] = []
  // Timed back from the landing: the drop, the terrace, the stairs, the floor.
  const lip: Pt = [826.5, ROOM_ON(s)]
  const onPlate = (t: number): Pt => {
    const [px, py] = plateEnd(t)
    return [px - 0.04, py - R * s]
  }
  const fallT = flightFor(lip, onPlate(land), 0.02)
  const tLip = land - fallT - 0.35
  const head = stepAt(STAIRS.steps - 1)
  const top: Pt = [head[0], ROOM_ON(s)]
  const tTop = tLip - 2.4
  const stepTimes = [0, 1, 2, 3, 4, 5].map((k) => tTop - (5 - k) * 0.42)
  const foot: Pt = [STAIRS.x0 - 0.25, fy]
  const tFoot = stepTimes[0] - 0.42
  const down: Pt = [SEATS[i] - 0.3, fy]
  const tDown = tFoot - (down[0] - foot[0]) / 1.8
  const tUp = tDown - 0.3
  m.push(ride(feasting(i), 0, tUp))
  m.push(fly(feasting(i)(tUp), down, tUp, tDown))
  m.push(roll([down, foot], tDown, tFoot))
  const steps = [0, 1, 2, 3, 4, 5].map((k) => {
    const p = stepAt(k)
    return [p[0], p[1] + R - R * s] as Pt
  })
  m.push(...hops([foot, ...steps], [tFoot, ...stepTimes], 0.08))
  m.push(roll([top, [TERRACE.x0 + 0.2, top[1]], lip], tTop, tLip))
  m.push(rest(lip, tLip, land - fallT))
  m.push(fly(lip, onPlate(land), land - fallT, land))
  // Nothing gives. Off the plate's end to the floor, and back along the hall to his seat.
  m.push(ride(onPlate, land, land + 0.5))
  const floor: Pt = [826.98, fy]
  const off = fly(onPlate(land + 0.5), floor, land + 0.5, land + 0.5 + flightFor(onPlate(land + 0.5), floor, 0.1))
  m.push(off)
  const below: Pt = [SEATS[i] + 0.3, fy]
  const tBelow = off.t1 + (floor[0] - below[0]) / 1.4
  m.push(roll([floor, below], off.t1, tBelow))
  const seat = feasting(i)
  const back = tBelow + flightFor(below, seat(tBelow + 0.35), 0.1)
  m.push(fly(below, seat(back), tBelow, back))
  return { moves: m, back }
}

/** Out over the plateau to the west cliff's edge and over it, into the dark (they are not seen again). */
function fleeWest(from: Pt, go: number, s: number): Move[] {
  const edge: Pt = [CLIFF_W.top + 0.1, on(-9, s)]
  const below: Pt = [CLIFF_W.top + 1.6, -5]
  const t1 = go + (edge[0] - from[0]) / 3.2
  return [roll([from, edge], go, t1, 'in'), fly(edge, below, t1, t1 + 0.62)]
}

/** Off the bench, out of the east door, the courtyard and the gate, past the dog to the cliff's edge and over it. */
function fleeEast(i: number, from: number, go: number): Move[] {
  const s = SUITOR_SIZE
  const fy = on(FLOOR, s)
  const down: Pt = [SEATS[i] - 0.3, fy]
  const edge: Pt = [807.5, on(-9, s)]
  const below: Pt = [806.2, -6]
  const t1 = go + 0.3
  const t2 = t1 + (down[0] - edge[0]) / 3.4
  return [
    ride(feasting(i), from, go),
    fly(feasting(i)(go), down, go, t1),
    roll([down, [818.0, fy], [GATE.x, on(-9, s)], edge], t1, t2, 'in'),
    fly(edge, below, t2, t2 + 0.6),
  ]
}

function suitorPaths(): Path[] {
  const out: Path[] = []
  for (let i = 0; i < SEATS.length; i++) {
    let moves: Move[]
    // The bench empties east as the hall erupts, a man at a time, not in step.
    const go = TRIAL.erupts + [0, 0.32, 0.64, 0.18, 0.5, 0.82, 0][i]
    if (i < 3) {
      const t = trier(i, TRIAL.tries[i])
      moves = [...t.moves, ...fleeEast(i, t.back, go)]
    } else if (i === SEATS.length - 1) {
      // Antinous would not try. At the bow's note he is the first out, by the west door.
      const fy = on(FLOOR, SUITOR_SIZE)
      const run = TRIAL.sing + 0.35
      const down: Pt = [SEATS[i] + 0.3, fy]
      moves = [ride(feasting(i), 0, run), fly(feasting(i)(run), down, run, run + 0.3), ...fleeWest(down, run + 0.3, SUITOR_SIZE)]
    } else moves = fleeEast(i, 0, go)
    out.push(new Path(moves, `suitor ${i}`))
  }
  return out
}

/** Whether a fleeing suitor is still on the stage: gone once he is over a cliff's edge and well down it. */
const onStage = (p: Path) => (t: number): boolean => t <= p.t1 - 0.05

export function ithacaActors(): Actor[] {
  const suitors = suitorPaths()
  return [
    { id: PENELOPE_ID, color: PENELOPE, rim: PENELOPE_RIM, size: PENELOPE_SIZE, path: penelopePath() },
    { id: TELEMACHUS_ID, color: TELEMACHUS, rim: TELEMACHUS_RIM, size: TELEMACHUS_SIZE, path: telemachusPath(), turn: -0.6 },
    // Each suitor faces his own way at the feast, a few towards each other, one at his cup.
    ...suitors.map((path, i): Actor => ({ id: SUITORS_ID + i, color: SUITOR, rim: SUITOR_RIM, size: SUITOR_SIZE, path, on: onStage(path), turn: [0.5, 2.7, -0.4, 3.3, 0.9, 2.2, -0.9][i] })),
  ]
}

