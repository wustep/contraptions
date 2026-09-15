import { outline, solid } from '../../../../../src/core/draw'
import { R, ROLL, definePiece, gallows, laneAt, laneReach, rail, ramp, roll, type Lane } from '../../parts'
import { lamp, score } from './neon'

/**
 * A pinball spinner: a plate hung from an axle over the lane, its foot
 * down in the ball's way. The ball shoves through it — the foot rides up
 * over the ball's front as it comes, and slips off its back — and the plate
 * goes over the top and keeps going, round and round, slowing, while a row
 * of lamps on the bracket count the turns and the score climbs. It stops
 * hanging down again, ready for the next one.
 */
const AXLE_Y = -0.34
const PLATE = 0.27
const HALF = 0.04
const MEET = -0.16
const PAST = 0.1
/** Where the ball's back lets the foot go: the plate is as high as the ball can push it. */
const RELEASE = 0.22
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
const LET_GO = shoved(RELEASE)

/** The one lane: slowed a little by the shove, back to pace by the far edge. */
const LANE: Lane = {
  segs: [roll([-0.5, 0], [MEET, 0], ROLL), ramp([MEET, 0], [PAST, 0], ROLL, ROLL * 0.8), ramp([PAST, 0], [0.5, 0], ROLL * 0.8, ROLL)],
  fire: 0,
}
LANE.fire = laneReach(LANE, RELEASE)

/** The plate's angle, forward of hanging: shoved by the ball, then spinning on. */
const plateAngle = (t: number, since: number) => (since >= 0 ? LET_GO + turned(since) : shoved(laneAt(LANE, t).x))

export const spinner = definePiece<{ color: string }>({
  name: 'spinner',
  weight: 1,
  place: ({ color, fits }) => {
    if (!fits([[0, 0]], [1, 0])) return null
    return { cells: [[0, 0]], exit: { at: [1, 0], dir: 1 }, lane: LANE, state: { color } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    const angle = plateAngle(t, since)
    const turns = Math.floor((angle - LET_GO + Math.PI) / (Math.PI * 2))

    rail(p, k, ink, weight, -0.5, 0.5)
    gallows(p, k, ink, weight, -0.3, 0.3, -0.3, -0.5)
    outline(p, ink, weight)
    p.line(0, -0.5 * k, 0, AXLE_Y * k)
    // The lamps along the beam: one for every turn so far.
    for (let i = 0; i < 5; i++) lamp(p, k, ink, weight, s.color, bg, -0.2 + i * 0.1, -0.44, 0.025, since > 0 && turns > i ? 1 : 0)
    // The score, once it stops.
    if (since > 2 && since < 2.9) score(p, k, s.color, 0, AXLE_Y - 0.3, `+${Math.max(1, turns) * 10}`, since - 2, 0.9)
  },
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
