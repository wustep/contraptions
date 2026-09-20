import type p5 from 'p5'
import { outline } from '../../../../../../src/core/draw'
import { R, ROLL, definePiece, gallows, laneAt, laneReach, ramp, roll, type Lane, type Pt } from '../../../parts'
import { stage } from './hall'
import { ivoryFor, rod } from './parts-a'

/**
 * A triangle hung over the line from a gallows by a loop of gut at its
 * apex, its bottom bar down in the ball's way. The ball takes the near
 * corner on its shoulder and carries the triangle up ahead of it, swung
 * right over on its loop until the bar lies across the ball's top; the
 * ball goes under, the corner slips off its back, and the triangle swings
 * free, a long way over and back, ringing: the steel shivers where it
 * hangs, and the swings die away. Nothing stops here; a triangle is
 * punctuation.
 *
 * The triangle is pushed, not animated: its swing while the ball has it is
 * solved for, the least swing that keeps all three bars off the ball.
 */
/** The hook under the gallows, the loop's length, and the triangle's side. */
const HOOK: Pt = [0, -0.47]
const LOOP = 0.07
const SIDE = 0.36
const HIGH = (SIDE * Math.sqrt(3)) / 2
/** The steel's thickness, and the gap at the open corner. */
const STEEL = 0.034
const GAP = 0.06
/** The three corners, hanging plumb, relative to the hook: apex, east, west. */
const CORNERS: Pt[] = [
  [0, LOOP],
  [SIDE / 2, LOOP + HIGH],
  [-SIDE / 2, LOOP + HIGH],
]
/** The most the ball can swing it. */
const MOST = 1.45

/** A point of the triangle, swung `a` to the east about the hook. */
const swung = ([x, y]: Pt, a: number): Pt => [HOOK[0] + x * Math.cos(a) + y * Math.sin(a), HOOK[1] - x * Math.sin(a) + y * Math.cos(a)]

function distToSeg(px: number, py: number, [ax, ay]: Pt, [bx, by]: Pt): number {
  const dx = bx - ax
  const dy = by - ay
  const u = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(px - ax - u * dx, py - ay - u * dy)
}
/** Whether the triangle, swung `a`, is clear of a ball centred at `x` on the line. */
function clear(x: number, a: number): boolean {
  const c = CORNERS.map((pt) => swung(pt, a))
  for (let i = 0; i < 3; i++) if (distToSeg(x, 0, c[i], c[(i + 1) % 3]) < R + STEEL / 2) return false
  return true
}
/** The least swing, no less than `from`, that clears a ball at `x`. */
function shoved(x: number, from: number): number {
  for (let a = from; a <= MOST; a += 0.004) if (clear(x, a)) return a
  return MOST
}

/** Where the ball first touches it, and the swing it has been given by every place after that, until it can fall back. */
const TABLE: { x: number; a: number }[] = []
let MEET = 0
let RELEASE = 0
let LET_GO = 0
{
  let a = 0
  let met = false
  for (let x = -0.5; x <= 0.5; x += 0.002) {
    if (!met && clear(x, 0)) continue
    if (!met) {
      met = true
      MEET = x
    }
    // It falls back once nothing between here and hanging plumb would touch the ball.
    let free = true
    for (let b = a; b >= 0 && free; b -= 0.01) if (!clear(x, b)) free = false
    if (free) {
      RELEASE = x
      LET_GO = a
      break
    }
    a = shoved(x, a)
    TABLE.push({ x, a })
  }
}
const swingFor = (x: number): number => {
  if (x <= MEET || !TABLE.length) return 0
  const i = Math.min(TABLE.length - 1, Math.round((x - MEET) / 0.002))
  return TABLE[i].a
}

/** Slowed a little by the load, and back to pace by the far edge. */
const LANE: Lane = {
  segs: [roll([-0.5, 0], [MEET, 0], ROLL), ramp([MEET, 0], [RELEASE, 0], ROLL, ROLL * 0.8), ramp([RELEASE, 0], [0.5, 0], ROLL * 0.8, ROLL)],
  fire: 0,
}
LANE.fire = laneReach(LANE, RELEASE)

/** The free swing: a pendulum on its loop, let go at `LET_GO`, dying away. */
const OMEGA = 8.2
const swingAfter = (since: number) => LET_GO * Math.cos(OMEGA * since) * Math.exp(-since * 1.15)
/** It turns on its loop as it swings, so we see it narrow and widen. */
const twist = (since: number) => 1.1 * Math.sin(since * 5.3) * Math.exp(-since * 1.4)
/** The ring: how far the steel shivers either side of itself. */
const ring = (since: number) => (since < 0 ? 0 : 0.014 * Math.exp(-since * 2.4))

function bars(p: p5, k: number, ink: string, weight: number, color: string, a: number, narrow: number, dx: number, ghost: boolean): void {
  // The west bar stops short of the bottom corner: the open corner.
  const at = (pt: Pt): Pt => {
    const [x, y] = swung([pt[0] * narrow, pt[1]], a)
    return [x + dx, y]
  }
  const [apex, east, west] = CORNERS
  const open: Pt = [west[0] + (apex[0] - west[0]) * (GAP / SIDE), west[1] + (apex[1] - west[1]) * (GAP / SIDE)]
  const path = [open, apex, east, west].map(at)
  if (ghost) {
    const c = p.color(ink)
    c.setAlpha(70)
    p.stroke(c)
    p.strokeWeight(STEEL * k)
    p.noFill()
    p.beginShape()
    for (const [x, y] of path) p.vertex(x * k, y * k)
    p.endShape()
    return
  }
  rod(p, k, ink, weight * 0.7, color, path, STEEL)
}

export const triangle = definePiece<{ steel: string }>({
  name: 'triangle',
  weight: 0.8,
  place: ({ fits, theme, ball }) => {
    if (!fits([[0, 0]], [1, 0])) return null
    return { cells: [[0, 0]], exit: { at: [1, 0], dir: 1 }, lane: LANE, state: { steel: ivoryFor(theme, ball.color) } }
  },
  draw: (p, _s, { k, ink, weight }) => {
    stage(p, k, ink, weight, -0.5, 0.5)
    gallows(p, k, ink, weight, -0.4, 0.12, -0.4)
  },
  over: (p, s, { k, t, since, ink, weight }) => {
    const a = since < 0 ? swingFor(laneAt(LANE, t).x) : swingAfter(since)
    const narrow = since < 0 ? 1 : Math.cos(twist(since))
    // The loop it hangs by, from the hook to the apex.
    const [ax, ay] = swung(CORNERS[0], a)
    outline(p, ink, weight * 0.7)
    p.line(HOOK[0] * k, -0.5 * k, HOOK[0] * k, HOOK[1] * k)
    p.line(HOOK[0] * k, HOOK[1] * k, ax * k, ay * k)
    const shiver = ring(since)
    if (shiver > 0.002) {
      bars(p, k, ink, weight, s.steel, a, narrow, shiver, true)
      bars(p, k, ink, weight, s.steel, a, narrow, -shiver, true)
    }
    bars(p, k, ink, weight, s.steel, a, narrow, 0, false)
  },
})
