import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../parts'
import { solid } from '../../../../../../../src/core/draw'
import type { Ctx } from './kit'
import { FLETCHER, HALL, HANDS } from './worlds'

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
export const CHEST = { top: 0.1, half: 0.34, waist: 1.12, halfWaist: 0.15 }

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
  /**
   * A bow (radians; negative toward the house's left): the chest and arms turned further than the column, about his
   * waist, so his head goes forward and down off it. Needs `floor`. The head passed in is already where the bow puts it.
   */
  bow?: number
}

/** His edge: the black's own dark, never cream. He is told from the wall by light, not by a line. */
const EDGE = '#0B0A09'
/** His sleeves: a breath lighter than the shirt-front, so an arm across the chest still reads. */
const SLEEVE = mixHex(FLETCHER, HANDS, 0.07)
/** The rim light along his top edges (the key light is above him, a little to the house's left). */
const RIM = HALL.gold
/** A hand's edge: the skin's own shadow. */
const HAND_EDGE = mixHex(HANDS, FLETCHER, 0.5)

/** A thin warm rim from a to b (in pixels). */
function rimLine(p: p5, a: Pt, b: Pt, w: number, alpha: number): void {
  if (alpha <= 0.01) return
  const col = p.color(RIM)
  col.setAlpha(255 * alpha)
  p.stroke(col)
  p.strokeWeight(w)
  p.noFill()
  p.line(a[0], a[1], b[0], b[1])
}

/** Fletcher's rig and hands round his ball at `head` (the stage draws the ball itself). */
export function drawConductor(p: p5, c: Ctx, head: Pt, pose: Pose, look: ConductorLook = {}): void {
  const { k, weight } = c
  const [hx, hy] = head
  const light = look.light ?? 1
  const rim = 0.2 + 0.3 * light
  // The lean: the body's axis from his head down to the column's foot, as a turn of the chest and arms about the head.
  let lean = look.floor !== undefined && look.base !== undefined ? Math.atan2(look.floor - hy, look.base - hx) - Math.PI / 2 : 0
  // The column's top: just under the cup; in a bow, at the waist, the chest turned further than the column.
  let tx = hx - 0.16 * Math.sin(lean)
  let ty = hy + 0.16 * Math.cos(lean)
  const bow = look.floor !== undefined ? look.bow ?? 0 : 0
  if (bow) {
    const r = CHEST.waist * 0.9
    const bx = look.base ?? hx
    for (let i = 0; i < 2; i++) {
      tx = hx - r * Math.sin(lean + bow)
      ty = hy + r * Math.cos(lean + bow)
      lean = Math.atan2(look.floor! - ty, bx - tx) - Math.PI / 2
    }
  }
  p.push()
  // Laid out by corners (the stage draws in rectMode(CENTER)): the base plate, the hands.
  p.rectMode(p.CORNER)
  // The column, from the floor to the waist: wide enough to read as his trousers, and his shoes on the floor.
  if (look.floor !== undefined) {
    solid(p, EDGE, weight * 0.8, FLETCHER)
    const bx = look.base ?? hx
    // The waist, where the chest ends (in a bow the chest is turned further, so the column meets it lower).
    const wx = bow ? tx : hx - CHEST.waist * Math.sin(lean)
    const wy = bow ? ty : hy + CHEST.waist * Math.cos(lean)
    p.quad((bx - 0.1) * k, look.floor * k, (bx + 0.1) * k, look.floor * k, (wx + 0.125) * k, wy * k, (wx - 0.125) * k, wy * k)
    p.rect((bx - 0.2) * k, (look.floor - 0.06) * k, 0.4 * k, 0.07 * k, 0.03 * k, 0.03 * k, 0.01 * k, 0.01 * k)
    // A dark crease down the middle (two legs, standing together), and the light along the key side.
    p.stroke(EDGE)
    p.strokeWeight(weight * 0.7)
    p.line(bx * k, (look.floor - 0.07) * k, (bx + (wx - bx) * 0.72) * k, (look.floor + (wy - look.floor) * 0.72) * k)
    rimLine(p, [(bx - 0.095) * k, (look.floor - 0.08) * k], [(wx - 0.12) * k, (wy + 0.06) * k], weight * 0.9, rim * 0.6)
  }
  p.translate(hx * k, hy * k)
  if (lean + bow) p.rotate(lean + bow)
  // The chest: a black shirt-front, square at the shoulders and narrowing to the waist, so the rig reads as a man.
  solid(p, EDGE, weight * 0.8, FLETCHER)
  const top = CHEST.top
  const waist = CHEST.waist
  const H = CHEST.half
  p.beginShape()
  p.vertex((-H + 0.07) * k, top * k)
  p.vertex((H - 0.07) * k, top * k)
  p.quadraticVertex(H * k, top * k, H * k, (top + 0.09) * k)
  p.quadraticVertex((H - 0.03) * k, (top + 0.6) * k, CHEST.halfWaist * k, waist * k)
  p.vertex(-CHEST.halfWaist * k, waist * k)
  p.quadraticVertex((-H + 0.03) * k, (top + 0.6) * k, -H * k, (top + 0.09) * k)
  p.quadraticVertex(-H * k, top * k, (-H + 0.07) * k, top * k)
  p.endShape(p.CLOSE)
  // The light along the tops of his shoulders, and down the key side of the chest.
  if (rim > 0.01) {
    const col = p.color(RIM)
    col.setAlpha(255 * rim)
    p.stroke(col)
    p.strokeWeight(weight * 1.0)
    p.noFill()
    p.beginShape()
    p.vertex(-H * k, (top + 0.1) * k)
    p.quadraticVertex(-H * k, (top + 0.005) * k, (-H + 0.07) * k, (top + 0.005) * k)
    p.vertex((H - 0.07) * k, (top + 0.005) * k)
    p.quadraticVertex(H * k, (top + 0.005) * k, H * k, (top + 0.1) * k)
    p.endShape()
    col.setAlpha(255 * rim * 0.45)
    p.stroke(col)
    p.bezier(-H * k, (top + 0.12) * k, (-H + 0.02) * k, (top + 0.4) * k, (-H + 0.06) * k, (top + 0.62) * k, -(CHEST.halfWaist + 0.04) * k, (waist - 0.2) * k)
  }
  // The arms, over the chest, behind the cup.
  drawArm(p, c, [-RIG.shoulder, RIG.drop], pose.right, light, lean + bow)
  drawArm(p, c, [RIG.shoulder, RIG.drop], pose.left, light, lean + bow)
  // The cup the ball sits in: his collar, a black crescent under it.
  solid(p, EDGE, weight * 0.8, FLETCHER)
  p.arc(0, 0.02 * k, (RIG.cup * 2 + 0.06) * k, (RIG.cup + 0.12) * k, 0.05, Math.PI - 0.05, p.CHORD)
  p.pop()
}

/**
 * One arm: the sleeve as two filled, tapered black limbs (0.17 of a cell at the shoulder, 0.12 at the wrist) with a
 * round elbow, a warm rim along whichever edge faces up (turned by `turn`, the body's lean), and the hand.
 */
function drawArm(p: p5, c: Ctx, shoulder: Pt, a: ArmPose, light: number, turn = 0): void {
  const { k, weight } = c
  const elbow: Pt = [shoulder[0] + Math.cos(a.up) * RIG.upper, shoulder[1] + Math.sin(a.up) * RIG.upper]
  const fa = a.up + a.bend
  const wrist: Pt = [elbow[0] + Math.cos(fa) * RIG.fore, elbow[1] + Math.sin(fa) * RIG.fore]
  const rim = 0.2 + 0.3 * light
  const limb = (from: Pt, to: Pt, w0: number, w1: number): void => {
    const dx = to[0] - from[0]
    const dy = to[1] - from[1]
    const L = Math.hypot(dx, dy) || 1e-6
    const nx = -dy / L
    const ny = dx / L
    solid(p, EDGE, weight * 0.7, SLEEVE)
    p.quad(
      (from[0] + nx * w0 / 2) * k, (from[1] + ny * w0 / 2) * k,
      (to[0] + nx * w1 / 2) * k, (to[1] + ny * w1 / 2) * k,
      (to[0] - nx * w1 / 2) * k, (to[1] - ny * w1 / 2) * k,
      (from[0] - nx * w0 / 2) * k, (from[1] - ny * w0 / 2) * k,
    )
    // The rim on the upper edge, as the stage sees it (the normal whose screen-y points up, the lean included).
    const up = Math.sin(turn) * nx + Math.cos(turn) * ny < 0 ? 1 : -1
    const inset = 0.012
    rimLine(
      p,
      [(from[0] + up * nx * (w0 / 2 - inset)) * k, (from[1] + up * ny * (w0 / 2 - inset)) * k],
      [(to[0] + up * nx * (w1 / 2 - inset)) * k, (to[1] + up * ny * (w1 / 2 - inset)) * k],
      weight * 0.9,
      rim * 0.8,
    )
  }
  limb(shoulder, elbow, 0.17, 0.145)
  limb(elbow, wrist, 0.14, 0.12)
  // The shoulder and the elbow: round, filled, so the arm bends rather than folds.
  p.noStroke()
  p.fill(SLEEVE)
  p.circle(shoulder[0] * k, shoulder[1] * k, 0.165 * k)
  p.circle(elbow[0] * k, elbow[1] * k, 0.14 * k)
  drawHand(p, c, wrist, fa + a.wrist, a.hand, light)
}

/** One hand at `wrist`, pointing along `angle`, in `shape`. Pale, simple, big enough to read. */
export function drawHand(p: p5, c: Ctx, wrist: Pt, angle: number, shape: HandShape, light = 1): void {
  const { k, weight } = c
  // Drawn at 0.24 of a cell and scaled up to the rig's hand, so the four shapes keep their proportions.
  const s = RIG.hand / 0.24
  p.push()
  p.rectMode(p.CORNER)
  p.translate(wrist[0] * k, wrist[1] * k)
  p.rotate(angle)
  p.scale(s)
  const edge = light >= 1 ? HAND_EDGE : mixHex(FLETCHER, HAND_EDGE, 0.3 + 0.7 * light)
  solid(p, edge, (weight * 0.7) / s, light >= 1 ? HANDS : mixHex(FLETCHER, HANDS, 0.3 + 0.7 * light))
  if (shape === 'fist') {
    // The closed fist, front on and larger than an open hand, so it reads at a glance: a short wrist out of the
    // sleeve, the heel of the hand, four curled fingers side by side (a dark crease between each, their rounded ends
    // the knuckles' row), and the thumb laid across them. Along +x is up the forearm, across (y) the fingers' row.
    p.scale(1.3)
    const sw = (weight * 0.7) / s / 1.3
    const skin = light >= 1 ? HANDS : mixHex(FLETCHER, HANDS, 0.3 + 0.7 * light)
    // The wrist, and the heel of the hand: a squarish block.
    solid(p, edge, sw, skin)
    p.rect(-0.07 * k, -0.05 * k, 0.1 * k, 0.1 * k, 0.02 * k)
    p.rect(0.0 * k, -0.112 * k, 0.15 * k, 0.224 * k, 0.05 * k, 0.03 * k, 0.03 * k, 0.05 * k)
    // The four fingers, curled: short rounded ends in a row (as long as they are wide), a dark crease between each.
    const fw = 0.056
    for (let i = 0; i < 4; i++) {
      const y0 = -0.112 + i * fw
      // The middle two stand a little proud of the outer two: a fist's knuckle line is not flat.
      const top = 0.2 + (i === 1 || i === 2 ? 0.01 : 0)
      solid(p, edge, sw * 0.9, skin)
      p.rect(0.11 * k, y0 * k, (top - 0.11) * k, fw * k, 0.01 * k, 0.028 * k, 0.028 * k, 0.01 * k)
    }
    // The thumb, laid across the fingers' lower joints from the outer side, its tip past the second finger.
    solid(p, edge, sw * 0.9, skin)
    p.rect(0.085 * k, -0.045 * k, 0.052 * k, 0.175 * k, 0.026 * k)
  } else if (shape === 'point') {
    // The palm, the other three fingers curled into it (a row of knuckles), the thumb tucked along them, and the index
    // straight out, long and thin: unmistakably a point.
    p.rect(0, -0.07 * k, 0.13 * k, 0.14 * k, 0.05 * k)
    p.rect(0.1 * k, -0.02 * k, 0.07 * k, 0.09 * k, 0.012 * k, 0.035 * k, 0.035 * k, 0.012 * k)
    p.rect(0.1 * k, -0.07 * k, 0.25 * k, 0.042 * k, 0.021 * k)
    p.rect(0.02 * k, -0.098 * k, 0.1 * k, 0.04 * k, 0.02 * k)
  } else {
    // An open hand: a palm, four fingers side by side with a hair of light between them, and the thumb well apart.
    // `beat` curls the fingers a little.
    const curl = shape === 'beat' ? 0.35 : 0
    p.rect(0, -0.072 * k, 0.125 * k, 0.144 * k, 0.04 * k)
    p.push()
    p.translate(0.105 * k, 0)
    p.rotate(curl)
    const fw = 0.031
    const gap = (0.144 - 4 * fw) / 3
    const lens = [0.11, 0.122, 0.112, 0.088]
    for (let i = 0; i < 4; i++) p.rect(0, (-0.072 + i * (fw + gap)) * k, lens[i] * k, fw * k, 0.015 * k)
    p.pop()
    p.push()
    p.translate(0.035 * k, -0.068 * k)
    p.rotate(-0.95)
    p.rect(0, -0.022 * k, 0.1 * k, 0.044 * k, 0.022 * k)
    p.pop()
  }
  p.pop()
}
