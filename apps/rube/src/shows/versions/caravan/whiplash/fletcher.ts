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
 * Time kept with the right hand: `phase` is beats (1 per beat; 0 is the ictus, where the hand bottoms out and
 * bounces), `size` how big the pattern is (0.3 small, 1 big). The left hand mirrors at a third of the size, or
 * holds if `hold` is set.
 */
export function beatPose(phase: number, size = 0.7, hold = false): Pose {
  const u = phase - Math.floor(phase)
  // A bounce: down fast into the ictus, a quick rebound up, a slow float to the top.
  const lift = u < 0.12 ? 1 - u / 0.12 : Math.pow(Math.sin(((u - 0.12) / 0.88) * Math.PI * 0.5), 0.7)
  const r = arm(-Math.PI * 0.75 + 0.55 * size * (1 - lift), 0.7 - 0.35 * size * (1 - lift), 0.35 * (1 - lift), 'beat')
  const l = hold ? POSES.ready.left : arm(-Math.PI * 0.25 - 0.18 * size * (1 - lift), -0.7 + 0.12 * size * (1 - lift), -0.3 * (1 - lift), 'beat')
  return { right: r, left: l }
}

/** Between two poses, `u` 0..1 (ease it yourself). A hand's shape changes halfway. */
export function blendPose(a: Pose, b: Pose, u: number): Pose {
  const m = (x: ArmPose, y: ArmPose): ArmPose => ({
    up: x.up + (y.up - x.up) * u,
    bend: x.bend + (y.bend - x.bend) * u,
    wrist: x.wrist + (y.wrist - x.wrist) * u,
    hand: u < 0.5 ? x.hand : y.hand,
  })
  return { left: m(a.left, b.left), right: m(a.right, b.right) }
}

export interface ConductorLook {
  /** Where his column stands (the floor or the podium's top), in the part's frame; no column when unset. */
  floor?: number
  /** 0..1: how lit he is (his hands catch the light; the black stays black). */
  light?: number
}

/** Fletcher's rig and hands round his ball at `head` (the stage draws the ball itself). */
export function drawConductor(p: p5, c: Ctx, head: Pt, pose: Pose, look: ConductorLook = {}): void {
  const { k, ink, weight } = c
  const [hx, hy] = head
  const cupY = hy + 0.1
  p.push()
  // Laid out by corners (the stage draws in rectMode(CENTER)): the base plate, the hands.
  p.rectMode(p.CORNER)
  // The column, from the floor to the cup.
  if (look.floor !== undefined) {
    solid(p, ink, weight * 0.8, FLETCHER)
    const w = 0.09
    p.quad((hx - w) * k, look.floor * k, (hx + w) * k, look.floor * k, (hx + w * 0.6) * k, (cupY + 0.06) * k, (hx - w * 0.6) * k, (cupY + 0.06) * k)
    p.rect((hx - 0.2) * k, (look.floor - 0.04) * k, 0.4 * k, 0.05 * k, 0.02 * k)
  }
  // The chest: a black shirt-front, square at the shoulders and narrowing to the waist, so the rig reads as a man.
  solid(p, ink, weight * 0.8, FLETCHER)
  const top = hy + CHEST.top
  const waist = hy + CHEST.waist
  p.beginShape()
  p.vertex((hx - CHEST.half + 0.06) * k, top * k)
  p.vertex((hx + CHEST.half - 0.06) * k, top * k)
  p.quadraticVertex((hx + CHEST.half) * k, top * k, (hx + CHEST.half) * k, (top + 0.08) * k)
  p.quadraticVertex((hx + CHEST.half - 0.02) * k, (top + 0.55) * k, (hx + CHEST.halfWaist) * k, waist * k)
  p.vertex((hx - CHEST.halfWaist) * k, waist * k)
  p.quadraticVertex((hx - CHEST.half + 0.02) * k, (top + 0.55) * k, (hx - CHEST.half) * k, (top + 0.08) * k)
  p.quadraticVertex((hx - CHEST.half) * k, top * k, (hx - CHEST.half + 0.06) * k, top * k)
  p.endShape(p.CLOSE)
  // The arms, over the chest, behind the cup.
  drawArm(p, c, [hx - RIG.shoulder, hy + RIG.drop], pose.right, look.light ?? 1)
  drawArm(p, c, [hx + RIG.shoulder, hy + RIG.drop], pose.left, look.light ?? 1)
  // The cup the ball sits in: a black crescent under it.
  solid(p, ink, weight * 0.8, FLETCHER)
  p.arc(hx * k, (hy + 0.02) * k, (RIG.cup * 2 + 0.06) * k, (RIG.cup + 0.12) * k, 0.05, Math.PI - 0.05, p.CHORD)
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
    // A closed fist: a squarer block than the open palm, the four knuckles a ridge along its end, the thumb wrapped
    // across its face. Reads as a fist from across the hall.
    p.rect(0, -0.1 * k, 0.21 * k, 0.2 * k, 0.07 * k, 0.05 * k, 0.05 * k, 0.07 * k)
    for (let i = 0; i < 4; i++) p.ellipse(0.2 * k, (-0.075 + i * 0.05) * k, 0.06 * k, 0.05 * k)
    p.strokeWeight((weight * 0.55) / s)
    p.rect(0.05 * k, 0.015 * k, 0.12 * k, 0.05 * k, 0.025 * k)
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
