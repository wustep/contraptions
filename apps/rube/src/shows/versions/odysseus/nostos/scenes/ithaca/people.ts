import { ANTINOUS, ANTINOUS_RIM, ANTINOUS_SIZE, PENELOPE, PENELOPE_ID, PENELOPE_RIM, PENELOPE_SIZE, SUITOR, SUITORS_ID, SUITOR_RIM, SUITOR_SIZE, TELEMACHUS, TELEMACHUS_ID, TELEMACHUS_RIM, TELEMACHUS_SIZE } from '../../cast'
import { mix, smooth } from '../../draw'
import { END } from '../../voyage'
import { Path, fly, flightFor, rest, ride, roll, type Move, type Pt } from '../../path'
import type { Actor } from '../../show'
import { BEACH, DAIS, GATE, HALL, CLIFF_W, HOIST, HOME, ON_TOP, R, ROOM, STAIRS, TERRACE, TRIAL } from './geo'
import { stepAt } from './palace'
import { STRUCK, antinousStruck, heroBasketY, plateEnd } from './rig'
import { weaverX } from './loom'
import { skiffScale, skiffSeat } from './west'
import { FIGHT, HERO_MEET, heroFight, penelopeDown, sonFight, suitorFight } from './battle'

/**
 * Who moves on Ithaca, and how: the hero from the beach to the bow and the skiff; Penelope at her loom, at the head of
 * the stairs, and down them to him; Telemachus on the terrace, at the dog, at the axes, in the doorway, and at his
 * father's side; the suitors at their bench, three of them up the stairs and onto the plate in turn; Antinous, who goes
 * for the son and is taken by the arrow; and the rest of them drawn together on the dais, beaten.
 * Every step lands on a note (`geo.ts`, TRIAL and HOME).
 */

const FLOOR = HALL.floor
/** A ball's centre on a floor, for its size. */
const on = (floor: number, size = 1) => floor - R * size
const HERO_ON = on(FLOOR)
const ROOM_ON = (size: number) => on(ROOM.floor, size)
/** What a suitor is once the colour has gone out of him: darker than the hall's dado behind him, where the living are lighter. */
const DEAD = '#1F2226'

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
  // The battle (`battle.ts`): out at the first two, then down the whole hall through the rest, to her at the stairs.
  m.push(...heroFight(byDoor))
  const meet: Pt = [HERO_MEET, HERO_ON]
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
  m.push(rest(near, 490.43, 495.0))
  // The bow sings, and she knows him by it: out of her door after him, across the terrace to the light well's lip,
  // and there she stands over him, looking down, while his weight draws the bow and the arrow goes.
  const lip: Pt = [826.18, y]
  m.push(roll([near, lip], 495.0, 497.4, 'inout'))
  m.push(rest(lip, 497.4, 501.3))
  // Back to the stairs' head, to watch the fight over the hall; down them when it is over, a step a note, to him.
  const head = stepAt(STAIRS.steps - 1)
  const top: Pt = [head[0], y]
  m.push(roll([lip, top], 501.3, 503.95, 'inout'))
  const down = penelopeDown(top)
  m.push(...down.moves)
  m.push(rest(down.end, TRIAL.meet, TRIAL.fade))
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
  m.push(rest(lookout, 0, 422.0))
  // He sees the basket coming up the cliff, and goes down to meet it: through the room, down the stairs, out of the hall
  // and the gate (out of shot), running.
  const head = stepAt(STAIRS.steps - 1)
  const top: Pt = [head[0], ty]
  m.push(roll([lookout, [TERRACE.x0 + 0.1, ty], top], 422.0, 424.6))
  const down = [4, 3, 2, 1, 0].map((i) => {
    const p = stepAt(i)
    return [p[0], p[1] + R - R * s] as Pt
  })
  const floorFoot: Pt = [STAIRS.x0 - 0.25, fy]
  m.push(...hops([top, ...down, floorFoot], [424.6, 425.0, 425.4, 425.8, 426.2, 426.6, 427.0], 0.05))
  // Out of the gate he stops under the olive at what he sees: the old dog lifting his head to the beggar. He watches the
  // tail go once and the dog die (that is how he knows him, as in the film), and only then comes, slowly, to the dog's
  // other side: the two of them with the dead dog between them.
  const watch: Pt = [811.15, ground]
  const across: Pt = [810.62, ground]
  m.push(roll([floorFoot, [HALL.x0 + 0.1, fy], [GATE.x, ground], watch], 427.0, 429.75))
  m.push(rest(watch, 429.75, 434.2))
  m.push(roll([watch, across], 434.2, TRIAL.touch, 'inout'))
  // He leads his father in, into the hall ahead of him, and to the first axe's foot.
  const inHall: Pt = [818.18 + 0.8, fy]
  m.push(rest(across, TRIAL.touch, TRIAL.touch + 0.6))
  m.push(roll([across, [GATE.x, ground], inHall], TRIAL.touch + 0.6, TRIAL.inside - 0.2))
  m.push(rest(inHall, TRIAL.inside - 0.2, 448.6))
  const atAxe: Pt = [820.31 - 0.24, fy]
  m.push(roll([inHall, atAxe], 448.6, 450.58))
  // Back to the doorway, at his father's east side.
  const doorway: Pt = [818.18, fy]
  m.push(roll([atAxe, inHall, doorway], 451.4, 453.6))
  // Antinous comes at him and the arrow takes him at his feet. Then over the dead man to the stairs, to stand on them
  // between the suitors and his mother (`battle.ts`); and down to his father when it is over.
  const fight = sonFight(doorway)
  m.push(...fight.moves)
  m.push(rest(fight.end, TRIAL.meet, TRIAL.fade))
  // The west: on the cliff's edge over the harbour, and a little nearer it as they cast off, watching them go.
  const back: Pt = [CLIFF_W.top - 0.55, ground]
  const brink: Pt = [CLIFF_W.top - 0.25, ground]
  m.push(rest(back, TRIAL.fade, TRIAL.fade + 4))
  m.push(roll([back, brink], TRIAL.fade + 4, TRIAL.fade + 6.5))
  m.push(rest(brink, TRIAL.fade + 6.5, END))
  return new Path(m, 'telemachus')
}

/* ------------------------------------------------------------------ the suitors */

/** Where each suitor sits on the dais, east to west, in twos and threes; the last, apart by the bow, is Antinous. */
const SEATS = [0, 0.29, 0.82, 1.1, 1.38, 1.9, 2.5].map((d) => DAIS.x0 + 0.18 + d)
const SEAT_Y = DAIS.top - R * SUITOR_SIZE
/** More of them on their feet on the floor in front of the dais, the house overrun, between the axes: by index, 7 to 12. */
const STANDS: Record<number, number> = { 7: 822.29, 8: 822.73, 9: 823.61, 10: 824.05, 11: 824.49, 12: 825.4 }
const STAND_Y = on(FLOOR, SUITOR_SIZE)
/** How many suitors there are, Antinous among them (index 6). */
const SUITORS = 13
const ANTINOUS_I = 6

/** A suitor feasting: a small bob now and then, never in step with the others. */
const feasting = (i: number) => (t: number): Pt => [SEATS[i], SEAT_Y - 0.014 * Math.max(0, Math.sin(t * (0.7 + 0.13 * i) + i * 1.9)) ** 6]
/** One standing on the floor: the same, on his feet. */
const standing = (i: number) => (t: number): Pt => [STANDS[i], STAND_Y - 0.012 * Math.max(0, Math.sin(t * (0.6 + 0.11 * i) + i * 2.3)) ** 6]

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

/**
 * Antinous, who would not try: by the bow, at its note he goes down off the dais and east along the hall towards the
 * door where the son stands, and stalks him; on the loose he leaps at him, and the arrow, through the twelve eyes,
 * takes him in the air.
 */
function antinous(i: number): Move[] {
  const fy = on(FLOOR, ANTINOUS_SIZE)
  const go = TRIAL.sing + 0.35
  const down: Pt = [SEATS[i] - 0.32, fy]
  const leapFrom: Pt = [STRUCK[0] + 0.5, fy]
  const leap = flightFor(leapFrom, STRUCK, 0.0001)
  // Quickly clear of the rest, who are closing in on the bow, then stalking the son, and a rush into the leap.
  const clear: Pt = [821.4, fy]
  const near: Pt = [820.2, fy]
  return [
    ride(feasting(i), 0, go),
    fly(feasting(i)(go), down, go, go + 0.32),
    roll([down, clear], go + 0.32, 497.0, 'inout'),
    roll([clear, near], 497.0, 500.6, 'inout'),
    roll([near, leapFrom], 500.6, TRIAL.strike - leap, 'in'),
    fly(leapFrom, STRUCK, TRIAL.strike - leap, TRIAL.strike),
    ride(antinousStruck, TRIAL.strike, END),
  ]
}

/** Up to the bow's note each suitor is at the feast (or trying the bow and back); from it, the fight decides. */
function suitorPaths(): { path: Path; dies?: number }[] {
  const hand = FIGHT.sing - 0.0001
  const out: { path: Path; dies?: number }[] = []
  for (let i = 0; i < SUITORS; i++) {
    if (i === ANTINOUS_I) {
      out.push({ path: new Path(antinous(i), 'antinous') })
      continue
    }
    const before: Move[] = []
    let where: (t: number) => Pt
    if (i < 3) {
      const t = trier(i, TRIAL.tries[i])
      before.push(...t.moves, ride(feasting(i), t.back, hand))
      where = feasting(i)
    } else if (i < ANTINOUS_I) {
      before.push(ride(feasting(i), 0, hand))
      where = feasting(i)
    } else {
      before.push(ride(standing(i), 0, hand))
      where = standing(i)
    }
    const fate = suitorFight(i, where(hand))
    out.push({ path: new Path([...before, ...fate.moves], `suitor ${i}`), dies: fate.dies })
  }
  return out
}

export function ithacaActors(): Actor[] {
  const suitors = suitorPaths()
  return [
    { id: PENELOPE_ID, color: PENELOPE, rim: PENELOPE_RIM, size: PENELOPE_SIZE, path: penelopePath() },
    { id: TELEMACHUS_ID, color: TELEMACHUS, rim: TELEMACHUS_RIM, size: TELEMACHUS_SIZE, path: telemachusPath(), turn: -0.6 },
    // Each suitor faces his own way at the feast, a few towards each other, one at his cup. Antinous is the biggest and
    // the darkest of them, and after the arrow the colour goes out of him; so it goes out of each of them he throws.
    ...suitors.map(({ path, dies }, i): Actor =>
      i === ANTINOUS_I
        ? { id: SUITORS_ID + i, color: ANTINOUS, rim: ANTINOUS_RIM, size: ANTINOUS_SIZE, path, turn: -0.9, colorAt: (t) => mix(ANTINOUS, DEAD, 0.9 * smooth(t, TRIAL.strike + 0.2, TRIAL.strike + 1.4)), under: (t) => t > TRIAL.strike + 0.4 }
        : {
            id: SUITORS_ID + i,
            color: SUITOR,
            rim: SUITOR_RIM,
            size: SUITOR_SIZE,
            path,
            turn: [0.5, 2.7, -0.4, 3.3, 0.9, 2.2, 0, 1.4, -1.1, 2.9, 0.3, -0.7, 1.9][i],
            colorAt: dies === undefined ? undefined : (t) => mix(SUITOR, DEAD, 0.9 * smooth(t, dies - 0.12, dies + 0.1)),
            under: dies === undefined ? undefined : (t) => t >= dies,
          },
    ),
  ]
}

