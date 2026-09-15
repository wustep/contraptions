import { outline, solid } from '../../../../../src/core/draw'
import { easeOutCubic } from '../../../../../src/core/ease'
import { FLOOR, ROLL, arrive, arriveAt, definePiece, fly, over, rail, ramp, wait, type Lane, type Pt } from '../../parts'
import { flash, glow, lamp, score, tube } from './neon'

/**
 * A pinball slingshot: a lit triangle beside the lane with a rubber band
 * along its face. The ball rolls into a saucer in the lane and stops with
 * its back against the band; the kicker behind the band draws it back,
 * then punches through — the band snaps into the ball and flings it up a
 * floor onto a shelf that slopes down to the way out, so it lands soft at
 * the top of its flight and rolls away down the slope. The triangle
 * flashes and the band twangs for a while after.
 */
const SEAT = -0.04
const SHELF_Y = -1
/** The shelf's high end, where the ball lands; it slopes down to the rail's height at the edge. */
const SHELF_X0 = 0.1
const SLOPE = 0.05
const LAND: Pt = [0.26, SHELF_Y - SLOPE * ((0.5 - 0.26) / (0.5 - SHELF_X0))]
const ARRIVE = arriveAt(SEAT)
const STRETCH = 0.18
const FIRE = ARRIVE + STRETCH
/** The band runs from the triangle's foot to its top; the ball at the seat just touches it. */
const FOOT: Pt = [-0.12, FLOOR + 0.02]
const TOP: Pt = [-0.36, -0.42]
/** The band's face: the way it kicks. */
const NORMAL: Pt = (() => {
  const nx = -(TOP[1] - FOOT[1])
  const ny = TOP[0] - FOOT[0]
  const nl = Math.hypot(nx, ny)
  return [nx / nl, ny / nl]
})()

export const slingshot = definePiece<{ color: string }>({
  name: 'slingshot',
  weight: 0.9,
  flight: true,
  place: ({ color, fits }) => {
    const cells: Pt[] = [
      [0, 0],
      [0, -1],
    ]
    if (!fits(cells, [1, -1])) return null
    const lane: Lane = {
      segs: [
        ...arrive([-0.5, 0], [SEAT, 0.02]),
        wait([SEAT, 0.02], STRETCH),
        // Up onto the shelf at the top of its flight, and down the slope to the edge.
        fly([SEAT, 0.02], LAND, 0.4, (0.02 - LAND[1]) / 4),
        ramp(LAND, [0.5, SHELF_Y], 0.85, ROLL),
      ],
      fire: FIRE,
    }
    return { cells, exit: { at: [1, -1], dir: 1 }, lane, state: { color } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    // The band: drawn back by the kicker as the ball settles, snapped into the ball at the fire, twanging after.
    const push = t < ARRIVE - 0.1 ? 0 : since < 0 ? over(t, ARRIVE - 0.1, FIRE) : 0
    const twang = since < 0 ? 0 : -0.06 * Math.sin(since * 40) * Math.exp(-since * 6)
    const bow = 0.1 * push + twang
    const lit = since < 0 ? 0 : 1 - over(since, 0.3, 1.2)

    // The rail to the seat, with a saucer the ball settles in; the shelf above on its post, sloping down to the edge, with a lamp over its end.
    rail(p, k, ink, weight, -0.5, SEAT - 0.1)
    outline(p, ink, weight)
    p.line((SEAT - 0.1) * k, FLOOR * k, (SEAT - 0.05) * k, (FLOOR + 0.02) * k)
    p.line((SEAT - 0.05) * k, (FLOOR + 0.02) * k, (SEAT + 0.05) * k, (FLOOR + 0.02) * k)
    p.line((SEAT + 0.05) * k, (FLOOR + 0.02) * k, (SEAT + 0.1) * k, FLOOR * k)
    rail(p, k, ink, weight, SEAT + 0.1, SEAT + 0.2)
    outline(p, ink, weight)
    p.line(SHELF_X0 * k, (SHELF_Y + FLOOR - SLOPE) * k, 0.5 * k, (SHELF_Y + FLOOR) * k)
    p.line(0.44 * k, (SHELF_Y + FLOOR - 0.01) * k, 0.44 * k, 0.5 * k)
    p.line(0.38 * k, 0.5 * k, 0.5 * k, 0.5 * k)
    p.line(0.44 * k, (SHELF_Y - 0.32) * k, 0.44 * k, (SHELF_Y - 0.44) * k)
    lamp(p, k, ink, weight, s.color, bg, 0.44, SHELF_Y - 0.48, 0.035, since > 0.3 ? 1 - over(since, 1.2, 2) : 0)
    // The triangle behind the band, lit on the fire, and the kicker arm inside it.
    glow(p, k, s.color, -0.28, -0.1, 0.3, lit)
    solid(p, ink, weight, lit > 0.5 ? s.color : bg)
    p.triangle(TOP[0] * k, TOP[1] * k, FOOT[0] * k, FOOT[1] * k, (TOP[0] - 0.12) * k, (FOOT[1] + 0.02) * k)
    lamp(p, k, ink, weight, s.color, bg, -0.36, -0.1, 0.035, lit)
    lamp(p, k, ink, weight, s.color, bg, -0.42, 0.06, 0.03, lit)
    // The kicker: a bar behind the band that draws it back, and punches out along its face at the fire.
    const kick = since < 0 ? 0 : since < 0.05 ? easeOutCubic(over(since, 0, 0.05)) : since < 0.4 ? 1 : 1 - over(since, 0.4, 0.8)
    const reach = 0.08 * kick - 0.1 * push
    const mx = (FOOT[0] + TOP[0]) / 2 + NORMAL[0] * reach
    const my = (FOOT[1] + TOP[1]) / 2 + NORMAL[1] * reach
    solid(p, ink, weight, ink)
    p.push()
    p.translate(mx * k, my * k)
    p.rotate(Math.atan2(TOP[1] - FOOT[1], TOP[0] - FOOT[0]))
    p.rect(0, 0, 0.16 * k, 0.05 * k)
    p.pop()
    // The band: a lit tube along the face, drawn back with the kicker and snapped forward by it.
    const bx = (FOOT[0] + TOP[0]) / 2 - NORMAL[0] * bow
    const by = (FOOT[1] + TOP[1]) / 2 - NORMAL[1] * bow
    tube(p, k, ink, weight, s.color, FOOT[0], FOOT[1], bx, by, lit)
    tube(p, k, ink, weight, s.color, bx, by, TOP[0], TOP[1], lit)
    // The posts the band is strung between.
    solid(p, ink, weight, s.color)
    p.circle(FOOT[0] * k, FOOT[1] * k, 0.06 * k)
    p.circle(TOP[0] * k, TOP[1] * k, 0.06 * k)
    // The snap, and the score.
    flash(p, k, s.color, weight, SEAT, -0.04, since, 0.25, 0.12, 0.3)
    score(p, k, s.color, -0.28, TOP[1] - 0.16, '+100', since)
  },
})
