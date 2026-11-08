import { ANTINOUS, ANTINOUS_RIM, ANTINOUS_SIZE, PENELOPE, PENELOPE_ID, PENELOPE_RIM, PENELOPE_SIZE, SUITOR, SUITORS_ID, SUITOR_RIM, SUITOR_SIZE, TELEMACHUS, TELEMACHUS_ID, TELEMACHUS_RIM, TELEMACHUS_SIZE } from '../../cast'
import { hash, mix, smooth, smoother } from '../../draw'
import { END } from '../../voyage'
import { Path, fly, flightFor, rest, ride, roll, type Move, type Pt } from '../../path'
import type { Actor } from '../../show'
import { BEACH, DAIS, GATE, HALL, HEARTH, HOIST, JETTY, HOME, ON_TOP, PAN, R, ROOM, STAIRS, TERRACE, TRIAL, WELL } from './geo'
import { stepAt } from './palace'
import { LEAVES, SAG, STRUCK, antinousStruck, heroBasketY, plateEnd } from './rig'
import { weaverX } from './loom'
import { skiffScale, skiffSeat } from './west'
import { FIGHT, HERO_MEET, heroFight, penelopeDown, sonFight, suitorFight } from './battle'

/**
 * Who moves on Ithaca, and how: the hero from the beach to the bow and the skiff; Penelope at her loom, at the head of
 * the stairs, and down them to him; Telemachus on the terrace, at the dog, at the axes, in the doorway, and at his
 * father's side; the suitors at their bench, four of them trying the bow's plate in turn, the rest watching; Antinous,
 * who goes for the son and is taken by the arrow; and the rest of them drawn together on the dais, beaten.
 * Every step lands on a note (`geo.ts`, TRIAL and HOME).
 */

const FLOOR = HALL.floor
/** A ball's centre on a floor, for its size. */
const on = (floor: number, size = 1) => floor - R * size
const HERO_ON = on(FLOOR)
/** Where the son waits on the dead dog's far side for his father. */
const SON_AT_DOG = 810.62
const ROOM_ON = (size: number) => on(ROOM.floor, size)
/**
 * Where a ball of `size` is over the light well clear of the slab's cut edge: whoever goes down it rolls off the lip to
 * here first and falls from here. (They fell from the lip itself, so a third of each was behind the slab's cut face as
 * it went through the floor: the three suitors at 457.9, 467.5 and 476.5 s, and the hero at 494.5 s.)
 */
const OVER_WELL = (size: number): number => WELL.x - WELL.half + R * size + 0.06
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
  // Sitting in the basket, his ink inside it: seated with his lowest point on its floor, his rim showed under the
  // basket as a dark arc all the way up the cliff (420-427 s).
  const inBasket = (t: number): Pt => [HOIST.hero, heroBasketY(t) - R - 0.02]
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
  // When the dog is dead and his son has come to its far side, he steps over it to him, and they touch on the note.
  const toSon: Pt = [SON_AT_DOG - R * TELEMACHUS_SIZE - R, ON_TOP]
  const over = hopTo(byDog, toSon, TRIAL.touch, 0.3)
  m.push(rest(byDog, HOME.atDog, over.t0))
  m.push(over)
  // In behind his son, through the gate and the courtyard, to the hall's threshold.
  const threshold: Pt = [818.45, HERO_ON]
  m.push(rest(toSon, TRIAL.touch, TRIAL.touch + 1.0))
  m.push(roll([toSon, [GATE.x, ON_TOP], [threshold[0], HERO_ON]], TRIAL.touch + 1.0, TRIAL.inside))
  m.push(rest(threshold, TRIAL.inside, 483.6))
  // To the hearth, short of its fire (it burns at the stairs' foot); over it onto the first step, and up them a step a
  // note; at their head, in her room.
  const foot: Pt = [HEARTH.x - HEARTH.half - R - 0.04, HERO_ON]
  m.push(roll([threshold, foot], 483.6, 485.0))
  const steps = TRIAL.climb.map((_, i) => stepAt(i))
  m.push(...hops([foot, steps[0]], [485.0, TRIAL.climb[0]], 0.3))
  m.push(...hops(steps, TRIAL.climb, 0.1))
  const head = steps[steps.length - 1]
  m.push(rest(head, TRIAL.climb[TRIAL.climb.length - 1], TRIAL.out))
  // Out of her door, along the terrace, to the well's edge; a moment there; over.
  const lip: Pt = [826.5, ROOM_ON(1)]
  m.push(roll([head, [TERRACE.x0 + 0.2, head[1]], lip], TRIAL.out, TRIAL.edge))
  const land = (t: number): Pt => {
    const [px, py] = plateEnd(t)
    return [px - 0.04, py - R]
  }
  const overWell: Pt = [OVER_WELL(1), lip[1]]
  const drop = fly(overWell, land(TRIAL.sing), TRIAL.sing - flightFor(overWell, land(TRIAL.sing), 0.02), TRIAL.sing)
  m.push(rest(lip, TRIAL.edge, drop.t0 - 0.12))
  m.push(roll([lip, overWell], drop.t0 - 0.12, drop.t0, 'in'))
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
  // He comes up the stairs into her room and goes on out past her; she stays at the stairs' head (going a little
  // towards him took her out over the stairwell's opening, standing on the air, 489.65-495.4 s).
  m.push(rest(watch, TRIAL.penelope + 2.4, 495.0))
  // The bow sings, and she knows him by it: over the stairs' opening onto its top step, out of her door after him,
  // across the terrace to the light well's lip, and there she stands over him, looking down, while his weight draws
  // the bow and the arrow goes. (She rolled straight across the opening.)
  const over: Pt = [stepAt(STAIRS.steps - 1)[0] - 0.05, y]
  const across = hopTo(watch, over, 495.0 + flightFor(watch, over, 0.12), 0.12)
  m.push(across)
  const lip: Pt = [826.18, y]
  m.push(roll([over, lip], across.t1, 497.4, 'out'))
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
  const floorFoot: Pt = [HEARTH.x - HEARTH.half - R * s - 0.04, fy]
  m.push(...hops([top, ...down, floorFoot], [424.6, 425.0, 425.4, 425.8, 426.2, 426.6, 427.0], 0.05))
  // Out of the gate he stops under the olive at what he sees: the old dog lifting his head to the beggar. He watches the
  // tail go once and the dog die (that is how he knows him, as in the film), and only then comes, slowly, to the dog's
  // other side, the dead dog between them; his father steps over it to him, and they touch (`heroMoves`).
  const watch: Pt = [811.15, ground]
  const across: Pt = [SON_AT_DOG, ground]
  m.push(roll([floorFoot, [HALL.x0 + 0.1, fy], [GATE.x, ground], watch], 427.0, 429.75))
  m.push(rest(watch, 429.75, 434.2))
  m.push(roll([watch, across], 434.2, 436.09, 'inout'))
  // He leads his father in, into the hall ahead of him, and to the first axe's foot.
  const inHall: Pt = [818.18 + 0.8, fy]
  m.push(rest(across, 436.09, TRIAL.touch + 0.6))
  m.push(roll([across, [GATE.x, ground], inHall], TRIAL.touch + 0.6, TRIAL.inside - 0.2))
  m.push(rest(inHall, TRIAL.inside - 0.2, 448.6))
  const atAxe: Pt = [820.31 - 0.24, fy]
  m.push(roll([inHall, atAxe], 448.6, 450.58))
  // Back to the doorway, at his father's east side: up to him at the threshold and over him (he rolled through his
  // father, 453.2-453.4 s).
  const doorway: Pt = [818.18, fy]
  const behind: Pt = [818.45 + R + R * s + 0.01, fy]
  const over = hopTo(behind, doorway, 453.6, 0.3)
  m.push(roll([atAxe, inHall, behind], 451.4, over.t0, 'inout'), over)
  // Antinous comes at him and the arrow takes him at his feet. Then over the dead man to the stairs, to stand on them
  // between the suitors and his mother (`battle.ts`); and down to his father when it is over.
  const fight = sonFight(doorway)
  m.push(...fight.moves)
  m.push(rest(fight.end, TRIAL.meet, TRIAL.fade))
  // The west: on the jetty's end beside the skiff they are in. He goes back to the bollard and casts off their line;
  // and as they go out he comes to the end again, and stays there, watching them go.
  const jetty = on(JETTY.top, s)
  const end: Pt = [JETTY.x1 - 0.14, jetty]
  const bollard: Pt = [JETTY.x1 - 0.31, jetty]
  m.push(rest(end, TRIAL.fade, TRIAL.fade + 0.2))
  m.push(roll([end, bollard], TRIAL.fade + 0.2, TRIAL.fade + 1.15, 'inout'))
  m.push(rest(bollard, TRIAL.fade + 1.15, TRIAL.fade + 3.4))
  m.push(roll([bollard, end], TRIAL.fade + 3.4, TRIAL.fade + 5.4, 'inout'))
  m.push(rest(end, TRIAL.fade + 5.4, END))
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

/* ------------------------------------------------------------------ the trial of the bow */

/** A suitor's radius, and his centre on the hall's floor. */
const RS = R * SUITOR_SIZE
const FY = on(FLOOR, SUITOR_SIZE)
/**
 * Who tries, in turn (`TRIAL.tries`): Leodes, nearest the stairs; the next along the bench; the one standing by the
 * bow, who warms it; and the one after them on the bench.
 */
const TRIERS = [0, 1, 12, 2]
/** The light well's lip on the terrace, where each stands before he goes over; and over the well, clear of the slab. */
const LIP: Pt = [826.5, ROOM_ON(SUITOR_SIZE)]
const OVER: Pt = [OVER_WELL(SUITOR_SIZE), LIP[1]]
/** A suitor on the plate's end at `t`, or `slide` cells further out along it. */
const onPlate = (t: number, slide = 0): Pt => {
  const [px, py] = plateEnd(t)
  return [px - 0.04 + slide, py - RS]
}
/** On the floor at the fire pan's east side, clear of its fire: where the tallow is shoved in from, and they get down. */
const BY_PAN: Pt = [PAN.x - PAN.half - RS - 0.005, FY]
/**
 * Where the plate throws the second: up over the bow, and down onto the bench between Antinous and the next man, who
 * both jump aside (`crowd`). (Down onto the floor beyond the bench, every arc went through a man sitting on it:
 * Antinous at 468.15 s, or the next at 468.12 s.)
 */
const THROWN: Pt = [824.98, SEAT_Y]
const THROWN_AT = LEAVES[1] + flightFor(onPlate(LEAVES[1]), THROWN, 0.6)
/** The two he comes down between, and which way each jumps. */
const DODGE: Record<number, number> = { 5: -0.05, 6: 0.05 }
/**
 * Where each who climbs gets down off the bench onto the floor, and where he gets back up onto it: in the gaps between
 * those standing (Leodes's way down was a cell from one of them, the second's was on top of another, and the fourth
 * hopped home up through the man beside his seat, 482.4 s).
 */
const DOWN_AT: Record<number, number> = { 0: 822.51, 1: 823.17, 2: 823.17 }
const UP_AT: Record<number, number> = { 0: 823.08, 1: 823.37, 2: 823.3 }

/**
 * How the hall takes each try, as an offset to where each of them sits or stands: they lean in towards the bow as it
 * goes down, start back when it springs, and laugh at him after, a bob or two each; each in his own time and measure,
 * and never at himself. (Neighbours on the bench sit a twentieth of a cell apart, so all lean the same way together.)
 */
const LEANS: [number, number, number, number][] = [
  // From, to, how far, and who is trying.
  [TRIAL.tries[1] + 0.1, TRIAL.snap, 0.03, 1],
  [TRIAL.tries[2] + 0.1, SAG, 0.04, 12],
  [TRIAL.tries[3] + 0.05, TRIAL.slip, 0.055, 2],
]
/** They start back: when it throws the second, and when the fourth slips. When, how far, and who tried. */
const STARTS: [number, number, number][] = [
  [TRIAL.snap, 0.04, 1],
  [TRIAL.slip, 0.055, 2],
]
/** They laugh at him: from when, for how long, and at whom. */
const JEERS: [number, number, number][] = [
  [LEAVES[0] + 0.05, 1.0, 0],
  [TRIAL.snap + 0.45, 1.0, 1],
  [LEAVES[2] + 0.2, 1.0, 12],
  [TRIAL.slip + 0.4, 1.2, 2],
]

function crowd(i: number, t: number): Pt {
  if (t < TRIAL.tries[0] || t > TRIAL.slip + 3) return [0, 0]
  const late = 0.04 * hash(i, 3)
  const much = 0.85 + 0.3 * hash(i, 5)
  let dx = 0
  let dy = 0
  for (const [a, b, d, who] of LEANS) {
    if (who !== i) dx += d * much * smooth(t, a + late, a + late + 0.7) * (1 - smooth(t, b, b + 0.15))
  }
  for (const [at, d, who] of STARTS) {
    const s = t - at - late * 0.5
    if (who !== i && s > 0 && !(at === TRIAL.snap && i in DODGE)) dx -= d * (0.9 + 0.2 * hash(i, 9)) * (s / 0.12) * Math.exp(1 - s / 0.12)
  }
  if (i in DODGE) dx += DODGE[i] * smooth(t, THROWN_AT - 0.14, THROWN_AT + 0.04) * (1 - smooth(t, THROWN_AT + 0.7, THROWN_AT + 1.2))
  JEERS.forEach(([at, dur, who], k) => {
    if (who === i || hash(i, 13, k) < 0.3) return
    const s = t - at - 0.25 * hash(i, 17, k)
    if (s > 0 && s < dur) dy -= (0.016 + 0.014 * hash(i, 19, k)) * Math.abs(Math.sin(Math.PI * (2.6 + hash(i, 23, k)) * s)) * (1 - s / dur)
  })
  return [dx, dy]
}

/**
 * Where he sits or stands from `t0` to `t1`, taking the hall's reactions, and none at either end (so he leaves his own
 * place and comes back to it); his mark rolls as he leans.
 */
function watching(i: number, base: (t: number) => Pt, t0: number, t1: number): Move {
  const w = (t: number) => smooth(t, t0, t0 + 0.3) * (1 - smooth(t, t1 - 0.3, t1))
  const at = (t: number): Pt => {
    const [x, y] = base(t)
    const [dx, dy] = crowd(i, t)
    return [x + dx * w(t), y + dy * w(t)]
  }
  return ride(at, t0, t1, (t) => (crowd(i, t)[0] * w(t)) / RS)
}

/**
 * Up from his seat to the well's lip, there at `tLip`: down off the dais, along to the stairs' foot in front of the
 * first step, clear of the hearth's fire (they stood in its flames, 452.2, 461.7 and 470.7 s), up them a step at a
 * time, through her room and along the terrace.
 */
function climb(i: number, tLip: number): Move[] {
  const m: Move[] = []
  const head = stepAt(STAIRS.steps - 1)
  const top: Pt = [head[0], ROOM_ON(SUITOR_SIZE)]
  const tTop = tLip - 2.4
  const stepTimes = [0, 1, 2, 3, 4, 5].map((k) => tTop - (5 - k) * 0.42)
  const foot: Pt = [stepAt(0)[0], FY]
  const tFoot = stepTimes[0] - 0.42
  const down: Pt = [DOWN_AT[i], FY]
  const tDown = tFoot - (down[0] - foot[0]) / 1.8
  const tUp = tDown - 0.3
  m.push(watching(i, feasting(i), 0, tUp))
  m.push(fly(feasting(i)(tUp), down, tUp, tDown))
  m.push(roll([down, foot], tDown, tFoot))
  const steps = [0, 1, 2, 3, 4, 5].map((k) => {
    const p = stepAt(k)
    return [p[0], p[1] + R - RS] as Pt
  })
  m.push(...hops([foot, ...steps], [tFoot, ...stepTimes], 0.08))
  m.push(roll([top, [TERRACE.x0 + 0.2, top[1]], LIP], tTop, tLip))
  return m
}

/** Off the lip over the well, and down through it onto the plate at `land`; `leaves` is when he leaves the lip. */
function drop(land: number): { moves: Move[]; leaves: number } {
  const fall = flightFor(OVER, onPlate(land), 0.02)
  const leaves = land - fall - 0.12
  return { moves: [roll([LIP, OVER], leaves, land - fall, 'in'), fly(OVER, onPlate(land), land - fall, land)], leaves }
}

/** A bounce on the plate, coming down on it at `at`, `lift` high. */
function bounceOn(at: number, lift: number): Move {
  const T = flightFor(onPlate(at - 0.15), onPlate(at), lift)
  return fly(onPlate(at - T), onPlate(at), at - T, at)
}

/** Down off the plate at `t`, east over the crank, to the floor by the pan. */
function getDown(t: number, lift: number): Move {
  return fly(onPlate(t), BY_PAN, t, t + flightFor(onPlate(t), BY_PAN, lift))
}

/** From the floor at `from`, at `t`, back along the hall to below his seat and up onto it; when he is in it. */
function home(i: number, from: Pt, t: number, m: Move[]): number {
  const below: Pt = [UP_AT[i], FY]
  const tBelow = t + (from[0] - below[0]) / 1.4
  m.push(roll([from, below], t, tBelow))
  const back = tBelow + flightFor(below, feasting(i)(tBelow + 0.35), 0.1)
  m.push(fly(below, feasting(i)(back), tBelow, back))
  return back
}

/** Leodes: long at the lip; down onto the plate, and it barely dips. He bounces on it, twice, and it does not give. */
function leodes(i: number): { moves: Move[]; back: number } {
  const land = TRIAL.tries[0]
  const d = drop(land)
  const tLip = d.leaves - 0.75
  const m = climb(i, tLip)
  m.push(rest(LIP, tLip, d.leaves), ...d.moves)
  const [p0, p1] = TRIAL.pumps
  const b0 = bounceOn(p0, 0.06)
  const b1 = bounceOn(p1, 0.045)
  m.push(ride(onPlate, land, b0.t0), b0, ride(onPlate, p0, b1.t0), b1, ride(onPlate, p1, LEAVES[0]))
  const off = getDown(LEAVES[0], 0.08)
  m.push(off)
  return { moves: m, back: home(i, BY_PAN, off.t1, m) }
}

/**
 * The second: no waiting at the lip. It goes three sevenths of the way down under him, and he strains on it,
 * trembling, until it springs back and throws him over the bow among the rest of them.
 */
function second(i: number): { moves: Move[]; back: number } {
  const land = TRIAL.tries[1]
  const d = drop(land)
  const tLip = d.leaves - 0.08
  const m = climb(i, tLip)
  m.push(rest(LIP, tLip, d.leaves), ...d.moves)
  m.push(ride(onPlate, land, LEAVES[1]))
  m.push(fly(onPlate(LEAVES[1]), THROWN, LEAVES[1], THROWN_AT))
  // He comes down among them on the bench and lies there a moment; then down off it to the floor, and home.
  const floor: Pt = [THROWN[0] - 0.03, FY]
  const t1 = THROWN_AT + 0.55
  const T = flightFor(THROWN, floor, 0.06)
  m.push(rest(THROWN, THROWN_AT, t1), fly(THROWN, floor, t1, t1 + T))
  return { moves: m, back: home(i, floor, t1 + T, m) }
}

/**
 * The one standing by the bow: he shoves the tallow off the pan's rim into its coals, and the fat flares up round the
 * bow's foot. With the bow warm he leaps up onto the plate from the floor, and it goes more than half way; he bounces
 * on it, and it goes further; and it rises back under him, and he gets down, back to where he stood.
 */
function warmer(i: number): Move[] {
  const m: Move[] = []
  const place = standing(i)
  const go = TRIAL.tallow - 0.6
  m.push(watching(i, place, 0, go))
  // Up to the pan and into it, at speed: the shove. He comes back off it from the flare, to where he stood, and leaps
  // from there up over the bow and the fire onto the plate. (From beside the pan he went through its flames, 471.0 s.)
  m.push(roll([place(go), BY_PAN], go, TRIAL.tallow, 'in'))
  const back: Pt = [STANDS[i] + 0.03, FY]
  m.push(roll([BY_PAN, back], TRIAL.tallow, TRIAL.tallow + 0.7, 'out'))
  const land = TRIAL.tries[2]
  const T = flightFor(back, onPlate(land), 0.3)
  m.push(rest(back, TRIAL.tallow + 0.7, land - T), fly(back, onPlate(land), land - T, land))
  const b = bounceOn(TRIAL.bounce, 0.05)
  m.push(ride(onPlate, land, b.t0), b, ride(onPlate, TRIAL.bounce, LEAVES[2]))
  // Down, east over the fire, to his place.
  const t1 = LEAVES[2] + flightFor(onPlate(LEAVES[2]), [STANDS[i], FY], 0.15)
  m.push(fly(onPlate(LEAVES[2]), place(t1), LEAVES[2], t1))
  m.push(watching(i, place, t1, FIGHT.sing - 0.0001))
  return m
}

/**
 * The fourth: two small hops on the lip to brace himself, and down onto the warm bow. It goes nearly all the way at
 * once and creeps on, trembling, the string all but home; and he slips off the plate's end, and it springs back. When
 * the camera has gone back to the stranger, he goes back over the plate and the fire, and home.
 */
function fourth(i: number): { moves: Move[]; back: number } {
  const land = TRIAL.tries[3]
  const d = drop(land)
  const braces = [475.463, 475.864]
  const tLip = braces[0] - 0.5
  const m = climb(i, tLip)
  const H = flightFor(LIP, LIP, 0.06)
  m.push(rest(LIP, tLip, braces[0] - H), fly(LIP, LIP, braces[0] - H, braces[0]), rest(LIP, braces[0], braces[1] - H))
  m.push(fly(LIP, LIP, braces[1] - H, braces[1]), rest(LIP, braces[1], d.leaves), ...d.moves)
  // Slipping out along the plate as it trembles, and off its end.
  const slide = (t: number) => 0.1 * smoother(t, TRIAL.slip - 0.4, TRIAL.slip)
  m.push(ride((t) => onPlate(t, slide(t)), land, TRIAL.slip))
  const floor: Pt = [826.95, FY]
  const off = fly(onPlate(TRIAL.slip, 0.1), floor, TRIAL.slip, TRIAL.slip + flightFor(onPlate(TRIAL.slip, 0.1), floor, 0.02))
  const sprawl: Pt = [827.05, FY]
  m.push(off, roll([floor, sprawl], off.t1, off.t1 + 0.3, 'out'))
  const over = 480.6
  const T = flightFor(sprawl, BY_PAN, 0.5)
  m.push(rest(sprawl, off.t1 + 0.3, over), fly(sprawl, BY_PAN, over, over + T))
  return { moves: m, back: home(i, BY_PAN, over + T, m) }
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
    watching(i, feasting(i), 0, go),
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
  const tries = [leodes, second, null, fourth]
  const out: { path: Path; dies?: number }[] = []
  for (let i = 0; i < SUITORS; i++) {
    if (i === ANTINOUS_I) {
      out.push({ path: new Path(antinous(i), 'antinous') })
      continue
    }
    const before: Move[] = []
    let where: (t: number) => Pt
    const k = TRIERS.indexOf(i)
    const go = tries[k]
    if (i === TRIERS[2]) {
      before.push(...warmer(i))
      where = standing(i)
    } else if (go) {
      const t = go(i)
      before.push(...t.moves, watching(i, feasting(i), t.back, hand))
      where = feasting(i)
    } else if (i < ANTINOUS_I) {
      before.push(watching(i, feasting(i), 0, hand))
      where = feasting(i)
    } else {
      before.push(watching(i, standing(i), 0, hand))
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
    // They are inside the house: from the dissolve to the west, where the house is one dark shape shut against the
    // sunset, they are not drawn (they showed as discs on its wall, 514-549 s, wherever the frame took in the house).
    ...suitors.map(({ path, dies }, i): Actor =>
      i === ANTINOUS_I
        ? { id: SUITORS_ID + i, color: ANTINOUS, rim: ANTINOUS_RIM, size: ANTINOUS_SIZE, path, turn: -0.9, on: (t) => t < TRIAL.fade, colorAt: (t) => mix(ANTINOUS, DEAD, 0.9 * smooth(t, TRIAL.strike + 0.2, TRIAL.strike + 1.4)), under: (t) => t > TRIAL.strike + 0.4 }
        : {
            id: SUITORS_ID + i,
            on: (t) => t < TRIAL.fade,
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

