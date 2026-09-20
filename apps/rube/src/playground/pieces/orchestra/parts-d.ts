import type p5 from 'p5'
import type { Theme } from '../../../../../../src/core/themes'
import { FLOOR, R, post, rail, type Pt } from '../../../parts'

/**
 * What the hall's ways up share. Four of them end the same way: a board
 * with the ball on it comes level with the rail a floor up and tips toward
 * it, and the ball rolls off the board's end onto the rail. The tip and the
 * roll are one motion, worked out once here, so the lane and the drawing of
 * each piece read the same board.
 */

/** Cartoon gravity along a slope, for a ball that rolls rather than slides. */
const G_ROLL = 17

/** The first of `prefs` that is not the ball's colour: a body is never the colour of the ball it holds. */
export const avoid = (theme: Theme, prefs: readonly string[], ball: string): string =>
  prefs.find((c) => c !== ball) ?? theme.colors.find((c) => c !== ball) ?? prefs[0]

/**
 * The ball's centre on a board that passes through `pivot` at angle `a`
 * (positive: the side toward `turn` is down), `s` cells along the board from
 * the pivot toward `turn`.
 */
export const onBoard = (pivot: Pt, a: number, s: number, turn: 1 | -1): Pt => [
  pivot[0] + turn * (s * Math.cos(a) + R * Math.sin(a)),
  pivot[1] + s * Math.sin(a) - R * Math.cos(a),
]

export interface RollOff {
  /** Seconds from the first lean to the ball leaving the board's end. */
  dur: number
  /** The board's angle `tau` seconds in; it holds its last lean after. */
  angle(tau: number): number
  /** How far along the board the ball is, from where it started, `tau` seconds in. */
  along(tau: number): number
  /** The ball's pace along the board as it leaves. */
  pace: number
}

/**
 * A board leans over `lean(tau)` and a ball at rest on it rolls `length`
 * cells down it and off the end, under the slope it is on at each instant.
 * A lean the other way holds it where it is: it sits in a dimple.
 */
export function rollOff(length: number, lean: (tau: number) => number): RollOff {
  const dt = 1 / 480
  const table: number[] = [0]
  let s = 0
  let v = 0
  let tau = 0
  while (s < length && tau < 4) {
    v += G_ROLL * Math.sin(lean(tau)) * dt
    if (s <= 0 && v < 0) v = 0
    s = Math.max(0, s + v * dt)
    tau += dt
    table.push(Math.min(s, length))
  }
  const dur = tau
  return {
    dur,
    angle: lean,
    along: (at) => {
      if (at <= 0) return 0
      if (at >= dur) return length
      const i = at / dt
      const lo = Math.floor(i)
      return table[lo] + (table[Math.min(lo + 1, table.length - 1)] - table[lo]) * (i - lo)
    },
    pace: v,
  }
}

/** The rail a floor or two up that a board tips the ball onto, from `x0` out to the cell's edge, on a post to that cell's floor. */
export function shelf(p: p5, k: number, ink: string, weight: number, turn: 1 | -1, x0: number, floors: number): void {
  const a = turn * x0
  const b = turn * 0.5
  rail(p, k, ink, weight, Math.min(a, b), Math.max(a, b), -floors + FLOOR)
  post(p, k, ink, weight, turn * 0.43, -floors + FLOOR, -floors + 0.5)
}
