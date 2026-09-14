import { outline, solid } from '../../../../../src/core/draw'
import { easeOutCubic } from '../../../../../src/core/ease'
import { FLOOR, ROLL, arrive, arriveAt, definePiece, fly, over, rail, ramp, wait, type Lane, type Pt } from '../../parts'
import { flash, glow, lamp, score, tube } from './neon'

/**
 * A pinball slingshot: a lit triangle beside the lane with a rubber band
 * along its face. The ball rolls into the band and stops against it; the
 * band stretches, the kicker behind it fires, and the ball is flung up a
 * floor onto a shelf, where a bumper stops it and it rolls on. The
 * triangle flashes and the band twangs for a while after.
 */
const SEAT = 0.04
const SHELF_Y = -1
const LAND: Pt = [0.28, SHELF_Y]
const ARRIVE = arriveAt(SEAT)
const STRETCH = 0.18
const FIRE = ARRIVE + STRETCH
/** The band runs from the triangle's foot to its top, just behind the seat. */
const FOOT: Pt = [-0.12, FLOOR + 0.02]
const TOP: Pt = [-0.36, -0.42]

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
        ...arrive([-0.5, 0], [SEAT, 0]),
        wait([SEAT, 0], STRETCH),
        fly([SEAT, 0], LAND, 0.4, 0.26),
        fly(LAND, [LAND[0] + 0.1, SHELF_Y], 0.06, 0.02),
        ramp([LAND[0] + 0.1, SHELF_Y], [0.5, SHELF_Y], 1.6, ROLL),
      ],
      fire: FIRE,
    }
    return { cells, exit: { at: [1, -1], dir: 1 }, lane, state: { color } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    // The band: pushed back by the ball as it settles, snapped forward at the fire, twanging after.
    const push = t < ARRIVE - 0.1 ? 0 : since < 0 ? over(t, ARRIVE - 0.1, FIRE) : 0
    const twang = since < 0 ? 0 : -0.06 * Math.sin(since * 40) * Math.exp(-since * 6)
    const bow = 0.1 * push + twang
    const lit = since < 0 ? 0 : 1 - over(since, 0.3, 1.2)

    // The rail to the seat, the shelf above on its post with a bumper at its end.
    rail(p, k, ink, weight, -0.5, SEAT + 0.16)
    rail(p, k, ink, weight, 0.1, 0.5, SHELF_Y + FLOOR)
    outline(p, ink, weight)
    p.line(0.44 * k, (SHELF_Y + FLOOR) * k, 0.44 * k, 0.5 * k)
    p.line(0.38 * k, 0.5 * k, 0.5 * k, 0.5 * k)
    solid(p, ink, weight, s.color)
    p.rect(0.47 * k, (SHELF_Y - 0.04) * k, 0.05 * k, 0.28 * k)
    // The triangle behind the band, lit on the fire, and the kicker arm inside it.
    glow(p, k, s.color, -0.28, -0.1, 0.3, lit)
    solid(p, ink, weight, lit > 0.5 ? s.color : bg)
    p.triangle(TOP[0] * k, TOP[1] * k, FOOT[0] * k, FOOT[1] * k, (TOP[0] - 0.12) * k, (FOOT[1] + 0.02) * k)
    lamp(p, k, ink, weight, s.color, bg, -0.36, -0.1, 0.035, lit)
    lamp(p, k, ink, weight, s.color, bg, -0.42, 0.06, 0.03, lit)
    // The kicker: a bar behind the band that punches out at the fire.
    const kick = since < 0 ? 0 : since < 0.05 ? easeOutCubic(over(since, 0, 0.05)) : since < 0.4 ? 1 : 1 - over(since, 0.4, 0.8)
    const mx = (FOOT[0] + TOP[0]) / 2 + 0.06 * kick
    const my = (FOOT[1] + TOP[1]) / 2 + 0.03 * kick
    solid(p, ink, weight, ink)
    p.push()
    p.translate(mx * k, my * k)
    p.rotate(Math.atan2(TOP[1] - FOOT[1], TOP[0] - FOOT[0]))
    p.rect(0, 0, 0.16 * k, 0.05 * k)
    p.pop()
    // The band: a lit tube along the face, bowed by the ball and the kick.
    const nx = -(TOP[1] - FOOT[1])
    const ny = TOP[0] - FOOT[0]
    const nl = Math.hypot(nx, ny)
    const bx = (FOOT[0] + TOP[0]) / 2 - (nx / nl) * bow
    const by = (FOOT[1] + TOP[1]) / 2 - (ny / nl) * bow
    tube(p, k, ink, weight, s.color, FOOT[0], FOOT[1], bx, by, lit)
    tube(p, k, ink, weight, s.color, bx, by, TOP[0], TOP[1], lit)
    // The posts the band is strung between.
    solid(p, ink, weight, s.color)
    p.circle(FOOT[0] * k, FOOT[1] * k, 0.06 * k)
    p.circle(TOP[0] * k, TOP[1] * k, 0.06 * k)
    // The snap, and the score.
    flash(p, k, s.color, weight, SEAT, -0.06, since, 0.25, 0.12, 0.3)
    score(p, k, s.color, -0.28, TOP[1] - 0.16, '+100', since)
  },
})
