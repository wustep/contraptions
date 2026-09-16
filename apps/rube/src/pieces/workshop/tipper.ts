import { outline, solid } from '../../../../../src/core/draw'
import { easeInQuad, easeInOutSine, easeOutCubic } from '../../../../../src/core/ease'
import { FAST, FLOOR, R, ROLL, arcPts, arrive, arriveAt, burst, catchBend, chain, definePiece, over, rail, ramp, trace, type Lane, type Pt, type Seg } from '../../parts'

/**
 * A tipping tray. The ball rolls off the rail onto a tray hinged at its
 * heel; a counterweight under the heel holds it level, resting against the
 * post, and gives slowly under the ball's weight — the tray creeps, the
 * ball riding it down — until the weight at the far end wins; the tray
 * tips over, past upright, until it lands on its stop with its mouth
 * facing down, and the ball is dumped into the cell below, where a
 * quarter-pipe turns the fall back into a roll. The tray clacks on its
 * stop, and later the counterweight rights it.
 *
 * The ball's seat is traced from the same tilt the tray is drawn with, so
 * it sits on the tray's floor at every angle until it slides off.
 */
const HEEL: Pt = [-0.2, FLOOR]
const W = 0.34
const H = 0.3
/** The tray's floor is this thick; the ball sits on top of it. */
const PLATE = 0.045
const SEAT = -0.03
const ARRIVE = arriveAt(SEAT)
const SETTLE = 0.3
const FIRE = ARRIVE + SETTLE
/** How far the tray has crept by the time it goes. */
const CREEP = 0.12
const TIP = 0.22
/** The ball slides off the tray this long into the tip. */
const SLIDE = 0.1
const OVER = 1.95
const ARC = 0.18
/** Where the catch's bend begins, under the tray's mouth. */
const CATCH = 0.24
const STOP_Y = 0.62
const RESET = 2.6

const tipAt = (since: number) =>
  since < -SETTLE ? 0
  : since < 0 ? CREEP * easeInQuad(over(since, -SETTLE, 0))
  : since < TIP ? CREEP + (OVER - CREEP) * easeInQuad(over(since, 0, TIP))
  : since < RESET ? OVER
  : OVER * (1 - easeInOutSine(over(since, RESET, RESET + 1)))

/** The ball's centre on the tray's floor, `d` along it from the heel, with the tray tilted `a`. */
function seatAt(t: number): Pt {
  const a = tipAt(t - FIRE)
  const d = SEAT - HEEL[0]
  const up = R + PLATE
  return [HEEL[0] + d * Math.cos(a) + up * Math.sin(a), HEEL[1] + d * Math.sin(a) - up * Math.cos(a)]
}

export const tipper = definePiece<{ color: string }>({
  name: 'tipper',
  weight: 1,
  place: ({ color, fits }) => {
    const cells: Pt[] = [
      [0, 0],
      [0, 1],
    ]
    if (!fits(cells, [1, 1])) return null
    const bend = chain(arcPts(CATCH + ARC, 1 - ARC, ARC, Math.PI, Math.PI / 2, 4), 0.045)
    const off = seatAt(FIRE + SLIDE)
    const segs: Seg[] = [
      ...arrive([-0.5, 0], seatAt(ARRIVE)),
      ...trace(seatAt, ARRIVE, FIRE + SLIDE, 8),
      { from: off, to: [CATCH, 1 - ARC], dur: 0.22, ease: 'in' },
      ...bend,
      ramp([CATCH + ARC, 1], [0.5, 1], FAST, ROLL),
    ]
    const lane: Lane = { segs, fire: FIRE }
    return { cells, exit: { at: [1, 1], dir: 1 }, lane, state: { color } }
  },
  draw: (p, s, { k, since, ink, bg, weight }) => {
    const tip = tipAt(since)

    // The rail to the tray's heel, the post the heel is hinged on, and the
    // stop out from the post that the tipped tray lands on.
    rail(p, k, ink, weight, -0.5, HEEL[0] - 0.02)
    outline(p, ink, weight)
    p.line(HEEL[0] * k, HEEL[1] * k, HEEL[0] * k, 1.5 * k)
    p.line((HEEL[0] - 0.08) * k, 1.5 * k, (HEEL[0] + 0.08) * k, 1.5 * k)
    p.line(HEEL[0] * k, STOP_Y * k, 0.12 * k, STOP_Y * k)
    p.line(0.12 * k, STOP_Y * k, 0.12 * k, (STOP_Y - 0.06) * k)
    // The catch below: a quarter-pipe onto the rail out.
    const squash = since < 0.55 ? 0 : 1 - over(since, 0.55, 0.9)
    p.push()
    p.translate(CATCH * k, 1 * k)
    catchBend(p, k, ink, weight, s.color, 1, ARC, squash, 0.5 - CATCH)
    p.pop()

    // The tray: a floor and a far wall on the heel pin, with the
    // counterweight on a short arm under the heel.
    p.push()
    p.translate(HEEL[0] * k, HEEL[1] * k)
    p.rotate(tip)
    solid(p, ink, weight, s.color)
    p.beginShape()
    p.vertex(0, 0)
    p.vertex(W * k, 0)
    p.vertex(W * k, -H * k)
    p.vertex((W - 0.045) * k, -H * k)
    p.vertex((W - 0.045) * k, -0.045 * k)
    p.vertex(0, -0.045 * k)
    p.endShape(p.CLOSE)
    outline(p, ink, weight)
    p.line(0, -0.02 * k, -0.09 * k, 0.11 * k)
    p.fill(ink)
    p.noStroke()
    p.circle(-0.1 * k, 0.13 * k, 0.1 * k)
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
