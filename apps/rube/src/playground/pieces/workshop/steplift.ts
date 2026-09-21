import type p5 from 'p5'
import { outline, solid } from '../../../../../../src/core/draw'
import { easeInOutSine } from '../../../../../../src/core/ease'
import { FLOOR, R, ROLL, definePiece, over, post, rail, ramp, roll, trace, type Lane, type Pt } from '../../../parts'

/**
 * A step lift, the marble run's way up. Five steps stand side by side, each
 * top a little ramp down to the next step's flank: two are fixed and three
 * are one comb on one sole, which a crank and a connecting rod raise and lower. The
 * ball rolls onto the comb's first step and rests against the fixed step's
 * flank; the switch it knocked over has started the wheel; the comb rises
 * till that step's top stands a hair over the fixed one's, and the ball
 * rolls across and rests against the comb's next step; the comb sinks till
 * that one is a hair under, and the ball rolls on to it; and so up, a stair
 * at a time, tick, tick, tick, onto the rail a floor above. The wheel makes
 * three turns, one a lift, and stops with the comb down.
 *
 * The comb's height is a slider-crank's, worked from the wheel's angle with
 * the rod's length held; the ball's lane is the top of whichever step is
 * under it, at every instant, so it rides the comb and never floats over it.
 */
/** The steps: how wide, where the first begins, how much each top falls across its width, and the hair a handing-over step stands proud by. */
const W = 0.26
const X0 = -0.32
const FALL = 0.025
const PROUD = 0.03
/** What the comb rises by: three lifts make the floor, and every handing-over gives a little back. */
const STROKE = (1 + 6 * PROUD + 5 * FALL) / 3
/** The far edge of step `j`, and its top there with the comb down, as the height of a ball's centre standing on it. */
const edge = (j: number) => X0 + (j + 1) * W
const topDown = (j: number) => (j + 1) * (PROUD + FALL) - Math.floor((j + 1) / 2) * STROKE
const moves = (j: number) => j % 2 === 0

/** The wheel, its crank, the rod, and where the rod takes hold of the comb's last step. */
const HUB: Pt = [1.24, 0.2]
const CRANK = STROKE / 2
const ROD = 0.492
const LUG_X = edge(4)
const lugAt = (turn: number) => HUB[1] + CRANK * Math.cos(turn) - Math.sqrt(ROD * ROD - (HUB[0] + CRANK * Math.sin(turn) - LUG_X) ** 2)
/** How far the comb is up, for the wheel's angle. */
const liftFor = (turn: number) => lugAt(0) - lugAt(turn)

/** The ball comes off the rail's end, down the first step's top to rest against the first flank; the wheel starts, and turns three times: run up, run, run down. */
const REST0: Pt = [edge(0) - R, topDown(0) - (FALL * R) / W]
const ARRIVE = (X0 + 0.5) / ROLL + Math.hypot(REST0[0] - X0, REST0[1]) / (ROLL / 2)
const START = ARRIVE + 0.1
const TURN = 0.7
const RATE = (2 * Math.PI) / TURN
const RUN_UP = 0.15
const TURNS = 3
const RUN_END = (TURNS * 2 * Math.PI) / RATE
function turnAt(t: number): number {
  const u = t - START
  if (u <= 0) return 0
  if (u < RUN_UP) return (RATE * u * u) / (2 * RUN_UP)
  if (u < RUN_END) return RATE * (u - RUN_UP / 2)
  const left = Math.max(0, RUN_END + RUN_UP - u)
  return TURNS * 2 * Math.PI - (RATE * left * left) / (2 * RUN_UP)
}
/** When the wheel is at dead centre `m`: up for odd, down for even. */
const deadCentre = (m: number) => START + (m * Math.PI) / RATE + RUN_UP / 2
/** A handing-over takes this long either side of its dead centre: while the comb is within the hair it stands proud by. */
const HAND = Math.acos(1 - (2 * PROUD) / STROKE) / RATE

/** The top of step `j` under a ball at `x`, `t` seconds in. */
const topAt = (j: number, x: number, t: number) => topDown(j) - (moves(j) ? liftFor(turnAt(t)) : 0) - (FALL * (edge(j) - x)) / W

/** Where the ball is from the moment it rests on the first step to the moment it is over the top rail's end. */
function ballAt(t: number): Pt {
  for (let j = 0; j < 5; j++) {
    const at = deadCentre(j + 1)
    if (t >= at + HAND) continue
    const rest = edge(j) - R
    if (t <= at - HAND) return [rest, topAt(j, rest, t)]
    // Across: from rest, over the edge at the dead centre, to rest against the next flank; its height eased from one top to the other as it goes over the edge.
    const x = rest + W * easeInOutSine((t - at + HAND) / (2 * HAND))
    const b = over(x, edge(j) - 0.05, edge(j) + 0.08)
    const next = j === 4 ? -1 : topAt(j + 1, x, t)
    return [x, topAt(j, x, t) * (1 - b * b * (3 - 2 * b)) + next * b * b * (3 - 2 * b)]
  }
  return [edge(4) + R, -1]
}

const LEAVE = deadCentre(5)
const LANE: Lane = (() => {
  const off = ballAt(LEAVE)
  // Over the last edge at the pace of every handing-over's middle, and down to a roll.
  const pace = (W * Math.PI) / (4 * HAND)
  return {
    segs: [roll([-0.5, 0], [X0, 0], ROLL), ramp([X0, 0], REST0, ROLL, 0), ...trace(ballAt, ARRIVE, LEAVE, 110), ramp(off, [1.5, -1], pace, ROLL)],
    fire: deadCentre(1),
  }
})()

/** One step: a column from its sloped top down to `foot`. */
function step(p: p5, k: number, j: number, top: number, foot: number): void {
  p.beginShape()
  p.vertex((edge(j) - W) * k, (top + FLOOR - FALL) * k)
  p.vertex(edge(j) * k, (top + FLOOR) * k)
  p.vertex(edge(j) * k, foot * k)
  p.vertex((edge(j) - W) * k, foot * k)
  p.endShape(p.CLOSE)
}

export const steplift = definePiece<{ color: string }>({
  name: 'steplift',
  weight: 0.8,
  place: ({ color, fits }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
      [0, -1],
      [1, -1],
    ]
    if (!fits(cells, [2, -1])) return null
    return { cells, exit: { at: [2, -1], dir: 1 }, lane: LANE, state: { color } }
  },
  draw: (p, s, { k, t, ink, bg, weight }) => {
    const turn = turnAt(t)
    const lift = liftFor(turn)
    const running = t > START && t < START + RUN_END + RUN_UP

    // The rail in, with the switch the ball knocks over; the rail out, on its post, an apron hung from its end for the ball to climb against.
    rail(p, k, ink, weight, -0.5, X0)
    post(p, k, ink, weight, -0.47)
    const T_SWITCH = (-0.41 + 0.5) / ROLL
    const thrown = running || t < T_SWITCH ? over(t, T_SWITCH - 0.04, T_SWITCH + 0.02) : 1 - over(t, START + RUN_END + RUN_UP, START + RUN_END + RUN_UP + 0.25)
    p.push()
    p.translate(-0.41 * k, (FLOOR - 0.02) * k)
    p.rotate(-0.6 + 1.5 * thrown)
    solid(p, ink, weight, s.color)
    p.rect(0, -0.06 * k, 0.03 * k, 0.12 * k)
    p.pop()
    rail(p, k, ink, weight, edge(4), 1.5, -1 + FLOOR)
    post(p, k, ink, weight, 1.42, -1 + FLOOR, -0.5)
    outline(p, ink, weight)
    p.line(edge(4) * k, (-1 + FLOOR) * k, edge(4) * k, -0.49 * k)

    // The comb: three steps of one length, behind the fixed ones, and the sole that makes them one, across the front of the lot.
    const sole = 0.47 - lift
    solid(p, ink, weight, s.color)
    for (const j of [0, 2, 4]) step(p, k, j, topDown(j) - lift, sole)
    // The fixed steps, down to the ground.
    solid(p, ink, weight, bg)
    for (const j of [1, 3]) step(p, k, j, topDown(j), 0.5)
    outline(p, ink, weight)
    p.line(X0 * k, sole * k, edge(4) * k, sole * k)
    p.line(edge(4) * k, 0.5 * k, (HUB[0] + 0.2) * k, 0.5 * k)

    // The wheel on its post, the crank pin, and the rod up to the lug on the comb's last step.
    const pin: Pt = [HUB[0] + CRANK * Math.sin(turn), HUB[1] + CRANK * Math.cos(turn)]
    outline(p, ink, weight)
    p.line(HUB[0] * k, HUB[1] * k, HUB[0] * k, 0.5 * k)
    solid(p, ink, weight, bg)
    p.circle(HUB[0] * k, HUB[1] * k, (CRANK + 0.035) * 2 * k)
    solid(p, ink, weight, running ? s.color : bg)
    p.circle(HUB[0] * k, HUB[1] * k, 0.07 * k)
    outline(p, ink, weight * 1.4)
    p.line(pin[0] * k, pin[1] * k, LUG_X * k, lugAt(turn) * k)
    solid(p, ink, weight, s.color)
    p.circle(pin[0] * k, pin[1] * k, 0.06 * k)
    p.circle(LUG_X * k, lugAt(turn) * k, 0.06 * k)
  },
})
