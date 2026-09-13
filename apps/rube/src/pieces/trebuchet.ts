import { outline, solid } from '../../../../src/core/draw'
import { easeInQuad, easeOutCubic } from '../../../../src/core/ease'
import { FLOOR, ROLL, arcPts, burst, chain, definePiece, fly, over, rail, roll, wait, type Lane, type Pt } from '../parts'

/**
 * A trebuchet. The long arm rests with its cup down on the rail and the
 * counterweight up; the ball rolls into the cup and its weight pulls the
 * pin; the counterweight drops, the arm comes over the top, and the ball
 * leaves the cup at the top of the swing to land two cells over. The arm
 * stays up, swinging a little, the way they do.
 */
const PIVOT: Pt = [0.5, -0.5]
const ARM = 0.75
const SHORT = 0.28
const REST = Math.PI - 0.73
const RELEASE = Math.PI * 1.7
const LAND: Pt = [2.28, 0]
const SEAT = PIVOT[0] + Math.cos(REST) * ARM
const ARRIVE = (0.5 + SEAT) / ROLL
const PIN = 0.4
const SWING = 0.36
const FIRE = ARRIVE + PIN
const FLIGHT = 0.5

const armAt = (since: number) =>
  since < 0 ? REST
  : since < SWING ? REST + (RELEASE - REST) * easeInQuad(over(since, 0, SWING))
  : RELEASE + 0.5 * (1 - Math.exp(-(since - SWING) * 2)) - 0.25 * Math.exp(-(since - SWING) * 1.5) * Math.sin((since - SWING) * 7)

export const trebuchet = definePiece<{ color: string }>({
  name: 'trebuchet',
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
    const speed = (i: number) => 0.15 + (i / 12) * 1.2
    const throwSeg = chain(pts, SWING, speed)
    const off = pts[pts.length - 1]
    const lane: Lane = {
      segs: [
        roll([-0.5, 0], [SEAT, 0], ROLL, 'out'),
        wait([SEAT, 0], PIN),
        ...throwSeg,
        fly(off, LAND, FLIGHT, 0.35),
        fly(LAND, [LAND[0] + 0.12, 0], 0.06, 0.02),
        roll([LAND[0] + 0.12, 0], [2.5, 0], ROLL * 1.3, 'out'),
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
    p.translate((SEAT + 0.16) * k, (FLOOR - 0.04) * k)
    p.rotate(0.9 * pulled)
    solid(p, ink, weight, s.color)
    p.rect(-0.07 * k, 0, 0.14 * k, 0.035 * k)
    p.pop()
    outline(p, ink, weight)
    p.line((SEAT + 0.16) * k, FLOOR * k, (SEAT + 0.16) * k, 0.5 * k)

    // The arm, the counterweight on its short end, the cup on its long end.
    outline(p, ink, weight)
    p.line(tail[0] * k, tail[1] * k, tip[0] * k, tip[1] * k)
    p.push()
    p.translate(tail[0] * k, tail[1] * k)
    p.rotate(a)
    solid(p, ink, weight, s.color)
    p.rect(0, 0, 0.16 * k, 0.2 * k, 0.02 * k)
    p.fill(ink)
    p.noStroke()
    p.rect(0, -0.07 * k, 0.16 * k, 0.03 * k)
    p.pop()
    p.push()
    p.translate(tip[0] * k, tip[1] * k)
    p.rotate(a + Math.PI / 2)
    outline(p, ink, weight)
    p.line(-0.14 * k, 0.05 * k, -0.14 * k, -0.06 * k)
    p.line(0.14 * k, 0.05 * k, 0.14 * k, -0.06 * k)
    solid(p, ink, weight, s.color)
    p.rect(0, 0.05 * k, 0.3 * k, 0.04 * k)
    p.pop()
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
})
