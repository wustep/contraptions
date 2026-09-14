import { outline, solid } from '../../../../src/core/draw'
import { easeInQuad } from '../../../../src/core/ease'
import { ROLL, definePiece, gallows, laneReach, over, rail, ramp, roll, type Lane } from '../parts'

/**
 * A bell hung over the line by a pin through its crown, with its clapper
 * down in the ball's way. The ball shoulders the clapper going past; the
 * clapper swings up and strikes the lip from inside; the knock sets the
 * bell rocking on its pin and the sound goes out in rings. Nothing stops
 * here; a bell is punctuation.
 */
const BW = 0.48
const BH = 0.32
const CROWN = -0.42
const HINGE = CROWN + BH * 0.4
/** Where the ball first meets the clapper's head, and where it has pushed it to the lip. */
const MEET = -0.2
const PAST = 0.02
/** The clapper's swing when its head reaches the lip. */
const KNOCK = 0.7

export const bell = definePiece<{ color: string }>({
  name: 'bell',
  weight: 0.8,
  place: ({ color, fits }) => {
    if (!fits([[0, 0]], [1, 0])) return null
    const lane: Lane = {
      segs: [roll([-0.5, 0], [MEET, 0], ROLL), ramp([MEET, 0], [PAST, 0], ROLL, ROLL * 0.75), ramp([PAST, 0], [0.5, 0], ROLL * 0.75, ROLL)],
      fire: 0,
    }
    lane.fire = laneReach(lane, PAST)
    return { cells: [[0, 0]], exit: { at: [1, 0], dir: 1 }, lane, state: { color } }
  },
  draw: (p, s, { k, since, ink, weight }) => {
    // The knock: the bell rocks on its pin, away from the clapper first, and rings down.
    const rock = since < 0 ? 0 : -0.13 * Math.sin(since * 28) * Math.exp(-since * 4)
    const ring = since < 0 ? 0 : 1 - over(since, 0, 0.7)

    rail(p, k, ink, weight, -0.5, 0.5)

    if (ring > 0.02) {
      p.push()
      p.stroke(s.color)
      p.strokeWeight(weight)
      p.noFill()
      for (const side of [-1, 1]) {
        for (let i = 1; i <= 3; i++) {
          const r = BW * (0.8 + i * 0.28 + (1 - ring) * 0.5) * k
          p.arc(side * BW * 0.42 * k, (CROWN + BH * 0.5) * k, r, r, side > 0 ? -0.5 : Math.PI - 0.5, side > 0 ? 0.5 : Math.PI + 0.5)
        }
      }
      p.pop()
    }

    // The yoke: a stem from a gallows down to the pin at the crown.
    gallows(p, k, ink, weight, -0.34, 0.2, -0.34)
    outline(p, ink, weight)
    p.line(0, -0.5 * k, 0, CROWN * k)
    p.push()
    p.translate(0, CROWN * k)
    p.rotate(rock)
    solid(p, ink, weight, s.color)
    p.beginShape()
    p.vertex((-BW / 2) * k, BH * k)
    p.bezierVertex((-BW / 2) * k, 0, -BW * 0.22 * k, 0, 0, 0)
    p.bezierVertex(BW * 0.22 * k, 0, (BW / 2) * k, 0, (BW / 2) * k, BH * k)
    p.endShape(p.CLOSE)
    p.line((-BW / 2) * k, BH * k, (BW / 2) * k, BH * k)
    p.pop()
    solid(p, ink, weight, s.color)
    p.circle(0, CROWN * k, 0.05 * k)
  },
  over: (p, s, { k, t, since, ink, weight }) => {
    // The clapper: pushed up by the ball as it passes, it strikes the lip at
    // the fire and swings back through, decaying.
    const push = over(t, (0.5 + MEET) / ROLL, t - since)
    const swing = since < 0 ? KNOCK * easeInQuad(push) : KNOCK * Math.cos(since * 9) * Math.exp(-since * 1.6)
    p.push()
    p.translate(0, HINGE * k)
    p.rotate(swing)
    outline(p, ink, weight)
    p.line(0, 0, 0, -HINGE * k)
    solid(p, ink, weight, s.color)
    p.circle(0, -HINGE * k, 0.13 * k)
    p.pop()
  },
})
