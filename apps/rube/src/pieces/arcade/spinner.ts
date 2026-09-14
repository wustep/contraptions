import { outline, solid } from '../../../../../src/core/draw'
import { ROLL, definePiece, gallows, laneReach, over, rail, ramp, roll, type Lane } from '../../parts'
import { lamp, score } from './neon'

/**
 * A pinball spinner: a plate hung from an axle over the lane, its foot
 * down in the ball's way. The ball shoves through it; the plate goes over
 * the top and keeps going, round and round, slowing, while a row of lamps
 * on the bracket count the turns and the score climbs. It stops hanging
 * down again, ready for the next one.
 */
const AXLE_Y = -0.34
const PLATE = 0.27
const MEET = -0.16
const PAST = 0.1
/** Spin off the shove: OMEGA radians a second, decaying with TAU. */
const OMEGA = 34
const TAU = 0.7

/** How far the plate has turned since the shove. */
const turned = (since: number) => (since < 0 ? 0 : OMEGA * TAU * (1 - Math.exp(-since / TAU)))

export const spinner = definePiece<{ color: string }>({
  name: 'spinner',
  weight: 1,
  place: ({ color, fits }) => {
    if (!fits([[0, 0]], [1, 0])) return null
    const lane: Lane = {
      segs: [roll([-0.5, 0], [MEET, 0], ROLL), ramp([MEET, 0], [PAST, 0], ROLL, ROLL * 0.8), ramp([PAST, 0], [0.5, 0], ROLL * 0.8, ROLL)],
      fire: 0,
    }
    lane.fire = laneReach(lane, 0)
    return { cells: [[0, 0]], exit: { at: [1, 0], dir: 1 }, lane, state: { color } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    // The plate: pushed up ahead of the ball, then spinning off the shove.
    const push = since < 0 ? 1.2 * over(t, (0.5 + MEET) / ROLL, t - since) : 0
    const angle = since < 0 ? push : 1.2 + turned(since)
    const turns = Math.floor((angle - 1.2 + Math.PI) / (Math.PI * 2))

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
    // The plate, in front of the ball: hanging from the axle, turning about it.
    const push = since < 0 ? 1.2 * over(t, (0.5 + MEET) / ROLL, t - since) : 0
    const angle = since < 0 ? push : 1.2 + turned(since)
    p.push()
    p.translate(0, AXLE_Y * k)
    p.rotate(angle)
    solid(p, ink, weight, s.color)
    p.rect(0, (PLATE / 2) * k, 0.08 * k, PLATE * k, 0.01 * k)
    p.fill(ink)
    p.noStroke()
    p.rect(0, (PLATE - 0.04) * k, 0.08 * k, 0.03 * k)
    p.pop()
    solid(p, ink, weight, s.color)
    p.circle(0, AXLE_Y * k, 0.05 * k)
  },
})
