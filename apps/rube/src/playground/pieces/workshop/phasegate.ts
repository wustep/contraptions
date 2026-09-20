import { outline, solid } from '../../../../../../src/core/draw'
import { ROLL, burst, definePiece, gallows, laneReach, rail, roll, type BallChange, type Lane, type Pt } from '../../../parts'

/**
 * A phase gate. An emitter on a gallows over the line turns the ball to a
 * ghost as it passes; a solid wall stands across the rail beyond, and the
 * ghost goes straight through it; a second emitter on the far side makes
 * it solid again. The wall shimmers where the ball went through.
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
    // The emitters: each on a gallows, a lamp pointing down at the line.
    for (const x of [IN, OUT]) {
      gallows(p, k, ink, weight, x - 0.16, x + 0.16, x - 0.16)
      solid(p, ink, weight, bg)
      p.rect(x * k, -0.4 * k, 0.16 * k, 0.14 * k, 0.02 * k)
      outline(p, ink, weight)
      p.line((x - 0.06) * k, -0.33 * k, (x + 0.06) * k, -0.33 * k)
      // The beam, while the ball is under it.
      const at = since - (x - WALL) / ROLL
      if (at > -0.16 && at < 0.16) {
        const f = 1 - Math.abs(at) / 0.16
        p.push()
        p.stroke(s.color)
        p.strokeWeight(weight)
        for (const dx of [-0.05, 0, 0.05]) p.line((x + dx) * k, -0.32 * k, (x + dx * 2.6) * k, (-0.32 + 0.4 * f) * k)
        p.pop()
        p.push()
        p.stroke(ink)
        p.strokeWeight(weight)
        burst(p, x * k, 0, (0.16 + 0.08 * f) * k, (0.2 + 0.12 * f) * k, 6, f * 2)
        p.pop()
      }
      // A lamp that lights while the ball is ghostly.
      const on = since > -(WALL - IN) / ROLL && since < (OUT - WALL) / ROLL
      solid(p, ink, weight, on ? s.color : bg)
      p.circle(x * k, -0.46 * k, 0.05 * k)
    }
    // The wall across the rail: solid colour, on the rail, and it shimmers as the ghost goes through.
    solid(p, ink, weight, s.color)
    p.rect(WALL * k, (0.13 - WALL_H / 2) * k, WALL_W * k, WALL_H * k, 0.02 * k)
    if (since > -0.14 && since < 0.24) {
      const f = 1 - Math.abs(since - 0.05) / 0.19
      p.push()
      p.stroke(bg)
      p.strokeWeight(weight)
      for (const dy of [-0.16, -0.06, 0.04]) p.line((WALL - 0.04) * k, dy * k, (WALL + 0.04) * k, (dy + 0.02 * f) * k)
      p.pop()
    }
  },
})
