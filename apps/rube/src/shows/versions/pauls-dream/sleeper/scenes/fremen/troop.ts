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
 * At the foot of the great rock: the stolen thopter, Jessica and Paul by it. The Fremen come up round them: two out of
 * the sand behind Jessica as the picture comes back from Chani, Jamis nearest Paul, Stilgar behind him, one beyond, one
 * on the slope's boulder, one on the boulder by the thopter; Chani alone on the crest above. Jamis is fought on the
 * flat, side on, and falls back toward his own people. Stilgar comes past him to Paul. Then they go east over the dunes,
 * Paul beside Chani and in step with her, the others overtaking them and dropping back; up onto the crest to watch the
 * worm, the others waiting below it out of its sight; and on toward the sun, out of the frame.
 *
 * In a side view everyone is on one line, so the order along it is the staging: nobody crosses anybody at a moment
 * that matters, and where the walk has someone overtake, they do it moving.
 */

export const SIZE = { paul: PAUL.size, jessica: JESSICA.size, chani: CHANI.size, stilgar: STILGAR.size, jamis: JAMIS.size, fremen: FREMEN.size }

/** Where each one stands before anything happens (x). */
export const AT = {
  paul: 1165.5,
  jessica: 1163.1,
  jamis: 1168.6,
  stilgar: 1170.4,
  /**
   * The Fremen: one on the boulder by the thopter (it stays), two that come up out of the sand behind Jessica as the
   * picture comes back to Paul, one beyond Stilgar, one rising from behind the slope's boulder.
   */
  fremen: [BOULDERS[0][0], 1162.05, 1161.3, 1172.6, BOULDERS[1][0]] as number[],
  chani: 1186,
} as const

/** The duel's moments: the challenge, the clash, the exchanges on the fill, the blow. */
export const DUEL = {
  challenge: 342.67,
  clash: 344.14,
  lunges: [346.93, 347.63] as const,
  fill: [347.98, 348.15, 348.37, 348.95, 349.37] as const,
  blow: 349.629,
} as const
/** Stilgar takes Paul in. */
export const TAKEN = 357.53
/** They set off, one on each onset of the fill, Stilgar leading. */
export const SET_OFF = { stilgar: 362.98, f4: 363.15, f3: 363.37, f2: 363.95, paul: 364.12, jessica: 364.25, f1: 364.62 } as const
/** Paul comes level with Chani; from here they walk side by side. */
export const JOIN = 366.0
/** They stop below the crest, one on each onset of the fill, and Paul and Chani on the crest on its last. */
export const STOPS = { f4: 377.97, f3: 378.15, stilgar: 378.36, jessica: 378.95, f1: 379.12, f2: 379.25, together: 379.37 } as const
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

/** Where Paul and Chani walk from together and stop on the crest (she a little ahead of him), and their seeds. */
const PAIR = { from: 1171.5, to: 1199.95, gap: 0.7, seed: 31, endSeed: 37, end: 1271.0 } as const

/* ------------------------------------------------------------------ Paul */

function paul(): Seg[] {
  const s = SIZE.paul
  const w = new Walk(on(1160.6, s), M.breath2)
  w.roll(over(1160.6, 1164.2, s), 337.7, 'inout').wait(338.6).roll(over(1164.2, AT.paul, s), 339.6).wait(343.75)
  // The duel: Paul west, Jamis east; on each exchange the striker arrives in contact on the onset.
  const J = (x: number) => x - contact(SIZE.paul, SIZE.jamis)
  keyed(w, s, [
    [DUEL.clash, J(1166.3), 'in'],
    [344.55, 1165.45, 'out'],
    [345.45, 1165.3],
    [346.4, 1165.55],
    [DUEL.lunges[0], 1165.55],
    [347.25, 1165.1, 'out'],
    [DUEL.lunges[1], J(1166.55), 'in'],
    [347.85, 1166.0, 'out'],
    [DUEL.fill[0], 1166.0],
    [348.08, 1165.8, 'out'],
    [DUEL.fill[1], J(1166.45), 'in'],
    [348.26, 1166.0, 'out'],
    [DUEL.fill[2], 1166.0],
    [348.55, 1165.75, 'out'],
    [DUEL.fill[3], J(1166.5), 'in'],
    [349.1, 1166.05, 'out'],
    [DUEL.fill[4], 1166.05],
    [349.5, 1165.85, 'out'],
    [DUEL.blow, J(1166.45), 'in'],
    [349.95, 1166.35, 'out'],
  ])
  // Past the man he killed to where she waits, and from there beside her, in step with her and no one else.
  w.wait(SET_OFF.paul).roll(over(1166.35, PAIR.from, s), JOIN)
  sandwalk(w, PAIR.to, JOIN + 0.25, STOPS.together, PAIR.seed, s)
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
  w.roll(over(1159.4, AT.jessica, s), 337.95).wait(342.95)
  // A step back from the two of them as Jamis comes.
  w.roll(over(AT.jessica, 1162.55, s), 343.9).wait(358.0)
  // To her son's side when it is over.
  w.roll(over(1162.55, 1166.35 - contact(s, SIZE.paul), s), 359.7).wait(SET_OFF.jessica)
  sandwalk(w, 1194.2, SET_OFF.jessica, STOPS.jessica, 41, s)
  w.wait(ON + 1.2)
  sandwalk(w, PAIR.end - 1.4, ON + 1.2, GONE + 0.8, 43, s)
  w.wait(440)
  return w.segs
}

/* ------------------------------------------------------------------ Jamis */

function jamis(): Seg[] {
  const s = SIZE.jamis
  const P = (x: number) => x + contact(SIZE.paul, SIZE.jamis)
  const w = new Walk(on(AT.jamis, s), 339.9)
  w.wait(DUEL.challenge)
  keyed(w, s, [
    [343.6, 1168.0],
    [DUEL.clash, P(1166.3 - contact(SIZE.paul, SIZE.jamis)), 'in'],
    [344.6, 1166.95, 'out'],
    [345.45, 1166.75],
    [346.4, 1167.05],
    [DUEL.lunges[0], P(1165.55), 'in'],
    [347.25, 1166.55, 'out'],
    [DUEL.lunges[1], 1166.55],
    [347.85, 1166.95, 'out'],
    [DUEL.fill[0], P(1166.0), 'in'],
    [348.08, 1166.45, 'out'],
    [DUEL.fill[1], 1166.45],
    [348.26, 1166.65, 'out'],
    [DUEL.fill[2], P(1166.0), 'in'],
    [348.55, 1166.5, 'out'],
    [DUEL.fill[3], 1166.5],
    [349.1, 1166.75, 'out'],
    [DUEL.fill[4], P(1166.05), 'in'],
    [349.5, 1166.45, 'out'],
    [DUEL.blow, 1166.45],
  ])
  // Thrown back by the blow, and still.
  w.roll(over(1166.45, 1168.6, s), 350.45, 'out').wait(440)
  return w.segs
}

/* ------------------------------------------------------------------ Stilgar */

function stilgar(): Seg[] {
  const s = SIZE.stilgar
  const w = new Walk(on(AT.stilgar, s), 339.9)
  w.wait(350.4)
  // Down to his man, a while beside him; then past him to the one who killed him.
  w.roll(over(AT.stilgar, 1168.6 + contact(SIZE.jamis, s) + 0.04, s), 352.3).wait(355.4)
  w.roll(over(w.at[0], 1166.35 + contact(SIZE.paul, s), s), TAKEN, 'in').wait(TAKEN + 0.05)
  w.roll(over(w.at[0], w.at[0] + 0.18, s), TAKEN + 0.5, 'out').wait(SET_OFF.stilgar)
  // He leads them off, and waits under the crest.
  sandwalk(w, 1195.1, SET_OFF.stilgar, STOPS.stilgar, 47, s)
  w.wait(ON + 2.0)
  sandwalk(w, PAIR.end - 0.5, ON + 2.0, GONE + 0.4, 49, s)
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
  // Down the dune to the others, behind the boulder and out the other side; and there she waits for him.
  w.roll(over(AT.chani, PAIR.from + PAIR.gap, s), 357.1)
  sandwalk(w, PAIR.to + PAIR.gap, JOIN + 0.25, STOPS.together, PAIR.seed, s)
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

/** Each walker's walk: when they set off and stop, where under the crest, their seed, and the end's [from, to x, by]. */
const WALKS: Record<number, { off: number; stop: number; at: number; seed: number; end: [number, number, number] }> = {
  1: { off: SET_OFF.f1, stop: STOPS.f1, at: 1193.3, seed: 61, end: [ON + 2.6, PAIR.end - 4.0, GONE + 1.0] },
  2: { off: SET_OFF.f2, stop: STOPS.f2, at: 1192.5, seed: 67, end: [ON + 3.1, PAIR.end - 4.8, GONE + 1.3] },
  3: { off: SET_OFF.f3, stop: STOPS.f3, at: 1196.0, seed: 71, end: [ON + 1.6, PAIR.end - 1.8, GONE + 0.6] },
  4: { off: SET_OFF.f4, stop: STOPS.f4, at: 1196.8, seed: 79, end: [ON + 2.2, PAIR.end - 2.6, GONE + 0.9] },
}

function fremen(i: number): Actor {
  const s = SIZE.fremen
  const x = AT.fremen[i]
  const id = FREMEN.id + i
  let w: Walk
  if (i === 0) {
    // On the boulder by the thopter, and stays: the rock's watch.
    w = new Walk([x, boulderTop(0) - R * s], 339.9).wait(440)
  } else {
    if (i === 4) {
      // Up from behind the slope's boulder while the picture is on Chani; down off it when they set off.
      const top: Pt = [x, boulderTop(1) - R * s]
      w = new Walk([x, ground(x) + 0.3], 339.9).roll([top], 341.4, 'out').wait(WALKS[4].off)
      w.hop(on(x + 1.5, s), WALKS[4].off + 0.5)
    } else if (i === 1 || i === 2) {
      // Up out of the sand behind Jessica as the picture comes back to Paul: one half up on the cut, the other after it.
      const [r0, r1] = i === 2 ? [342.25, 343.45] : [342.95, 343.95]
      w = new Walk([x, ground(x) + R * s + 0.05], 339.9).wait(r0).roll([on(x, s)], r1, 'out')
    } else {
      w = new Walk(on(x, s), 339.9)
    }
    const plan = WALKS[i]
    w.wait(Math.max(w.time, plan.off))
    sandwalk(w, plan.at, w.time, plan.stop, plan.seed, s)
    w.wait(plan.end[0])
    sandwalk(w, plan.end[1], plan.end[0], plan.end[2], plan.seed + 2, s)
    w.wait(440)
  }
  return {
    id,
    color: FREMEN.color,
    rim: FREMEN.rim,
    size: s,
    run: new Run(w.segs, `fremen ${i}`),
    turn: [0.6, 2.4, -0.4, 2.9, -2.2][i],
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
    actors: [0, 1, 2, 3, 4].map(fremen).concat(rider()),
  }
}
