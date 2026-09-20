import { outline, solid } from '../../../../../src/core/draw'
import { easeInQuad } from '../../../../../src/core/ease'
import { FLOOR, ROLL, burst, definePiece, fly, over, rail, ramp, roll, trace, type Lane, type Pt } from '../../parts'
import { WATER, bodyColor, piling, seabed, water } from './sea'

/**
 * A barrel. A cask lies on its side across the end of the upper deck, its
 * open mouth to the ball and its head out over the drop, balanced on the
 * deck's corner. The ball rolls in and is gone; as it runs down to the
 * head its weight overbalances the cask, which tips over the corner, slow
 * and then all at once, and goes off the end head first, turning as it
 * falls. It comes down on the pier a floor below the other way round, on
 * the rim of its head, slaps down level and rocks on its belly; and the
 * ball, turned right over with it, trundles back down the inside and out
 * of the same mouth it went in by, which now faces on.
 *
 * The ball is inside from the mouth to the mouth: its hidden lane is
 * sampled from the cask's own tip and tumble, the one motion the cask is
 * drawn with, so it comes out where the mouth is.
 */
/** The upper deck's corner, which the cask balances on; the lower deck. */
const CORNER: Pt = [0.3, FLOOR]
const DECK = 1 + FLOOR
/** The cask in its own frame: the axis along x from the mouth at -LEN/2 to the head at LEN/2; the chime and the bilge. */
const LEN = 0.5
const H = LEN / 2
const CHIME = 0.19
const BILGE = 0.23
/** The ball lies this far off the axis inside, on whichever side is down. */
const SEAT = 0.08

/** Into the mouth, and along inside to the head. */
const MOUTH = CORNER[0] - H
const T_MOUTH = (MOUTH + 0.5) / ROLL
const T_HEAD = T_MOUTH + 0.2
/** The tip begins as the ball passes the corner: the cask turns about the corner to A_GO, sliding out over it as it goes, and lets go. */
const FIRE = T_MOUTH + 0.12
const TIP = 0.34
const A_GO = 0.95
const SLIP = 0.18
/** It falls, turning on, and lands just short of half a turn, on the rim of its head. */
const FALL = 0.32
const SHORT = 0.32
const LOW = H * Math.sin(SHORT) + CHIME * Math.cos(SHORT)
const SPIN = (Math.PI - SHORT - A_GO) / FALL
const GO: Pt = [CORNER[0] + BILGE * Math.sin(A_GO) + SLIP * Math.cos(A_GO), CORNER[1] - BILGE * Math.cos(A_GO) + SLIP * Math.sin(A_GO)]
/** It leaves the corner at the pace the tip had worked up to, along its own axis, and gravity is whatever brings it down on time. */
const PACE = ((2 * A_GO) / TIP) * BILGE + (2 * SLIP) / TIP
const V_GO: Pt = [PACE * Math.cos(A_GO), PACE * Math.sin(A_GO)]
const G = (2 * (DECK - LOW - GO[1] - V_GO[1] * FALL)) / (FALL * FALL)
const T_GO = FIRE + TIP
const T_DOWN = T_GO + FALL
/** The rim of the head where it lands, which the cask slaps down about. */
const RIM_X = GO[0] + V_GO[0] * FALL - H * Math.cos(SHORT) + CHIME * Math.sin(SHORT)
/** A beat on its belly; the ball back down the inside, gathering pace, and out of the mouth. */
const REST = 0.2279
const T_BACK = T_DOWN + REST
const BACK = 0.55
const T_OUT = T_BACK + BACK
const V_OUT = (2 * (LEN - 0.08)) / BACK

/** The cask's pose: its centre and how far it has turned, head down. */
function poseAt(t: number): { c: Pt; a: number } {
  if (t < FIRE) return { c: [CORNER[0], CORNER[1] - BILGE], a: 0 }
  if (t < T_GO) {
    // Over the corner: slowly at first, then all at once, the bilge turning on the corner and sliding out over it.
    const u = easeInQuad(over(t, FIRE, T_GO))
    const a = A_GO * u
    return { c: [CORNER[0] + BILGE * Math.sin(a) + SLIP * u * Math.cos(a), CORNER[1] - BILGE * Math.cos(a) + SLIP * u * Math.sin(a)], a }
  }
  if (t < T_DOWN) {
    const s = t - T_GO
    return { c: [GO[0] + V_GO[0] * s, GO[1] + V_GO[1] * s + (G * s * s) / 2], a: A_GO + SPIN * s }
  }
  // On the rim of its head; the mouth end slaps down about it, and the cask rocks on its belly till it is still.
  const s = t - T_DOWN
  const short = SHORT * Math.exp(-s * 9) * Math.cos(s * 14)
  return { c: [RIM_X + H * Math.cos(short) - CHIME * Math.sin(short), DECK - Math.max(BILGE, H * Math.abs(Math.sin(short)) + CHIME * Math.cos(short))], a: Math.PI - short }
}
/** A point of the cask's frame in the cell's. */
function inCask(local: Pt, t: number): Pt {
  const { c, a } = poseAt(t)
  return [c[0] + local[0] * Math.cos(a) - local[1] * Math.sin(a), c[1] + local[0] * Math.sin(a) + local[1] * Math.cos(a)]
}
/** The ball along the axis inside: in to the head, pinned there through the tumble, and back down to the mouth and past it. */
function alongAt(t: number): number {
  if (t < T_HEAD) return -H + (LEN - 0.1) * (1 - Math.pow(1 - over(t, T_MOUTH, T_HEAD), 2))
  if (t < T_BACK) return H - 0.1
  return H - 0.1 - (LEN - 0.08) * easeInQuad(over(t, T_BACK, T_OUT))
}
/** On the staves that are under it, whichever way up the cask is. */
const ballAt = (t: number): Pt => inCask([alongAt(t), SEAT * Math.cos(poseAt(t).a)], t)

/** Out of sight from the mouth, through the tumble, to the mouth again, where the cask still stands between us and it. */
const T_PEEK = T_BACK + BACK * Math.sqrt((LEN - 0.1 - 0.12) / (LEN - 0.08))
const HIDDEN = [...trace(ballAt, T_MOUTH + 0.04, T_GO, 8), ...trace(ballAt, T_GO, T_DOWN, 8), ...trace(ballAt, T_DOWN, T_PEEK, 14)].map((s) => ({ ...s, hidden: true }))
const OUT = ballAt(T_OUT)
const LAND: Pt = [OUT[0] + 0.07, 1]
const LANE: Lane = {
  segs: [
    roll([-0.5, 0], [MOUTH - 0.06, 0], ROLL),
    { from: [MOUTH - 0.06, 0], to: ballAt(T_MOUTH + 0.04), dur: 0.04 + 0.06 / ROLL },
    ...HIDDEN,
    ...trace(ballAt, T_PEEK, T_OUT, 4),
    fly(OUT, LAND, 0.06, 0.008),
    ramp(LAND, [1.5, 1], V_OUT, ROLL),
  ],
  fire: FIRE,
}

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
    // The upper deck over its water, on a piling and a post at its corner; the lower pier a floor down over the sea, on its own.
    water(p, k, ink, weight, -0.5, 0.5)
    rail(p, k, ink, weight, -0.5, CORNER[0])
    piling(p, k, ink, weight, -0.3)
    outline(p, ink, weight)
    p.line(CORNER[0] * k, CORNER[1] * k, CORNER[0] * k, 0.5 * k)
    water(p, k, ink, weight, 0.5, 1.5, 1 + WATER)
    seabed(p, k, ink, weight, 0.5, 1.5, 1.5)
    rail(p, k, ink, weight, 0.5, 1.5, DECK)
    piling(p, k, ink, weight, 0.62, DECK, 1.5)
    piling(p, k, ink, weight, 1.36, DECK, 1.5)
    // The thump as the head's rim meets the deck.
    const hit = t - T_DOWN
    if (hit > 0 && hit < 0.2) {
      const f = hit / 0.2
      p.push()
      p.stroke(ink)
      p.strokeWeight(weight * (1 - f))
      burst(p, (RIM_X - 0.04) * k, (DECK - 0.05) * k, (0.05 + 0.08 * f) * k, (0.09 + 0.12 * f) * k, 4, 3.5)
      p.pop()
    }
  },
  over: (p, s, { k, t, ink, bg, weight }) => {
    const { c, a } = poseAt(t)
    // The cask, in front of the ball: staves bellied out between two chimes, one shape; a seam between staves either
    // side of the axis; a hoop near either chime; and the dark of the open mouth.
    p.push()
    p.translate(c[0] * k, c[1] * k)
    p.rotate(a)
    solid(p, ink, weight, s.color)
    p.beginShape()
    p.vertex(-H * k, -CHIME * k)
    p.bezierVertex(-H * 0.4 * k, -BILGE * 1.08 * k, H * 0.4 * k, -BILGE * 1.08 * k, H * k, -CHIME * k)
    p.vertex(H * k, CHIME * k)
    p.bezierVertex(H * 0.4 * k, BILGE * 1.08 * k, -H * 0.4 * k, BILGE * 1.08 * k, -H * k, CHIME * k)
    p.endShape(p.CLOSE)
    outline(p, ink, weight * 0.6)
    for (const side of [-1, 1]) {
      p.beginShape()
      p.vertex((-H + 0.05) * k, side * 0.065 * k)
      p.quadraticVertex(0, side * 0.09 * k, (H - 0.03) * k, side * 0.065 * k)
      p.endShape()
    }
    solid(p, ink, weight * 0.8, bg)
    for (const x of [-H + 0.1, H - 0.1]) {
      const r = CHIME + (BILGE - CHIME) * (1 - Math.pow(x / H, 2)) * 1.05
      p.rect(x * k, 0, 0.04 * k, (r * 2 - weight / k) * k)
    }
    p.fill(ink)
    p.noStroke()
    p.ellipse(-H * k, 0, 0.07 * k, (CHIME * 2 + weight / k) * k)
    p.pop()
  },
})
