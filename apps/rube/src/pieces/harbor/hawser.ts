import type p5 from 'p5'
import { outline, solid } from '../../../../../src/core/draw'
import { easeOutCubic } from '../../../../../src/core/ease'
import { FLOOR, ROLL, burst, definePiece, fly, over, rail, ramp, roll, trace, type Lane, type Pt } from '../../parts'
import { WATER, piling, seaColor, seabed, water } from './sea'

/**
 * A breeches buoy on a hawser. A line is made fast to the head of a samson
 * post at the deck's end and runs down, over open water, to a post on the
 * pier a floor below; a life ring with a canvas seat hangs from a traveller
 * block at the top, held there by a toggled lanyard. The ball drops off
 * the deck into the ring; the jerk pulls the toggle, the lanyard falls
 * away, and block, ring and ball run down the line, the ring trailing
 * behind. The line is a little longer than the straight way down, so the
 * load hangs it in two straight parts that meet at the block — deepest at
 * mid-span — the way a loaded line does. The block fetches up against the
 * rat guard at the bottom; the ring swings on past it and tips the ball
 * out onto the pier, and swings itself still.
 *
 * The ball rides the ring: its lane is sampled from the block's run down
 * the line and the ring's swing under it, the same two the ring is drawn
 * with.
 */
const WEST = -0.22
const PIER = 2.08
/** The post heads the line is made fast to; how much longer than the straight way between them it is. */
const HEAD: Pt = [-0.1, -0.44]
const FOOT_X = 2.04
const SLACK = 1.006
/** Where the block waits, and where the rat guard stops it. */
const X0 = -0.02
const X1 = 1.84

/** The block's place on a line of fixed length made fast at `a` and `b`: a point of the ellipse they are the foci of, below the chord. */
function onLine(a: Pt, b: Pt, x: number): Pt {
  const c = Math.hypot(b[0] - a[0], b[1] - a[1]) / 2
  const A = c * SLACK
  const B = Math.sqrt(A * A - c * c)
  const ux = (b[0] - a[0]) / (2 * c)
  const uy = (b[1] - a[1]) / (2 * c)
  const at = (th: number): Pt => {
    const u = A * Math.cos(th)
    const v = B * Math.sin(th)
    return [(a[0] + b[0]) / 2 + u * ux - v * uy, (a[1] + b[1]) / 2 + u * uy + v * ux]
  }
  let lo = 0
  let hi = Math.PI
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    if (at(mid)[0] > x) lo = mid
    else hi = mid
  }
  return at((lo + hi) / 2)
}
/** The foot's height is whatever brings the ring down to just over the pier's level at the bottom. */
const SEAT_END = 0.97
const solveFoot = (hang: (foot: Pt) => number): Pt => {
  let lo = 0.3
  let hi = 0.9
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    const foot: Pt = [FOOT_X, mid]
    if (onLine(HEAD, foot, X1)[1] + hang(foot) < SEAT_END) lo = mid
    else hi = mid
  }
  return [FOOT_X, (lo + hi) / 2]
}
/** The ring hangs this far under the block, so that at the top the ball sits a hair under the deck's level. */
const SEAT_TOP = 0.025
const hangFor = (foot: Pt) => SEAT_TOP - onLine(HEAD, foot, X0)[1]
const FOOT = solveFoot(hangFor)
const HANG = hangFor(FOOT)

const T_EDGE = (WEST + 0.5) / ROLL
const DROP = 0.08
const T_IN = T_EDGE + DROP
const JERK = 0.2
const FIRE = T_IN + JERK
const RUN = 0.95
const T_STOP = FIRE + RUN
/** The ring swings on past the stopped block; the ball leaves it this long after, on the way up. */
const RELEASE = 0.13
const T_OUT = T_STOP + RELEASE
const LAND: Pt = [PIER + 0.16, 1]

/** Where the block is along the line. */
const blockX = (t: number) => (t < FIRE ? X0 : t < T_STOP ? X0 + (X1 - X0) * Math.pow((t - FIRE) / RUN, 2) : X1 - 0.02 * Math.exp(-(t - T_STOP) * 9) * Math.sin((t - T_STOP) * 40))
/** The ring's swing under the block, forward positive: a nod as the ball lands in it, trailing on the run, flung forward at the stop, and swinging down. */
function swingAt(t: number): number {
  // Empty, it stirs in the breeze.
  const idle = 0.035 * Math.sin(t * 1.7) * (1 - over(t, T_IN - 0.05, T_IN + 0.1))
  const nod = t < T_IN ? 0 : 0.26 * Math.exp(-(t - T_IN) * 6) * Math.sin((t - T_IN) * 12)
  if (t < FIRE) return idle + nod
  if (t < T_STOP) return nod - 0.16 * over(t, FIRE, FIRE + 0.2)
  const s = t - T_STOP
  // Flung forward by the stop: up to its height in a fifth of a second, then a pendulum dying away about the plumb.
  return s < 0.2 ? -0.16 + 0.96 * Math.sin((Math.PI / 2) * (s / 0.2)) : 0.8 * Math.exp(-(s - 0.2) * 1.6) * Math.cos((s - 0.2) * 6.5)
}
const blockAt = (t: number): Pt => onLine(HEAD, FOOT, blockX(t))
const seatAt = (t: number): Pt => {
  const [bx, by] = blockAt(t)
  const a = swingAt(t)
  return [bx + HANG * Math.sin(a), by + HANG * Math.cos(a)]
}

const RIDE = [...trace(seatAt, T_IN, FIRE, 6), ...trace(seatAt, FIRE, T_STOP, 30), ...trace(seatAt, T_STOP, T_OUT, 8)]
const OUT = RIDE[RIDE.length - 1].to
const LANE: Lane = {
  segs: [
    roll([-0.5, 0], [WEST, 0], ROLL),
    fly([WEST, 0], RIDE[0].from, DROP, 0.012),
    ...RIDE,
    fly(OUT, LAND, 0.14, 0.05),
    fly(LAND, [LAND[0] + 0.07, 1], 0.05, 0.012),
    ramp([LAND[0] + 0.07, 1], [2.5, 1], 2.2, ROLL),
  ],
  fire: FIRE,
}

export const hawser = definePiece<{ color: string }>({
  name: 'hawser',
  weight: 0.9,
  flight: true,
  place: ({ color, fits, theme }) => {
    // The line comes down through the corner of the third cell of the upper
    // floor, where a neighbour's water would be, so that cell is the hawser's too.
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
      [2, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ]
    if (!fits(cells, [3, 1])) return null
    return { cells, exit: { at: [3, 1], dir: 1 }, lane: LANE, state: { color: seaColor(theme, color) } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    const [bx, by] = blockAt(t)
    const swing = swingAt(t)

    // The deck the ball comes off; the sea a floor below, and the pier down there.
    rail(p, k, ink, weight, -0.5, WEST)
    seabed(p, k, ink, weight, HEAD[0] - 0.12, 2.5, 1.5)
    water(p, k, ink, weight, HEAD[0] - 0.12, 2.5, 1 + WATER)
    rail(p, k, ink, weight, PIER, 2.5, 1 + FLOOR)
    piling(p, k, ink, weight, PIER + 0.26, 1 + FLOOR, 1.5)
    // The samson post at the deck's end, and the post on the pier: both stand on the bed of the sea.
    outline(p, ink, weight * 1.4)
    p.line(HEAD[0] * k, (HEAD[1] - 0.03) * k, HEAD[0] * k, 1.5 * k)
    p.line(FOOT[0] * k, (FOOT[1] - 0.03) * k, FOOT[0] * k, 1.5 * k)
    outline(p, ink, weight)
    for (const x of [HEAD[0], FOOT[0]]) p.line((x - 0.07) * k, 1.5 * k, (x + 0.07) * k, 1.5 * k)
    for (const [x, y] of [HEAD, FOOT]) p.line((x - 0.05) * k, (y + 0.02) * k, (x + 0.05) * k, (y + 0.02) * k)
    // The deck's end is carried on a knee off the samson post.
    p.line((WEST - 0.06) * k, FLOOR * k, HEAD[0] * k, (FLOOR + 0.2) * k)

    // The hawser: two straight parts that meet at the block.
    outline(p, ink, weight)
    p.line(HEAD[0] * k, HEAD[1] * k, bx * k, by * k)
    p.line(bx * k, by * k, FOOT[0] * k, FOOT[1] * k)
    // The rat guard the block fetches up against: a disc on the line, edge on.
    const [gx, gy] = onLine(HEAD, FOOT, X1 + 0.075)
    const slope = Math.atan2(FOOT[1] - gy, FOOT[0] - gx)
    p.push()
    p.translate(gx * k, gy * k)
    p.rotate(slope)
    solid(p, ink, weight, s.color)
    p.ellipse(0, 0, 0.045 * k, 0.17 * k)
    p.pop()
    // The lanyard that holds the block at the top: toggled to it, until the jerk pulls the toggle; then it
    // falls away and swings from the post.
    const gone = since < 0 ? 0 : easeOutCubic(over(since, 0, 0.3))
    const sway = since < 0 ? 0 : 0.5 * Math.exp(-since * 1.8) * Math.sin(since * 7)
    const from: Pt = [HEAD[0], HEAD[1] + 0.06]
    const held: Pt = [X0 - 0.015, blockAt(t)[1] + 0.035]
    const hung: Pt = [from[0] - 0.05 + 0.2 * Math.sin(sway), from[1] + 0.2 * Math.cos(sway)]
    const end: Pt = [held[0] + (hung[0] - held[0]) * gone, held[1] + (hung[1] - held[1]) * gone]
    outline(p, ink, weight * 0.8)
    p.noFill()
    p.beginShape()
    p.vertex(from[0] * k, from[1] * k)
    p.quadraticVertex(((from[0] + end[0]) / 2 - 0.03 * (1 - gone)) * k, (Math.max(from[1], end[1]) + 0.1 * (1 - gone)) * k, end[0] * k, end[1] * k)
    p.endShape()
    p.push()
    p.translate(end[0] * k, end[1] * k)
    p.rotate(gone * (0.3 - sway))
    solid(p, ink, weight * 0.8, s.color)
    p.rect(0, 0, 0.09 * k, 0.03 * k, 0.01 * k)
    p.pop()

    // The block: a sheave on the line, between cheeks, and the strops down to the ring.
    ring(p, k, ink, weight, s.color, bg, bx, by, swing, false)
    solid(p, ink, weight, bg)
    p.circle(bx * k, (by - 0.0) * k, 0.1 * k)
    p.push()
    p.translate(bx * k, by * k)
    p.rotate((blockX(t) - X0) / 0.05)
    outline(p, ink, weight * 0.8)
    p.line(-0.03 * k, 0, 0.03 * k, 0)
    p.line(0, -0.03 * k, 0, 0.03 * k)
    p.pop()

    // The stop: a knock off the rat guard.
    const hit = t - T_STOP
    if (hit > 0 && hit < 0.22) {
      const f = hit / 0.22
      p.push()
      p.stroke(ink)
      p.strokeWeight(weight * (1 - f))
      burst(p, (gx - 0.03) * k, (gy - 0.04) * k, (0.06 + 0.08 * f) * k, (0.1 + 0.12 * f) * k, 5, 3.4)
      p.pop()
    }
  },
  over: (p, s, { k, t, ink, bg, weight }) => {
    const [bx, by] = blockAt(t)
    ring(p, k, ink, weight, s.color, bg, bx, by, swingAt(t), true)
  },
})

/**
 * The breeches buoy under the block at (bx, by), swung `a` from the plumb.
 * Behind the ball: the strops and the far side of the ring. In front of
 * it: the near side of the ring, banded, and the canvas seat under it.
 */
function ring(p: p5, k: number, ink: string, weight: number, color: string, bg: string, bx: number, by: number, a: number, front: boolean): void {
  p.push()
  p.translate(bx * k, by * k)
  p.rotate(-a)
  const W = 0.19
  const RY = HANG + 0.03
  if (!front) {
    outline(p, ink, weight * 0.8)
    for (const dx of [-W, W]) p.line(0, 0.04 * k, dx * k, RY * k)
    outline(p, ink, weight)
    p.arc(0, RY * k, W * 2 * k, 0.1 * k, Math.PI, Math.PI * 2)
  } else {
    // The seat: canvas slung under the ring, that the ball sits down into.
    solid(p, ink, weight, bg)
    p.beginShape()
    p.vertex(-W * 0.8 * k, (RY + 0.02) * k)
    p.bezierVertex(-W * 0.7 * k, (RY + 0.19) * k, W * 0.7 * k, (RY + 0.19) * k, W * 0.8 * k, (RY + 0.02) * k)
    p.endShape(p.CLOSE)
    // The near side of the ring: cork in the colour, with a paper band either side.
    p.noFill()
    p.stroke(ink)
    p.strokeWeight(weight * 3.4)
    p.arc(0, RY * k, W * 2 * k, 0.1 * k, 0, Math.PI)
    p.stroke(color)
    p.strokeWeight(weight * 1.8)
    p.arc(0, RY * k, W * 2 * k, 0.1 * k, 0, Math.PI)
    p.stroke(bg)
    for (const c of [0.55, Math.PI - 0.55]) p.arc(0, RY * k, W * 2 * k, 0.1 * k, c - 0.13, c + 0.13)
  }
  p.pop()
}
