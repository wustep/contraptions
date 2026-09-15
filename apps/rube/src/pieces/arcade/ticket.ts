import { outline, solid } from '../../../../../src/core/draw'
import { FLOOR, ROLL, definePiece, fly, over, rail, ramp, rankBy, wait, type Lane, type Pt } from '../../parts'
import { cabinet, digits, lamp, marquee } from './neon'

/**
 * A ticket machine as tall as the drop. The lane runs into a hopper in its
 * top; the ball rolls off the rail's end and tips into the funnel, still
 * going the way it came, and is gone down the throat; the machine whirs,
 * its lights chase, and a strip of tickets feeds out of the slot at the
 * bottom, longer and longer — until the ball drops out of the prize chute
 * on the far side, a hood at the cabinet's foot, onto the rail below: one
 * or two floors down, on or back the way it came. The tickets hang there.
 * Nobody tears them off.
 *
 * The hood stands in front of the ball, so it comes *out* of the chute
 * and lands beside the cabinet, instead of appearing on the cabinet's face.
 */
export interface TicketState {
  color: string
  floors: number
  turn: 1 | -1
}

const HOPPER = -0.12
const W = 0.5
/** The rail's end: the ball tips off it into the funnel's mouth. */
const EDGE = HOPPER - 0.14
/** Where the ball is out of sight, at the funnel's throat. */
const THROAT: Pt = [-0.04, 0.2]
const V_EDGE = 1.4
const T_EDGE = (0.5 + EDGE) / ((ROLL + V_EDGE) / 2)
const TIP = (THROAT[0] - EDGE) / V_EDGE
/** The prize chute: a hood at the cabinet's foot on the exit side, and the ball's centre as it waits inside. */
const CHUTE_X = 0.3
const CHUTE_W = 0.32
const CHUTE_TOP = -0.4
const CHUTE_BOTTOM = -0.12
const CHUTE_Y = -0.24
const DROP = Math.sqrt((2 * -CHUTE_Y) / 24)
const rideTime = (floors: number) => 0.4 + 0.35 * floors
const HOLD = 0.15

export const ticket = definePiece<TicketState>({
  name: 'ticket',
  weight: 1.1,
  place: ({ rng, color, fits, taste }) => {
    const deep = taste.weights['drop-deep'] ?? 1
    const options = rng.shuffle([1, 2].flatMap((floors) => [1, -1].map((turn) => ({ floors, turn: turn as 1 | -1 }))))
    for (const { floors, turn } of rankBy(rng, options, (o) => Math.pow(deep, o.floors - 1))) {
      const cells: Pt[] = []
      for (let i = 0; i <= floors; i++) cells.push([0, i])
      const exit: Pt = [turn, floors]
      if (!fits(cells, exit)) continue
      const ride = rideTime(floors)
      const chute: Pt = [turn * CHUTE_X, floors + CHUTE_Y]
      const land: Pt = [turn * CHUTE_X, floors]
      const lane: Lane = {
        segs: [
          ramp([-0.5, 0], [EDGE, 0], ROLL, V_EDGE),
          // Off the rail's end at its own pace, falling from level: the arc is a quarter of the drop.
          fly([EDGE, 0], THROAT, TIP, THROAT[1] / 4),
          { from: THROAT, to: chute, dur: ride, hidden: true },
          wait(chute, HOLD, { hidden: true }),
          { from: chute, to: land, dur: DROP, ease: 'in' },
          fly(land, [turn * (CHUTE_X + 0.06), floors], 0.03, 0.01),
          ramp([turn * (CHUTE_X + 0.06), floors], [turn * 0.5, floors], 2.0, ROLL),
        ],
        fire: T_EDGE + TIP + ride + HOLD,
      }
      return { cells, exit: { at: exit, dir: turn }, lane, state: { color, floors, turn } }
    }
    return null
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    const { floors, turn } = s
    const ride = rideTime(floors)
    const whir = t > T_EDGE + TIP && since < 0
    // The ticket strip: fed out while the machine works, hanging after.
    const fed = t < T_EDGE + TIP ? 0 : since < 0 ? over(t, T_EDGE + TIP, T_EDGE + TIP + ride) : 1
    const tickets = Math.round(fed * (3 + 3 * floors))
    const shake = whir ? 0.008 * Math.sin(t * 50) : 0

    rail(p, k, ink, weight, -0.5, EDGE)
    rail(p, k, ink, weight, turn * 0.22, turn * 0.5, floors + FLOOR)
    p.push()
    p.translate(shake * k, 0)
    // The cabinet: from a marquee above the hopper down to the floor of the lowest cell.
    cabinet(p, k, ink, weight, s.color, 0, -0.42, floors + 0.5, W)
    // The hopper: a funnel in the top, on the lane's side, wide enough for the ball.
    solid(p, ink, weight, bg)
    p.quad((HOPPER - 0.2) * k, -0.04 * k, (HOPPER + 0.24) * k, -0.04 * k, 0.12 * k, 0.26 * k, -0.12 * k, 0.26 * k)
    // The marquee along the top, chasing while it whirs; a lamp that stays on after.
    marquee(p, k, ink, weight, s.color, bg, -0.2, 0.2, -0.36, 5, t, whir)
    // The display: the count of tickets so far.
    solid(p, ink, weight, ink)
    p.rect(0, 0.42 * k, 0.3 * k, 0.14 * k, 0.01 * k)
    digits(p, k, whir || since > 0 ? s.color : bg, 0, 0.42, String(tickets).padStart(2, '0'), 0.022)
    // Reels behind a window, turning while it works.
    solid(p, ink, weight, bg)
    p.rect(0, (floors * 0.5 + 0.5) * k, 0.3 * k, 0.2 * k, 0.01 * k)
    outline(p, ink, weight * 0.8)
    for (const dx of [-0.08, 0.08]) {
      p.push()
      p.translate(dx * k, (floors * 0.5 + 0.5) * k)
      p.rotate(whir ? t * 12 : 0)
      p.line(-0.05 * k, 0, 0.05 * k, 0)
      p.line(0, -0.05 * k, 0, 0.05 * k)
      p.pop()
    }
    // The ticket slot beside the chute, on the other side.
    solid(p, ink, weight, ink)
    p.rect(-turn * 0.12 * k, (floors + 0.06) * k, 0.16 * k, 0.04 * k)
    p.pop()
    // The tickets: a strip out of the slot, a perforation every ticket, curling at the end.
    if (tickets > 0) {
      const x = -turn * 0.12
      for (let i = 0; i < tickets; i++) {
        const y = floors + 0.1 + i * 0.07
        solid(p, ink, weight * 0.7, bg)
        p.rect(x * k, (y + 0.035) * k, 0.14 * k, 0.07 * k)
        p.fill(s.color)
        p.noStroke()
        p.circle((x - 0.04) * k, (y + 0.035) * k, 0.02 * k)
        p.circle((x + 0.04) * k, (y + 0.035) * k, 0.02 * k)
      }
    }
  },
  over: (p, s, { k, t, since, ink, weight, bg }) => {
    const { floors, turn } = s
    const whir = t > T_EDGE + TIP && since < 0
    const shake = whir ? 0.008 * Math.sin(t * 50) : 0
    // The prize chute: a hood on the cabinet's side at its foot, open underneath, in front of the ball.
    p.push()
    p.translate(shake * k, 0)
    solid(p, ink, weight, s.color)
    p.rect(turn * CHUTE_X * k, (floors + (CHUTE_TOP + CHUTE_BOTTOM) / 2) * k, CHUTE_W * k, (CHUTE_BOTTOM - CHUTE_TOP) * k, 0.02 * k)
    // Its mouth: dark along the bottom edge, where the ball comes out.
    p.fill(ink)
    p.noStroke()
    p.rect(turn * CHUTE_X * k, (floors + CHUTE_BOTTOM - 0.035) * k, (CHUTE_W - 0.06) * k, 0.05 * k)
    // A lamp on the hood that comes on as the ball drops.
    lamp(p, k, ink, weight, s.color, bg, turn * CHUTE_X, floors + CHUTE_TOP + 0.08, 0.03, since > 0 && since < 0.6 ? 1 - over(since, 0.3, 0.6) : 0)
    p.pop()
  },
})
