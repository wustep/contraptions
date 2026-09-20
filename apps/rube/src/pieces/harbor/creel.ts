import { outline, solid } from '../../../../../src/core/draw'
import { easeInOutSine, easeInQuad, easeOutCubic, lerp } from '../../../../../src/core/ease'
import { FLOOR, ROLL, definePiece, over, rail, ramp, roll, trace, type Lane, type Pt } from '../../parts'
import { bodyColor, piling, rope, water } from './sea'

/**
 * A creel. A lobster pot sits on the deck at the rail's end with its
 * funnel mouth to the ball, a rope from its bridle up to the block on a
 * davit that stands over it from the deck above, and back to a winch up
 * there. The ball rolls in the mouth and is gone. The winch turns and the
 * pot goes up a floor on its rope, swinging a little; at the top the davit
 * swings inboard and carries it over the upper deck, and the winch lets it
 * down onto the planks with a thump. The ball rolls to the far end, shoves
 * the trap's door open and comes out onto the deck; the door swings shut
 * behind it. The rope hangs slack from the block.
 *
 * The ball is inside from the mouth to the door: its hidden lane is
 * sampled from the pot's own hoist and swing, the one motion the pot is
 * drawn with, so it comes out where the door is.
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
/** The winch drum. */
const DRUM: Pt = [0.28, -0.98]
const DRUM_R = 0.06

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
/** How far the door is swung open, pushed by the ball, swinging shut after. */
function doorAt(t: number): number {
  const s = t - (T_DOOR - 0.06)
  if (s < 0) return 0
  if (s < 0.1) return 1.7 * easeOutCubic(s / 0.1)
  if (s < 0.3) return 1.7
  return 1.7 * Math.exp(-(s - 0.3) * 3) * Math.abs(Math.cos((s - 0.3) * 6))
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
  draw: (p, s, { k, t, ink, bg, weight }) => {
    const { b } = poseAt(t)
    const block = blockAt(t)
    const hoist = inPot([0, -HOIST_H], t)

    // The lower deck over the water, the post from the seabed up through the upper deck to the davit's head, and the upper deck.
    water(p, k, ink, weight, -0.5, 0.5)
    rail(p, k, ink, weight, -0.5, LOWER_END)
    piling(p, k, ink, weight, -0.34)
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
    // The rope: from the winch up the post and out along the arm, over the block and down to the bridle; slack once the pot is down.
    const hauled = Math.max(0, FLOOR - b[1])
    outline(p, ink, weight * 0.8)
    p.line(DRUM[0] * k, (DRUM[1] - DRUM_R) * k, POST_X * k, (DAVIT_TOP + 0.03) * k)
    if (t < T_LAND) p.line(block[0] * k, (DAVIT_TOP + 0.03) * k, hoist[0] * k, hoist[1] * k)
    else rope(p, k, ink, weight, block[0], DAVIT_TOP + 0.03, hoist[0] - 0.02, hoist[1], 0.05 * over(t, T_LAND, T_LAND + 0.3))
    solid(p, ink, weight, bg)
    p.circle(block[0] * k, (DAVIT_TOP + 0.03) * k, 0.07 * k)
    // The winch: a drum on the upper deck, turning as it hauls.
    solid(p, ink, weight, s.color)
    p.circle(DRUM[0] * k, DRUM[1] * k, DRUM_R * 2 * k)
    p.push()
    p.translate(DRUM[0] * k, DRUM[1] * k)
    p.rotate(-hauled / DRUM_R)
    outline(p, ink, weight)
    p.line(-DRUM_R * 0.7 * k, 0, DRUM_R * 0.7 * k, 0)
    p.line(0, -DRUM_R * 0.7 * k, 0, DRUM_R * 0.7 * k)
    p.pop()
    outline(p, ink, weight)
    p.line(DRUM[0] * k, DRUM[1] * k, DRUM[0] * k, UP * k)
    // The bridle, behind the pot, from the hoist point to the pot's shoulders.
    for (const sx of [-0.1, 0.1]) {
      const sh = inPot([sx, -SIDE - HW * 0.7], t)
      p.line(hoist[0] * k, hoist[1] * k, sh[0] * k, sh[1] * k)
    }
  },
  over: (p, s, { k, t, ink, weight }) => {
    const { b, th } = poseAt(t)
    // The pot, in front of the ball: a flat-bottomed cage with an arched top, its ribs, the funnel's mouth on the near end.
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
    p.ellipse(-HW * k, -0.14 * k, 0.07 * k, 0.24 * k)
    // The door on the far end, hinged at its top: shut, or shoved open by the ball and swinging to.
    p.push()
    p.translate(HW * k, -0.24 * k)
    p.rotate(doorAt(t))
    solid(p, ink, weight, s.color)
    p.rect(0.01 * k, 0.12 * k, 0.04 * k, 0.24 * k, 0.006 * k)
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
