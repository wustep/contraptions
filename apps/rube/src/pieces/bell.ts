import { outline, solid } from '../../../../src/core/draw'
import { ROLL, definePiece, flick, gallows, over, rail, roll, wait, type Lane } from '../parts'

/**
 * A bell hung over the line with its clapper down in the ball's way. The ball
 * shoulders the clapper going past, the bell rings and rocks on its yoke,
 * and the sound goes out in rings. Nothing stops here; a bell is punctuation.
 */
const BW = 0.48
const BH = 0.32
const CROWN = -0.42
const HINGE = CROWN + BH * 0.4
const HIT = -0.06

export const bell = definePiece<{ color: string }>({
  name: 'bell',
  weight: 0.8,
  place: ({ color, fits }) => {
    if (!fits([[0, 0]], [1, 0])) return null
    const lane: Lane = {
      segs: [roll([-0.5, 0], [HIT, 0], ROLL), wait([HIT, 0], 0.07), roll([HIT, 0], [0.5, 0], ROLL * 0.9)],
      fire: (0.5 + HIT) / ROLL,
    }
    return { cells: [[0, 0]], exit: { at: [1, 0], dir: 1 }, lane, state: { color } }
  },
  draw: (p, s, { k, since, ink, weight }) => {
    const hit = 1 - over(since, 0, 0.8)
    const rock = since < 0 ? 0 : hit * 0.2 * Math.sin(since * 26)

    rail(p, k, ink, weight, -0.5, 0.5)

    if (since >= 0 && hit > 0.02) {
      p.push()
      p.stroke(s.color)
      p.strokeWeight(weight)
      p.noFill()
      for (const side of [-1, 1]) {
        for (let i = 1; i <= 3; i++) {
          const r = BW * (0.8 + i * 0.28 + (1 - hit) * 0.5) * k
          p.arc(side * BW * 0.42 * k, (CROWN + BH * 0.5) * k, r, r, side > 0 ? -0.5 : Math.PI - 0.5, side > 0 ? 0.5 : Math.PI + 0.5)
        }
      }
      p.pop()
    }

    // The yoke, on a gallows that stands behind the rail.
    gallows(p, k, ink, weight, -0.34, 0.2, -0.34)
    p.push()
    p.translate(0, -0.5 * k)
    p.rotate(rock)
    outline(p, ink, weight)
    p.line(0, 0, 0, (CROWN + 0.5) * k)
    p.fill(s.color)
    p.beginShape()
    p.vertex((-BW / 2) * k, (CROWN + 0.5 + BH) * k)
    p.bezierVertex((-BW / 2) * k, (CROWN + 0.5) * k, -BW * 0.22 * k, (CROWN + 0.5) * k, 0, (CROWN + 0.5) * k)
    p.bezierVertex(BW * 0.22 * k, (CROWN + 0.5) * k, (BW / 2) * k, (CROWN + 0.5) * k, (BW / 2) * k, (CROWN + 0.5 + BH) * k)
    p.endShape(p.CLOSE)
    p.line((-BW / 2) * k, (CROWN + 0.5 + BH) * k, (BW / 2) * k, (CROWN + 0.5 + BH) * k)
    p.pop()
  },
  over: (p, s, { k, since, ink, weight }) => {
    const hit = 1 - over(since, 0, 0.8)
    p.push()
    p.translate(0, HINGE * k)
    p.rotate(since < 0 ? 0 : flick(since, 0.06, 0.12, 0.6) * 0.75 + hit * 0.1 * Math.sin(since * 26))
    outline(p, ink, weight)
    p.line(0, 0, 0, -HINGE * k)
    solid(p, ink, weight, s.color)
    p.circle(0, -HINGE * k, 0.13 * k)
    p.pop()
  },
})
