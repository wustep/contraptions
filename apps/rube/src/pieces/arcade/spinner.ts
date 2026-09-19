import { outline, solid } from '../../../../../src/core/draw'
import { R, ROLL, definePiece, gallows, laneAt, laneReach, rail, ramp, roll, type Lane } from '../../parts'
import { lamp, score } from './neon'

/**
 * A pinball spinner: a plate hung from an axle over the lane, its foot
 * down in the ball's way. The ball shoves through it — the foot rides up
 * over the ball's front as it comes, and slips off its back — and the plate
 * goes over the top and keeps going, round and round, slowing, while a
 * column of lamps on the bracket's post count the turns. The score pops
 * the instant the plate is flung and ticks up with the turns while it is
 * up. It stops hanging down again, ready for the next one.
 *
 * The axle hangs low enough and the plate is short enough that the plate
 * clears the beam it hangs from at the top of every turn.
 */
const AXLE_Y = -0.25
const PLATE = 0.2
const HALF = 0.04
const MEET = -0.16
const PAST = 0.1
/** Spin off the shove: OMEGA radians a second, decaying with TAU. */
const OMEGA = 34
const TAU = 0.7

/** How far the plate has turned since the shove. */
const turned = (since: number) => (since < 0 ? 0 : OMEGA * TAU * (1 - Math.exp(-since / TAU)))

/**
 * The plate's angle forward of hanging when its foot rests on a ball whose
 * centre is at `x`: the tip a hair off the ball's surface, solved for.
 * Zero before the ball reaches it, and past where it can touch.
 */
function shoved(x: number): number {
  const h = -AXLE_Y
  const rr = R + HALF
  const c = (PLATE * PLATE + x * x + h * h - rr * rr) / (2 * PLATE)
  const m = Math.hypot(x, h)
  if (c >= m) return 0
  return Math.max(0, Math.PI - Math.asin(c / m) - Math.atan2(h, x))
}
/** Where the ball's back lets the foot go: the plate is as high as the ball can push it. Solved by walking the ball past. */
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

/** The one lane: slowed a little by the shove, back to pace by the far edge. */
const LANE: Lane = {
  segs: [roll([-0.5, 0], [MEET, 0], ROLL), ramp([MEET, 0], [PAST, 0], ROLL, ROLL * 0.8), ramp([PAST, 0], [0.5, 0], ROLL * 0.8, ROLL)],
  fire: 0,
}
LANE.fire = laneReach(LANE, RELEASE)

/** The plate's angle, forward of hanging: shoved by the ball, then spinning on. */
const plateAngle = (t: number, since: number) => (since >= 0 ? LET_GO + turned(since) : shoved(laneAt(LANE, t).x))
/** Turns the plate has made since it was flung: one each time it comes over the top. */
const turnsAt = (t: number, since: number) => Math.floor((plateAngle(t, since) - LET_GO + Math.PI) / (Math.PI * 2))

export const spinner = definePiece<{ color: string }>({
  name: 'spinner',
  // Ten a turn, and the spin off the shove is good for four.
  points: 40,
  weight: 1,
  place: ({ color, fits }) => {
    if (!fits([[0, 0]], [1, 0])) return null
    return { cells: [[0, 0]], exit: { at: [1, 0], dir: 1 }, lane: LANE, state: { color } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    const turns = turnsAt(t, since)

    rail(p, k, ink, weight, -0.5, 0.5)
    gallows(p, k, ink, weight, -0.3, 0.3, -0.3, -0.5)
    outline(p, ink, weight)
    p.line(0, -0.5 * k, 0, AXLE_Y * k)
    // The lamps up the post: one for every turn so far, clear of the plate's sweep.
    for (let i = 0; i < 5; i++) lamp(p, k, ink, weight, s.color, bg, -0.3, -0.44 + i * 0.06, 0.02, since > 0 && turns > i ? 1 : 0)
  },
  // The score pops the instant the foot slips off the ball and the plate is
  // flung, and ticks up a ten at every turn that comes round while it is up;
  // the lamps go on counting after it has faded.
  scores: (p, s, { k, t, since, bg }) => score(p, k, s.color, bg, 0, AXLE_Y - 0.2, `+${Math.max(1, turnsAt(t, since)) * 10}`, since, 0.9),
  over: (p, s, { k, t, since, ink, weight }) => {
    // The plate, in front of the ball: hanging from the axle, turning about
    // it the way the ball is going.
    const angle = plateAngle(t, since)
    p.push()
    p.translate(0, AXLE_Y * k)
    p.rotate(-angle)
    solid(p, ink, weight, s.color)
    p.rect(0, (PLATE / 2) * k, HALF * 2 * k, PLATE * k, 0.01 * k)
    p.fill(ink)
    p.noStroke()
    p.rect(0, (PLATE - 0.04) * k, HALF * 2 * k, 0.03 * k)
    p.pop()
    solid(p, ink, weight, s.color)
    p.circle(0, AXLE_Y * k, 0.05 * k)
  },
})
