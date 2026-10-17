import { LAP } from './geo'
import { Machine, type CubeName, type Cue, type Dir, type Setup } from './machine'
import { beat, quarter } from './music'

/**
 * The score: what moves on which beat. Every cue lands on a note of the measured clock (`music.ts`): a cube's flop
 * ends on its beat, a plank's slide ends on a downbeat. `machine.ts` builds the toy from these and checks it.
 *
 * The toy keeps the metre in layers: the planks move on the phrases (four bars), the black cube on the bars, the
 * coloured cubes on the beats, and a struck cube or a last dash on the eighths. Each of the four halves (A, A', B, B')
 * ends in the music with a run down eight sixteenths to the last note alone, and in the toy with a cube coming home
 * on that note.
 */

const cues: Cue[] = []

/** `cube` tips over toward `dir`, landing on beat `n` (fractions are between beats). */
function step(cube: CubeName, dir: Dir, n: number, how: 'step' | 'struck' = 'step', dur?: number): void {
  const t1 = beat(n)
  const d = dur ?? Math.min(0.4, 0.68 * quarter(n))
  cues.push({ kind: 'flop', cube, dir, t0: t1 - d, t1, how })
}

function slide(row: number, to: number, from: number, until: number): void {
  cues.push({ kind: 'slide', row, to, t0: beat(from), t1: beat(until) })
}

function flip(row: number, from: number, until: number): void {
  cues.push({ kind: 'flip', row, t0: beat(from), t1: beat(until) })
}

const dirOf = (a: readonly [number, number], b: readonly [number, number]): Dir =>
  b[0] > a[0] ? 'E' : b[0] < a[0] ? 'W' : b[1] > a[1] ? 'S' : 'N'

/** Beat `k` (1 to 3, fractions between) of bar `n`, counted in quarters from the first downbeat. */
const at = (n: number, k = 1): number => (n - 1) * 3 + k

// The clock: from one cell past the front's middle, a step on every downbeat from bar 2, so that its laps of the rim
// (32 cells) end at the front's middle on bars 32 and 64, the ends of the two parts.
for (let n = 2; n <= 64; n++) {
  const i = (n - 1) % LAP.length
  step('black', dirOf(LAP[i], LAP[(i + 1) % LAP.length]), at(n), 'step', 0.5)
}

/** Struck: knocked over by a cube landing against it, it leaves already moving and lands quicker. */
function struck(cube: CubeName, dir: Dir, n: number): void {
  step(cube, dir, n, 'struck', Math.min(0.3, 0.5 * quarter(n)))
}

/** `cube` walks `dirs`, a letter a step, landing on `beats` in turn. */
function route(cube: CubeName, dirs: string, beats: number[]): void {
  if (dirs.length !== beats.length) throw new Error(`${cube}: ${dirs.length} steps on ${beats.length} beats`)
  for (let i = 0; i < dirs.length; i++) step(cube, dirs[i] as Dir, beats[i])
}

/** Beats 1 and 2 of each bar in `bars`: a waltz's step, step, rest. */
const waltz = (bars: number[]): number[] => bars.flatMap((n) => [at(n, 1), at(n, 2)])

export const SETUP: Setup = {
  planks: [
    { at: 2, up: false },
    { at: 0, up: true },
    { at: 2, up: true },
    { at: 0, up: true },
    { at: 2, up: false },
  ],
  cubes: {
    black: { on: 'rim', x: LAP[1][0], y: LAP[1][1] },
    red: { on: 'plank', row: 3, i: 5 },
    yellow: { on: 'plank', row: 3, i: 1 },
    blue: { on: 'plank', row: 0, i: 6 },
    green: { on: 'plank', row: 4, i: 6 },
  },
  homes: ['green', 'blue', 'yellow', 'red', 'black'],
}

/* A1, bars 1–16: the clock sets out alone; then the planks shuffle, two bars apart, and carry the passenger to and fro
   until its pocket is beside it on the last note. The gate walks to its post. */
slide(2, 0, at(4, 2), at(5))
slide(3, 2, at(6, 2), at(7))
slide(0, 0, at(8, 2), at(9))
slide(3, 0, at(10, 2), at(11))
slide(4, 0, at(12, 2), at(13))
route('green', 'NNNW', [at(14, 1), at(14, 2), at(14, 3), at(15, 1)])
slide(3, 2, at(16), at(16, 2.25))
step('yellow', 'N', at(16, 3))

/* A2, bars 17–32: the board holds still; the walker walks home the long way, step, step, rest, over the passenger,
   and runs the last three on the cadence's run. */
route('blue', 'WWWWWWSSEESSEEEENN', waltz([19, 21, 22, 23, 25, 26, 27, 29, 30]))
step('blue', 'W', at(32, 1))
step('blue', 'W', at(32, 1.5), 'step', 0.26)
step('blue', 'W', at(32, 2), 'step', 0.26)
step('blue', 'N', at(32, 3))

/* B1, bars 33–48: the gate's pocket turns up; the planks line up a column behind the gate, two bars apart: its pocket,
   the passenger, the striker; the striker backs off and comes on. */
flip(0, at(33), at(34))
slide(0, 2, at(36, 2), at(37))
slide(2, 2, at(38, 2), at(39))
slide(3, 0, at(40, 2), at(41))
slide(4, 2, at(42, 2), at(43))
route('red', 'SN', [at(45, 1), at(47, 1)])
step('red', 'N', at(48, 2.5), 'step', 0.5)
struck('green', 'N', at(48, 3))

/* B2, bars 49–64: the clock's pocket turns up; the striker walks home over the others, a step on each second beat
   (the clock has the first); then the board swings zig to zag and back, each plank going as the one before it
   lands, a beat each, like dominoes; on the last bar's downbeat all five come flush together, and on the last note
   the clock steps into the last pocket. */
flip(4, at(49), at(50))
route('red', 'NNWWSSS', [at(50, 2), at(51, 2), at(52, 2), at(53, 2), at(54, 2), at(55, 2), at(56, 1)])
// The swing goes over the board plank by plank, each set off as the one before it lands: back to front from the
// third phrase's downbeat, front to back from the fourth's; then all five at once.
const ZIG = [2, 0, 2, 0, 2]
for (let r = 0; r < 5; r++) slide(r, 2 - ZIG[r], at(57) + r, at(57) + r + 1)
for (let r = 4; r >= 0; r--) slide(r, ZIG[r], at(61) + (4 - r), at(61) + (4 - r) + 1)
for (let r = 0; r < 5; r++) slide(r, 1, at(63), at(64))
step('black', 'N', at(64, 3), 'step', 0.55)

export const MACHINE = new Machine(SETUP, cues)
