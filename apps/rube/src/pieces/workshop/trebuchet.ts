import { outline, solid } from '../../../../../src/core/draw'
import { easeInQuad, easeOutCubic } from '../../../../../src/core/ease'
import { FAST, FLOOR, R, ROLL, arcPts, arrive, arriveAt, burst, chain, definePiece, fly, over, rail, ramp, wait, type Lane, type Pt } from '../../parts'

/**
 * A trebuchet. The long arm rests with its cup down on the rail and the
 * counterweight up; the ball rolls into the cup and its weight pulls the
 * pin; the counterweight drops, the arm comes over the top, and the ball
 * leaves the cup at the top of the swing to land two cells over. The arm
 * swings on through upright and back, and comes to stand straight up, the
 * weight hanging under the pivot, the way they do.
 *
 * The cup is a bowl on the end of the arm, deep enough to hold the ball,
 * and it stands in front of the ball: the ball sits down in it to the
 * waist, and is not a disc laid over the arm's end.
 */
const PIVOT: Pt = [0.5, -0.5]
const ARM = 0.75
const SHORT = 0.28
const REST = Math.PI - 0.73
const RELEASE = Math.PI * 1.38
const LAND: Pt = [2.28, 0]
const SEAT = PIVOT[0] + Math.cos(REST) * ARM
const ARRIVE = arriveAt(SEAT)
const PIN = 0.4
const SWING = 0.48
const FIRE = ARRIVE + PIN
const FLIGHT = 0.38
/** The cup: its floor this far down the arm from the ball's centre, under the ball; its rim short of the ball's middle; its width a little over the ball's. */
const CUP_FLOOR = R + 0.03
const CUP_RIM = 0.03
const CUP_W = 0.34
/** The pin's post: clear of the cup's corner, so the pin is seen holding it. */
const PIN_X = SEAT + 0.22

/** Where a counterweighted arm comes to rest: straight up, the weight straight down under the pivot. */
const UP = Math.PI * 1.5
/** After the release the arm swings on through upright and back, less each time, and stands there: not at whatever angle the throw left it. */
const armAt = (since: number) => {
  if (since < 0) return REST
  if (since < SWING) return REST + (RELEASE - REST) * easeInQuad(over(since, 0, SWING))
  const u = since - SWING
  return UP + Math.exp(-u * 1.8) * (0.7 * Math.sin(u * 6) - (UP - RELEASE) * Math.cos(u * 6))
}

export const trebuchet = definePiece<{ color: string }>({
  name: 'trebuchet',
  flight: true,
  weight: 0.9,
  place: ({ color, fits }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
      [2, 0],
      [0, -1],
      [1, -1],
    ]
    if (!fits(cells, [3, 0])) return null
    // The ball rides the cup round the top, accelerating, then flies.
    const pts = arcPts(PIVOT[0], PIVOT[1], ARM, REST, RELEASE, 12)
    const speed = (i: number) => 0.2 + (i / 12) * 1.1
    const throwSeg = chain(pts, SWING, speed)
    const off = pts[pts.length - 1]
    const lane: Lane = {
      segs: [
        ...arrive([-0.5, 0], [SEAT, 0]),
        wait([SEAT, 0], PIN),
        ...throwSeg,
        fly(off, LAND, FLIGHT, 0.45),
        fly(LAND, [LAND[0] + 0.14, 0], 0.035, 0.015),
        ramp([LAND[0] + 0.14, 0], [2.5, 0], FAST, ROLL),
      ],
      fire: FIRE,
    }
    return { cells, exit: { at: [3, 0], dir: 1 }, lane, state: { color } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    const a = armAt(since)
    const tip: Pt = [PIVOT[0] + Math.cos(a) * ARM, PIVOT[1] + Math.sin(a) * ARM]
    const tail: Pt = [PIVOT[0] - Math.cos(a) * SHORT, PIVOT[1] - Math.sin(a) * SHORT]

    // The rail to the cup, and the landing with its bumper.
    rail(p, k, ink, weight, -0.5, SEAT - 0.14)
    rail(p, k, ink, weight, LAND[0] - 0.3, 2.5)
    const landAt = FIRE + SWING + FLIGHT
    const squash = t < landAt ? 0 : 1 - over(t, landAt, landAt + 0.3)
    solid(p, ink, weight, s.color)
    p.rect(LAND[0] * k, (FLOOR + 0.06 + squash * 0.02) * k, 0.3 * k, (0.08 - squash * 0.03) * k)
    outline(p, ink, weight)
    p.line(LAND[0] * k, (FLOOR + 0.1) * k, LAND[0] * k, 0.5 * k)
    p.line((LAND[0] - 0.06) * k, 0.5 * k, (LAND[0] + 0.06) * k, 0.5 * k)

    // The frame: an A over the axle, on the ground, and the pin post.
    outline(p, ink, weight)
    p.line((PIVOT[0] - 0.3) * k, 0.5 * k, PIVOT[0] * k, PIVOT[1] * k)
    p.line((PIVOT[0] + 0.3) * k, 0.5 * k, PIVOT[0] * k, PIVOT[1] * k)
    p.line((PIVOT[0] - 0.38) * k, 0.5 * k, (PIVOT[0] + 0.38) * k, 0.5 * k)
    p.line((PIVOT[0] - 0.15) * k, 0.2 * k, (PIVOT[0] + 0.15) * k, 0.2 * k)
    // The pin: holds the arm's cup end down, pulled by the ball's weight.
    const pulled = t < ARRIVE ? 0 : since < 0 ? over(t, ARRIVE + 0.1, FIRE) : 1
    p.push()
    p.translate((PIN_X) * k, (FLOOR - 0.04) * k)
    p.rotate(0.9 * pulled)
    solid(p, ink, weight, s.color)
    p.rect(-0.07 * k, 0, 0.14 * k, 0.035 * k)
    p.pop()
    outline(p, ink, weight)
    p.line((PIN_X) * k, FLOOR * k, (PIN_X) * k, 0.5 * k)

    // The arm, the counterweight on its short end, the cup on its long end.
    outline(p, ink, weight)
    p.line(tail[0] * k, tail[1] * k, (tip[0] - Math.cos(a) * CUP_FLOOR) * k, (tip[1] - Math.sin(a) * CUP_FLOOR) * k)
    // The counterweight hangs plumb from a hinge at the short end, swinging a little with the arm.
    const hang = 0.2 * Math.sin(a - REST) * (since < SWING ? 1 : Math.exp(-(since - SWING) * 1.2))
    outline(p, ink, weight)
    p.line(tail[0] * k, tail[1] * k, (tail[0] + Math.sin(hang) * 0.06) * k, (tail[1] + Math.cos(hang) * 0.06) * k)
    p.push()
    p.translate((tail[0] + Math.sin(hang) * 0.06) * k, (tail[1] + Math.cos(hang) * 0.06) * k)
    p.rotate(-hang)
    solid(p, ink, weight, s.color)
    p.rect(0, 0.1 * k, 0.16 * k, 0.2 * k, 0.02 * k)
    p.fill(ink)
    p.noStroke()
    p.rect(0, 0.03 * k, 0.16 * k, 0.03 * k)
    p.pop()
    solid(p, ink, weight, bg)
    p.circle(tail[0] * k, tail[1] * k, 0.04 * k)
    solid(p, ink, weight, bg)
    p.circle(PIVOT[0] * k, PIVOT[1] * k, 0.07 * k)

    // The release: a puff of lines off the cup.
    if (since > SWING && since < SWING + 0.2) {
      const f = easeOutCubic(over(since, SWING, SWING + 0.2))
      p.push()
      p.stroke(s.color)
      p.strokeWeight(weight)
      burst(p, tip[0] * k, tip[1] * k, (0.1 + 0.16 * f) * k, (0.16 + 0.2 * f) * k, 6, 0.4)
      p.pop()
    }
  },
  over: (p, s, { k, since, ink, weight }) => {
    // The cup, in front of the ball: a bowl on the arm's end, its round bottom to the arm.
    const a = armAt(since)
    p.push()
    p.translate((PIVOT[0] + Math.cos(a) * ARM) * k, (PIVOT[1] + Math.sin(a) * ARM) * k)
    p.rotate(a + Math.PI / 2)
    solid(p, ink, weight, s.color)
    p.rect(0, ((CUP_RIM + CUP_FLOOR) / 2 + 0.01) * k, CUP_W * k, (CUP_FLOOR - CUP_RIM + 0.02) * k, 0, 0, 0.08 * k, 0.08 * k)
    p.pop()
  },
})
