import { ring, smooth, smoother } from '../../draw'
import type { Pt } from '../../path'
import { AXES, BOW, CRANK, HOIST, HOME, TRIAL } from './geo'

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

/** The crank's angle: cocked until his weight brings the plate down; held while he sits on it; back up as he leaves. */
export function crankAngle(t: number): number {
  const c = CRANK.cocked
  // Each suitor lands on the plate and it gives a little, and no more.
  let give = 0
  for (const at of TRIAL.tries) give += 0.06 * Math.max(0, ring(t, at, 2.6, 0.3))
  if (t < TRIAL.sing) return c - give
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
const SPEED = 9

/** How far the string is drawn west of its rest, at `t`: the arm's swing, and the string's ring when it sings. */
export function drawOf(t: number): number {
  const d = CRANK.arm * (Math.sin(CRANK.cocked) - Math.sin(crankAngle(t)))
  const sing = t > TRIAL.sing ? 0.012 * ring(t, TRIAL.sing, 9, 0.3) : 0
  const twang = t > TRIAL.loose ? 0.02 * ring(t, TRIAL.loose + 0.12, 8, 0.35) : 0
  return Math.max(0, d) + sing + twang
}

/** How far the string is drawn as it looses. */
const DRAWN = CRANK.arm * Math.sin(CRANK.cocked)

/** The arrow's nock (its tail), x: on the string until the loose, then flying east. */
export function arrowTail(t: number): number {
  if (t <= TRIAL.loose) return NOCK0 + drawOf(t)
  return NOCK0 + DRAWN - SPEED * (t - TRIAL.loose)
}

/** Show time the arrow's point passes x (east of the bow). */
export const arrowPasses = (x: number): number => TRIAL.loose + (NOCK0 + DRAWN - ARROW - x) / SPEED

/** Whether the arrow is on the stage: laid on the string through the trial, gone into the dark over the cliff after it. */
export const arrowShown = (t: number): boolean => t >= TRIAL.inside && arrowTail(t) > 795
