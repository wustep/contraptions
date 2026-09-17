import type p5 from 'p5'
import { outline, solid } from '../../../../../src/core/draw'
import { clamp, easeInOutSine, easeInQuad, easeOutCubic, lerp } from '../../../../../src/core/ease'
import { FLOOR, ROLL, definePiece, fly, laneAt, over, post, rail, ramp, roll, type Lane, type Pt } from '../../parts'
import { display, flash, marquee, score } from './neon'

/**
 * Whack-a-mole. The lane runs onto the deck of a cabinet with three holes
 * in it and a raised rim at its far end; over the deck a mallet hangs from
 * a trolley on a gantry, parked over the first hole. The ball rolls across.
 * A mole pops up out of each hole just behind it and watches it go, and the
 * mallet comes after them — wind up, slam, on to the next — always a beat
 * late. The third mole comes up right under the ball and tosses it, over
 * the rim and onto the far lane; the mallet gets that one too, in the end.
 * Ten a mole; the counter on the cabinet's face keeps the tally. The mallet
 * trundles back to where it started.
 *
 * The third mole's head and the toss are one motion: the ball leaves at
 * the pace the head comes up at, so it is thrown, not teleported.
 */
const HOLES = [-0.1, 0.3, 0.7]
const HOLE_W = 0.22
/** A mole: how wide, how far it stands out of its hole, how long it takes to come up. */
const MOLE_W = 0.18
const MOLE_H = 0.16
const POP = 0.05
/** Behind the ball: a mole waits until the ball's back has cleared its hole. */
const LAG = 0.1
/** When the ball is over each hole. */
const PASS = HOLES.map((x) => (x + 0.5) / ROLL)
const POPS = [PASS[0] + LAG, PASS[1] + LAG, PASS[2]]
/** The toss, from the third hole over the rim to the far lane. */
const LAND: Pt = [1.2, 0]
const FLIGHT = 0.4
const ARC = (MOLE_H / POP) * (FLIGHT / 4)
const V_LAND = (LAND[0] - HOLES[2]) / FLIGHT
/** The cabinet, the rim at its far end, and the gantry over it. */
const CAB = { x0: -0.32, x1: 0.92 }
const RIM = { x: 0.89, w: 0.06, h: 0.1 }
const BEAM = { x0: -0.34, x1: 0.8, y: -0.45 }
const POSTS = [-0.29, 0.5]
/** The mallet: its head's centre hanging, and at the bottom of a slam; when each slam lands. */
const HEAD = { w: 0.22, h: 0.11 }
const HANG = -0.245
const STRUCK = FLOOR - 0.035 - HEAD.h / 2
const BLOWS = [POPS[0] + 0.25, POPS[0] + 0.59, POPS[0] + 0.93]
const WIND = 0.1
const STROKE = 0.07
const HOLD = 0.05
const BACK = 0.16
const RETURN = BLOWS[2] + 0.7

const LANE: Lane = {
  segs: [
    roll([-0.5, 0], [HOLES[2], 0], ROLL),
    fly([HOLES[2], 0], LAND, FLIGHT, ARC),
    fly(LAND, [LAND[0] + 0.08, 0], 0.06, 0.015),
    ramp([LAND[0] + 0.08, 0], [1.5, 0], V_LAND, ROLL),
  ],
  fire: PASS[2],
}

/** How far the mallet is through its stroke at `t`: a little lift for the wind-up, 1 at the bottom of a slam. */
function stroke(t: number): number {
  for (const at of BLOWS) {
    if (t < at - STROKE - WIND || t > at + HOLD + BACK) continue
    if (t < at - STROKE) return -0.12 * Math.sin(Math.PI * 0.5 * over(t, at - STROKE - WIND, at - STROKE))
    if (t < at) return lerp(-0.12, 1, easeInQuad(over(t, at - STROKE, at)))
    if (t < at + HOLD) return 1
    return 1 - easeOutCubic(over(t, at + HOLD, at + HOLD + BACK))
  }
  return 0
}

/** Where the trolley is: over each hole in turn for its slam, and back to the first in its own time. */
function trolley(t: number): number {
  if (t < BLOWS[0] + HOLD) return HOLES[0]
  if (t < BLOWS[1]) return lerp(HOLES[0], HOLES[1], easeInOutSine(over(t, BLOWS[0] + HOLD, BLOWS[1] - STROKE - WIND)))
  if (t < BLOWS[1] + HOLD) return HOLES[1]
  if (t < BLOWS[2]) return lerp(HOLES[1], HOLES[2], easeInOutSine(over(t, BLOWS[1] + HOLD, BLOWS[2] - STROKE - WIND)))
  if (t < RETURN) return HOLES[2]
  return lerp(HOLES[2], HOLES[0], easeInOutSine(over(t, RETURN, RETURN + 1.4)))
}

/** How far mole `i` stands out of its hole: up with a little overshoot, and down for good under the mallet. */
function standing(i: number, t: number): number {
  const s = t - POPS[i]
  if (s < 0) return 0
  const up = s < POP ? MOLE_H * (s / POP) : MOLE_H * (1 + 0.12 * Math.exp(-(s - POP) * 14) * Math.cos((s - POP) * 30))
  if (t < BLOWS[i] - STROKE) return up
  // The mallet's face comes down on it: it is never taller than the room under the head.
  const room = FLOOR - (lerp(HANG, STRUCK, clamp(stroke(t))) + HEAD.h / 2)
  return t < BLOWS[i] ? Math.min(up, room) : 0
}

/** A mole in its hole at `x`, `h` out of the deck, its eyes toward (`lx`, `ly`). */
function mole(p: p5, k: number, ink: string, weight: number, color: string, bg: string, x: number, h: number, lx: number, ly: number): void {
  if (h <= 0.004) return
  const top = FLOOR - h
  p.push()
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.beginPath()
  ctx.rect((x - 0.2) * k, (top - 0.1) * k, 0.4 * k, (FLOOR - top + 0.1) * k)
  ctx.clip()
  // A dome on a neck: the head's round top, straight sides down into the hole.
  solid(p, ink, weight, color)
  p.rect(x * k, (top + MOLE_W / 2 + 0.2) * k, MOLE_W * k, 0.4 * k)
  p.arc(x * k, (top + MOLE_W / 2) * k, MOLE_W * k, MOLE_W * k, Math.PI, Math.PI * 2, p.OPEN)
  p.noStroke()
  p.fill(color)
  p.rect(x * k, (top + MOLE_W / 2 + 0.01) * k, (MOLE_W - weight / k) * k, 0.03 * k)
  // The eyes, on the ball.
  const d = Math.hypot(lx - x, ly - top) || 1
  const ex = ((lx - x) / d) * 0.012
  const ey = ((ly - top) / d) * 0.012
  for (const dx of [-0.04, 0.04]) {
    p.noStroke()
    p.fill(ink)
    p.circle((x + dx) * k, (top + 0.075) * k, 0.055 * k)
    p.fill(bg)
    p.circle((x + dx + ex) * k, (top + 0.075 + ey) * k, 0.026 * k)
  }
  p.pop()
}

export const whack = definePiece<{ color: string; mole: string }>({
  name: 'whack',
  weight: 1,
  flight: true,
  place: ({ rng, color, fits, theme, ball }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
    ]
    if (!fits(cells, [2, 0])) return null
    // The moles in a colour of their own: not the cabinet's, and not the ball's if there is another to be had.
    const others = theme.colors.filter((c) => c !== color)
    const apart = others.filter((c) => c !== ball.color)
    const pool = apart.length ? apart : others
    return { cells, exit: { at: [2, 0], dir: 1 }, lane: LANE, state: { color, mole: pool.length ? rng.pick(pool) : color } }
  },
  draw: (p, s, { k, t, ink, bg, weight }) => {
    const ball = laneAt(LANE, t)
    const tally = BLOWS.filter((at) => t >= at).length
    const busy = t > PASS[0] - 0.2 && t < RETURN + 1.4

    // The gantry, on posts that stand behind the cabinet; the far lane.
    for (const x of POSTS) post(p, k, ink, weight, x, BEAM.y, 0.5)
    rail(p, k, ink, weight, -0.5, CAB.x0)
    rail(p, k, ink, weight, CAB.x1 + 0.05, 1.5)
    post(p, k, ink, weight, CAB.x1 + 0.11, FLOOR, 0.5)

    // The moles, behind the cabinet's face: each comes up out of its hole, and goes down under the mallet.
    HOLES.forEach((x, i) => mole(p, k, ink, weight, s.mole, bg, x, standing(i, t), ball.x, ball.y))

    // The cabinet: the deck the ball rolls on, a rim at its far end, the holes dark in its top.
    solid(p, ink, weight, s.color)
    p.rect((RIM.x) * k, (FLOOR - RIM.h / 2 + 0.02) * k, RIM.w * k, (RIM.h + 0.04) * k, 0.012 * k)
    p.rect(((CAB.x0 + CAB.x1) / 2) * k, ((FLOOR + 0.5) / 2) * k, (CAB.x1 - CAB.x0) * k, (0.5 - FLOOR) * k, 0.02 * k)
    p.noStroke()
    p.fill(bg)
    for (const x of HOLES) p.rect(x * k, (FLOOR + 0.02) * k, HOLE_W * k, (0.04 + weight / k) * k, 0.01 * k)
    outline(p, ink, weight)
    for (const x of HOLES) {
      p.line((x - HOLE_W / 2) * k, FLOOR * k, (x - HOLE_W / 2) * k, (FLOOR + 0.045) * k)
      p.line((x + HOLE_W / 2) * k, FLOOR * k, (x + HOLE_W / 2) * k, (FLOOR + 0.045) * k)
      p.line((x - HOLE_W / 2) * k, (FLOOR + 0.045) * k, (x + HOLE_W / 2) * k, (FLOOR + 0.045) * k)
    }
    // Its face: lamps chasing while there is a game on, and the tally.
    marquee(p, k, ink, weight, s.color, bg, CAB.x0 + 0.08, 0.5, 0.27, 6, t, busy, 0.075)
    display(p, k, ink, weight, bg, 0.72, 0.34, 0.26, 0.16, `${tally}0`.replace(/^00$/, '0'), s.color, tally > 0)

    // The beam, the trolley on it, the rod and the mallet's head.
    const tx = trolley(t)
    const head = lerp(HANG, STRUCK, stroke(t))
    solid(p, ink, weight, s.color)
    p.rect(((BEAM.x0 + BEAM.x1) / 2) * k, BEAM.y * k, (BEAM.x1 - BEAM.x0) * k, 0.06 * k, 0.012 * k)
    outline(p, ink, weight)
    p.line(tx * k, (BEAM.y + 0.07) * k, tx * k, (head - HEAD.h / 2) * k)
    solid(p, ink, weight, ink)
    p.rect(tx * k, (BEAM.y + 0.065) * k, 0.16 * k, 0.06 * k, 0.015 * k)
    solid(p, ink, weight, s.color)
    p.rect(tx * k, head * k, HEAD.w * k, HEAD.h * k, 0.03 * k)
    p.fill(ink)
    p.noStroke()
    p.rect(tx * k, (head + HEAD.h / 2 - 0.02) * k, (HEAD.w - 0.03) * k, 0.025 * k)

    // The blows: a ring off each, and the thud in the deck.
    BLOWS.forEach((at, i) => {
      flash(p, k, s.color, weight, HOLES[i], FLOOR - 0.04, t - at, 0.2, 0.1, 0.22)
      const f = over(t, at, at + 0.18)
      if (f <= 0 || f >= 1) return
      p.push()
      p.stroke(ink)
      p.strokeWeight(weight)
      for (const side of [-1, 1]) {
        const x0 = HOLES[i] + side * (HEAD.w / 2 + 0.03 + 0.04 * f)
        p.line(x0 * k, (FLOOR - 0.03) * k, (x0 + side * 0.05) * k, (FLOOR - 0.07 - 0.03 * f) * k)
      }
      p.pop()
    })
    // The pops: crumbs off the hole's edges as a mole comes up; and the toss.
    POPS.forEach((at, i) => {
      const f = over(t, at, at + 0.14)
      if (f <= 0 || f >= 1) return
      p.push()
      p.stroke(s.mole)
      p.strokeWeight(weight)
      for (const side of [-1, 1]) {
        const x0 = HOLES[i] + side * (HOLE_W / 2 + 0.01 + 0.03 * f)
        p.line(x0 * k, (FLOOR - 0.03 - 0.05 * f) * k, (x0 + side * 0.03) * k, (FLOOR - 0.07 - 0.07 * f) * k)
      }
      p.pop()
    })
    flash(p, k, s.mole, weight, HOLES[2], 0, t - PASS[2], 0.18, 0.12, 0.24)
  },
  scores: (p, s, { k, t, bg }) => {
    // Over the gantry, clear of the mallet that comes back up through where the blow was.
    BLOWS.forEach((at, i) => score(p, k, s.color, bg, HOLES[i], BEAM.y + 0.1, '+10', t - at, 0.6, 0.12))
  },
})
