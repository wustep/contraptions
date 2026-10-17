import type p5 from 'p5'
import { outline, solid } from '../../../../../src/core/draw'
import { FLOOR, ROLL, definePiece, fly, over, rail, ramp, rankBy, wait, type Lane, type Pt } from '../../parts'
import { cabinet, display, lamp, marquee, score } from './neon'

/**
 * A ticket machine as tall as the drop, and the arcade's last word: the
 * planner never draws it from the pool, and stands it at the end of the
 * map, where the run's points are paid out. The lane runs into a hopper in
 * its top; the ball rolls off the rail's end and tips into the funnel,
 * still going the way it came, and is gone down the throat; the machine
 * whirs, its lights chase, the display — which came on showing what the
 * map earned — counts down a hundred at a time, and for every hundred a
 * ticket feeds out of the slot at the bottom: a strip that keeps printing,
 * piles up, and spills off the bottom of the frame. Then the ball
 * drops out of the prize chute on the far side, a hood at the cabinet's
 * foot, onto the rail below: one or two floors down, on or back the way it
 * came. The tickets stay. Nobody tears them off.
 *
 * Alone under the glass there is no run behind it, so it makes up a total
 * a run might have earned, and pays that out.
 *
 * The hood stands in front of the ball, so it comes *out* of the chute
 * and lands beside the cabinet, instead of appearing on the cabinet's face.
 */
export interface TicketState {
  color: string
  floors: number
  turn: 1 | -1
  /** What the map earned, and what that comes to at a ticket a hundred. */
  points: number
  tickets: number
}

/** Points to a ticket. */
export const PER_TICKET = 100
export const ticketsFor = (points: number): number => Math.max(1, Math.round(points / PER_TICKET))
/** Pitch of one ticket on the payout strip. */
const PITCH = 0.07
/**
 * How long the strip keeps feeding after the ball tips in. Long enough that a
 * full Arcade payout is still printing while the ball rolls the last rails
 * into the portal; tickets pile up and spill off the bottom of the frame.
 */
const FEED = 3.4
/** Seconds per ticket when the strip sets its own pace (a stream, not a burst). */
const TICK = 0.05

const HOPPER = -0.12
const W = 0.5
/** The hopper's funnel: its mouth across the top, its throat across the bottom. */
const MOUTH_Y = -0.04
const THROAT_Y = 0.26
const FUNNEL: [number, number][] = [
  [HOPPER - 0.2, MOUTH_Y],
  [HOPPER + 0.24, MOUTH_Y],
  [0.12, THROAT_Y],
  [-0.12, THROAT_Y],
]
/** The funnel's lane-side wall, across at `y`. */
const wallAt = (y: number): number => FUNNEL[0][0] + ((y - MOUTH_Y) * (FUNNEL[3][0] - FUNNEL[0][0])) / (THROAT_Y - MOUTH_Y)
/** How long the ball takes to sink out of sight down the throat. */
const SINK = 0.07
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

/** Lane time from the tip-in to the ball leaving the piece (ride + chute + exit). */
const afterTip = (floors: number): number => {
  const ride = rideTime(floors)
  const flyOut = 0.03
  const rampOut = Math.abs(0.5 - (CHUTE_X + 0.06)) / ((2.0 + ROLL) / 2)
  return ride + HOLD + DROP + flyOut + rampOut
}

/** Elapsed payout time: continues after the ball leaves, via `since`. */
const feedClock = (floors: number, t: number, since: number): number => {
  const start = T_EDGE + TIP
  if (since < 0) return Math.max(0, t - start)
  return afterTip(floors) + since
}

/** How long this payout streams: at least FEED, and at least one TICK per ticket. */
const feedDur = (tickets: number, floors: number): number =>
  Math.max(FEED, rideTime(floors), tickets * TICK)

export const ticket = definePiece<TicketState>({
  name: 'ticket',
  weight: 1.1,
  finale: true,
  place: ({ rng, color, fits, taste, earned }) => {
    // With no run behind it, what a run might have earned.
    const points = earned > 0 ? earned : 300 + 50 * rng.fork('points').int(0, 26)
    const tickets = ticketsFor(points)
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
      return { cells, exit: { at: exit, dir: turn }, lane, state: { color, floors, turn, points, tickets } }
    }
    return null
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    const { floors, turn } = s
    const clock = feedClock(floors, t, since)
    const dur = feedDur(s.tickets, floors)
    const fed = dur <= 0 ? 1 : Math.max(0, Math.min(1, clock / dur))
    // Keep whirring for the whole stream, including after the ball has left for the portal.
    const whir = fed > 0 && fed < 1
    // The payout: a ticket for every hundred, streaming out through the exit, staying after.
    const tickets = Math.round(fed * s.tickets)
    const left = tickets >= s.tickets ? 0 : Math.max(0, s.points - tickets * PER_TICKET)
    const shake = whir ? 0.008 * Math.sin(t * 50) : 0

    rail(p, k, ink, weight, -0.5, EDGE)
    rail(p, k, ink, weight, turn * 0.22, turn * 0.5, floors + FLOOR)
    p.push()
    p.translate(shake * k, 0)
    // The cabinet: from a marquee above the hopper down to the floor of the lowest cell.
    cabinet(p, k, ink, weight, s.color, 0, -0.42, floors + 0.5, W)
    // The hopper: a funnel in the top, on the lane's side, wide enough for the ball.
    solid(p, ink, weight, bg)
    funnel(p, k)
    // The marquee along the top, on a dark band let into the cabinet so its lamps read against it, chasing while it whirs.
    marquee(p, k, ink, weight, s.color, bg, -0.22, 0.22, -0.35, 5, t, whir, 0.09)
    // The display: the points the run earned, counting down as they are paid out. Dark until the ball is in.
    display(p, k, ink, weight, bg, 0, 0.42, 0.36, 0.14, String(left).padStart(4, '0'), s.color, whir || since > 0, 0.018)
    // The ticket slot beside the chute, on the other side.
    solid(p, ink, weight, ink)
    p.rect(-turn * 0.12 * k, (floors + 0.06) * k, 0.16 * k, 0.04 * k)
    p.pop()
    // The tickets: one strip out of the slot, a perforation every ticket, growing without a floor cap so a long
    // payout piles up and spills off the bottom of the frame while the ball rolls into the portal.
    if (tickets > 0) {
      const x = -turn * 0.12
      const y0 = floors + 0.1
      const h = tickets * PITCH
      solid(p, ink, weight * 0.7, bg)
      p.rect(x * k, (y0 + h / 2) * k, 0.14 * k, h * k, 0.005 * k)
      outline(p, ink, weight * 0.7)
      // Perforations for the visible span (cap the loop so a long spill stays cheap to draw).
      const yMax = y0 + Math.min(h, 8) - 0.02
      for (let y = y0 + PITCH; y < yMax; y += PITCH) {
        p.line((x - 0.05) * k, y * k, (x - 0.02) * k, y * k)
        p.line((x + 0.02) * k, y * k, (x + 0.05) * k, y * k)
      }
    }
  },
  // What the points came to, over the marquee as the last ticket lands: on the cabinet's own face it was the cabinet's colour.
  scores: (p, s, { k, since, bg }) => {
    const spill = Math.max(0, feedDur(s.tickets, s.floors) - afterTip(s.floors))
    return score(p, k, s.color, bg, 0, -0.3, `x${s.tickets}`, since - spill, 1.4)
  },
  over: (p, s, { k, t, since, ink, weight, bg }) => {
    const { floors, turn } = s
    const clock = feedClock(floors, t, since)
    const fed = Math.max(0, Math.min(1, clock / feedDur(s.tickets, floors)))
    const whir = fed > 0 && fed < 1
    const shake = whir ? 0.008 * Math.sin(t * 50) : 0
    p.push()
    p.translate(shake * k, 0)
    // The cabinet's face below the rail's level round the hopper, in front of the ball: what of the ball is
    // under the sill, past the funnel's wall or down its throat is inside the cabinet, and the rest sinks into
    // the dark of the throat, so the ball goes down it rather than blinking out whole in the funnel.
    const sill = wallAt(FLOOR)
    const foot = THROAT_Y + 0.08
    p.noStroke()
    p.fill(s.color)
    p.beginShape()
    for (const [x, y] of [[-W / 2, FLOOR], [sill, FLOOR], FUNNEL[3], [W / 2, THROAT_Y], [W / 2, foot], [-W / 2, foot]]) p.vertex(x * k, y * k)
    p.endShape(p.CLOSE)
    const gone = T_EDGE + TIP
    if (t > gone - SINK && t < gone) {
      // The dark, short of the mouth's and the far wall's lines, which stay as they are.
      const d = weight / 2 / k
      const dark = p.color(bg)
      dark.setAlpha(255 * over(t, gone - SINK, gone))
      p.fill(dark)
      p.quad(wallAt(MOUTH_Y + d) * k, (MOUTH_Y + d) * k, (FUNNEL[1][0] - d) * k, (MOUTH_Y + d) * k, (FUNNEL[2][0] - d) * k, THROAT_Y * k, FUNNEL[3][0] * k, THROAT_Y * k)
    }
    // The lines the face was laid over: the sill, the funnel's wall and throat, and the cabinet's sides.
    outline(p, ink, weight)
    p.line((-W / 2) * k, FLOOR * k, sill * k, FLOOR * k)
    p.line(sill * k, FLOOR * k, FUNNEL[3][0] * k, THROAT_Y * k)
    p.line(FUNNEL[3][0] * k, THROAT_Y * k, FUNNEL[2][0] * k, THROAT_Y * k)
    p.line((-W / 2) * k, FLOOR * k, (-W / 2) * k, foot * k)
    p.line((W / 2) * k, THROAT_Y * k, (W / 2) * k, foot * k)
    // The prize chute: a hood on the cabinet's side at its foot, open underneath, in front of the ball.
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

/** The hopper's funnel, in whatever stroke and fill are set. */
function funnel(p: p5, k: number): void {
  p.quad(FUNNEL[0][0] * k, FUNNEL[0][1] * k, FUNNEL[1][0] * k, FUNNEL[1][1] * k, FUNNEL[2][0] * k, FUNNEL[2][1] * k, FUNNEL[3][0] * k, FUNNEL[3][1] * k)
}
