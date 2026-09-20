import type p5 from 'p5'
import { outline, solid } from '../../../../../src/core/draw'
import { FLOOR, R, ROLL, definePiece, laneAt, rail, ramp, roll, type Lane, type Seg } from '../../parts'
import { gardenGreen, nearestHue, tuft } from './green'

/**
 * A roll of turf. The path crosses a bed of bare soil cut one turf's
 * thickness under it, and a fat roll of turf lies on the bed with its loose
 * end already laid back to the bed's near edge, flush with the path. The
 * ball rolls onto the laid end and thumps into the roll, which gives, and
 * then goes: the ball shoves it along and it unrolls ahead of it, laying
 * lawn level with the path for the ball to roll on. It is heavy and slow at
 * first and quicker as the roll lightens, the ball gaining on the roll as it
 * dwindles, until the last curl is pressed flat under it and it rolls on at
 * the path's own pace. The lawn stays laid.
 *
 * The roll's radius goes as the square root of what is left in it, and the
 * ball is always against it: the roll's place is the ball's, plus what two
 * circles standing on two levels a turf apart must keep between their
 * centres. The ball's pace is the path's over one and the roll's heft, which
 * is what is left in it, so it leaves at a roll.
 */
/** A turf's thickness; the bed's two edges; where the roll lies to begin with, and how big it is. */
const T = 0.075
const X0 = -0.38
const X1 = 0.4
const XS = 0
const R0 = 0.15
/** How far the roll gives under the thump, and how far it has rolled when it has sprung back. */
const SQUASH = 0.03
const RELAX = 0.05
/** The last curl, hardly thicker than the turf itself: past this it is lawn. */
const R_MIN = T / 2 + 0.004
/** How much the full roll holds the ball back: its pace is the path's over one and this, times what is left of the roll. */
const HEFT = 7.0153

const REM0 = X1 - XS
/** What is left in the roll when it stands at `x`, as a fraction; its radius; how far behind its centre the ball's is. */
const left = (x: number) => Math.max(0, (X1 - x) / REM0)
const radius = (x: number) => R0 * Math.sqrt(left(x))
const reach = (r: number) => Math.sqrt((2 * R + T) * Math.max(0, 2 * r - T))
/** Where the roll is down to its last curl. */
const X_END = X1 - REM0 * (R_MIN / R0) ** 2
/** How much of the thump's dent the roll still has when it stands at `x`. */
const dent = (x: number) => SQUASH * Math.exp(-(x - XS) / RELAX)
/** The ball's place with the roll at `x`, and its pace. */
const ballFor = (x: number) => x - reach(radius(x)) + dent(x)
const paceFor = (x: number) => ROLL / (1 + HEFT * left(x))

/** Where the ball meets the roll, and where it is when the roll is spent. */
const X_HIT = XS - reach(R0)
const X_SPENT = ballFor(X_END)

const LANE: Lane = (() => {
  const n = 32
  const shove: Seg[] = []
  for (let i = 0; i < n; i++) {
    const a = XS + ((X_END - XS) * i) / n
    const b = XS + ((X_END - XS) * (i + 1)) / n
    shove.push(ramp([ballFor(a), 0], [ballFor(b), 0], paceFor(a), paceFor(b)))
  }
  return {
    segs: [
      roll([-0.5, 0], [X_HIT, 0], ROLL),
      // The thump: the ball buries its way in the roll, which dents before it moves.
      ramp([X_HIT, 0], [X_HIT + SQUASH, 0], ROLL, paceFor(XS)),
      ...shove,
      ramp([X_SPENT, 0], [0.5, 0], paceFor(X_END), ROLL),
    ],
    fire: (X_HIT + 0.5) / ROLL,
  }
})()

/** The roll for a ball at `bx`: where it stands, its dent, and whether there is any of it left. */
function rollFor(bx: number): { x: number; dent: number; spent: boolean } {
  if (bx <= X_HIT) return { x: XS, dent: 0, spent: false }
  if (bx <= X_HIT + SQUASH) return { x: XS, dent: bx - X_HIT, spent: false }
  if (bx >= X_SPENT) return { x: X1, dent: 0, spent: true }
  let lo = XS
  let hi = X_END
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2
    if (ballFor(mid) < bx) lo = mid
    else hi = mid
  }
  const x = (lo + hi) / 2
  return { x, dent: dent(x), spent: false }
}

/** The roll end-on: soil outside, and the grass wound into it from the bottom, up its leading side and round. */
function swissRoll(p: p5, k: number, ink: string, weight: number, soil: string, grass: string, r: number): void {
  solid(p, ink, weight, soil)
  p.circle(0, 0, r * 2 * k)
  const pitch = 0.062
  const turns = Math.max(0, (r - 0.03) / pitch)
  if (turns < 0.15) return
  p.noFill()
  p.stroke(grass)
  p.strokeWeight(Math.max(weight, 0.024 * k))
  p.strokeCap(p.SQUARE)
  p.beginShape()
  const n = Math.ceil(turns * 28)
  for (let i = 0; i <= n; i++) {
    const u = (turns * 2 * Math.PI * i) / n
    const rr = r - 0.026 - (pitch * u) / (2 * Math.PI)
    p.vertex(Math.cos(Math.PI / 2 - u) * rr * k, Math.sin(Math.PI / 2 - u) * rr * k)
  }
  p.endShape()
  p.strokeCap(p.ROUND)
}

export const turf = definePiece<{ color: string; grass: string }>({
  name: 'turf',
  weight: 1,
  place: ({ fits, theme, ball }) => {
    if (!fits([[0, 0]], [1, 0])) return null
    // Lawn is green and soil is earth, whatever colour the map hands the piece.
    return { cells: [[0, 0]], exit: { at: [1, 0], dir: 1 }, lane: LANE, state: { color: nearestHue(theme, 18, ball.color), grass: gardenGreen(theme) } }
  },
  draw: (p, s, { k, t, ink, weight }) => {
    const at = rollFor(laneAt(LANE, t).x)
    const r = radius(at.x)

    // The path either side of the bed, the ground, and the bed: bare soil a turf's thickness under the path.
    rail(p, k, ink, weight, -0.5, X0)
    rail(p, k, ink, weight, X1, 0.5)
    outline(p, ink, weight)
    p.line(-0.5 * k, 0.5 * k, 0.5 * k, 0.5 * k)
    tuft(p, k, ink, weight, -0.45, 0.5, 0.08, -0.02)
    tuft(p, k, ink, weight, 0.46, 0.5, 0.07, 0.02)
    solid(p, ink, weight, s.color)
    p.rect(((X0 + X1) / 2) * k, ((FLOOR + T + 0.5) / 2) * k, (X1 - X0) * k, (0.5 - FLOOR - T) * k)

    // The lawn laid so far, its top level with the path, and the grass standing on it.
    const laid = at.x
    solid(p, ink, weight, s.grass)
    p.rect(((X0 + laid) / 2) * k, (FLOOR + T / 2) * k, (laid - X0) * k, T * k)
    for (const x of [X0 + 0.09, X0 + 0.33, X0 + 0.6]) if (x < laid - (at.spent ? 0.06 : r + 0.04)) tuft(p, k, ink, weight, x, FLOOR, 0.06, 0.015)

    // The roll, standing on the bed where the lawn ends, dented on the ball's side while the thump is in it.
    if (!at.spent) {
      p.push()
      p.translate((at.x + r) * k, (FLOOR + T) * k)
      p.scale((2 * r - at.dent) / (2 * r), 1 + at.dent / (4 * r))
      p.translate(-r * k, -r * k)
      swissRoll(p, k, ink, weight, s.color, s.grass, r)
      p.pop()
    }
  },
})
