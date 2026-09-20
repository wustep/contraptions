import { outline, solid } from '../../../../../src/core/draw'
import { easeInQuad, easeOutCubic } from '../../../../../src/core/ease'
import { FLOOR, ROLL, burst, definePiece, fly, over, rail, ramp, roll, trace, type Lane, type Pt } from '../../parts'
import { WATER, bodyColor, piling, seabed, water } from './sea'

/**
 * A barrel on a plank. A cask lies on its side at the deck's end, its
 * open end to the ball and its head to the sea, balanced on the deck's
 * corner over the head of a plank that runs down a floor to the lower
 * pier. The ball rolls in and is gone; as it reaches the far end its
 * weight tips the cask over the corner onto the plank, and the cask goes
 * down it nose first, gathering pace. At the foot its nose meets the lower
 * deck and it comes level with a thump and slides on into the chock; the
 * ball, still going, knocks the head open and rolls out onto the pier.
 * The head swings up and lies back on the cask.
 *
 * The ball is inside from the mouth to the head: its hidden lane is
 * sampled from the cask's own tip and slide, the one motion the cask is
 * drawn with, so it comes out where the mouth is.
 */
/** The upper deck: its end, and the corner the cask balances on. */
const CORNER: Pt = [0.3, FLOOR]
/** The cask in its own frame: the axis along x from the mouth at -LEN/2 to the head at LEN/2; the chime and the bilge. */
const LEN = 0.5
const CHIME = 0.2
const BILGE = 0.23
/** The ball lies this far under the axis inside. */
const SEAT = 0.08
/** The plank: from the corner down to the lower deck at this slope; and the chock at the bottom. */
const SLOPE = Math.atan2(1, 0.8)
const FOOT: Pt = [CORNER[0] + 0.8, 1 + FLOOR]
const CHOCK = 1.4
/** Where the cask lies at the top, and at rest at the bottom against the chock. */
const C0: Pt = [CORNER[0], FLOOR - BILGE]
const C_REST: Pt = [CHOCK - 0.03 - LEN / 2, 1 + FLOOR - BILGE]

/** Into the mouth, and along inside to the head. */
const MOUTH = C0[0] - LEN / 2
const T_MOUTH = (MOUTH + 0.5) / ROLL
const T_HEAD = T_MOUTH + 0.2
/** The tip begins as the ball passes the corner, and the cask is on the plank this much later. */
const FIRE = T_MOUTH + 0.12
const TIP = 0.35
const T_ON = FIRE + TIP
/** Down the plank; the nose meets the deck; level; into the chock. */
const SLIDE = 0.72
const T_LAND = T_ON + SLIDE
const LEVEL = 0.14
const T_LEVEL = T_LAND + LEVEL
const RUN = 0.14
const T_CHOCK = T_LEVEL + RUN
/** The head knocked open; the ball out of the mouth. */
const T_OUT = T_CHOCK + 0.1
const V_OUT = 1.6

/** How far down the plank the bilge has slid when the nose meets the lower deck. */
const S_LAND = (() => {
  // The nose's bottom corner, in the cask's frame, is at (LEN/2, CHIME); its height on the plank is C.y + that turned by SLOPE.
  const noseDrop = (LEN / 2) * Math.sin(SLOPE) + CHIME * Math.cos(SLOPE)
  const cy = CORNER[1] - BILGE * Math.cos(SLOPE)
  return (FOOT[1] - noseDrop - cy) / Math.sin(SLOPE)
})()
/** The nose's corner on the lower deck, which the cask comes level about. */
const NOSE_ON: Pt = (() => {
  const cx = CORNER[0] + BILGE * Math.sin(SLOPE) + S_LAND * Math.cos(SLOPE)
  return [cx + (LEN / 2) * Math.cos(SLOPE) - CHIME * Math.sin(SLOPE), FOOT[1]]
})()

/** The cask's pose: its centre and its nose-down angle. */
function poseAt(t: number): { c: Pt; a: number } {
  if (t < FIRE) return { c: C0, a: 0 }
  if (t < T_ON) {
    // Over the corner: slowly at first, then all at once, the bilge turning on the corner.
    const a = SLOPE * easeInQuad(over(t, FIRE, T_ON))
    return { c: [CORNER[0] + BILGE * Math.sin(a), CORNER[1] - BILGE * Math.cos(a)], a }
  }
  if (t < T_LAND) {
    const s = S_LAND * Math.pow(over(t, T_ON, T_LAND), 2)
    return { c: [CORNER[0] + BILGE * Math.sin(SLOPE) + s * Math.cos(SLOPE), CORNER[1] - BILGE * Math.cos(SLOPE) + s * Math.sin(SLOPE)], a: SLOPE }
  }
  if (t < T_LEVEL) {
    // The nose on the deck; the tail comes down about it.
    const a = SLOPE * (1 - easeOutCubic(over(t, T_LAND, T_LEVEL)))
    return { c: [NOSE_ON[0] - (LEN / 2) * Math.cos(a) + CHIME * Math.sin(a), NOSE_ON[1] - (LEN / 2) * Math.sin(a) - CHIME * Math.cos(a)], a }
  }
  const x0 = NOSE_ON[0] - LEN / 2
  if (t < T_CHOCK) return { c: [x0 + (C_REST[0] - x0) * over(t, T_LEVEL, T_CHOCK), C_REST[1]], a: 0 }
  const s = t - T_CHOCK
  return { c: [C_REST[0] - 0.012 * Math.exp(-s * 6) * Math.sin(s * 40), C_REST[1]], a: 0 }
}
/** A point of the cask's frame in the cell's. */
function inCask(local: Pt, t: number): Pt {
  const { c, a } = poseAt(t)
  return [c[0] + local[0] * Math.cos(a) - local[1] * Math.sin(a), c[1] + local[0] * Math.sin(a) + local[1] * Math.cos(a)]
}
/** The ball along the axis inside: in to the head, held there through the slide, and out past it. */
function alongAt(t: number): number {
  if (t < T_HEAD) return -LEN / 2 + (LEN - 0.1) * (1 - Math.pow(1 - over(t, T_MOUTH, T_HEAD), 2))
  if (t < T_CHOCK) return LEN / 2 - 0.1
  return LEN / 2 - 0.1 + (0.1 + 0.02) * over(t, T_CHOCK, T_OUT)
}
const ballAt = (t: number): Pt => inCask([alongAt(t), SEAT], t)

const HIDDEN = [...trace(ballAt, T_MOUTH + 0.04, T_ON, 8), ...trace(ballAt, T_ON, T_OUT, 20)].map((s) => ({ ...s, hidden: true }))
const OUT = HIDDEN[HIDDEN.length - 1].to
const LAND: Pt = [OUT[0] + 0.07, 1]
const LANE: Lane = {
  segs: [
    roll([-0.5, 0], [MOUTH - 0.06, 0], ROLL),
    { from: [MOUTH - 0.06, 0], to: ballAt(T_MOUTH + 0.04), dur: 0.04 + 0.06 / ROLL },
    ...HIDDEN,
    fly(OUT, LAND, 0.06, 0.008),
    ramp(LAND, [1.5, 1], V_OUT, ROLL),
  ],
  fire: FIRE,
}

/** How far the head has swung open, in radians, about its hinge at the top of the nose. */
const headAt = (t: number) => (t < T_CHOCK + 0.04 ? 0 : 2.6 * easeOutCubic(over(t, T_CHOCK + 0.04, T_CHOCK + 0.3)))

export const barrel = definePiece<{ color: string }>({
  name: 'barrel',
  weight: 0.9,
  place: ({ color, fits, theme, ball }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
      [1, 1],
    ]
    if (!fits(cells, [2, 1])) return null
    return { cells, exit: { at: [2, 1], dir: 1 }, lane: LANE, state: { color: bodyColor(theme, color, ball.color) } }
  },
  draw: (p, _s, { k, t, ink, weight }) => {
    // The upper deck over its water, on a piling; the lower pier a floor down over the sea, on its own.
    water(p, k, ink, weight, -0.5, 1.5)
    rail(p, k, ink, weight, -0.5, CORNER[0])
    piling(p, k, ink, weight, -0.3)
    water(p, k, ink, weight, 0.5, 1.5, 1 + WATER)
    seabed(p, k, ink, weight, 0.5, 1.5, 1.5)
    rail(p, k, ink, weight, FOOT[0] - 0.22, 1.5, 1 + FLOOR)
    piling(p, k, ink, weight, 1.3, 1 + FLOOR, 1.5)
    // The plank, from the corner down to the lower deck, on a trestle; the chock at the bottom.
    outline(p, ink, weight * 1.6)
    p.line(CORNER[0] * k, CORNER[1] * k, FOOT[0] * k, FOOT[1] * k)
    outline(p, ink, weight)
    const tx = CORNER[0] + 0.45
    const ty = CORNER[1] + 0.45 * Math.tan(SLOPE)
    p.line(tx * k, ty * k, tx * k, 1.5 * k)
    p.line((tx - 0.06) * k, 1.5 * k, (tx + 0.06) * k, 1.5 * k)
    p.line(CORNER[0] * k, CORNER[1] * k, CORNER[0] * k, 0.5 * k)
    solid(p, ink, weight, ink)
    p.triangle(CHOCK * k, (1 + FLOOR) * k, (CHOCK + 0.07) * k, (1 + FLOOR) * k, (CHOCK + 0.07) * k, (1 + FLOOR - 0.09) * k)
    // The thump at the chock.
    const hit = t - T_CHOCK
    if (hit > 0 && hit < 0.2) {
      const f = hit / 0.2
      p.push()
      p.stroke(ink)
      p.strokeWeight(weight * (1 - f))
      burst(p, (CHOCK + 0.02) * k, (1 + FLOOR - 0.14) * k, (0.05 + 0.08 * f) * k, (0.09 + 0.12 * f) * k, 4, 3.6)
      p.pop()
    }
  },
  over: (p, s, { k, t, ink, bg, weight }) => {
    const { c, a } = poseAt(t)
    // The cask, in front of the ball: staves bellied out between two chimes, one shape; two hoops; the head on its hinge.
    p.push()
    p.translate(c[0] * k, c[1] * k)
    p.rotate(a)
    const h = LEN / 2
    solid(p, ink, weight, s.color)
    p.beginShape()
    p.vertex(-h * k, -CHIME * k)
    p.bezierVertex(-h * 0.4 * k, -BILGE * 1.05 * k, h * 0.4 * k, -BILGE * 1.05 * k, h * k, -CHIME * k)
    p.vertex(h * k, CHIME * k)
    p.bezierVertex(h * 0.4 * k, BILGE * 1.05 * k, -h * 0.4 * k, BILGE * 1.05 * k, -h * k, CHIME * k)
    p.endShape(p.CLOSE)
    // The hoops: paper bands round the staves near either chime.
    solid(p, ink, weight * 0.8, bg)
    for (const x of [-h + 0.09, h - 0.09]) {
      const r = CHIME + (BILGE - CHIME) * (1 - Math.pow(x / h, 2)) * 1.02
      p.rect(x * k, 0, 0.035 * k, (r * 2 - weight / k) * k)
    }
    // The mouth: the near chime's rim, a hair heavier, so the end reads open.
    outline(p, ink, weight * 1.5)
    p.line(-h * k, -CHIME * k, -h * k, CHIME * k)
    // The head, hinged at the top of the nose: shut, or knocked open and lying back.
    p.push()
    p.translate(h * k, -CHIME * k)
    p.rotate(-headAt(t))
    solid(p, ink, weight, s.color)
    p.rect(0.015 * k, CHIME * k, 0.035 * k, CHIME * 2 * k, 0.008 * k)
    p.pop()
    p.pop()
  },
})
