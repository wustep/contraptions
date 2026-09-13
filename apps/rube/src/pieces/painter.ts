import { outline, solid } from '../../../../src/core/draw'
import { easeOutCubic } from '../../../../src/core/ease'
import { FLOOR, ROLL, burst, definePiece, gallows, laneReach, over, rail, roll, type BallChange, type Lane } from '../parts'

/**
 * A paint booth. A pot on a gallows over the line feeds two nozzles that
 * hang either side of the rail. The ball rolls through without slowing;
 * as it passes under them they spray, and it comes out the far side a
 * different colour — for good. The booth drips for a while after.
 */
const NOZZLE_Y = -0.28
const SPRAY = 0.14

export const painter = definePiece<{ color: string; paint: string }>({
  name: 'painter',
  weight: 0.9,
  place: ({ rng, color, fits, theme, ball }) => {
    if (!fits([[0, 0]], [1, 0])) return null
    const pool = theme.colors.filter((c) => c !== ball.color)
    const paint = rng.pick(pool.length ? pool : theme.colors)
    const lane: Lane = { segs: [roll([-0.5, 0], [0.5, 0], ROLL)], fire: 0.5 / ROLL }
    const changes: BallChange[] = [{ at: laneReach(lane, 0), color: paint }]
    return { cells: [[0, 0]], exit: { at: [1, 0], dir: 1 }, lane, state: { color, paint }, changes }
  },
  draw: (p, s, { k, since, ink, bg, weight }) => {
    rail(p, k, ink, weight, -0.5, 0.5)
    // The gallows, the pot on it, and the pipes down to the nozzles.
    gallows(p, k, ink, weight, -0.36, 0.3, -0.36)
    solid(p, ink, weight, s.paint)
    p.rect(0, -0.62 * k, 0.3 * k, 0.2 * k, 0.02 * k)
    solid(p, ink, weight, bg)
    p.rect(0, -0.62 * k, 0.16 * k, 0.08 * k)
    outline(p, ink, weight)
    p.line(-0.08 * k, -0.5 * k, -0.08 * k, -0.42 * k)
    p.line(-0.08 * k, -0.42 * k, -0.22 * k, -0.42 * k)
    p.line(-0.22 * k, -0.42 * k, -0.22 * k, NOZZLE_Y * k)
    p.line(0.08 * k, -0.5 * k, 0.08 * k, -0.42 * k)
    p.line(0.08 * k, -0.42 * k, 0.22 * k, -0.42 * k)
    p.line(0.22 * k, -0.42 * k, 0.22 * k, NOZZLE_Y * k)
    // The nozzles, angled in at the ball's line.
    for (const side of [-1, 1]) {
      p.push()
      p.translate(side * 0.22 * k, NOZZLE_Y * k)
      p.rotate(-side * 0.5)
      solid(p, ink, weight, s.color)
      p.rect(0, 0.05 * k, 0.07 * k, 0.1 * k)
      p.pop()
    }
    // The spray, while the ball is under the nozzles.
    if (since > -SPRAY && since < SPRAY) {
      const f = 1 - Math.abs(since) / SPRAY
      p.push()
      p.stroke(s.paint)
      p.strokeWeight(weight)
      for (const side of [-1, 1]) {
        for (const a of [-0.25, 0, 0.25]) {
          const dir = Math.PI / 2 + side * 0.5 + a
          const x0 = side * 0.22 + Math.cos(dir) * 0.12
          const y0 = NOZZLE_Y + Math.sin(dir) * 0.12
          p.line(x0 * k, y0 * k, (x0 + Math.cos(dir) * 0.12 * f) * k, (y0 + Math.sin(dir) * 0.12 * f) * k)
        }
      }
      p.pop()
    }
    // Drips off the nozzles after, and a puddle of the new colour on the rail.
    if (since > SPRAY) {
      const g = over(since, SPRAY, SPRAY + 1.6)
      p.push()
      p.noStroke()
      p.fill(s.paint)
      for (const side of [-1, 1]) {
        const y = NOZZLE_Y + 0.1 + easeOutCubic(g) * (FLOOR - NOZZLE_Y - 0.1)
        if (g < 1) p.ellipse(side * 0.2 * k, y * k, 0.035 * k, 0.05 * k)
      }
      p.pop()
      solid(p, ink, weight, s.paint)
      p.rect(0, (FLOOR + 0.04) * k, (0.16 + 0.14 * g) * k, 0.04 * k, 0.02 * k)
    }
    // A puff of the new colour off the ball as it passes.
    if (since > -0.02 && since < 0.3) {
      const f = over(since, 0, 0.3)
      p.push()
      p.stroke(s.paint)
      p.strokeWeight(weight)
      burst(p, 0, 0, (0.16 + 0.14 * f) * k, (0.2 + 0.2 * f) * k, 6, 0.5 + f)
      p.pop()
    }
  },
})
