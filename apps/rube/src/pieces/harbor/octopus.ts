import { outline, solid } from '../../../../../src/core/draw'
import { clamp } from '../../../../../src/core/ease'
import { FLOOR, ROLL, burst, definePiece, laneReach, over, rail, roll, type BallChange, type Lane } from '../../parts'
import { water } from './sea'

/**
 * An octopus in a rock pool under the pier. Its eyes follow the ball
 * along the deck; as it passes overhead the funnel on top of its head
 * puckers, draws breath, and squirts a jet of ink straight up at it — a
 * splat of the new colour all round the ball, and the ball rolls on that
 * colour for good. The octopus goes on watching, and the tentacles never
 * stop moving.
 */
const HEAD_Y = 0.36
/** The funnel: on top of the head, its lip where the ink comes out. */
const FUNNEL_Y = HEAD_Y - 0.12
const LIP_Y = FUNNEL_Y - 0.07
const SQUIRT = 0.12
/** The funnel puckers over this long before the squirt, and eases back after. */
const BREATH = 0.3

export const octopus = definePiece<{ color: string; paint: string }>({
  name: 'octopus',
  weight: 0.9,
  dynamic: true,
  place: ({ rng, color, fits, theme, ball }) => {
    if (!fits([[0, 0]], [1, 0])) return null
    // The ink is never the colour the ball arrives in; with nothing else to offer, the octopus stays out of the map.
    const pool = theme.colors.filter((c) => c !== ball.color)
    if (!pool.length) return null
    const paint = rng.pick(pool)
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
    // The funnel on top of the head, aimed straight up at the deck: it
    // puckers wide as the ball comes, drawing breath, and eases back after
    // the squirt. A puckered lip on a short throat, in the body's colour.
    const pucker = since < -BREATH ? 0 : since < 0 ? over(since, -BREATH, 0) : 1 - over(since, 0, 0.5)
    const flare = 1 + 0.35 * pucker
    solid(p, ink, weight, s.color)
    p.quad(-0.03 * k, FUNNEL_Y * k, 0.03 * k, FUNNEL_Y * k, 0.045 * flare * k, LIP_Y * k, -0.045 * flare * k, LIP_Y * k)
    p.ellipse(0, LIP_Y * k, 0.09 * flare * k, 0.035 * k)
    p.fill(ink)
    p.noStroke()
    p.ellipse(0, LIP_Y * k, 0.05 * flare * k, 0.016 * k)

    // The squirt: a jet of ink from the funnel's lip straight up to the ball.
    if (since > -SQUIRT && since < SQUIRT) {
      const f = 1 - Math.abs(since) / SQUIRT
      const reach = LIP_Y - (LIP_Y - FLOOR) * Math.min(1, f * 1.6)
      p.push()
      p.stroke(s.paint)
      p.strokeWeight(weight * (2 + 2.5 * f))
      p.line(0, LIP_Y * k, 0, reach * k)
      p.noStroke()
      p.fill(s.paint)
      p.circle(0, reach * k, (0.05 + 0.04 * f) * k)
      p.pop()
    }
    // The splat: the ink hits the ball's underside and goes everywhere —
    // spokes off the ball, and drops flung out and up round it that fall
    // away — in the new colour, so the change is seen to happen.
    if (since > -0.02 && since < 0.4) {
      const f = over(since, 0, 0.4)
      p.push()
      p.stroke(s.paint)
      p.strokeWeight(weight * 1.4 * (1 - f * 0.5))
      burst(p, 0, 0, (0.15 + 0.18 * f) * k, (0.22 + 0.26 * f) * k, 8, 0.4 + f * 0.6)
      p.noStroke()
      p.fill(s.paint)
      for (let j = 0; j < 7; j++) {
        const a = Math.PI + (Math.PI * (j + 0.5)) / 7
        const r = 0.16 + 0.34 * f
        const dx = Math.cos(a) * r * (0.8 + 0.2 * ((j * 3) % 2))
        const dy = Math.sin(a) * r * 0.7 + 0.5 * f * f
        p.circle(dx * k, dy * k, (0.045 - 0.03 * f) * (0.8 + 0.2 * (j % 2)) * k)
      }
      p.pop()
    }
  },
})
