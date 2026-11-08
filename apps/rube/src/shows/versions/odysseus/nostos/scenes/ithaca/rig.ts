import { ring, smooth, smoother } from '../../draw'
import type { Pt } from '../../path'
import { AXES, BOW, CRANK, HALL, HOIST, HOME, PAN, TRIAL } from './geo'

const HALL_FLOOR = HALL.floor

/**
 * The machines of Ithaca as functions of show time: the hoist's two baskets, the twelve axes, the bow's crank, the bow
 * and the arrow. The drawings and the balls' paths both read these, so a ball never floats off what carries it.
 */

/* ------------------------------------------------------------------ the hoist */

/** How far up the hero's basket has come, 0 at the cliff's foot, 1 at the top. The stones' basket goes the other way. */
export const hoistUp = (t: number): number => smoother(t, HOME.lift, HOME.top)

/** The hero's basket's floor, y, at `t` (a small bounce as it fetches up at the top), and the stones' basket's. */
export const heroBasketY = (t: number): number => HOIST.foot + (HOIST.top - HOIST.foot) * hoistUp(t) + 0.04 * ring(t, HOME.top, 1.6, 0.4)
export const stonesBasketY = (t: number): number => HOIST.top + (HOIST.foot - HOIST.top) * hoistUp(t)

/** The pin that holds the stones: in until the jerk, then pulled. */
export const pinOut = (t: number): number => smooth(t, HOME.lift - 0.12, HOME.lift + 0.12)

/* ------------------------------------------------------------------ the axes */

/** When axe `i` (0 the west one, by the bow) comes upright: the east one first, each up tripping the next. */
export const axeTime = (i: number): number => TRIAL.axes[AXES.length - 1 - i]

/** How far up axe `i` has swung, 0 lying in the trench (head to the west) to 1 standing, settling with a small rock. */
export function axeUp(i: number, t: number): number {
  const at = axeTime(i)
  return smoother(t, at - 0.4, at) + 0.06 * ring(t, at, 2.4, 0.3)
}

/** How hard axe `i` shivers as the arrow goes through its eye. */
export const axeShiver = (i: number, t: number): number => ring(t, arrowPasses(AXES[i]), 9, 0.18) * 0.05

/* ------------------------------------------------------------------ the crank and the bow */

const clamp01 = (u: number): number => Math.max(0, Math.min(1, u))
/** Fast at first and slowing onto where it is going; and the other way, from rest to fastest. */
const easeOut = (u: number): number => 1 - (1 - clamp01(u)) ** 2
const easeIn = (u: number): number => clamp01(u) ** 2

/** A knock on the plate: down at once, and ringing back up onto its stop (`depth` radians at most). */
const knock = (t: number, at: number, depth: number): number => depth * Math.max(0, ring(t, at, 2.6, 0.3))

/** A strain's tremble from `a`: a quarter of `amp` at first, all of it by `b`, `f` times a second. */
function tremble(t: number, a: number, b: number, amp: number, f: number): number {
  if (t <= a) return 0
  return amp * (0.25 + 0.75 * smooth(t, a, b)) * smooth(t, a, a + 0.15) * Math.sin(2 * Math.PI * f * (t - a))
}

/**
 * Given back from `g0` when he leaves it: the bow takes the cord back, the plate springing up onto its stop in `back`
 * seconds (fastest as it gets there), and rocking there (`rock`, radians past it at most).
 */
function given(t: number, at: number, g0: number, back: number, rock: number): number {
  if (t <= at + back) return g0 * (1 - easeIn((t - at) / back))
  return -rock * ring(t, at + back, 2.4, 0.4)
}

/** When each who tries leaves the plate: Leodes gets down; the second is thrown; the third leaps down; the fourth slips. */
export const LEAVES = [459.95, TRIAL.snap + 0.06, 473.96, TRIAL.slip]
/** When the plate begins to rise back under the third, the bow stronger than he is. */
export const SAG = 472.95

/**
 * How far below cocked each suitor has the plate, radians (cocked is 0.7, all the way is all of it), each further than
 * the last (`TRIAL.tries`):
 * - Leodes: a knock as he lands and one on each bounce, about a twelfth of the way, and his little weight while he
 *   sits.
 * - the second: driven three sevenths down at once, creeping on to half as he strains, trembling more and more, until
 *   it springs back and throws him.
 * - the third, on the bow warmed at the fire: more than half way, and his bounce takes it to seven tenths; then it
 *   rises back under him, slowly, and he gets down.
 * - the fourth: nearly all the way at once, creeping to within a twentieth of it, trembling hardest; and he slips.
 */
function tried(t: number): number {
  const [l0, l1, l2, l3] = TRIAL.tries
  if (t <= l0) return 0
  let g = knock(t, l0, 0.075) + knock(t, TRIAL.pumps[0], 0.06) + knock(t, TRIAL.pumps[1], 0.045)
  g += 0.012 * smooth(t, l0, l0 + 0.15) * (1 - smooth(t, LEAVES[0] - 0.1, LEAVES[0] + 0.05))
  if (t > l1) {
    const held = (u: number) => 0.3 * easeOut((u - l1) / 0.22) + 0.035 * Math.max(0, ring(u, l1 + 0.22, 3.2, 0.18)) + 0.055 * smooth(u, l1 + 0.35, TRIAL.snap - 0.1) + tremble(u, l1 + 0.3, TRIAL.snap, 0.014, 8.5)
    g += t <= TRIAL.snap ? held(t) : given(t, TRIAL.snap, held(TRIAL.snap), 0.14, 0.06)
  }
  if (t > l2) {
    const held = (u: number) => 0.4 * easeOut((u - l2) / 0.3) + 0.03 * Math.max(0, ring(u, l2 + 0.3, 3, 0.2)) + 0.09 * easeOut((u - TRIAL.bounce) / 0.2) * (u > TRIAL.bounce ? 1 : 0) + tremble(u, TRIAL.bounce + 0.25, SAG, 0.008, 7.5)
    const sits = 0.04
    if (t <= SAG) g += held(t)
    else if (t <= LEAVES[2]) g += sits + (held(SAG) - sits) * (1 - smoother(t, SAG, LEAVES[2] - 0.06))
    else g += given(t, LEAVES[2], sits, 0.08, 0.03)
  }
  if (t > l3) {
    const held = (u: number) => 0.6 * easeOut((u - l3) / 0.35) + 0.03 * Math.max(0, ring(u, l3 + 0.35, 3, 0.2)) + 0.06 * smooth(u, l3 + 0.5, TRIAL.slip - 0.25) + tremble(u, l3 + 0.45, TRIAL.slip, 0.012, 9)
    g += t <= TRIAL.slip ? held(t) : given(t, TRIAL.slip, held(TRIAL.slip), 0.2, 0.08)
  }
  return g
}

/** The crank's angle: cocked until his weight brings the plate down; held while he sits on it; back up as he leaves. */
export function crankAngle(t: number): number {
  const c = CRANK.cocked
  // Each suitor lands on the plate and it gives, each further than the last, and never all the way.
  if (t < TRIAL.sing) return c - tried(t)
  // His weight brings it down, fast at first and slowing onto the stop.
  const u = Math.min(1, (t - TRIAL.sing) / (TRIAL.drawn - TRIAL.sing))
  const down = c * (1 - (1 - u) * (1 - u))
  if (t < TRIAL.loose) return c - down
  // As he leaves the plate the bow takes the cord back at once, and the crank rocks on its stop.
  const back = Math.min(1, (t - TRIAL.loose) / 0.12)
  return back * c + 0.08 * ring(t, TRIAL.loose + 0.12, 2.2, 0.5)
}

/** The plate's outer end, where a ball lands on it. */
export function plateEnd(t: number): Pt {
  const a = crankAngle(t)
  return [CRANK.x + CRANK.plate * Math.cos(a), CRANK.y - CRANK.plate * Math.sin(a)]
}

/** The arm's tip, where the cord to the string is tied. */
export function armTip(t: number): Pt {
  const a = crankAngle(t)
  return [CRANK.x - CRANK.arm * Math.sin(a), CRANK.y - CRANK.arm * Math.cos(a)]
}

/** The string's middle at rest, a little west of the grip. */
export const NOCK0 = BOW.x + 0.09
/** The arrow's length, and its speed off the string (cells a second). */
export const ARROW = 0.46
const SPEED = 7.9

/** How far the string is drawn west of its rest, at `t`: the arm's swing, and the string's ring when it sings. */
export function drawOf(t: number): number {
  const d = CRANK.arm * (Math.sin(CRANK.cocked) - Math.sin(crankAngle(t)))
  const sing = t > TRIAL.sing ? 0.012 * ring(t, TRIAL.sing, 9, 0.3) : 0
  const twang = t > TRIAL.loose ? 0.02 * ring(t, TRIAL.loose + 0.12, 8, 0.35) : 0
  // When it springs back out of a suitor's hands, the string hums on.
  const hum = 0.012 * ring(t, TRIAL.snap + 0.14, 8, 0.28) + 0.016 * ring(t, TRIAL.slip + 0.2, 8, 0.32)
  return Math.max(0, d) + sing + twang + hum
}

/* ------------------------------------------------------------------ the fire pan */

/** When the tallow reaches the coals, after his shove tips it off the rim. */
const FAT = TRIAL.tallow + 0.12

/**
 * How tall the fire in the pan stands, cells: no flame on its coals until the tallow goes in; then the fat flares up
 * round the bow's foot, settles to a steady fire through the last tries, and once the last has slipped, the tallow
 * spent, it burns down to its coals again.
 */
export function panFire(t: number): number {
  const flare = 0.17 * smooth(t, FAT, FAT + 0.18) * Math.exp(-Math.max(0, t - FAT - 0.18) / 0.9)
  const burn = 0.1 * smooth(t, FAT, FAT + 0.4) * (1 - smooth(t, TRIAL.slip + 0.3, TRIAL.slip + 1.5))
  return flare + burn
}

/**
 * The round of tallow: on the pan's east rim, warming, until his shove tips it in; then on the coals, melting into the
 * flare. Where its middle is, and how much of it is left (1 whole, 0 gone).
 */
export function tallowAt(t: number): { x: number; y: number; left: number } {
  const rimX = PAN.x - PAN.half + 0.03
  const inX = PAN.x - 0.02
  if (t <= TRIAL.tallow) return { x: rimX, y: PAN.rim, left: 1 }
  const u = clamp01((t - TRIAL.tallow) / (FAT - TRIAL.tallow))
  // Off the rim and over onto the coals heaped above it, a little arc. (It went down below the rim, and was drawn on the
  // bowl's face, 469.6-470.7 s.)
  const x = rimX + (inX - rimX) * u
  const y = PAN.rim - 0.018 * u - 0.03 * Math.sin(Math.PI * u)
  return { x, y, left: 1 - smooth(t, FAT, FAT + 1.1) }
}

/** How warm the bow is from the fire under it: from the flare, through the last tries, cooling after. */
export const bowWarm = (t: number): number => smooth(t, FAT, FAT + 1.6) * (1 - smooth(t, 481, 490))

/** How far the string is drawn as it looses. */
const DRAWN = CRANK.arm * Math.sin(CRANK.cocked)

/** The arrow's flight: its nock (its tail) flying east from the string at the loose. */
const flying = (t: number): number => NOCK0 + DRAWN - SPEED * (t - TRIAL.loose)

/**
 * Where it takes Antinous: his middle, as the point reaches it, at the height the arrow flies. He comes down where it
 * throws him, a little on east, and lies there.
 */
export const STRUCK: Pt = [flying(TRIAL.strike) - ARROW - 0.02, BOW.y]
const DOWN: Pt = [STRUCK[0] - 0.53, HALL_FLOOR - 0.13]
const DOWN_T = TRIAL.strike + Math.sqrt((2 * (DOWN[1] - STRUCK[1])) / 26)
const LIES: Pt = [DOWN[0] - 0.12, DOWN[1]]

/** Antinous from the moment the arrow takes him: thrown on, down onto the floor, a short roll, and still. */
export function antinousStruck(t: number): Pt {
  if (t <= DOWN_T) {
    const u = (t - TRIAL.strike) / (DOWN_T - TRIAL.strike)
    const s = t - TRIAL.strike
    return [STRUCK[0] + (DOWN[0] - STRUCK[0]) * u, STRUCK[1] + 0.5 * 26 * s * s]
  }
  const u = smoother(t, DOWN_T, DOWN_T + 0.7)
  return [DOWN[0] + (LIES[0] - DOWN[0]) * (1 - (1 - u) * (1 - u)), DOWN[1]]
}

/** The arrow's nock (its tail), x: on the string until the loose, flying east, then standing in him where he lies. */
export function arrowTail(t: number): number {
  if (t <= TRIAL.loose) return NOCK0 + drawOf(t)
  if (t < TRIAL.strike) return flying(t)
  return antinousStruck(t)[0] + 0.02 + ARROW
}

/** The arrow's height at `t`: the bow's, and then his as he falls with it in him. */
export const arrowY = (t: number): number => (t < TRIAL.strike ? BOW.y : antinousStruck(t)[1])

/** Show time the arrow's point passes x (east of the bow). */
export const arrowPasses = (x: number): number => TRIAL.loose + (NOCK0 + DRAWN - ARROW - x) / SPEED

/** Whether the arrow is on the stage: laid on the string through the trial, and in Antinous after it. */
export const arrowShown = (t: number): boolean => t >= TRIAL.inside
