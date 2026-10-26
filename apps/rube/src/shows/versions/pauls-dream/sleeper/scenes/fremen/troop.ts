import { R } from '../../../../../../parts'
import { CHANI, FREMEN, JAMIS, JESSICA, PAUL, STILGAR } from '../../cast'
import { M } from '../../music'
import { hash, smoother, type Pt } from '../../paint'
import { Run, Walk, type Ease, type Seg } from '../../path'
import type { Actor } from '../../show'
import { boulderTop, BOULDERS } from './land'
import { ground, on, over } from './ground'
import { INSERT, riderAt } from './worm'

/**
 * Who is where in the Fremen's scene, and how they move.
 *
 * At the foot of the great rock: the stolen thopter, Jessica by it, Paul a little way off. The Fremen come up out of the
 * sand between them, Jamis nearest Paul, Stilgar behind him; one rises behind the slope's boulder; Chani is alone on
 * the crest above, on the other side. Jamis is fought on the flat, side on, and falls back among his own. Stilgar steps
 * over him to Paul, and Chani comes down and forward to Paul from the other side, and they look at each other. Then,
 * on the dune beyond, they go east in a line that keeps its order: two Fremen and Stilgar ahead, Paul beside Chani and
 * in step with her, Jessica behind; up onto the crest to watch the worm, the others waiting off its top; and on toward
 * the sun, out of the frame.
 *
 * In a side view everyone is on one line, so the order along it is the staging: nobody crosses anybody at a moment
 * that matters, and where the walk has someone overtake, they do it moving.
 */

export const SIZE = { paul: PAUL.size, jessica: JESSICA.size, chani: CHANI.size, stilgar: STILGAR.size, jamis: JAMIS.size, fremen: FREMEN.size }

/**
 * The duel was laid out with Paul to the west; it is played mirrored about here, Jamis coming at him from the west, out
 * of the ring that rose between Paul and his mother, and falling back among his own.
 */
const MIRROR = 2331.7
const m = (x: number) => MIRROR - x

/** Where each one stands before anything happens (x). */
export const AT = {
  paul: m(1165.5),
  jessica: 1159.9,
  jamis: m(1168.6),
  stilgar: 1162.15,
  /**
   * The Fremen, by number (1 to 4): two that come up out of the sand between Paul and his mother as the picture comes
   * back to him, one by the thopter's nose (up while the picture is on Chani), one rising from behind the slope's boulder.
   */
  fremen: [NaN, 1161.3, 1160.6, 1158.85, BOULDERS[0][0]] as number[],
  chani: 1186,
} as const

/** When each of those who come up out of the sand on the flat is all the way up. */
const UP = { jamis: 343.2, stilgar: 341.6, f1: 343.95, f2: 343.45, f3: 341.2 } as const

/**
 * Where on the flat someone comes up out of the sand, how big they are, and when they are up: the near sand stays over
 * them there until then, though elsewhere on the flat they stand on it.
 */
export const RISES: [number, number, number][] = [
  [AT.jamis, SIZE.jamis, UP.jamis],
  [AT.stilgar, SIZE.stilgar, UP.stilgar],
  [AT.fremen[1], SIZE.fremen, UP.f1],
  [AT.fremen[2], SIZE.fremen, UP.f2],
  [AT.fremen[3], SIZE.fremen, UP.f3],
]

/** The duel's moments: the challenge, the clash, the exchanges on the fill, the blow. */
export const DUEL = {
  challenge: 342.67,
  clash: 344.14,
  lunges: [346.93, 347.63] as const,
  fill: [347.98, 348.15, 348.37, 348.95, 349.37] as const,
  blow: 349.629,
} as const
/** Jamis thrown by the blow: where he comes down (and when), and where he bounces to. */
export const THROWN = { land: m(1167.75), at: 349.93, bounce: m(1168.25) } as const
/** Stilgar takes Paul in. */
export const TAKEN = 357.53
/**
 * The meeting: Chani comes down from her crest and forward to Paul, and stops in front of him; Paul turns to her and she
 * to him, and they hold. `at` is where she stands; the looks are the scene's (`MEET_LOOKS`).
 */
export const MEET = { from: 357.9, to: 359.9, at: m(1166.35) + R * (PAUL.size + CHANI.size) + 0.42 } as const
export const MEET_LOOKS = {
  paul: [[358.6, 363.4, 0]] as [number, number, number][],
  chani: [[359.5, 363.4, Math.PI]] as [number, number, number][],
  stilgar: [[358.1, 363.4, 0]] as [number, number, number][],
}
/**
 * The walk: on the fill's first onset the picture dissolves from the basin to the troop already in its line on the dune
 * beyond, in the order it keeps (the two Fremen and Stilgar ahead, Paul with Chani beside him, Jessica behind), and
 * they set off one on each of its onsets after, Paul and Chani together. Nobody passes anybody.
 */
export const WALK_FROM = 362.98
export const LINE = { jessica: 1179.6, paul: 1181.2, chani: 1181.9, stilgar: 1183.4, f3: 1184.6, f4: 1185.6 } as const
export const SET_OFF = { f4: 363.15, f3: 363.37, stilgar: 363.95, paul: 364.12, jessica: 364.25 } as const
/** They stop, one on each onset of the fill: the leaders over the crest, Jessica under it, Paul and Chani on it last. */
export const STOPS = { f4: 377.97, f3: 378.15, stilgar: 378.36, jessica: 378.95, together: 379.37 } as const
/** Chani turns to Paul on the last blow. */
export const TURN = M.last
/** They go on. */
export const ON = 398.65
/** Out of the frame toward the sun by about here. */
const GONE = 436.0

const contact = (a: number, b: number) => R * (a + b)

/** A run of rolls through [t, x] keys on the sand, each key reached with the ease given (arriving at speed for a blow). */
function keyed(w: Walk, size: number, keys: [number, number, Ease?][]): Walk {
  for (const [t, x, e] of keys) {
    const from = w.at[0]
    w.roll(over(from, x, size, 0.08), t, e ?? 'inout')
  }
  return w
}

/**
 * The Fremen's walk over the sand: never in step. From where it is to `b` between `t0` and `t1`, in legs of unequal
 * length with short unequal rests between, so a troop of them is a scatter of starts and stops, not a march. Two walks
 * with the same seed over the same distance are in step with each other: Paul's and Chani's.
 */
function sandwalk(w: Walk, b: number, t0: number, t1: number, seed: number, size: number): Walk {
  const a = w.at[0]
  const dist = Math.abs(b - a)
  const legs = Math.max(2, Math.round(dist / 2.6))
  const lens = Array.from({ length: legs }, (_, i) => 0.6 + hash(seed, i, 1))
  const rests = Array.from({ length: legs - 1 }, (_, i) => 0.12 + 0.42 * hash(seed, i, 2))
  const restTotal = Math.min(rests.reduce((s, r) => s + r, 0), (t1 - t0) * 0.32)
  const restScale = restTotal / Math.max(1e-6, rests.reduce((s, r) => s + r, 0))
  const roll = (t1 - t0) - restTotal
  const sum = lens.reduce((s, l) => s + l, 0)
  w.wait(t0)
  let x = a
  let t = t0
  for (let i = 0; i < legs; i++) {
    const share = lens[i] / sum
    const nx = i === legs - 1 ? b : x + (b - a) * share
    const nt = i === legs - 1 ? t1 : t + roll * share
    w.roll(over(x, nx, size, 0.1), nt, 'inout')
    x = nx
    t = nt
    if (i < legs - 1) {
      t += rests[i] * restScale
      w.wait(t)
    }
  }
  return w
}

/**
 * Turns the mark of a ball that has rolled this far (`segs`) to face `target` (radians, 0 east, -π/2 up), standing at
 * `at`, between `t0` and `t1`: a ride that carries nothing but its turn.
 */
function facing(segs: Seg[], name: string, size: number, at: Pt, t0: number, t1: number, target: number): Seg {
  const run = new Run(segs, name)
  const now = run.spin(t0, R * size)
  let d = target - now
  d = ((d % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI
  // Through the top: a head that looks up and over, never one that spins the long way round.
  return { t0, t1, kind: 'ride', at: () => at, turn: (t) => d * smoother(t, t0, t1) }
}

/**
 * The three who lead: where they wait over the crest (a long step apart), and the end's walk, which they make in one
 * rhythm a little apart in time, so the one behind never comes up on the one ahead.
 */
const LEAD = { f4: 1209.4, f3: 1207.8, stilgar: 1206.1, on: 69.0, dur: 35.4, delay: 0.42, seed: 83 } as const

/** Where Paul and Chani stop on the crest (she a little ahead of him), their seeds, and where they go on to. */
const PAIR = { to: 1199.95, gap: 0.7, seed: 31, endSeed: 37, end: 1271.0 } as const

/* ------------------------------------------------------------------ Paul */

function paul(): Seg[] {
  const s = SIZE.paul
  const w = new Walk(on(1160.6, s), M.breath2)
  w.roll(over(1160.6, 1164.2, s), 337.7, 'inout').wait(338.6).roll(over(1164.2, AT.paul, s), 339.6).wait(343.75)
  // The duel: Paul east, Jamis west; on each exchange the striker arrives in contact on the onset.
  const J = (x: number) => m(x - contact(SIZE.paul, SIZE.jamis))
  const k = (keys: [number, number, Ease?][]) => keyed(w, s, keys.map(([t, x, e]): [number, number, Ease?] => [t, m(x), e]))
  keyed(w, s, [[DUEL.clash, J(1166.3), 'in']])
  // The clash throws them both back.
  w.hop(on(m(1165.45), s), 344.36)
  k([
    [345.45, 1165.3],
    [346.4, 1165.55],
    [DUEL.lunges[0], 1165.55],
  ])
  // Jamis's lunge lands: back he goes.
  w.hop(on(m(1165.1), s), 347.13)
  keyed(w, s, [[DUEL.lunges[1], J(1166.55), 'in']])
  k([
    [347.85, 1166.0, 'out'],
    [DUEL.fill[0], 1166.0],
    [348.08, 1165.8, 'out'],
  ])
  keyed(w, s, [[DUEL.fill[1], J(1166.45), 'in']])
  k([
    [348.26, 1166.0, 'out'],
    [DUEL.fill[2], 1166.0],
    [348.55, 1165.75, 'out'],
  ])
  keyed(w, s, [[DUEL.fill[3], J(1166.5), 'in']])
  k([
    [349.1, 1166.05, 'out'],
    [DUEL.fill[4], 1166.05],
    [349.5, 1165.85, 'out'],
  ])
  keyed(w, s, [[DUEL.blow, J(1166.45), 'in']])
  k([[349.95, 1166.35, 'out']])
  // From the line on the dune beyond, beside Chani, in step with her and no one else.
  w.wait(WALK_FROM).jump(on(LINE.paul, s)).wait(SET_OFF.paul)
  sandwalk(w, PAIR.to, SET_OFF.paul, STOPS.together, PAIR.seed, s)
  const walked = [...w.segs]
  const stand = on(PAIR.to, s)
  // On the crest he turns to look east, where the worm will come.
  walked.push(facing(walked, 'paul', s, stand, STOPS.together, STOPS.together + 1.2, -0.25))
  const on2 = new Walk(stand, STOPS.together + 1.2).wait(ON + 0.4)
  sandwalk(on2, PAIR.end, ON + 0.4, GONE, PAIR.endSeed, s)
  on2.wait(440)
  return [...walked, ...on2.segs]
}

/* ------------------------------------------------------------------ Jessica */

function jessica(): Seg[] {
  const s = SIZE.jessica
  const w = new Walk(on(1159.4, s), M.breath2)
  // By the thopter's nose: the Fremen come up out of the sand between her and her son.
  w.roll(over(1159.4, AT.jessica, s), 337.95).wait(WALK_FROM)
  w.jump(on(LINE.jessica, s)).wait(SET_OFF.jessica)
  sandwalk(w, 1193.6, SET_OFF.jessica, STOPS.jessica, 41, s)
  w.wait(ON + 1.2)
  sandwalk(w, PAIR.end - 2.4, ON + 1.2, GONE + 0.6, 43, s)
  w.wait(440)
  return w.segs
}

/* ------------------------------------------------------------------ Jamis */

function jamis(): Seg[] {
  const s = SIZE.jamis
  const P = (x: number) => m(x + contact(SIZE.paul, SIZE.jamis))
  const k = (keys: [number, number, Ease?][]) => keyed(w, s, keys.map(([t, x, e]): [number, number, Ease?] => [t, m(x), e]))
  // Up out of the sand behind Paul as the picture comes back to him, nearest of all.
  const w = new Walk([AT.jamis, ground(AT.jamis) + R * s + 0.05], 339.9)
  w.wait(342.35).roll([on(AT.jamis, s)], UP.jamis, 'out')
  k([[343.6, 1168.0]])
  keyed(w, s, [[DUEL.clash, P(1166.3 - contact(SIZE.paul, SIZE.jamis)), 'in']])
  w.hop(on(m(1166.95), s), 344.38)
  k([
    [345.45, 1166.75],
    [346.4, 1167.05],
  ])
  keyed(w, s, [[DUEL.lunges[0], P(1165.55), 'in']])
  k([
    [347.25, 1166.55, 'out'],
    [DUEL.lunges[1], 1166.55],
  ])
  // Paul's lunge lands: back he goes.
  w.hop(on(m(1166.95), s), 347.82)
  keyed(w, s, [[DUEL.fill[0], P(1166.0), 'in']])
  k([
    [348.08, 1166.45, 'out'],
    [DUEL.fill[1], 1166.45],
    [348.26, 1166.65, 'out'],
  ])
  keyed(w, s, [[DUEL.fill[2], P(1166.0), 'in']])
  k([
    [348.55, 1166.5, 'out'],
    [DUEL.fill[3], 1166.5],
    [349.1, 1166.75, 'out'],
  ])
  keyed(w, s, [[DUEL.fill[4], P(1166.05), 'in']])
  k([
    [349.5, 1166.45, 'out'],
    [DUEL.blow, 1166.45],
  ])
  // Thrown back by the blow: off his feet, down among his own, once more, and still.
  w.hop(on(THROWN.land, s), THROWN.at).hop(on(THROWN.bounce, s), THROWN.at + 0.2)
  w.roll(over(THROWN.bounce, AT.jamis, s), 350.65, 'out').wait(440)
  return w.segs
}

/* ------------------------------------------------------------------ Stilgar */

function stilgar(): Seg[] {
  const s = SIZE.stilgar
  // Up out of the sand behind Paul while the picture is on Chani.
  const w = new Walk([AT.stilgar, ground(AT.stilgar) + R * s + 0.05], 339.9).roll([on(AT.stilgar, s)], UP.stilgar, 'out')
  w.wait(352.4)
  // A step to his man, and a breath beside him; then over him, on the boom, to the one who killed him.
  w.roll(over(AT.stilgar, 1162.45, s), 353.6).wait(TAKEN - 0.45)
  w.hop(on(m(1166.35) - contact(SIZE.paul, s), s), TAKEN).wait(TAKEN + 0.05)
  w.roll(over(w.at[0], w.at[0] - 0.18, s), TAKEN + 0.5, 'out').wait(WALK_FROM)
  // He leads them off, and waits over the crest.
  w.jump(on(LINE.stilgar, s)).wait(SET_OFF.stilgar)
  sandwalk(w, LEAD.stilgar, SET_OFF.stilgar, STOPS.stilgar, 47, s)
  w.wait(ON + LEAD.delay * 2)
  sandwalk(w, LEAD.stilgar + LEAD.on, ON + LEAD.delay * 2, ON + LEAD.delay * 2 + LEAD.dur, LEAD.seed, s)
  w.wait(440)
  return w.segs
}

/* ------------------------------------------------------------------ Chani */

function chani(): Seg[] {
  const s = SIZE.chani
  const crest = on(AT.chani, s)
  const segs: Seg[] = []
  // On the crest, looking east into the sun; on the boom she turns to look down at him.
  segs.push({ t0: 338.15, t1: 339.9, kind: 'rest', at: () => crest })
  segs.push({ t0: 339.9, t1: 341.6, kind: 'ride', at: () => crest, turn: (t) => -2.72 * smoother(t, 339.9, 341.6) })
  const w = new Walk(crest, 341.6)
  w.wait(350.4)
  // Down the dune, behind the boulder, to the flat; then forward to him, and she stops in front of him.
  w.roll(over(AT.chani, 1170.2, s), 357.1).wait(MEET.from)
  w.roll(over(1170.2, MEET.at, s), MEET.to).wait(WALK_FROM)
  w.jump(on(LINE.chani, s)).wait(SET_OFF.paul)
  sandwalk(w, PAIR.to + PAIR.gap, SET_OFF.paul, STOPS.together, PAIR.seed, s)
  const walked = [...segs, ...w.segs]
  const stand = on(PAIR.to + PAIR.gap, s)
  walked.push(facing(walked, 'chani', s, stand, STOPS.together, STOPS.together + 1.0, -0.3))
  walked.push({ t0: STOPS.together + 1.0, t1: TURN, kind: 'rest', at: () => stand })
  walked.push(facing(walked, 'chani', s, stand, TURN, TURN + 0.9, -Math.PI + 0.12))
  walked.push({ t0: TURN + 0.9, t1: ON + 0.4, kind: 'rest', at: () => stand })
  const on2 = new Walk(stand, ON + 0.4)
  sandwalk(on2, PAIR.end + PAIR.gap, ON + 0.4, GONE, PAIR.endSeed, s)
  on2.wait(440)
  return [...walked, ...on2.segs]
}

/* ------------------------------------------------------------------ the Fremen */

/** The two Fremen who walk ahead: where in the line, when they set off and stop, where over the crest, and on. */
const WALKS: Record<number, { line: number; off: number; stop: number; at: number; seed: number; end: [number, number, number] }> = {
  3: { line: LINE.f3, off: SET_OFF.f3, stop: STOPS.f3, at: LEAD.f3, seed: 71, end: [ON + LEAD.delay, LEAD.f3 + LEAD.on, ON + LEAD.delay + LEAD.dur] },
  4: { line: LINE.f4, off: SET_OFF.f4, stop: STOPS.f4, at: LEAD.f4, seed: 79, end: [ON, LEAD.f4 + LEAD.on, ON + LEAD.dur] },
}

function fremen(i: number): Actor {
  const s = SIZE.fremen
  const x = AT.fremen[i]
  const id = FREMEN.id + i
  let w: Walk
  if (i === 1 || i === 2) {
    // Up out of the sand between Paul and his mother as the picture comes back to him (one half up on the cut, the
    // other after it); and they stay with the dead.
    const [r0, r1] = i === 2 ? [342.25, UP.f2] : [342.95, UP.f1]
    w = new Walk([x, ground(x) + R * s + 0.05], 339.9).wait(r0).roll([on(x, s)], r1, 'out').wait(440)
  } else {
    if (i === 4) {
      // Up from behind the slope's boulder while the picture is on Chani.
      const top: Pt = [x, boulderTop(0) - R * s]
      w = new Walk([x, ground(x) + 0.3], 339.9).roll([top], 341.4, 'out')
    } else {
      // Up out of the sand by the thopter's nose while the picture is on Chani.
      w = new Walk([x, ground(x) + R * s + 0.05], 339.9).roll([on(x, s)], UP.f3, 'out')
    }
    const plan = WALKS[i]
    w.wait(WALK_FROM).jump(on(plan.line, s)).wait(plan.off)
    sandwalk(w, plan.at, plan.off, plan.stop, plan.seed, s)
    w.wait(plan.end[0])
    sandwalk(w, plan.end[1], plan.end[0], plan.end[2], LEAD.seed, s)
    w.wait(440)
  }
  return {
    id,
    color: FREMEN.color,
    rim: FREMEN.rim,
    size: s,
    run: new Run(w.segs, `fremen ${i}`),
    turn: [0, 2.4, -0.4, 2.9, -2.2][i],
  }
}

/** The rider on the worm in the insert: the stage's ball, on its back while the camera is there. */
function rider(): Actor {
  return {
    id: FREMEN.id + 10,
    color: FREMEN.color,
    rim: FREMEN.rim,
    size: FREMEN.size,
    run: new Run([{ t0: INSERT.from, t1: INSERT.to, kind: 'ride', at: riderAt }], 'rider'),
    // A rider looks ahead, down the worm toward its head.
    mark: Math.PI - 0.25,
  }
}

export function troop(): { moves: { paul: Seg[]; jessica: Seg[]; jamis: Seg[]; stilgar: Seg[]; chani: Seg[] }; actors: Actor[] } {
  return {
    moves: { paul: paul(), jessica: jessica(), jamis: jamis(), stilgar: stilgar(), chani: chani() },
    actors: [1, 2, 3, 4].map(fremen).concat(rider()),
  }
}
