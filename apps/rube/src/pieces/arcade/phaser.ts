import type p5 from 'p5'
import { outline, solid } from '../../../../../src/core/draw'
import { FLOOR, R, ROLL, definePiece, laneAt, laneReach, over, post, rail, ramp, roll, type BallChange, type Lane, type Pt } from '../../parts'
import { flash, glow, lamp, score } from './neon'

/**
 * A phase gate, and a wall to prove it on. A wall of bricks stands on the
 * lane, four courses in the palette's colours, as solid as anything in the
 * show; either side of it a pylon hangs a curtain of scanlines across the
 * lane. Through the first curtain the ball comes out a ghost — an outline,
 * the world showing through it — and it slows, as if it did not quite
 * believe it, and rolls straight through the bricks, which flicker to
 * wireframe where it is and close up solid behind it. The second curtain
 * makes it whole again, with a flash, and it picks its pace back up.
 *
 * The wall and the curtains stand in front of the ball: it is seen inside
 * the wall only through the bricks it has phased.
 */
const GATE_IN = -0.22
const GATE_OUT = 1.22
const WALL_X0 = 0.3
const WALL_X1 = 0.7
const BRICK_W = (WALL_X1 - WALL_X0) / 2
const BRICK_H = 0.125
const COURSES = 4
/** Through the wall the ball goes at this pace, easing down to it from the first curtain and back up to the second. */
const V_WALL = 1.5
const SLOW: Pt = [WALL_X0 - R - 0.04, 0]
const QUICK: Pt = [WALL_X1 + R + 0.04, 0]
/** The pylons: a post outside each curtain, an arm over it, and the head the curtain hangs from. */
const HEAD_Y = -0.4
const CURTAIN_TOP = HEAD_Y + 0.045
const CURTAIN_W = 0.13

const LANE: Lane = {
  segs: [roll([-0.5, 0], [GATE_IN, 0], ROLL), ramp([GATE_IN, 0], SLOW, ROLL, V_WALL), roll(SLOW, QUICK, V_WALL), ramp(QUICK, [GATE_OUT, 0], V_WALL, ROLL), roll([GATE_OUT, 0], [1.5, 0], ROLL)],
  fire: 0,
}
const T_IN = laneReach(LANE, GATE_IN)
const T_OUT = laneReach(LANE, GATE_OUT)
LANE.fire = T_IN

/** Every brick in the wall: its course, and its rectangle. Running bond, so alternate courses start on a half. */
const BRICKS: { course: number; x0: number; x1: number; y0: number; y1: number }[] = []
for (let c = 0; c < COURSES; c++) {
  const y1 = FLOOR - c * BRICK_H
  const edges = c % 2 ? [WALL_X0, WALL_X0 + BRICK_W / 2, WALL_X0 + BRICK_W * 1.5, WALL_X1] : [WALL_X0, WALL_X0 + BRICK_W, WALL_X1]
  for (let i = 1; i < edges.length; i++) BRICKS.push({ course: c, x0: edges[i - 1], x1: edges[i], y0: y1 - BRICK_H, y1 })
}

export const phaser = definePiece<{ color: string; courses: string[] }>({
  name: 'phaser',
  points: 100,
  weight: 0.9,
  dynamic: true,
  place: ({ rng, color, fits, theme }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
    ]
    if (!fits(cells, [2, 0])) return null
    // The wall's courses: the palette, shuffled, one colour a course.
    const courses = rng.shuffle(theme.colors).slice(0, COURSES)
    // A ghost from the first curtain to the second, and never past it.
    const changes: BallChange[] = [
      { at: T_IN, ghost: true },
      { at: T_OUT, ghost: false },
    ]
    return { cells, exit: { at: [2, 0], dir: 1 }, lane: LANE, state: { color, courses }, changes }
  },
  // Over the first gate's head, where the ball phases: off the ball it sat on the gate.
  scores: (p, s, { k, since, bg }) => score(p, k, s.color, bg, GATE_IN, HEAD_Y - 0.05 + 0.1, '+100', since, 1),
  draw: (p, s, { k, t, ink, bg, weight }) => {
    rail(p, k, ink, weight, -0.5, 1.5)
    // The wall's footing: a slab under the lane on two posts.
    solid(p, ink, weight, s.color)
    p.rect(((WALL_X0 + WALL_X1) / 2) * k, (FLOOR + 0.035) * k, (WALL_X1 - WALL_X0 + 0.1) * k, 0.07 * k, 0.01 * k)
    for (const x of [WALL_X0 + 0.04, WALL_X1 - 0.04]) post(p, k, ink, weight, x, FLOOR + 0.07)
    // The pylons behind the lane: post, arm and head, and the plate in the rail the curtain falls to.
    for (const [gate, side, at] of [
      [GATE_IN, -1, T_IN],
      [GATE_OUT, 1, T_OUT],
    ] as [number, number, number][]) {
      const lit = 0.5 + 0.5 * (t > at ? 1 - over(t, at + 0.15, at + 0.7) : 0)
      const px = gate + side * 0.15
      outline(p, ink, weight)
      p.line(px * k, 0.5 * k, px * k, (HEAD_Y - 0.06) * k)
      p.line((px - 0.06) * k, 0.5 * k, (px + 0.06) * k, 0.5 * k)
      p.line(px * k, (HEAD_Y - 0.06) * k, gate * k, (HEAD_Y - 0.06) * k)
      p.line(gate * k, (HEAD_Y - 0.06) * k, gate * k, HEAD_Y * k)
      glow(p, k, s.color, gate, HEAD_Y, 0.12, lit > 0.6 ? lit : 0)
      solid(p, ink, weight, s.color)
      p.rect(gate * k, HEAD_Y * k, 0.17 * k, 0.08 * k, 0.015 * k)
      lamp(p, k, ink, weight, s.color, bg, px, HEAD_Y - 0.06, 0.03, lit > 0.6 ? 1 : 0)
      solid(p, ink, weight, s.color)
      p.rect(gate * k, (FLOOR + 0.025) * k, 0.17 * k, 0.05 * k, 0.01 * k)
    }
  },
  over: (p, s, { k, t, ink, weight }) => {
    const at = laneAt(LANE, t)
    const ghost = t > T_IN && t < T_OUT
    // The wall. A brick the ghost is inside goes to wireframe — its own
    // colour, dashed, nothing in it — and the ball is seen through it.
    const ctx = p.drawingContext as CanvasRenderingContext2D
    for (const b of BRICKS) {
      const dx = Math.max(b.x0 - at.x, 0, at.x - b.x1)
      const dy = Math.max(b.y0 - at.y, 0, at.y - b.y1)
      const phased = ghost && Math.hypot(dx, dy) < R + 0.015
      const cx = ((b.x0 + b.x1) / 2) * k
      const cy = ((b.y0 + b.y1) / 2) * k
      if (phased) {
        p.push()
        p.noFill()
        p.stroke(s.courses[b.course % s.courses.length])
        p.strokeWeight(weight * (Math.floor(t * 30) % 2 ? 0.7 : 0.5))
        p.strokeCap(p.SQUARE)
        ctx.setLineDash([0.03 * k, 0.03 * k])
        p.rect(cx, cy, (b.x1 - b.x0) * k, (b.y1 - b.y0) * k)
        ctx.setLineDash([])
        p.pop()
      } else {
        solid(p, ink, weight * 0.7, s.courses[b.course % s.courses.length])
        p.rect(cx, cy, (b.x1 - b.x0) * k, (b.y1 - b.y0) * k)
      }
    }
    // One heavy line round the whole wall, so it stands as one thing; the courses inside it are mortar.
    if (!ghost || at.x < WALL_X0 - R - 0.015 || at.x > WALL_X1 + R + 0.015) {
      outline(p, ink, weight)
      p.rect(((WALL_X0 + WALL_X1) / 2) * k, (FLOOR - (COURSES * BRICK_H) / 2) * k, (WALL_X1 - WALL_X0) * k, COURSES * BRICK_H * k)
    } else {
      // Open where the ghost is: the top and the sides above it stay drawn.
      const top = FLOOR - COURSES * BRICK_H
      const open = -R - 0.015 - BRICK_H
      outline(p, ink, weight)
      p.line(WALL_X0 * k, top * k, WALL_X1 * k, top * k)
      p.line(WALL_X0 * k, top * k, WALL_X0 * k, open * k)
      p.line(WALL_X1 * k, top * k, WALL_X1 * k, open * k)
    }
    // The curtains: scanlines falling from each head to the rail, brighter and wider as the ball goes through.
    curtain(p, k, weight, s.color, GATE_IN, t, t - T_IN)
    curtain(p, k, weight, s.color, GATE_OUT, t, t - T_OUT)
    flash(p, k, s.color, weight, GATE_IN, 0, t - T_IN, 0.25, 0.13, 0.3)
    flash(p, k, s.color, weight, GATE_OUT, 0, t - T_OUT, 0.25, 0.13, 0.3)
  },
})

/**
 * A curtain of scanlines at `x`, from the head down to the rail, always
 * falling; `since` the ball crossed it. Fine lines, each with its halo:
 * light, not slats.
 */
function curtain(p: p5, k: number, weight: number, color: string, x: number, t: number, since: number): void {
  const hit = since < 0 ? over(since, -0.12, 0) : 1 - over(since, 0.1, 0.5)
  const gap = 0.034
  const span = FLOOR - CURTAIN_TOP
  const n = Math.floor(span / gap)
  const w = CURTAIN_W * (1 + 0.5 * hit)
  const halo = p.color(color)
  halo.setAlpha(30 + 50 * hit)
  p.push()
  p.strokeCap(p.SQUARE)
  for (let i = 0; i < n; i++) {
    const y = CURTAIN_TOP + ((((i * gap + t * 0.25) % (n * gap)) + n * gap) % (n * gap))
    if (y > FLOOR - 0.015) continue
    p.stroke(halo)
    p.strokeWeight(weight * 1.5)
    p.line((x - w / 2) * k, y * k, (x + w / 2) * k, y * k)
    p.stroke(color)
    p.strokeWeight(weight * (0.35 + 0.2 * hit))
    p.line((x - w / 2) * k, y * k, (x + w / 2) * k, y * k)
  }
  p.pop()
}
