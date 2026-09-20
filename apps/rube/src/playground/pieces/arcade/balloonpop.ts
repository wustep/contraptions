import type p5 from 'p5'
import { outline, solid } from '../../../../../../src/core/draw'
import { easeOutCubic } from '../../../../../../src/core/ease'
import { R, ROLL, definePiece, laneAt, laneReach, post, rail, ramp, roll, type Lane, type Pt } from '../../../parts'
import { flash, score } from '../../../pieces/arcade/neon'

/**
 * A balloon stall. Three balloons stand pinned by their knots to a painted
 * board over the lane, and under the board runs a slide bar with a little
 * carriage on it: a needle standing up from its back, a finger hanging down
 * from its belly into the ball's way. The ball rolls into the finger and
 * shoves the carriage along the bar ahead of it, slowed by the load, and the
 * needle goes along under the balloons: pop, pop, pop, each a burst in the
 * balloon's own colour and a rag of rubber left hanging on its pin. The
 * carriage fetches up against the bar's end; with nothing left to give, the
 * finger rides up over the ball's front, slips off its back, and swings
 * itself still. Thirty a balloon, one score over the board that ticks up
 * with the pops. The carriage stays where it stopped, under three rags.
 *
 * The carriage is where the ball has pushed it, read off the lane; the
 * finger's angle is the one that rests its tip on the ball, solved for.
 */
/** The board the balloons are pinned to, and the posts it stands on. */
const BOARD = { top: -1.2, foot: -0.44 }
const POSTS = [-0.4, 1.4]
/** The balloons: where each hangs, its pin, the middle of its body and the body's size. */
const XS = [0.04, 0.5, 0.96]
const PIN_Y = -0.6
const BODY_R = 0.2
const BODY_Y = PIN_Y - 0.05 - BODY_R
/** The slide bar, hung under the board; the carriage's run along it. */
const BAR_Y = -0.3
const C0 = -0.12
const C1 = 1.12
/** The needle's tip, up to the balloons' knots; the finger, hinged under the carriage. */
const TIP_Y = PIN_Y + 0.015
const HINGE_Y = BAR_Y + 0.035
const FINGER = 0.235
const HALF = 0.02
/** How far behind the carriage the ball's centre is while it shoves, and its pace under the load. */
const BEHIND = Math.sqrt((R + HALF) ** 2 - (HINGE_Y + FINGER) ** 2)
const V_PUSH = 1.7
const MEET = C0 - BEHIND
const STOP = C1 - BEHIND

const LANE: Lane = {
  segs: [roll([-0.5, 0], [MEET, 0], ROLL), ramp([MEET, 0], [MEET + 0.06, 0], ROLL, V_PUSH), roll([MEET + 0.06, 0], [STOP, 0], V_PUSH), ramp([STOP, 0], [1.5, 0], V_PUSH, ROLL)],
  fire: 0,
}
/** When the needle is under each balloon. */
const POPS = XS.map((x) => laneReach(LANE, x - BEHIND))
LANE.fire = POPS[0]

/** The carriage, where the ball has shoved it to. */
const carriageAt = (t: number): number => Math.min(C1, Math.max(C0, laneAt(LANE, t).x + BEHIND))

/** The finger's angle forward of hanging with its tip resting on a ball whose centre is `x` on from the hinge. */
function shoved(x: number): number {
  const h = -HINGE_Y
  const rr = R + HALF
  const c = (FINGER * FINGER + x * x + h * h - rr * rr) / (2 * FINGER)
  const m = Math.hypot(x, h)
  if (c >= m) return 0
  return Math.max(0, Math.PI - Math.asin(c / m) - Math.atan2(h, x))
}
/** Where the ball's back lets the finger go, and the angle it goes from. */
const RELEASE = (() => {
  let best = 0
  let at = 0
  for (let x = -0.3; x <= 0.4; x += 0.001) {
    const a = shoved(x)
    if (a > best) {
      best = a
      at = x
    }
  }
  return at
})()
const LET_GO = shoved(RELEASE)
const T_RELEASE = laneReach(LANE, C1 + RELEASE)

/** The finger: plumb while the carriage runs, ridden up by the ball at the bar's end, then a pendulum running down. */
function fingerAt(t: number): number {
  if (t >= T_RELEASE) {
    const s = t - T_RELEASE
    return LET_GO * Math.exp(-s * 3.2) * Math.cos(s * 13)
  }
  return shoved(laneAt(LANE, t).x - carriageAt(t))
}

/** A balloon standing on its pin: a round body, and the knot under it where the pin goes through. */
function balloon(p: p5, k: number, ink: string, weight: number, color: string, x: number): void {
  solid(p, ink, weight, color)
  p.triangle(x * k, (PIN_Y - 0.06) * k, (x - 0.035) * k, (PIN_Y + 0.005) * k, (x + 0.035) * k, (PIN_Y + 0.005) * k)
  p.circle(x * k, BODY_Y * k, BODY_R * 2 * k)
}

/** What a pop leaves: a limp rag of rubber hanging from the pin. */
function rag(p: p5, k: number, ink: string, weight: number, color: string, x: number): void {
  solid(p, ink, weight * 0.8, color)
  p.beginShape()
  p.vertex((x - 0.015) * k, PIN_Y * k)
  p.bezierVertex((x + 0.05) * k, (PIN_Y + 0.03) * k, (x + 0.045) * k, (PIN_Y + 0.09) * k, (x + 0.02) * k, (PIN_Y + 0.13) * k)
  p.bezierVertex((x - 0.005) * k, (PIN_Y + 0.1) * k, (x - 0.05) * k, (PIN_Y + 0.08) * k, (x - 0.015) * k, PIN_Y * k)
  p.endShape(p.CLOSE)
}

/** The burst: the body's outline flung outward as four scraps in its colour, thinning, gone in a fifth of a second. */
function burst(p: p5, k: number, weight: number, color: string, x: number, s: number): void {
  const dur = 0.2
  if (s < 0 || s > dur) return
  const f = s / dur
  flash(p, k, color, weight, x, BODY_Y, s, dur, BODY_R * 0.9, BODY_R * 1.9)
  const c = p.color(color)
  c.setAlpha(255 * (1 - f))
  p.push()
  p.noFill()
  p.stroke(c)
  p.strokeWeight(weight * 1.6 * (1 - f * 0.5))
  const r = BODY_R * (1 + 1.3 * easeOutCubic(f))
  for (const a of [-2.5, -0.7, 0.5, 2.2]) p.arc(x * k, BODY_Y * k, r * 2 * k, r * 2 * k, a, a + 0.5 * (1 - f))
  p.pop()
}

export interface BalloonpopState {
  color: string
  /** The three balloons' colours, in the order they go. */
  balloons: [string, string, string]
}

export const balloonpop = definePiece<BalloonpopState>({
  name: 'balloonpop',
  // Thirty a balloon.
  points: 90,
  weight: 0.9,
  place: ({ rng, color, fits, theme, ball }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
      [0, -1],
      [1, -1],
    ]
    if (!fits(cells, [2, 0])) return null
    // Three different balloons, none of them the board's colour or the ball's, so a burst is never mistaken for the ball.
    const spare = theme.colors.filter((c) => c !== ball.color && c !== color)
    const pool = rng.shuffle(spare.length ? spare : theme.colors.filter((c) => c !== color))
    const balloons: [string, string, string] = [pool[0], pool[1 % pool.length], pool[2 % pool.length]]
    return { cells, exit: { at: [2, 0], dir: 1 }, lane: LANE, state: { color, balloons } }
  },
  draw: (p, s, { k, t, ink, weight }) => {
    const c = carriageAt(t)
    const popped = POPS.map((at) => t - at)

    // The stall: two posts to the floor, behind the lane, and the painted board on them.
    for (const x of POSTS) post(p, k, ink, weight, x, BOARD.foot - 0.02, 0.5)
    rail(p, k, ink, weight, -0.5, 1.5)
    solid(p, ink, weight, s.color)
    p.rect(((POSTS[0] + POSTS[1]) / 2) * k, ((BOARD.top + BOARD.foot) / 2) * k, (POSTS[1] - POSTS[0]) * k, (BOARD.foot - BOARD.top) * k, 0.03 * k)

    // The balloons, or what is left of them, on their pins.
    XS.forEach((x, i) => {
      if (popped[i] < 0) balloon(p, k, ink, weight, s.balloons[i], x)
      else rag(p, k, ink, weight, s.balloons[i], x)
      p.fill(ink)
      p.noStroke()
      p.circle(x * k, PIN_Y * k, 0.035 * k)
    })
    XS.forEach((x, i) => burst(p, k, weight, s.balloons[i], x, popped[i]))

    // The slide bar on its two hangers, a buffer at each end.
    outline(p, ink, weight)
    for (const x of [C0 - 0.14, C1 + 0.14]) p.line(x * k, BOARD.foot * k, x * k, BAR_Y * k)
    p.line((C0 - 0.14) * k, BAR_Y * k, (C1 + 0.14) * k, BAR_Y * k)
    p.fill(ink)
    p.noStroke()
    for (const x of [C0 - 0.095, C1 + 0.095]) p.rect(x * k, BAR_Y * k, 0.03 * k, 0.07 * k)

    // The carriage: the needle up from its back, a block on the bar.
    solid(p, ink, weight, ink)
    p.triangle((c - 0.022) * k, (BAR_Y - 0.03) * k, (c + 0.022) * k, (BAR_Y - 0.03) * k, c * k, TIP_Y * k)
    solid(p, ink, weight, s.color)
    p.rect(c * k, BAR_Y * k, 0.15 * k, 0.07 * k, 0.015 * k)
  },
  over: (p, s, { k, t, ink, weight }) => {
    // The finger, in the ball's way and then on its front: hinged under the carriage.
    const c = carriageAt(t)
    p.push()
    p.translate(c * k, HINGE_Y * k)
    p.rotate(-fingerAt(t))
    solid(p, ink, weight, s.color)
    p.rect(0, (FINGER / 2) * k, HALF * 2 * k, FINGER * k, HALF * k)
    p.pop()
    p.fill(ink)
    p.noStroke()
    p.circle(c * k, HINGE_Y * k, 0.035 * k)
  },
  // One score over the board's top: it pops with the first balloon and ticks up thirty with each of the others, in the colour of the one that just went.
  scores: (p, s, { k, t, bg }) => {
    const n = POPS.filter((at) => t >= at).length
    if (n) score(p, k, s.balloons[n - 1], bg, 0.5, BOARD.top + 0.1, `+${n * 30}`, t - POPS[0], POPS[2] - POPS[0] + 0.75, 0.12)
  },
})
