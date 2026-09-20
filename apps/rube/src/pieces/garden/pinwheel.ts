import { outline, solid } from '../../../../../src/core/draw'
import { FLOOR, R, ROLL, definePiece, fly, post, rail, ramp, roll, trace, wait, type Lane, type Pt } from '../../parts'
import { soil, tuft } from './green'

/**
 * A toy pinwheel on a stick, planted beside the path with one vane hanging
 * down into the ball's way. The ball runs into the vane's tip and stops
 * dead — and the knock sets the wheel spinning. The vane it hit whips
 * forward out of the way, and the next one comes over the top and down
 * behind the ball, catches it in the curl of its tip, carries it forward
 * and up the wheel's far side and lets go: up, in a steep hop, onto a
 * shelf of path a floor above. The wheel spins on, slower and slower.
 *
 * The ball rides a vane for a quarter turn: its lane there is the wheel's
 * own turning, sampled, the ball held a little ahead of the vane's face.
 */
/** The hub, the vanes' reach from it, and how far out along a vane the ball rides. */
const HUB: Pt = [0.02, -0.26]
const V = 0.36
const RS = 0.3
/** A vane's thickness, and how far ahead of a vane's centreline the ball it pushes sits, as an angle at the hub. */
const TH = 0.03
const AHEAD = Math.asin((R + TH / 2) / RS)
/** The ball's seat, as an angle at the hub: on the rail's line, down and back from the hub. */
const SEAT_A = Math.PI - Math.asin(-HUB[1] / RS)
/** Where the vane that stops the ball rests: its tip on the ball's lower front. */
const REST_A = SEAT_A - Math.acos((V * V + RS * RS - R * R) / (2 * V * RS))
const SEAT: Pt = [HUB[0] + RS * Math.cos(SEAT_A), 0]
/** The ball is let go at this angle, up the far side, and where it lands on the shelf. */
const LET_GO = (35 / 180) * Math.PI
const LAND: Pt = [0.44, -1]
const LEDGE = 0.36
const FLIGHT = 0.42
const ARC = 0.55

/** The spin the knock gives the wheel, radians a second, and how long it takes to die away. */
const SPIN = 13
const TAU = 1.6
const T_HIT = (0.5 + SEAT[0] - 0.04) / ROLL
const FIRE = T_HIT + 0.04 / (ROLL / 2)

/** How far the wheel has turned `s` seconds after the knock. */
const turned = (s: number) => (s <= 0 ? 0 : SPIN * TAU * (1 - Math.exp(-s / TAU)))
/** When it has turned by `a`. */
const turnedBy = (a: number) => -TAU * Math.log(1 - a / (SPIN * TAU))

/** The next vane round starts a quarter turn back; it reaches the ball's back at CATCH and lets it go at LET_GO. */
const T_CATCH = FIRE + turnedBy(REST_A + Math.PI / 2 - (SEAT_A + AHEAD))
const T_GO = FIRE + turnedBy(REST_A + Math.PI / 2 - AHEAD - LET_GO)

/** The ball riding the wheel at piece time `t`. */
function riding(t: number): Pt {
  const a = REST_A + Math.PI / 2 - turned(t - FIRE) - AHEAD
  return [HUB[0] + RS * Math.cos(a), HUB[1] + RS * Math.sin(a)]
}

const LANE: Lane = (() => {
  const ride = trace(riding, T_CATCH, T_GO, 10)
  const go = ride[ride.length - 1].to
  return {
    segs: [
      roll([-0.5, 0], [SEAT[0] - 0.04, 0], ROLL),
      ramp([SEAT[0] - 0.04, 0], SEAT, ROLL, 0),
      wait(SEAT, T_CATCH - FIRE),
      ...ride,
      fly(go, LAND, FLIGHT, ARC),
      fly(LAND, [LAND[0] + 0.03, -1], 0.03, 0.006),
      ramp([LAND[0] + 0.03, -1], [0.5, -1], 1.6, ROLL),
    ],
    fire: FIRE,
  }
})()

export const pinwheel = definePiece<{ color: string }>({
  name: 'pinwheel',
  weight: 1,
  flight: true,
  place: ({ color, fits }) => {
    const cells: Pt[] = [
      [0, 0],
      [0, -1],
    ]
    if (!fits(cells, [1, -1])) return null
    return { cells, exit: { at: [1, -1], dir: 1 }, lane: LANE, state: { color } }
  },
  draw: (p, s, { k, since, ink, bg, weight }) => {
    const phi = turned(since)

    // The path in to its last stake, the ground, and the shelf a floor up on a tall stake.
    rail(p, k, ink, weight, -0.5, -0.02)
    post(p, k, ink, weight, -0.05)
    soil(p, k, ink, weight, -0.5, 0.5)
    tuft(p, k, ink, weight, 0.3, 0.5, 0.1, 0.03)
    rail(p, k, ink, weight, LEDGE, 0.5, -1 + FLOOR)
    post(p, k, ink, weight, 0.46, -1 + FLOOR, 0.5)

    // The stick, planted behind the path, up to the hub.
    outline(p, ink, weight * 1.3)
    p.line(HUB[0] * k, 0.5 * k, HUB[0] * k, HUB[1] * k)
    outline(p, ink, weight)
    p.line((HUB[0] - 0.06) * k, 0.5 * k, (HUB[0] + 0.06) * k, 0.5 * k)

    // The wheel: four vanes, each a blade with its outer corner curled forward to the pin, and the pin.
    p.push()
    p.translate(HUB[0] * k, HUB[1] * k)
    for (let i = 0; i < 4; i++) {
      p.push()
      p.rotate(REST_A + (i * Math.PI) / 2 - phi)
      solid(p, ink, weight, s.color)
      p.beginShape()
      p.vertex(0.03 * k, -0.02 * k)
      p.vertex((V - 0.03) * k, -0.04 * k)
      p.vertex(V * k, -0.14 * k)
      p.vertex((V - 0.02) * k, 0.02 * k)
      p.vertex((V - 0.13) * k, 0.2 * k)
      p.vertex(0.03 * k, 0.06 * k)
      p.endShape(p.CLOSE)
      // The fold: the corner turned over, paper side out.
      solid(p, ink, weight * 0.9, bg)
      p.triangle((V - 0.02) * k, 0.02 * k, (V - 0.13) * k, 0.2 * k, (V * 0.5) * k, 0.07 * k)
      p.pop()
    }
    solid(p, ink, weight, bg)
    p.circle(0, 0, 0.09 * k)
    p.pop()
  },
})
