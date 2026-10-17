import { outline, solid } from '../../../../../../src/core/draw'
import { ROLL, definePiece, gallows, laneReach, rail, roll, type BallChange, type Lane, type Pt } from '../../../parts'

/**
 * A phase gate. An emitter on a gallows over the line turns the ball to a
 * ghost as it passes; a solid wall stands across the rail beyond, and the
 * ghost goes straight through it; a second emitter on the far side makes
 * it solid again. Each emitter's face is lit while the ball is under it.
 */
const IN = 0
const WALL = 1
const OUT = 1.4
const WALL_W = 0.12
const WALL_H = 0.5

export const phasegate = definePiece<{ color: string }>({
  name: 'phasegate',
  weight: 0.8,
  // Restored as it stood, but for this: it was retired before a piece declared for itself that it changes the ball.
  dynamic: true,
  place: ({ color, fits, ball }) => {
    if (ball.ghost) return null
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
    ]
    if (!fits(cells, [2, 0])) return null
    const lane: Lane = { segs: [roll([-0.5, 0], [1.5, 0], ROLL)], fire: 0 }
    lane.fire = laneReach(lane, WALL)
    const changes: BallChange[] = [
      { at: laneReach(lane, IN), ghost: true },
      { at: laneReach(lane, OUT), ghost: false },
    ]
    return { cells, exit: { at: [2, 0], dir: 1 }, lane, state: { color }, changes }
  },
  draw: (p, s, { k, since, ink, bg, weight }) => {
    rail(p, k, ink, weight, -0.5, 1.5)
    // The emitters: each hung from a gallows over the line, its face lit while the ball is under it.
    for (const x of [IN, OUT]) {
      gallows(p, k, ink, weight, x - 0.16, x + 0.16, x - 0.16)
      const at = since - (x - WALL) / ROLL
      solid(p, ink, weight, Math.abs(at) < 0.12 ? s.color : bg)
      p.rect(x * k, -0.43 * k, 0.16 * k, 0.14 * k, 0.02 * k)
      outline(p, ink, weight)
      p.line((x - 0.06) * k, -0.36 * k, (x + 0.06) * k, -0.36 * k)
    }
    // The wall across the rail: solid colour, standing on the rail.
    solid(p, ink, weight, s.color)
    p.rect(WALL * k, (0.13 - WALL_H / 2) * k, WALL_W * k, WALL_H * k, 0.02 * k)
  },
})
