import type p5 from 'p5'
import { coil, outline, solid } from '../../../../../src/core/draw'
import { clamp, lerp } from '../../../../../src/core/ease'
import { FLOOR, R, ROLL, arrive, arriveAt, definePiece, fly, laneAt, over, post, rail, ramp, segTime, trace, wait, type Lane, type Pt } from '../../parts'
import { display, flash, glow, score } from './neon'

/**
 * Arcade basketball. The rail ends at the cup on the tip of a sprung arm,
 * held down on a catch; the ball rolls into the cup and its weight slips
 * the catch; the spring on the arm's tail snaps it round its pivot and the
 * cup throws the ball the way it was moving when it let go — a high lob
 * over the top of two cells and down through the rim. The net takes the
 * pace off it, bulging round it as it goes through, and lets it drop onto
 * the return ramp, which runs it out under the backboard. The rim lights,
 * the board over the backboard goes to 2, and the net swings a while.
 *
 * The throw is one motion: the cup's swing about the pivot is what the lane
 * traces, and the flight leaves it along the swing's own tangent at the
 * swing's own pace, with the height and the distance following from that.
 */
const SEAT: Pt = [-0.12, 0.02]
const PIVOT: Pt = [0.16, 0]
/** The ball's seat from the pivot: it swings about the pivot with the arm. */
const ARM: Pt = [SEAT[0] - PIVOT[0], SEAT[1] - PIVOT[1]]
const REACH = Math.hypot(ARM[0], ARM[1])
/** How far round the arm has swung when the ball leaves the cup, and where it stops. */
const LET_GO = 0.47
const STOP = LET_GO + 0.4
/** The rim's centre and half its width; the net's length and the half-width of its foot. */
const RIM: Pt = [1.05, -0.5]
const RIM_HALF = 0.17
const NET = 0.27
const NET_HALF = 0.115
/** The arm's tail, past the pivot, that the spring pulls down. */
const TAIL = 0.18
/** Show gravity for the lob. */
const G = 12

const turned = (v: Pt, a: number): Pt => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a)]
/** Where the ball leaves the cup, and the way it is going: along the swing's tangent. */
const OFF: Pt = (() => {
  const v = turned(ARM, LET_GO)
  return [PIVOT[0] + v[0], PIVOT[1] + v[1]]
})()
const AIM: Pt = (() => {
  const v = turned(ARM, LET_GO + Math.PI / 2)
  return [v[0] / REACH, v[1] / REACH]
})()
/** The pace that carries it from the cup through the rim, a touch short of the rim's middle since it is still travelling. */
const THROUGH: Pt = [RIM[0] - 0.045, RIM[1]]
const V_OFF = (() => {
  const dx = THROUGH[0] - OFF[0]
  const dy = THROUGH[1] - OFF[1]
  return Math.sqrt((G * dx * dx) / (2 * AIM[0] * AIM[0] * (dy - (AIM[1] * dx) / AIM[0])))
})()
/** The flight runs on into the net, to where the net has it. */
const CAUGHT_Y = RIM[1] + 0.2
const FLIGHT = (-AIM[1] * V_OFF + Math.sqrt(AIM[1] * AIM[1] * V_OFF * V_OFF + 2 * G * (CAUGHT_Y - OFF[1]))) / G
const CAUGHT: Pt = [OFF[0] + AIM[0] * V_OFF * FLIGHT, CAUGHT_Y]
const LOB = (G * FLIGHT * FLIGHT) / 8
const V_IN: Pt = [AIM[0] * V_OFF, AIM[1] * V_OFF + G * FLIGHT]
const T_RIM_IN_FLIGHT = (THROUGH[0] - OFF[0]) / (AIM[0] * V_OFF)
/** The net checks it over a short way, along the way it was going. */
const CHECK = 0.07
const V_NET = 1.1
const SLACK: Pt = (() => {
  const v = Math.hypot(V_IN[0], V_IN[1])
  return [CAUGHT[0] + (V_IN[0] / v) * CHECK, CAUGHT[1] + (V_IN[1] / v) * CHECK]
})()
/** The return ramp: from under the near side of the net down to the rail, under the backboard. */
const RAMP_TOP: Pt = [0.86, -0.02]
const RAMP_FOOT: Pt = [1.42, FLOOR]
const SLOPE = (RAMP_FOOT[1] - RAMP_TOP[1]) / (RAMP_FOOT[0] - RAMP_TOP[0])
const OFFSET = R * Math.sqrt(1 + SLOPE * SLOPE)
const onRamp = (x: number): Pt => [x, RAMP_TOP[1] + (x - RAMP_TOP[0]) * SLOPE - OFFSET]
const LAND = onRamp(SLACK[0] + 0.02)
const RUN_OUT: Pt = [RAMP_TOP[0] + (OFFSET - RAMP_TOP[1]) / SLOPE, 0]
const V_LAND = 1.3
const V_FOOT = 2.3

const ARRIVE = arriveAt(SEAT[0])
const CATCH = 0.24
const T_SNAP = ARRIVE + CATCH
/** The swing quickens all the way round, so the cup's pace as the ball leaves is twice its mean. */
const SNAP = (2 * LET_GO * REACH) / V_OFF
const T_OFF = T_SNAP + SNAP
const T_RIM = T_OFF + T_RIM_IN_FLIGHT

/** How far round the arm is at `t`. */
function swung(t: number): number {
  if (t < T_SNAP) return 0
  if (t < T_OFF) return LET_GO * Math.pow((t - T_SNAP) / SNAP, 2)
  // On to the stop at the pace it had, and a judder against it.
  const s = t - T_OFF
  const reach = (STOP - LET_GO) / ((2 * LET_GO) / SNAP)
  if (s < reach) return LET_GO + (STOP - LET_GO) * (s / reach)
  return STOP - 0.1 * Math.abs(Math.sin((s - reach) * 22)) * Math.exp(-(s - reach) * 7)
}
const cupAt = (t: number): Pt => {
  const v = turned(ARM, swung(t))
  return [PIVOT[0] + v[0], PIVOT[1] + v[1]]
}

const LANE: Lane = {
  segs: [
    ...arrive([-0.5, 0], SEAT),
    wait(SEAT, CATCH),
    ...trace(cupAt, T_SNAP, T_OFF, 10),
    fly(OFF, CAUGHT, FLIGHT, LOB),
    ramp(CAUGHT, SLACK, Math.hypot(V_IN[0], V_IN[1]), V_NET),
    ramp(SLACK, LAND, V_NET, V_NET + 1.2),
    ramp(LAND, RUN_OUT, V_LAND, V_FOOT),
    ramp(RUN_OUT, [1.5, 0], V_FOOT, ROLL),
  ],
  fire: T_RIM,
}
const T_OUT = segTime(LANE.segs.slice(0, LANE.segs.length - 2))

/** The net's two sides at height `y`, swaying by `sway` at its foot, and bulged round a ball at (bx, by). */
function netAt(y: number, sway: number, bx: number, by: number): [number, number] {
  const f = clamp((y - RIM[1]) / NET)
  const half = lerp(RIM_HALF - 0.01, NET_HALF, Math.pow(f, 0.8))
  const cx = RIM[0] + sway * f * f
  let left = cx - half
  let right = cx + half
  const dy = Math.abs(y - by)
  const room = R + 0.025
  if (dy < room) {
    const c = Math.sqrt(room * room - dy * dy)
    left = Math.min(left, bx - c)
    right = Math.max(right, bx + c)
  }
  return [left, right]
}

function net(p: p5, k: number, ink: string, weight: number, sway: number, bx: number, by: number): void {
  outline(p, ink, weight * 0.6)
  const rows = 9
  for (const u of [0, 0.33, 0.67, 1]) {
    p.beginShape()
    for (let j = 0; j <= rows; j++) {
      const y = RIM[1] + (NET * j) / rows
      const [l, r] = netAt(y, sway, bx, by)
      p.vertex(lerp(l, r, u) * k, y * k)
    }
    p.endShape()
  }
  for (const f of [0.36, 0.7, 1]) {
    const y = RIM[1] + NET * f
    const [l, r] = netAt(y, sway, bx, by)
    p.line(l * k, y * k, r * k, y * k)
  }
}

export const hoops = definePiece<{ color: string }>({
  name: 'hoops',
  weight: 0.9,
  flight: true,
  place: ({ color, fits }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
      [0, -1],
      [1, -1],
    ]
    if (!fits(cells, [2, 0])) return null
    return { cells, exit: { at: [2, 0], dir: 1 }, lane: LANE, state: { color } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    const a = swung(t)
    const made = since > 0 ? 1 - over(since, 1.6, 2.6) : 0
    // The arm trembles on its catch once the ball is in the cup.
    const tremble = t > ARRIVE && t < T_SNAP ? 0.012 * Math.sin(t * 70) * over(t, ARRIVE, T_SNAP) : 0

    // The rail to the cup, the return ramp and the rail on; the backboard's post behind them.
    rail(p, k, ink, weight, -0.5, SEAT[0] - R - 0.04)
    post(p, k, ink, weight, SEAT[0] - R - 0.08, FLOOR, 0.5)
    post(p, k, ink, weight, 1.3, -1.12, 0.5)
    rail(p, k, ink, weight, RAMP_FOOT[0], 1.5)
    solid(p, ink, weight, s.color)
    p.triangle(RAMP_TOP[0] * k, RAMP_TOP[1] * k, RAMP_FOOT[0] * k, RAMP_FOOT[1] * k, RAMP_TOP[0] * k, RAMP_FOOT[1] * k)
    outline(p, ink, weight)
    p.line(RAMP_TOP[0] * k, RAMP_FOOT[1] * k, RAMP_TOP[0] * k, 0.5 * k)
    p.line((RAMP_TOP[0] - 0.06) * k, 0.5 * k, (RAMP_TOP[0] + 0.06) * k, 0.5 * k)

    // The backboard, edge on, with the rim's bracket; and the board over it: a dim 0 that lights to 2.
    solid(p, ink, weight, s.color)
    p.rect(1.27 * k, -0.74 * k, 0.08 * k, 0.62 * k, 0.02 * k)
    outline(p, ink, weight)
    p.line((RIM[0] + RIM_HALF) * k, RIM[1] * k, 1.23 * k, RIM[1] * k)
    p.line((RIM[0] + RIM_HALF) * k, RIM[1] * k, 1.23 * k, (RIM[1] + 0.1) * k)
    glow(p, k, s.color, 1.22, -1.24, 0.17, made)
    display(p, k, ink, weight, bg, 1.22, -1.24, 0.3, 0.17, since > 0 ? '2' : '0', s.color, since > 0)
    // The rim's far half, behind the ball: a lit ring when the shot is made.
    glow(p, k, s.color, RIM[0], RIM[1], 0.2, made)
    p.push()
    p.noFill()
    p.stroke(made > 0.5 ? s.color : ink)
    p.strokeWeight(weight * 1.2)
    p.arc(RIM[0] * k, RIM[1] * k, RIM_HALF * 2 * k, 0.09 * k, Math.PI, Math.PI * 2)
    p.pop()

    // The thrower. The catch on the rail's end post: a hook over the cup's lip, dropped open by the ball's weight.
    const open = t < T_SNAP - 0.03 ? 0 : 1.2 * over(t, T_SNAP - 0.03, T_SNAP + 0.03)
    p.push()
    p.translate((SEAT[0] - R - 0.08) * k, (FLOOR + 0.1) * k)
    p.rotate(open)
    outline(p, ink, weight * 1.1)
    p.line(0, 0, 0.06 * k, -0.07 * k)
    p.line(0.06 * k, -0.07 * k, 0.085 * k, -0.04 * k)
    p.pop()
    // The pivot's post, the spring from the arm's tail to the ground, and the stop the tail comes down on.
    post(p, k, ink, weight, PIVOT[0], PIVOT[1], 0.5)
    const tail = turned([TAIL, 0], a + tremble)
    outline(p, ink, weight * 0.75)
    coil(p, (PIVOT[0] + tail[0]) * k, (PIVOT[1] + tail[1]) * k, 0.36 * k, 0.48 * k, 5, 0.04 * k)
    outline(p, ink, weight)
    p.line(0.3 * k, 0.5 * k, 0.42 * k, 0.5 * k)
    // The stop: a peg on a strut off the post, where the tail comes down.
    const peg = turned([0.11, 0.035], STOP)
    outline(p, ink, weight)
    p.line(PIVOT[0] * k, (PIVOT[1] + 0.22) * k, (PIVOT[0] + peg[0]) * k, (PIVOT[1] + peg[1]) * k)
    solid(p, ink, weight, ink)
    p.circle((PIVOT[0] + peg[0]) * k, (PIVOT[1] + peg[1]) * k, 0.035 * k)
    // The arm, a spoon: the tail, the pivot, the handle out to the bowl the ball sits in.
    p.push()
    p.translate(PIVOT[0] * k, PIVOT[1] * k)
    p.rotate(a + tremble)
    outline(p, ink, weight * 1.5)
    p.line(TAIL * k, 0, (ARM[0] + R + 0.02) * k, (ARM[1] + 0.06) * k)
    solid(p, ink, weight, s.color)
    p.arc(ARM[0] * k, (ARM[1] + 0.03) * k, (R * 2 + 0.07) * k, (R * 2 + 0.03) * k, 0.1 * Math.PI, 0.9 * Math.PI, p.CHORD)
    p.pop()
    solid(p, ink, weight, bg)
    p.circle(PIVOT[0] * k, PIVOT[1] * k, 0.055 * k)

    // The throw, and the shot.
    flash(p, k, s.color, weight, OFF[0], OFF[1], t - T_OFF, 0.18, 0.12, 0.26)
    flash(p, k, s.color, weight, RIM[0], RIM[1], since, 0.25, 0.16, 0.3)
  },
  scores: (p, s, { k, since, bg }) => score(p, k, s.color, bg, RIM[0] - 0.05, RIM[1] - 0.12, '+2', since, 0.9),
  over: (p, s, { k, t, since, ink, weight }) => {
    // In front of the ball: the net it goes through, and the rim's near half.
    const ball = laneAt(LANE, t)
    const inNet = t > T_OFF && Math.abs(ball.x - RIM[0]) < RIM_HALF + R
    const left = t - T_OUT
    const sway = left > 0 ? 0.05 * Math.sin(left * 9) * Math.exp(-left * 1.8) : 0
    net(p, k, ink, weight, sway, inNet ? ball.x : -9, inNet ? ball.y : -9)
    const made = since > 0 ? 1 - over(since, 1.6, 2.6) : 0
    p.push()
    p.noFill()
    p.stroke(made > 0.5 ? s.color : ink)
    p.strokeWeight(weight * 1.2)
    p.arc(RIM[0] * k, RIM[1] * k, RIM_HALF * 2 * k, 0.09 * k, 0, Math.PI)
    p.pop()
  },
})
