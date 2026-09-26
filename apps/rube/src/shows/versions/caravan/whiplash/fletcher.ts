import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../parts'
import { solid } from '../../../../../../../src/core/draw'
import type { Ctx } from './kit'
import { FLETCHER, HANDS } from './worlds'

/**
 * Terence Fletcher as a machine: the conductor. Canonical: every part that shows him draws him with
 * `drawConductor`, and nobody draws him any other way.
 *
 * He is a black ball (company, `who: 'fletcher'`, drawn by the stage) riding the top of his rig: a slim black
 * column from the floor to a cup under the ball, and two long jointed arms from the cup's sides, ending in pale
 * hands. The hands are his instrument. Four shapes, and they must read at a glance from across a room:
 *
 * - `open`: a flat palm, fingers together: the hold, "wait", a band held on a chord.
 * - `beat`: the palm turned down, fingers loose: a hand keeping time (drive it with `beatPose`).
 * - `point`: the index finger out: "you".
 * - `fist`: the closed fist. **The cut-off.** When his fist closes, everything stops. Keep it for that.
 *
 * `head` is the ball's centre (where the stage draws him); the rig hangs from it, so a part moves him by moving
 * his company span and draws the rig at the same point. Arms are angles: `up` is the upper arm's angle from the
 * shoulder (radians, 0 pointing right, negative up), `bend` the elbow's turn from that, `wrist` the hand's from the
 * forearm. Left and right are his, as the house sees him from the front (his left arm on the house's right).
 */

export type HandShape = 'open' | 'beat' | 'point' | 'fist'
export interface ArmPose {
  up: number
  bend: number
  wrist: number
  hand: HandShape
}
export interface Pose {
  left: ArmPose
  right: ArmPose
}

/** Lengths, in cells. The ball (his head) is 0.26 across; his arms are long, his hands large, so they read. */
export const RIG = { shoulder: 0.24, drop: 0.17, upper: 0.52, fore: 0.48, hand: 0.3, cup: 0.2 }
/** His chest: a black shirt-front from the shoulders to the waist, where the column goes on down. */
const CHEST = { top: 0.1, half: 0.31, waist: 1.12, halfWaist: 0.14 }

const arm = (up: number, bend: number, wrist: number, hand: HandShape): ArmPose => ({ up, bend, wrist, hand })

/** The poses he holds. The house's left is his right. */
export const POSES = {
  /** Arms down at his sides: watching. */
  rest: { right: arm(Math.PI * 0.62, -0.12, 0.05, 'beat'), left: arm(Math.PI * 0.38, 0.12, -0.05, 'beat') },
  /** Both hands up, open, level: the band ready; a chord held. */
  ready: { right: arm(-Math.PI * 0.82, 0.95, 0.2, 'open'), left: arm(-Math.PI * 0.18, -0.95, -0.2, 'open') },
  /** The right hand points out at the kit (the house's left). */
  point: { right: arm(Math.PI * 0.96, 0.04, 0.0, 'point'), left: arm(Math.PI * 0.4, 0.1, -0.05, 'beat') },
  /** The right hand up and closed: the fist before the cut. */
  fist: { right: arm(-Math.PI * 0.75, 0.55, -0.1, 'fist'), left: arm(Math.PI * 0.4, 0.1, -0.05, 'beat') },
} satisfies Record<string, Pose>

/**
 * An arm reaching its wrist to `target` (relative to the head) from the shoulder on `side` (-1 his right, the
 * house's left; +1 his left): two links, the elbow on the low side, the hand pointing along `dir` in `shape`.
 */
export function reachFromHead(side: -1 | 1, target: Pt, dir: number, shape: HandShape): ArmPose {
  const U = RIG.upper
  const F = RIG.fore
  const dx = target[0] - side * RIG.shoulder
  const dy = target[1] - RIG.drop
  const d = Math.min(U + F - 0.002, Math.max(Math.abs(U - F) + 0.02, Math.hypot(dx, dy)))
  const base = Math.atan2(dy, dx)
  const a = Math.acos(Math.max(-1, Math.min(1, (U * U + d * d - F * F) / (2 * U * d))))
  // The elbow below the line from shoulder to wrist: the sign that puts it lower.
  const up = Math.sin(base - a) > Math.sin(base + a) ? base - a : base + a
  const ex = side * RIG.shoulder + Math.cos(up) * U
  const ey = RIG.drop + Math.sin(up) * U
  const fa = Math.atan2(target[1] - ey, target[0] - ex)
  return arm(up, fa - up, dir - fa, shape)
}

/**
 * Time kept with the right hand, the way the film's Fletcher conducts: small, tight, at the chest. `phase` is beats
 * (1 per beat; 0 is the ictus), `size` how big the pattern is (0.3 small, 1 big). The elbow stays low and out; the
 * forearm and wrist do the work: the hand falls, gathering speed, into the ictus at chest height with a flick of the
 * wrist, rebounds, and floats at the top (chin height, brow height when it is big). The left hand mirrors it small
 * at the chest, open, or holds still there if `hold` is set. Arms go overhead only for `POSES.ready`.
 */
export function beatPose(phase: number, size = 0.7, hold = false): Pose {
  const u = phase - Math.floor(phase)
  // 0 on the ictus, 1 at the top of the rebound: a bounce, sharp at the bottom, rounded at the top.
  const h = Math.pow(Math.sin(Math.PI * u), 0.75)
  const flick = Math.pow(1 - h, 3)
  const top = 0.2 - 0.12 * size
  const depth = 0.16 + 0.22 * size
  const right = reachFromHead(-1, [-0.9 - 0.04 * h, top + depth * (1 - h)], Math.PI + 0.55 * h - 0.32 * flick, 'beat')
  const left = hold
    ? reachFromHead(1, [0.8, 0.42], -0.12, 'open')
    : reachFromHead(1, [0.8 + 0.02 * h, 0.4 + 0.35 * depth * (1 - h)], -0.2 * h + 0.12 * flick, 'open')
  return { right, left }
}

/** Between two poses, `u` 0..1 (ease it yourself), each shoulder turning the short way round. A hand's shape changes halfway. */
export function blendPose(a: Pose, b: Pose, u: number): Pose {
  const m = (x: ArmPose, y: ArmPose): ArmPose => {
    let d = y.up - x.up
    while (d > Math.PI) d -= 2 * Math.PI
    while (d < -Math.PI) d += 2 * Math.PI
    return {
      up: x.up + d * u,
      bend: x.bend + (y.bend - x.bend) * u,
      wrist: x.wrist + (y.wrist - x.wrist) * u,
      hand: u < 0.5 ? x.hand : y.hand,
    }
  }
  return { left: m(a.left, b.left), right: m(a.right, b.right) }
}

export interface ConductorLook {
  /** Where his column stands (the floor or the podium's top), in the part's frame; no column when unset. */
  floor?: number
  /** 0..1: how lit he is (his hands catch the light; the black stays black). */
  light?: number
  /**
   * Where his column's foot is across the stage, when it is not under his head: he leans, the foot planted, his
   * chest and arms tipped with the column (the arm poses are the body's own). Needs `floor`.
   */
  base?: number
}

/** Fletcher's rig and hands round his ball at `head` (the stage draws the ball itself). */
export function drawConductor(p: p5, c: Ctx, head: Pt, pose: Pose, look: ConductorLook = {}): void {
  const { k, ink, weight } = c
  const [hx, hy] = head
  // The lean: the body's axis from his head down to the column's foot, as a turn of the chest and arms about the head.
  const lean = look.floor !== undefined && look.base !== undefined ? Math.atan2(look.floor - hy, look.base - hx) - Math.PI / 2 : 0
  p.push()
  // Laid out by corners (the stage draws in rectMode(CENTER)): the base plate, the hands.
  p.rectMode(p.CORNER)
  // The column, from the floor to the cup (under the chest).
  if (look.floor !== undefined) {
    solid(p, ink, weight * 0.8, FLETCHER)
    const w = 0.09
    const bx = look.base ?? hx
    const tx = hx - 0.16 * Math.sin(lean)
    const ty = hy + 0.16 * Math.cos(lean)
    p.quad((bx - w) * k, look.floor * k, (bx + w) * k, look.floor * k, (tx + w * 0.6) * k, ty * k, (tx - w * 0.6) * k, ty * k)
    p.rect((bx - 0.2) * k, (look.floor - 0.04) * k, 0.4 * k, 0.05 * k, 0.02 * k)
  }
  p.translate(hx * k, hy * k)
  if (lean) p.rotate(lean)
  // The chest: a black shirt-front, square at the shoulders and narrowing to the waist, so the rig reads as a man.
  solid(p, ink, weight * 0.8, FLETCHER)
  const top = CHEST.top
  const waist = CHEST.waist
  p.beginShape()
  p.vertex((-CHEST.half + 0.06) * k, top * k)
  p.vertex((CHEST.half - 0.06) * k, top * k)
  p.quadraticVertex(CHEST.half * k, top * k, CHEST.half * k, (top + 0.08) * k)
  p.quadraticVertex((CHEST.half - 0.02) * k, (top + 0.55) * k, CHEST.halfWaist * k, waist * k)
  p.vertex(-CHEST.halfWaist * k, waist * k)
  p.quadraticVertex((-CHEST.half + 0.02) * k, (top + 0.55) * k, -CHEST.half * k, (top + 0.08) * k)
  p.quadraticVertex(-CHEST.half * k, top * k, (-CHEST.half + 0.06) * k, top * k)
  p.endShape(p.CLOSE)
  // The arms, over the chest, behind the cup.
  drawArm(p, c, [-RIG.shoulder, RIG.drop], pose.right, look.light ?? 1)
  drawArm(p, c, [RIG.shoulder, RIG.drop], pose.left, look.light ?? 1)
  // The cup the ball sits in: a black crescent under it.
  solid(p, ink, weight * 0.8, FLETCHER)
  p.arc(0, 0.02 * k, (RIG.cup * 2 + 0.06) * k, (RIG.cup + 0.12) * k, 0.05, Math.PI - 0.05, p.CHORD)
  p.pop()
}

function drawArm(p: p5, c: Ctx, shoulder: Pt, a: ArmPose, light: number): void {
  const { k, ink, weight } = c
  const elbow: Pt = [shoulder[0] + Math.cos(a.up) * RIG.upper, shoulder[1] + Math.sin(a.up) * RIG.upper]
  const fa = a.up + a.bend
  const wrist: Pt = [elbow[0] + Math.cos(fa) * RIG.fore, elbow[1] + Math.sin(fa) * RIG.fore]
  // The sleeve: two black strokes with an ink edge, thicker at the shoulder.
  for (const [w, col] of [[weight * 7.2, ink], [weight * 5.4, FLETCHER]] as const) {
    p.stroke(col)
    p.strokeWeight(w)
    p.noFill()
    p.line(shoulder[0] * k, shoulder[1] * k, elbow[0] * k, elbow[1] * k)
    p.strokeWeight(w * 0.85)
    p.line(elbow[0] * k, elbow[1] * k, wrist[0] * k, wrist[1] * k)
  }
  drawHand(p, c, wrist, fa + a.wrist, a.hand, light)
}

/** One hand at `wrist`, pointing along `angle`, in `shape`. Pale, simple, big enough to read. */
export function drawHand(p: p5, c: Ctx, wrist: Pt, angle: number, shape: HandShape, light = 1): void {
  const { k, ink, weight } = c
  // Drawn at 0.24 of a cell and scaled up to the rig's hand, so the four shapes keep their proportions.
  const s = RIG.hand / 0.24
  const L = 0.24
  p.push()
  p.rectMode(p.CORNER)
  p.translate(wrist[0] * k, wrist[1] * k)
  p.rotate(angle)
  p.scale(s)
  solid(p, ink, (weight * 0.7) / s, light >= 1 ? HANDS : mixHex(FLETCHER, HANDS, 0.3 + 0.7 * light))
  if (shape === 'fist') {
    // The closed fist, side on and larger than an open hand: one rounded block, the fingers' fold a single ridge
    // across it near its end, the thumb laid across its face. No separate knuckles: bumps on the end read as fingers.
    p.scale(1.3)
    const sw = (weight * 0.7) / s / 1.3
    p.strokeWeight(sw)
    p.rect(-0.01 * k, -0.105 * k, 0.225 * k, 0.21 * k, 0.05 * k, 0.095 * k, 0.095 * k, 0.05 * k)
    p.noFill()
    p.strokeWeight(sw * 0.8)
    p.arc(0.09 * k, 0, 0.12 * k, 0.17 * k, -1.1, 1.1)
    solid(p, ink, sw * 0.9, light >= 1 ? HANDS : mixHex(FLETCHER, HANDS, 0.3 + 0.7 * light))
    p.rect(0.015 * k, 0.018 * k, 0.15 * k, 0.062 * k, 0.031 * k)
  } else if (shape === 'point') {
    // The palm, curled fingers, and the index straight out.
    p.rect(0, -0.07 * k, 0.13 * k, 0.14 * k, 0.05 * k)
    p.rect(0.1 * k, -0.07 * k, (L - 0.02) * k, 0.045 * k, 0.022 * k)
  } else {
    // An open hand: a palm and four fingers together, a thumb apart. `beat` curls the fingers a little.
    const curl = shape === 'beat' ? 0.35 : 0
    p.rect(0, -0.075 * k, 0.12 * k, 0.15 * k, 0.04 * k)
    p.push()
    p.translate(0.11 * k, 0)
    p.rotate(curl)
    p.rect(0, -0.07 * k, (L - 0.1) * k, 0.14 * k, 0.05 * k)
    p.pop()
    p.push()
    p.translate(0.05 * k, -0.07 * k)
    p.rotate(-0.7)
    p.rect(0, -0.025 * k, 0.1 * k, 0.05 * k, 0.025 * k)
    p.pop()
  }
  p.pop()
}
