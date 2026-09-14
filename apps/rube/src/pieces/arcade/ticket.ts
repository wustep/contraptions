import { outline, solid } from '../../../../../src/core/draw'
import { FLOOR, ROLL, definePiece, fly, over, rail, ramp, rankBy, wait, type Lane, type Pt } from '../../parts'
import { cabinet, digits, lamp, marquee } from './neon'

/**
 * A ticket machine as tall as the drop. The lane runs into a hopper in its
 * top; the ball tips in and is gone; the machine whirs, its lights chase,
 * and a strip of tickets feeds out of the slot at the bottom, longer and
 * longer, until the ball drops out of the prize chute beside it onto the
 * rail below — one or two floors down, on or back the way it came. The
 * tickets hang there. Nobody tears them off.
 */
export interface TicketState {
  color: string
  floors: number
  turn: 1 | -1
}

const HOPPER = -0.12
const W = 0.5
const T_HOPPER = (0.5 + HOPPER) / ((ROLL + 1.4) / 2)
const TIP = 0.16
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
      const lane: Lane = {
        segs: [
          ramp([-0.5, 0], [HOPPER, 0], ROLL, 1.4),
          { from: [HOPPER, 0], to: [0, 0.3], dur: TIP, ease: 'in' },
          { from: [0, 0.3], to: [0, floors - 0.25], dur: ride, hidden: true },
          wait([0, floors - 0.25], HOLD, { hidden: true }),
          fly([0, floors - 0.25], [turn * 0.3, floors], 0.2, 0.04),
          ramp([turn * 0.3, floors], [turn * 0.5, floors], 2.2, ROLL),
        ],
        fire: T_HOPPER + TIP + ride + HOLD,
      }
      return { cells, exit: { at: exit, dir: turn }, lane, state: { color, floors, turn } }
    }
    return null
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    const { floors, turn } = s
    const ride = rideTime(floors)
    const whir = t > T_HOPPER + TIP && since < 0
    // The ticket strip: fed out while the machine works, hanging after.
    const fed = t < T_HOPPER + TIP ? 0 : since < 0 ? over(t, T_HOPPER + TIP, T_HOPPER + TIP + ride) : 1
    const tickets = Math.round(fed * (3 + 3 * floors))
    const shake = whir ? 0.008 * Math.sin(t * 50) : 0

    rail(p, k, ink, weight, -0.5, HOPPER - 0.14)
    rail(p, k, ink, weight, turn * 0.3, turn * 0.5, floors + FLOOR)
    p.push()
    p.translate(shake * k, 0)
    // The cabinet: from a marquee above the hopper down to the floor of the lowest cell.
    cabinet(p, k, ink, weight, s.color, 0, -0.42, floors + 0.5, W)
    // The hopper: a funnel in the top, on the lane's side.
    solid(p, ink, weight, bg)
    p.quad((HOPPER - 0.16) * k, -0.04 * k, (HOPPER + 0.2) * k, -0.04 * k, 0.08 * k, 0.24 * k, -0.08 * k, 0.24 * k)
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
    // The prize chute the ball comes out of, on the exit side, and the ticket slot beside it.
    solid(p, ink, weight, ink)
    p.rect(turn * 0.18 * k, (floors - 0.2) * k, 0.12 * k, 0.16 * k, 0.01 * k)
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
    // The drop out of the chute.
    if (since > 0 && since < 0.2) {
      lamp(p, k, ink, weight, s.color, bg, turn * 0.18, floors - 0.32, 0.03, 1)
    }
  },
})
