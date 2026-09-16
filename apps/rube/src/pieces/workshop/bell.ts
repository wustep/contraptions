import { outline, solid } from '../../../../../src/core/draw'
import { R, ROLL, definePiece, gallows, laneAt, laneReach, over, rail, ramp, roll, type Lane } from '../../parts'

/**
 * A bell hung over the line by a pin through its crown, with its clapper
 * down in the ball's way. The ball shoulders the clapper going past; the
 * clapper swings up ahead of it and strikes the lip from inside; the knock
 * sets the bell rocking on its pin and the sound goes out in rings. The
 * ball wedges the clapper against the lip while it passes underneath, and
 * the clapper drops back and swings itself out once the ball is clear.
 * Nothing stops here; a bell is punctuation.
 */
const BW = 0.48
const BH = 0.32
const CROWN = -0.42
const HINGE = CROWN + BH * 0.4
/** The clapper's rod, from the hinge down to its head, and the head's radius. */
const ROD = -HINGE
const HEAD = 0.065
/** Where the ball first meets the clapper's head, and where it has pushed it to the lip. */
const MEET = -0.2
const PAST = 0.02
/** The clapper's swing when its head reaches the lip. */
const KNOCK = 0.75

const LANE: Lane = {
  segs: [roll([-0.5, 0], [MEET, 0], ROLL), ramp([MEET, 0], [PAST, 0], ROLL, ROLL * 0.75), ramp([PAST, 0], [0.5, 0], ROLL * 0.75, ROLL)],
  fire: 0,
}
LANE.fire = laneReach(LANE, PAST)
/** The ball's back has cleared the clapper's head this long after the fire; the clapper is free to fall back. */
const FREE = laneReach(LANE, ROD * Math.sin(KNOCK) + HEAD + R) - LANE.fire

/** The head's centre with the clapper swung `a` forward. */
const headAt = (a: number): [number, number] => [ROD * Math.sin(a), HINGE + ROD * Math.cos(a)]

/**
 * The swing that keeps the head's rim on the ball's, for a ball centred at
 * `x` on the line: the clapper is pushed, not animated. Zero before they
 * touch; never past the lip.
 */
function shoved(x: number): number {
  if (Math.hypot(x, 0) >= R + HEAD) return 0
  let lo = 0
  let hi = KNOCK
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2
    const [hx, hy] = headAt(mid)
    if (Math.hypot(hx - x, hy) < R + HEAD) lo = mid
    else hi = mid
  }
  return hi
}

export const bell = definePiece<{ color: string }>({
  name: 'bell',
  weight: 0.8,
  place: ({ color, fits }) => {
    if (!fits([[0, 0]], [1, 0])) return null
    return { cells: [[0, 0]], exit: { at: [1, 0], dir: 1 }, lane: LANE, state: { color } }
  },
  draw: (p, s, { k, since, ink, weight }) => {
    // The knock: the bell rocks on its pin, away from the clapper first, and rings down.
    const rock = since < 0 ? 0 : -0.13 * Math.sin(since * 28) * Math.exp(-since * 4)
    const ring = since < 0 ? 0 : 1 - over(since, 0, 0.5)

    rail(p, k, ink, weight, -0.5, 0.5)

    // The sound: two arcs a side, going out and thinning to nothing.
    if (ring > 0.02) {
      p.push()
      p.stroke(s.color)
      p.strokeWeight(weight * ring)
      p.noFill()
      for (const side of [-1, 1]) {
        for (let i = 1; i <= 2; i++) {
          const r = BW * (0.9 + i * 0.3 + (1 - ring) * 0.4) * k
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
    // The clapper: shoved ahead by the ball to the lip, wedged there while
    // the ball goes under, then dropping back and swinging itself out.
    const swing =
      since < 0 ? shoved(laneAt(LANE, t).x)
      : since < FREE ? KNOCK
      : KNOCK * Math.cos((since - FREE) * 9) * Math.exp(-(since - FREE) * 1.6)
    p.push()
    p.translate(0, HINGE * k)
    p.rotate(-swing)
    outline(p, ink, weight)
    p.line(0, 0, 0, ROD * k)
    solid(p, ink, weight, s.color)
    p.circle(0, ROD * k, HEAD * 2 * k)
    p.pop()
  },
})
