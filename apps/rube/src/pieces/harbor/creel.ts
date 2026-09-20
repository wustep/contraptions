import { outline, solid } from '../../../../../src/core/draw'
import { easeInOutSine, easeInQuad, easeOutCubic, lerp } from '../../../../../src/core/ease'
import { FLOOR, ROLL, definePiece, over, rail, ramp, roll, trace, type Lane, type Pt } from '../../parts'
import { aboveWater } from './creatures'
import { WATER, bodyColor, piling, rope, seaWater, splash, water } from './sea'

/**
 * A creel. A lobster pot sits on the deck at the rail's end with its
 * funnel mouth to the ball, a lug on its foot under a hook on the deck's
 * end. A rope goes from its bridle up to the block on a davit that stands
 * over it from the deck above, along the arm to a second sheave at the
 * post, and down through the upper deck to a lead weight that hangs by the
 * post, heavier than the pot: the hook is all that holds the pot down.
 * The ball rolls in the mouth and is gone, and its knock hops the lug off
 * the hook. The lead goes down into the sea and the pot goes up a floor on
 * its rope, swinging a little; at the top the davit swings inboard and
 * carries it over the upper deck, and lets it down onto the planks with a
 * thump. The ball rolls to the far end, shoulders the flap over the far
 * mouth aside and comes out onto the deck; the flap swings to behind it.
 * The rope hangs slack from the block.
 *
 * The ball is inside from the mouth to the flap: its hidden lane is
 * sampled from the pot's own hoist and swing, the one motion the pot is
 * drawn with, so it comes out where the flap is.
 */
/** The pot in its own frame: its base centre at the origin, half its width, its straight side, its arched top, the bridle over it. */
const HW = 0.17
const SIDE = 0.15
const BRIDLE = 0.07
const HOIST_H = SIDE + HW + BRIDLE
/** The decks: the lower one the pot sits on, the upper one it is set down on; and the post that carries both the deck and the davit. */
const LOWER_END = 0.08
const UPPER_X0 = 0.02
const POST_X = 0.45
const DAVIT_TOP = -1.44
const ARM = 0.57
/** Where the pot stands below, and where it is set down above. */
const X0 = POST_X - ARM
const X1 = 0.22
const UP = -1 + FLOOR
/** Hoisted this far clear of the upper deck before the davit swings it in. */
const CLEAR = 0.08
/** The second sheave, by the post; the fall from it, down the post's side; and the lead on the fall: its size, and where its top hangs, under the deck's brace, before it goes. */
const SHEAVE_X = 0.35
const FALL_X = SHEAVE_X + 0.035
const LEAD_W = 0.1
const LEAD_H = 0.14
const LEAD_TOP = UP + 0.32

/** In the mouth, to the middle; the winch starts; up; in; down; the door; out. */
const T_MOUTH = (X0 - HW + 0.5) / ROLL
const T_IN = T_MOUTH + 0.16
const FIRE = T_IN + 0.18
const HOIST = 1.1
const T_UP = FIRE + HOIST
const SWING = 0.5
const T_IN_BOARD = T_UP + SWING
const LOWER = 0.16
const T_LAND = T_IN_BOARD + LOWER
const T_OUT = T_LAND + 0.12
const T_DOOR = T_OUT + HW / 1.3

/** The pot's pose: its base centre, and how far it hangs from the plumb. */
function poseAt(t: number): { b: Pt; th: number } {
  if (t < FIRE) return { b: [X0, FLOOR], th: 0 }
  if (t < T_UP) {
    const u = easeInOutSine(over(t, FIRE, T_UP))
    const th = 0.04 * Math.sin(((t - FIRE) / 0.9) * Math.PI * 2) * Math.sin(Math.PI * u)
    return { b: [X0, lerp(FLOOR, UP - CLEAR, u)], th }
  }
  if (t < T_IN_BOARD) {
    const u = easeInOutSine(over(t, T_UP, T_IN_BOARD))
    return { b: [lerp(X0, X1, u), UP - CLEAR], th: -0.12 * Math.sin(Math.PI * u) }
  }
  if (t < T_LAND) return { b: [X1, lerp(UP - CLEAR, UP, easeInQuad(over(t, T_IN_BOARD, T_LAND)))], th: 0 }
  return { b: [X1, UP], th: 0 }
}
/** A point of the pot's frame in the cell's: the pot hangs from its hoist point, so it turns about that. */
function inPot(local: Pt, t: number): Pt {
  const { b, th } = poseAt(t)
  const dx = local[0]
  const dy = local[1] + HOIST_H
  return [b[0] + dx * Math.cos(th) - dy * Math.sin(th), b[1] - HOIST_H + dx * Math.sin(th) + dy * Math.cos(th)]
}
/** The ball along the pot's floor: in from the mouth to the middle, held there, and out to the door once it is down. */
function alongAt(t: number): number {
  if (t < T_IN) return -HW + HW * (1 - Math.pow(1 - over(t, T_MOUTH, T_IN), 2))
  if (t < T_OUT) return 0
  return HW * over(t, T_OUT, T_DOOR)
}
const ballAt = (t: number): Pt => inPot([alongAt(t), -0.13], t)

const HIDDEN = [...trace(ballAt, T_MOUTH + 0.03, FIRE, 4), ...trace(ballAt, FIRE, T_DOOR, 30)].map((s) => ({ ...s, hidden: true }))
const OUT = HIDDEN[HIDDEN.length - 1].to
const LANE: Lane = {
  segs: [roll([-0.5, 0], [X0 - HW - 0.04, 0], ROLL), { from: [X0 - HW - 0.04, 0], to: ballAt(T_MOUTH + 0.03), dur: 0.03 + 0.04 / ROLL }, ...HIDDEN, ramp(OUT, [0.5, -1], 1.3, ROLL)],
  fire: FIRE,
}

/** The block on the davit's end: the davit swings in the plan, so in the picture its arm shortens. */
const blockAt = (t: number): Pt => [poseAt(t).b[0], DAVIT_TOP]
/** How much rope the lead has taken: as far as the pot has come up. */
const hauledAt = (t: number) => Math.max(0, FLOOR - poseAt(t).b[1])
/** When the lead's foot meets the water, on its way down. */
const T_WET = FIRE + (HOIST * Math.acos(1 - (2 * (WATER - LEAD_TOP - LEAD_H)) / (FLOOR - UP + CLEAR))) / Math.PI
/** How far the flap over the far mouth is swung out, shouldered by the ball, swinging to after. */
function flapAt(t: number): number {
  const s = t - (T_DOOR - 0.06)
  if (s < 0) return 0
  if (s < 0.1) return 1.2 * easeOutCubic(s / 0.1)
  if (s < 0.3) return 1.2
  return 1.2 * Math.exp(-(s - 0.3) * 3) * Math.abs(Math.cos((s - 0.3) * 6))
}

export const creel = definePiece<{ color: string }>({
  name: 'creel',
  weight: 0.9,
  place: ({ color, fits, theme, ball }) => {
    const cells: Pt[] = [
      [0, 0],
      [0, -1],
    ]
    if (!fits(cells, [1, -1])) return null
    return { cells, exit: { at: [1, -1], dir: 1 }, lane: LANE, state: { color: bodyColor(theme, color, ball.color) } }
  },
  draw: (p, s, { k, t, ink, bg, weight, theme }) => {
    const block = blockAt(t)
    const hoist = inPot([0, -HOIST_H], t)
    const leadY = LEAD_TOP + hauledAt(t)

    // The lower deck, with the hook on its end; the post from the seabed up through the upper deck to the davit's head; the upper deck and its brace.
    rail(p, k, ink, weight, -0.5, LOWER_END)
    piling(p, k, ink, weight, -0.34)
    outline(p, ink, weight)
    p.line(LOWER_END * k, FLOOR * k, (LOWER_END - 0.015) * k, (FLOOR - 0.05) * k)
    outline(p, ink, weight * 1.4)
    p.line(POST_X * k, 0.5 * k, POST_X * k, DAVIT_TOP * k)
    outline(p, ink, weight)
    p.line((POST_X - 0.07) * k, 0.5 * k, (POST_X + 0.07) * k, 0.5 * k)
    rail(p, k, ink, weight, UPPER_X0, 0.5, UP)
    p.line(UPPER_X0 * k, UP * k, UPPER_X0 * k, (UP + 0.06) * k)
    p.line(UPPER_X0 * k, (UP + 0.06) * k, (POST_X - 0.02) * k, (UP + 0.28) * k)

    // The davit: its arm out from the post's head to the block, and the block, a sheave between cheeks.
    outline(p, ink, weight * 1.4)
    p.line(POST_X * k, DAVIT_TOP * k, block[0] * k, DAVIT_TOP * k)
    outline(p, ink, weight)
    p.line(POST_X * k, (DAVIT_TOP + 0.16) * k, (POST_X - 0.14) * k, DAVIT_TOP * k)
    // The rope: up from the bridle over the block, along under the arm, over the second sheave and down through
    // the upper deck to the lead; slack on the pot's side once the pot is down.
    outline(p, ink, weight * 0.8)
    p.line(FALL_X * k, (DAVIT_TOP + 0.03) * k, FALL_X * k, Math.min(leadY, WATER) * k)
    if (t < T_LAND) p.line(block[0] * k, (DAVIT_TOP + 0.03) * k, hoist[0] * k, hoist[1] * k)
    else rope(p, k, ink, weight, block[0], DAVIT_TOP + 0.03, hoist[0] - 0.02, hoist[1], 0.05 * over(t, T_LAND, T_LAND + 0.3))
    solid(p, ink, weight, bg)
    p.circle(block[0] * k, (DAVIT_TOP + 0.03) * k, 0.07 * k)
    p.circle(SHEAVE_X * k, (DAVIT_TOP + 0.03) * k, 0.07 * k)
    // The lead: a block with a dark head for the rope's eye. What goes under the water is not seen.
    p.push()
    aboveWater(p, k, -0.5, 0.5)
    solid(p, ink, weight, s.color)
    p.rect(FALL_X * k, (leadY + LEAD_H / 2) * k, LEAD_W * k, LEAD_H * k, 0.012 * k)
    p.fill(ink)
    p.noStroke()
    p.rect(FALL_X * k, (leadY + 0.02) * k, LEAD_W * k, 0.03 * k)
    p.pop()
    water(p, k, ink, weight, -0.5, 0.5)
    splash(p, k, seaWater(theme), weight, FALL_X - 0.03, WATER, over(t, T_WET, T_WET + 0.5), 0.5)
    outline(p, ink, weight)
    // The bridle, behind the pot, from the hoist point to the pot's shoulders.
    for (const sx of [-0.1, 0.1]) {
      const sh = inPot([sx, -SIDE - HW * 0.7], t)
      p.line(hoist[0] * k, hoist[1] * k, sh[0] * k, sh[1] * k)
    }
  },
  over: (p, s, { k, t, ink, weight }) => {
    const { b, th } = poseAt(t)
    // The pot, in front of the ball: a flat-bottomed cage with an arched top, its ribs, a funnel's mouth on either end, the lug on its foot.
    p.push()
    p.translate(b[0] * k, (b[1] - HOIST_H) * k)
    p.rotate(th)
    p.translate(0, HOIST_H * k)
    solid(p, ink, weight, s.color)
    p.beginShape()
    p.vertex(-HW * k, 0)
    p.vertex(-HW * k, -SIDE * k)
    p.bezierVertex(-HW * k, -(SIDE + HW * 1.33) * k, HW * k, -(SIDE + HW * 1.33) * k, HW * k, -SIDE * k)
    p.vertex(HW * k, 0)
    p.endShape(p.CLOSE)
    outline(p, ink, weight * 0.7)
    for (const x of [-HW * 0.4, HW * 0.4]) p.line(x * k, -0.01 * k, x * k, -(SIDE + HW * 0.9) * k)
    p.line(-HW * k, -SIDE * 0.55 * k, HW * k, -SIDE * 0.55 * k)
    p.fill(ink)
    p.noStroke()
    for (const end of [-1, 1]) p.ellipse(end * HW * k, -0.14 * k, 0.07 * k, 0.24 * k)
    p.rect((HW + 0.012) * k, -0.02 * k, 0.04 * k, 0.03 * k)
    // The flap over the far mouth, hinged at its top: hanging, or shouldered out by the ball and swinging to.
    p.push()
    p.translate((HW + 0.005) * k, -0.25 * k)
    p.rotate(-flapAt(t))
    solid(p, ink, weight, s.color)
    p.rect(0.008 * k, 0.06 * k, 0.04 * k, 0.12 * k, 0.006 * k)
    p.pop()
    p.pop()
    // The thump as it is set down.
    const hit = t - T_LAND
    if (hit > 0 && hit < 0.18) {
      const f = hit / 0.18
      p.push()
      p.stroke(ink)
      p.strokeWeight(weight * (1 - f))
      for (const side of [-1, 1]) p.line((X1 + side * (HW + 0.03)) * k, (UP - 0.02) * k, (X1 + side * (HW + 0.08 + 0.06 * f)) * k, (UP - 0.05 - 0.04 * f) * k)
      p.pop()
    }
  },
})
