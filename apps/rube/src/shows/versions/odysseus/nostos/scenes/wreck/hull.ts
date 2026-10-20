import { blob, fill, mix, poly, smooth, smoother, stroke, type Paint } from '../../draw'
import type { Pt } from '../../path'
import { DECK, floatAt, type Pose } from '../../world/ship'
import { STRIKE } from '../sirens/course'

/**
 * The ship after the bolt, in two halves: drawn here from the instant of the strike, exactly as the ship was drawn up to
 * it (the same hull, trim, eye, steering oar and oars, at the same pose), and then cracked at the mast. The bow half
 * noses down and goes under fast; the stern half rears up, so its deck tips towards the break, and settles slower.
 */

/** The hull's outline, the ship's own (`world/ship.ts`): bow to the right. */
const HULL: Pt[] = [
  [2.35, 0.12],
  [2.05, 0.06],
  [2.0, -0.2],
  [2.12, -0.42],
  [1.9, -0.3],
  [1.3, DECK],
  [-1.2, DECK],
  [-1.75, -0.32],
  [-2.05, -0.6],
  [-2.1, -0.95],
  [-1.95, -1.18],
  [-1.8, -1.1],
  [-1.95, -0.88],
  [-1.98, -0.6],
  [-2.2, -0.2],
  [-2.05, 0.18],
  [-1.6, 0.38],
  [-0.5, 0.46],
  [0.9, 0.44],
  [1.75, 0.3],
]

const HULL_FILL = '#1A1A1E'
const TRIM = '#9A4B2A'
const INK = '#15181C'
/** Where the hull cracks (the ship's own frame), and the point at the keel each half turns about. */
export const CRACK = 0.06
const PIVOT: Pt = [CRACK, 0.42]

/** The wreck's own drift: the way the ship had on it at the strike, dying away. */
const TAU = 0.8
const V = 4.6
export const wreckX = (t: number): number => 531 + V * TAU * (1 - Math.exp(-Math.max(0, t - STRIKE) / TAU))
export const wreckPose = (t: number): Pose => floatAt(wreckX(t), t)

/** The oars' stroke at the strike, which they keep as they go down. */
let frozenStroke = 0
export function setFrozenStroke(s: number): void {
  frozenStroke = s
}

export interface Half {
  /** Turned about the keel at the crack, radians, clockwise. */
  turn: number
  /** Moved off, cells: apart, and down. */
  dx: number
  dy: number
}

export function bowHalf(t: number): Half {
  const s = t - (STRIKE + 0.3)
  const dy = s <= 0 ? 0 : s < 3 ? 0.35 * s * s : 3.15 + 2.1 * (s - 3)
  return { turn: 0.85 * smoother(t, STRIKE + 0.12, STRIKE + 2.8) + 0.3 * smooth(t, STRIKE + 2.8, STRIKE + 9), dx: 0.45 * smooth(t, STRIKE + 0.1, STRIKE + 3), dy }
}

export function sternHalf(t: number): Half {
  const s = t - (STRIKE + 0.6)
  const dy = s <= 0 ? 0 : s < 4 ? 0.08 * s * s : 1.28 + 0.64 * (s - 4)
  return { turn: 0.42 * smoother(t, STRIKE + 0.2, STRIKE + 2.2) + 0.25 * smooth(t, STRIKE + 2.2, STRIKE + 12), dx: -0.35 * smooth(t, STRIKE + 0.1, STRIKE + 3), dy }
}

/** A point of a half (the ship's own frame) in the world at `t`. */
export function onHalf(t: number, half: (t: number) => Half, p: Pt): Pt {
  const pose = wreckPose(t)
  const h = half(t)
  // About the pivot, then moved off, then on the swell.
  const c = Math.cos(h.turn)
  const s = Math.sin(h.turn)
  const qx = PIVOT[0] + (p[0] - PIVOT[0]) * c - (p[1] - PIVOT[1]) * s + h.dx
  const qy = PIVOT[1] + (p[0] - PIVOT[0]) * s + (p[1] - PIVOT[1]) * c + h.dy
  const C = Math.cos(pose.a)
  const S = Math.sin(pose.a)
  return [pose.x + qx * C - qy * S, pose.y + qx * S + qy * C]
}

/** The angle a half's deck is at in the world: what a ball on it is turned with. */
export const halfAngle = (t: number, half: (t: number) => Half): number => wreckPose(t).a + half(t).turn

/** The two halves, until they are deep enough to be lost in the dark. */
export function drawHull(g: Paint): void {
  const { ctx, t, view } = g
  if (t < STRIKE || t > STRIKE + 26) return
  const pose = wreckPose(t)
  if (pose.x < view.x0 - 6 || pose.x > view.x1 + 6) return
  const whole = t < STRIKE + 0.12
  for (const [half, side] of [[sternHalf, -1], [bowHalf, 1]] as const) {
    const h = half(t)
    ctx.save()
    ctx.translate(pose.x, pose.y)
    ctx.rotate(pose.a)
    ctx.translate(h.dx, h.dy)
    ctx.translate(PIVOT[0], PIVOT[1])
    ctx.rotate(h.turn)
    ctx.translate(-PIVOT[0], -PIVOT[1])
    if (!whole) {
      ctx.beginPath()
      ctx.rect(side > 0 ? CRACK : -3, -3, 3 + (side > 0 ? 0 : CRACK), 6)
      ctx.clip()
    }
    drawWhole(g)
    ctx.restore()
    if (whole) break
  }
}

/** The ship's hull as `drawShip` draws it, oars and all, in its own frame. */
function drawWhole(g: Paint): void {
  const { ctx } = g
  const lw = 2.2
  // The oars at the stroke they were at.
  const ph = frozenStroke - Math.floor(frozenStroke)
  const sweep = Math.cos(ph * Math.PI * 2)
  const lift = ph < 0.5 ? 0 : Math.sin((ph - 0.5) * Math.PI * 2) * 0.12
  for (let i = 0; i < 7; i++) {
    const x = -1.05 + (2.1 * i) / 6
    ctx.beginPath()
    ctx.moveTo(x, DECK + 0.08)
    ctx.lineTo(x + 0.38 * sweep, 0.55 - lift)
    stroke(g, INK, 1.8)
  }
  blob(ctx, HULL)
  fill(ctx, HULL_FILL)
  stroke(g, INK, lw)
  poly(ctx, [[1.88, -0.27], [1.3, DECK + 0.06], [-1.2, DECK + 0.06], [-1.7, -0.27], [-1.68, -0.2], [-1.2, DECK + 0.13], [1.3, DECK + 0.13], [1.86, -0.2]])
  fill(ctx, TRIM)
  ctx.beginPath()
  ctx.ellipse(1.82, -0.06, 0.1, 0.06, 0, 0, Math.PI * 2)
  fill(ctx, mix('#E8DFC8', '#8899a0', 0))
  ctx.beginPath()
  ctx.arc(1.84, -0.06, 0.035, 0, Math.PI * 2)
  fill(ctx, HULL_FILL)
  ctx.beginPath()
  ctx.moveTo(-1.5, -0.45)
  ctx.lineTo(-2.05, 0.55)
  stroke(g, INK, lw)
  poly(ctx, [[-1.98, 0.38], [-2.18, 0.72], [-2.1, 0.76], [-1.9, 0.42]])
  fill(ctx, HULL_FILL)
  stroke(g, INK, lw * 0.8)
}
