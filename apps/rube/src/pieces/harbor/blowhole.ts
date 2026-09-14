import { outline, solid } from '../../../../../src/core/draw'
import { FLOOR, ROLL, arrive, arriveAt, definePiece, fly, over, post, rail, ramp, wait, type Lane, type Pt } from '../../parts'
import { splash, water } from './sea'

/**
 * A blowhole. The deck runs onto a rock with a hole in its top; the ball
 * rolls into the dip over the hole and stops; the rock rumbles, a few
 * bubbles come up, and the spout goes off — a column of water that
 * throws the ball straight up a floor and drops it onto a shelf, where
 * it rolls on. The column falls back into the hole in pieces.
 */
const LAND: Pt = [0.24, -1]
const ARRIVE = arriveAt(0)
const RUMBLE = 0.35
const FIRE = ARRIVE + RUMBLE
const FLIGHT = 0.4

export const blowhole = definePiece<{ color: string }>({
  name: 'blowhole',
  weight: 1,
  flight: true,
  place: ({ color, fits }) => {
    const cells: Pt[] = [
      [0, 0],
      [0, -1],
    ]
    if (!fits(cells, [1, -1])) return null
    const lane: Lane = {
      segs: [
        ...arrive([-0.5, 0], [0, 0]),
        wait([0, 0], RUMBLE),
        fly([0, 0], LAND, FLIGHT, 0.32),
        fly(LAND, [LAND[0] + 0.1, -1], 0.06, 0.02),
        ramp([LAND[0] + 0.1, -1], [0.5, -1], 2.2, ROLL),
      ],
      fire: FIRE,
    }
    return { cells, exit: { at: [1, -1], dir: 1 }, lane, state: { color } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    // The rumble: the rock shivers before the spout; the spout rises fast and falls back.
    const shiver = t > ARRIVE && since < 0 ? 0.012 * Math.sin(t * 70) * over(t, ARRIVE, FIRE) : 0
    const spout = since < 0 ? 0 : since < 0.5 ? Math.sin((Math.PI * since) / 0.5) : 0

    water(p, k, ink, weight, -0.5, 0.5)
    // The shelf above, on a post that stands on the rock.
    rail(p, k, ink, weight, 0.1, 0.5, -1 + FLOOR)
    post(p, k, ink, weight, 0.42, -1 + FLOOR, FLOOR - 0.02)
    solid(p, ink, weight, s.color)
    p.rect(0.47 * k, (-1 - 0.02) * k, 0.05 * k, 0.24 * k)

    p.push()
    p.translate(shiver * k, 0)
    // The rock: a mound with a flat top round the hole; the deck runs onto it.
    rail(p, k, ink, weight, -0.5, -0.3)
    solid(p, ink, weight, s.color)
    p.beginShape()
    p.vertex(-0.36 * k, 0.5 * k)
    p.bezierVertex(-0.4 * k, 0.3 * k, -0.34 * k, (FLOOR + 0.02) * k, -0.18 * k, (FLOOR + 0.02) * k)
    p.vertex(0.2 * k, (FLOOR + 0.02) * k)
    p.bezierVertex(0.36 * k, (FLOOR + 0.02) * k, 0.42 * k, 0.3 * k, 0.44 * k, 0.5 * k)
    p.endShape(p.CLOSE)
    // The hole, and the dip the ball waits in.
    p.fill(ink)
    p.noStroke()
    p.ellipse(0, (FLOOR + 0.03) * k, 0.2 * k, 0.05 * k)
    outline(p, ink, weight * 0.8)
    p.line(-0.3 * k, 0.32 * k, -0.2 * k, 0.36 * k)
    p.line(0.26 * k, 0.28 * k, 0.34 * k, 0.4 * k)
    p.pop()

    // Bubbles up the hole while it rumbles.
    if (t > ARRIVE && since < 0) {
      solid(p, ink, weight * 0.8, bg)
      for (let i = 0; i < 3; i++) {
        const f = ((t * 3 + i / 3) % 1 + 1) % 1
        p.circle((0.03 * Math.sin(f * 9 + i)) * k, (FLOOR + 0.02 - 0.14 * f) * k, (0.02 + 0.01 * i) * k)
      }
    }
    // The spout: a column of water from the hole, its head where the ball
    // is, breaking into drops at the top.
    if (spout > 0.02) {
      const h = 1.05 * spout
      solid(p, ink, weight, s.color)
      p.beginShape()
      p.vertex(-0.09 * k, (FLOOR + 0.02) * k)
      p.bezierVertex(-0.07 * k, (FLOOR - h * 0.5) * k, -0.12 * k, (FLOOR - h + 0.1) * k, -0.03 * k, (FLOOR - h) * k)
      p.vertex(0.03 * k, (FLOOR - h) * k)
      p.bezierVertex(0.12 * k, (FLOOR - h + 0.1) * k, 0.07 * k, (FLOOR - h * 0.5) * k, 0.09 * k, (FLOOR + 0.02) * k)
      p.endShape(p.CLOSE)
      p.push()
      p.noStroke()
      p.fill(bg)
      for (let i = 0; i < 4; i++) p.circle((-0.06 + 0.04 * i) * k, (FLOOR - h + 0.14 + 0.06 * (i % 2)) * k, 0.03 * k)
      p.pop()
      splash(p, k, s.color, weight, 0, FLOOR - h + 0.02, 1 - spout, 1.2)
    }
    // Drips after, back into the hole.
    if (since > 0.5 && since < 1.4) {
      p.push()
      p.noStroke()
      p.fill(s.color)
      for (const [dx, d] of [
        [-0.05, 0],
        [0.04, 0.3],
        [0.0, 0.6],
      ]) {
        const f = ((since - 0.5) * 1.6 + d) % 1
        p.ellipse(dx * k, (FLOOR - 0.5 + 0.5 * f) * k, 0.03 * k, 0.045 * k)
      }
      p.pop()
    }
  },
})
