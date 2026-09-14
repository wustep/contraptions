import { outline, solid } from '../../../../../src/core/draw'
import { clamp, easeOutCubic } from '../../../../../src/core/ease'
import { FLOOR, ROLL, burst, definePiece, laneReach, over, rail, roll, type BallChange, type Lane } from '../../parts'
import { water } from './sea'

/**
 * An octopus in a rock pool under the pier. Its eyes follow the ball
 * along the deck; as it passes overhead the siphon squirts a jet of ink
 * straight up at it, and the ball rolls on a different colour — for good.
 * The octopus goes on watching, and the tentacles never stop moving.
 */
const HEAD_Y = 0.36
const SIPHON = { x: 0.1, y: 0.28 }
const SQUIRT = 0.12

export const octopus = definePiece<{ color: string; paint: string }>({
  name: 'octopus',
  weight: 0.9,
  dynamic: true,
  place: ({ rng, color, fits, theme, ball }) => {
    if (!fits([[0, 0]], [1, 0])) return null
    const pool = theme.colors.filter((c) => c !== ball.color)
    const paint = rng.pick(pool.length ? pool : theme.colors)
    const lane: Lane = { segs: [roll([-0.5, 0], [0.5, 0], ROLL)], fire: 0.5 / ROLL }
    const changes: BallChange[] = [{ at: laneReach(lane, 0), color: paint }]
    return { cells: [[0, 0]], exit: { at: [1, 0], dir: 1 }, lane, state: { color, paint }, changes }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    // Where the ball is along the deck, for the eyes to follow.
    const bx = clamp(-0.5 + t * ROLL, -0.6, 0.6)
    rail(p, k, ink, weight, -0.5, 0.5)
    // The pool: rocks either side, water between.
    solid(p, ink, weight, bg)
    p.arc(-0.42 * k, 0.5 * k, 0.34 * k, 0.4 * k, Math.PI, Math.PI * 2, p.CHORD)
    p.arc(0.44 * k, 0.5 * k, 0.3 * k, 0.32 * k, Math.PI, Math.PI * 2, p.CHORD)
    water(p, k, ink, weight, -0.26, 0.3, 0.42)
    outline(p, ink, weight)
    p.line(-0.5 * k, 0.5 * k, 0.5 * k, 0.5 * k)

    // The tentacles: four curls, each on its own slow clock.
    for (let i = 0; i < 4; i++) {
      const side = i % 2 ? 1 : -1
      const x0 = side * (0.06 + 0.03 * i)
      const ph = t * 1.4 + i * 1.7
      const curl = 0.5 + 0.25 * Math.sin(ph)
      p.push()
      p.noFill()
      p.stroke(ink)
      p.strokeWeight(weight * 3.2)
      p.bezier(x0 * k, (HEAD_Y + 0.06) * k, (x0 + side * 0.12) * k, (HEAD_Y + 0.12 + 0.04 * i) * k, (x0 + side * (0.22 + curl * 0.1)) * k, (0.34 + 0.03 * i) * k, (x0 + side * 0.3) * k, (0.44 - curl * 0.14) * k)
      p.stroke(s.color)
      p.strokeWeight(weight * 1.6)
      p.bezier(x0 * k, (HEAD_Y + 0.06) * k, (x0 + side * 0.12) * k, (HEAD_Y + 0.12 + 0.04 * i) * k, (x0 + side * (0.22 + curl * 0.1)) * k, (0.34 + 0.03 * i) * k, (x0 + side * 0.3) * k, (0.44 - curl * 0.14) * k)
      p.pop()
    }
    // The head, the eyes following the ball, and the siphon.
    solid(p, ink, weight, s.color)
    p.ellipse(0, HEAD_Y * k, 0.3 * k, 0.26 * k)
    const squint = since > -0.1 && since < 0.25 ? 0.5 : 1
    for (const dx of [-0.06, 0.06]) {
      solid(p, ink, weight, bg)
      p.ellipse(dx * k, (HEAD_Y - 0.03) * k, 0.07 * k, 0.07 * squint * k)
      p.fill(ink)
      p.noStroke()
      p.circle((dx + 0.015 * bx * 1.6) * k, (HEAD_Y - 0.03 - 0.01) * k, 0.03 * squint * k)
    }
    solid(p, ink, weight, s.color)
    p.push()
    p.translate(SIPHON.x * k, SIPHON.y * k)
    p.rotate(-0.4)
    p.rect(0, 0, 0.06 * k, 0.09 * k, 0.01 * k)
    p.pop()

    // The squirt: a jet of ink from the siphon up to the ball, then a puff of the new colour.
    if (since > -SQUIRT && since < SQUIRT) {
      const f = 1 - Math.abs(since) / SQUIRT
      p.push()
      p.stroke(s.paint)
      p.strokeWeight(weight * (1.5 + 2 * f))
      p.noFill()
      const reach = SIPHON.y - (SIPHON.y - FLOOR) * Math.min(1, f * 1.6)
      p.bezier(SIPHON.x * k, SIPHON.y * k, (SIPHON.x - 0.04) * k, (SIPHON.y - 0.1) * k, 0.02 * k, (reach + 0.05) * k, 0, reach * k)
      p.pop()
    }
    if (since > -0.02 && since < 0.3) {
      const f = over(since, 0, 0.3)
      p.push()
      p.stroke(s.paint)
      p.strokeWeight(weight)
      burst(p, 0, 0, (0.16 + 0.14 * f) * k, (0.2 + 0.2 * f) * k, 6, 0.5 + f)
      p.pop()
    }
    // Drips of ink from the deck after, and a stain that spreads on the rail.
    if (since > SQUIRT) {
      const g = over(since, SQUIRT, SQUIRT + 1.4)
      solid(p, ink, weight, s.paint)
      p.rect(0, (FLOOR + 0.04) * k, (0.14 + 0.16 * g) * k, 0.04 * k, 0.02 * k)
      if (g < 1) {
        p.noStroke()
        p.fill(s.paint)
        const y = FLOOR + 0.06 + easeOutCubic(g) * (HEAD_Y - 0.2 - FLOOR)
        p.ellipse(-0.05 * k, y * k, 0.035 * k, 0.05 * k)
      }
    }
  },
})
