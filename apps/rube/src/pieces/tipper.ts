import { outline, solid } from '../../../../src/core/draw'
import { easeInQuad, easeInOutSine, easeOutCubic } from '../../../../src/core/ease'
import { FLOOR, ROLL, arcPts, burst, chain, definePiece, over, rail, roll, wait, type Lane, type Pt, type Seg } from '../parts'

/**
 * A tipping bucket. The ball rolls off the rail into a bucket hinged at
 * its heel; its weight sinks the bucket's floor and pulls the pin; the
 * bucket tips over on the ball's side, past upright, until the mouth
 * faces down, and the ball is dumped into the cell below, where a
 * quarter-pipe turns the fall back into a roll. The bucket clacks on its
 * stop, and later rights itself.
 */
const HEEL: Pt = [-0.2, FLOOR]
const W = 0.34
const H = 0.3
const SEAT = -0.03
const ARRIVE = (0.5 + SEAT) / ROLL
const LATCH = 0.3
const FIRE = ARRIVE + LATCH
const TIP = 0.22
const OVER = 1.95
const ARC = 0.18
const RESET = 2.6

const tipAt = (since: number) =>
  since < 0 ? 0 : since < TIP ? OVER * easeInQuad(over(since, 0, TIP)) : since < RESET ? OVER : OVER * (1 - easeInOutSine(over(since, RESET, RESET + 1)))

export const tipper = definePiece<{ color: string }>({
  name: 'tipper',
  weight: 1,
  place: ({ color, fits }) => {
    const cells: Pt[] = [
      [0, 0],
      [0, 1],
    ]
    if (!fits(cells, [1, 1])) return null
    const bend = chain(arcPts(0.3 + ARC, 1 - ARC, ARC, Math.PI, Math.PI / 2, 4), 0.09)
    const segs: Seg[] = [
      roll([-0.5, 0], [SEAT, 0], ROLL, 'out'),
      wait([SEAT, 0], LATCH + 0.1),
      { from: [SEAT, 0], to: [0.14, 0.32], dur: 0.12, ease: 'in' },
      { from: [0.14, 0.32], to: [0.3, 1 - ARC], dur: 0.11, ease: 'in' },
      ...bend,
      roll([0.3 + ARC, 1], [0.5, 1], ROLL * 1.2, 'out'),
    ]
    const lane: Lane = { segs, fire: FIRE }
    return { cells, exit: { at: [1, 1], dir: 1 }, lane, state: { color } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    const tip = tipAt(since)
    const sink = t < ARRIVE ? 0 : since < 0 ? over(t, ARRIVE, ARRIVE + 0.1) : 1 - over(since, RESET, RESET + 1)

    // The rail to the bucket's lip, and the post the heel is hinged on.
    rail(p, k, ink, weight, -0.5, HEEL[0] - 0.02)
    outline(p, ink, weight)
    p.line(HEEL[0] * k, HEEL[1] * k, HEEL[0] * k, 1.5 * k)
    p.line((HEEL[0] - 0.08) * k, 1.5 * k, (HEEL[0] + 0.08) * k, 1.5 * k)
    // The stop the bucket lands on, out from the post.
    p.line(HEEL[0] * k, 0.62 * k, 0.12 * k, 0.62 * k)
    p.line(0.12 * k, 0.62 * k, 0.12 * k, 0.56 * k)
    // The catch below: a quarter-pipe onto the rail out.
    p.arc((0.3 + ARC) * k, (1 - ARC) * k, (ARC + FLOOR) * 2 * k, (ARC + FLOOR) * 2 * k, Math.PI / 2, Math.PI)
    p.line((0.3 + ARC) * k, (1 + FLOOR) * k, 0.5 * k, (1 + FLOOR) * k)
    p.line(0.44 * k, (1 + FLOOR) * k, 0.44 * k, 1.5 * k)
    p.line(0.38 * k, 1.5 * k, 0.5 * k, 1.5 * k)
    const squash = since < 0.55 ? 0 : 1 - over(since, 0.55, 0.9)
    solid(p, ink, weight, s.color)
    p.rect(0.36 * k, (1 + FLOOR + 0.12 + squash * 0.02) * k, 0.2 * k, (0.09 - squash * 0.03) * k)
    outline(p, ink, weight)
    p.line(0.36 * k, (1 + FLOOR + 0.17) * k, 0.36 * k, 1.5 * k)

    // The pin that holds the bucket level, pulled by the sinking floor.
    const pulled = since < 0 ? sink : 1 - over(since, RESET + 0.6, RESET + 1)
    p.push()
    p.translate((HEEL[0] + W + 0.06) * k, (HEEL[1] - 0.02) * k)
    p.rotate(0.8 * pulled)
    solid(p, ink, weight, s.color)
    p.rect(-0.06 * k, 0, 0.12 * k, 0.035 * k)
    p.pop()
    outline(p, ink, weight)
    p.line((HEEL[0] + W + 0.06) * k, HEEL[1] * k, (HEEL[0] + W + 0.06) * k, 0.5 * k)
    p.line((HEEL[0] + W) * k, 0.5 * k, (HEEL[0] + W + 0.12) * k, 0.5 * k)

    // The bucket: a box open at the top, hinged at its heel, in front of nothing.
    p.push()
    p.translate(HEEL[0] * k, HEEL[1] * k)
    p.rotate(tip)
    solid(p, ink, weight, s.color)
    p.beginShape()
    p.vertex(0, (-H) * k)
    p.vertex(0, 0)
    p.vertex(W * k, 0)
    p.vertex(W * k, (-H) * k)
    p.vertex((W - 0.04) * k, (-H) * k)
    p.vertex((W - 0.04) * k, -0.04 * k)
    p.vertex(0.04 * k, -0.04 * k)
    p.vertex(0.04 * k, (-H + 0.14) * k)
    p.vertex(0, (-H + 0.14) * k)
    p.endShape(p.CLOSE)
    // The floor tongue that sinks under the ball.
    solid(p, ink, weight, s.color)
    p.rect((W / 2) * k, (-0.02 + sink * 0.02) * k, (W - 0.1) * k, 0.03 * k)
    p.pop()
    solid(p, ink, weight, bg)
    p.circle(HEEL[0] * k, HEEL[1] * k, 0.05 * k)

    // The clack.
    if (since > TIP && since < TIP + 0.25) {
      const f = easeOutCubic(over(since, TIP, TIP + 0.25))
      p.push()
      p.stroke(s.color)
      p.strokeWeight(weight)
      burst(p, 0.04 * k, 0.6 * k, (0.06 + 0.12 * f) * k, (0.1 + 0.16 * f) * k, 5, 3.4)
      p.pop()
    }
  },
})
