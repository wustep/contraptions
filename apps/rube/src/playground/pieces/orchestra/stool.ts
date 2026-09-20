import { outline, solid } from '../../../../../../src/core/draw'
import { easeInOutSine } from '../../../../../../src/core/ease'
import { FLOOR, ROLL, arrive, arriveAt, definePiece, over, rail, ramp, rankBy, trace, type Lane, type Pt } from '../../../parts'
import { brass, feltColor } from './hall'
import { onBoard, rollOff, shelf } from './parts-d'

/**
 * A piano stool, the kind that winds. A round buttoned seat on a brass
 * screw, in a turned column on three legs that stand on the floor below,
 * wound right down so the seat is level with the rail. The ball rolls onto
 * the seat and stops in the dimple at its middle, the cushion giving under
 * it; the seat starts to turn, slowly and then fast, and winds itself up
 * its screw a whole floor with the ball on its axis, the studs round its
 * edge going by and the screw coming up out of the column. At the top of
 * its thread the seat, high on a long screw, rocks: back a little, then
 * over toward the rail up there, and the ball rolls out of the dimple and
 * off the seat's edge onto it, on or back. The seat rocks itself still and
 * stays up.
 *
 * A screw through a fixed nut: the seat's height is its turns, so it spins
 * only while it climbs, and the threads stand still in the air as the screw
 * comes up through them. The rock and the roll off are one motion
 * (`rollOff`), which the lane traces and the seat is drawn from.
 */
export interface StoolState {
  color: string
  turn: 1 | -1
}

/** The seat: its half width, the cushion's thickness, and the plate under it. */
const SEAT = 0.27
const CUSHION = 0.11
const PLATE = 0.03
/** The column's top, where the nut is. */
const HUB = 0.34
/** How far the cushion gives under the ball, and how long it takes. */
const GIVE = 0.012
const SINK = 0.1
/** The last rock, toward the rail; the little one before it, away. */
const LEAN = 0.17
const BACK = 0.05
/** The seat's top is level with the rail a floor up at the edge it tips: so its middle stands this much over. */
const RISE = 1 + SEAT * Math.sin(LEAN)
/** Turns of the screw to the top, and how long the winding takes. */
const TURNS = 4
const WIND = 1.3
const STUDS = 5

const T_STOP = arriveAt(0)
const T_WIND = T_STOP + SINK
const T_TOP = T_WIND + WIND

/** The rock at the top: back a little, then over; the ball holds in the dimple through the first and goes with the second. */
const lean = (tau: number) => (tau < 0.16 ? -BACK * Math.sin((Math.PI * tau) / 0.16) : LEAN * easeInOutSine(over(tau, 0.16, 0.46)))
const OFF = rollOff(SEAT, lean)
const T_OFF = T_TOP + OFF.dur

/** How far the seat has wound up, 0 to 1. */
const wound = (t: number) => easeInOutSine(over(t, T_WIND, T_TOP))
/** The height of the middle of the seat's top. */
const seatY = (t: number) => FLOOR + GIVE * over(t, T_STOP, T_WIND) * (1 - wound(t)) - RISE * wound(t)
/** The seat's lean: the rock, and after the ball has gone a rocking that dies. */
function leanAt(t: number): number {
  if (t <= T_TOP) return 0
  if (t <= T_OFF) return lean(t - T_TOP)
  const s = t - T_OFF
  return lean(OFF.dur) * Math.exp(-2.4 * s) * Math.cos(9 * s)
}
const ballAt = (turn: 1 | -1) => (t: number): Pt => onBoard([0, seatY(t)], leanAt(t), t > T_TOP ? OFF.along(t - T_TOP) : 0, turn)

function laneFor(turn: 1 | -1): Lane {
  const at = ballAt(turn)
  const end = at(T_OFF)
  return {
    segs: [
      ...arrive([-0.5, 0], [0, 0]),
      ...trace(at, T_STOP, T_TOP, 36),
      ...trace(at, T_TOP, T_OFF, 24),
      ramp(end, [turn * 0.5, -1], OFF.pace, ROLL),
    ],
    fire: T_WIND,
  }
}
const LANES = { on: laneFor(1), back: laneFor(-1) }

export const stool = definePiece<StoolState>({
  name: 'stool',
  weight: 0.9,
  place: ({ rng, color, fits, theme, ball }) => {
    for (const turn of rankBy(rng, [1, -1] as const, () => 1)) {
      // The legs stand on the floor below, so the screw has a column to come up out of.
      const cells: Pt[] = [
        [0, 1],
        [0, 0],
        [0, -1],
      ]
      const exit: Pt = [turn, -1]
      if (!fits(cells, exit)) continue
      return { cells, exit: { at: exit, dir: turn }, lane: turn > 0 ? LANES.on : LANES.back, state: { color: feltColor(theme, color, ball.color), turn } }
    }
    return null
  },
  draw: (p, s, { k, t, ink, bg, weight, theme }) => {
    const y = seatY(t)
    const a = s.turn * leanAt(t)
    const spin = wound(t) * TURNS * Math.PI * 2
    const gold = brass(theme)

    rail(p, k, ink, weight, -0.5, -SEAT - 0.01)
    shelf(p, k, ink, weight, s.turn, SEAT + 0.02, 1)

    // The legs: two splayed to either side and one toward us, from the column's foot to the floor below.
    const foot = 1.5
    solid(p, ink, weight, bg)
    for (const side of [-1, 1]) {
      p.beginShape()
      p.vertex(side * 0.03 * k, 1.0 * k)
      p.quadraticVertex(side * 0.1 * k, 1.12 * k, side * 0.3 * k, (foot - 0.06) * k)
      p.vertex(side * 0.33 * k, foot * k)
      p.vertex(side * 0.24 * k, foot * k)
      p.quadraticVertex(side * 0.08 * k, 1.27 * k, side * 0.03 * k, 1.22 * k)
      p.endShape(p.CLOSE)
    }
    p.rect(0, 1.36 * k, 0.07 * k, 0.28 * k, 0.02 * k)
    // The column, turned, with the nut in its top.
    p.rect(0, ((HUB + 1.24) / 2) * k, 0.12 * k, (1.24 - HUB) * k, 0.02 * k)
    p.ellipse(0, 0.84 * k, 0.2 * k, 0.36 * k)
    // The screw, up out of the nut to the seat: its threads stand still as it comes through them.
    const under = y + CUSHION + PLATE
    if (under < HUB - 0.01) {
      solid(p, ink, weight, gold)
      p.rect(0, ((under + HUB) / 2) * k, 0.075 * k, (HUB - under) * k)
      outline(p, ink, weight * 0.7)
      for (let ty = HUB - 0.06; ty > under + 0.04; ty -= 0.08) p.line(-0.0375 * k, (ty + 0.016) * k, 0.0375 * k, (ty - 0.016) * k)
    }
    solid(p, ink, weight, gold)
    p.rect(0, (HUB + 0.025) * k, 0.18 * k, 0.05 * k, 0.012 * k)

    // The seat on the screw's head: a plate, a cushion, and the studs round its edge going by as it turns.
    p.push()
    p.translate(0, y * k)
    p.rotate(a)
    solid(p, ink, weight, bg)
    p.rect(0, (CUSHION + PLATE / 2) * k, (SEAT * 2 - 0.06) * k, PLATE * k)
    solid(p, ink, weight, s.color)
    p.rect(0, (CUSHION / 2) * k, SEAT * 2 * k, CUSHION * k, 0.05 * k)
    p.noStroke()
    p.fill(ink)
    for (let i = 0; i < STUDS; i++) {
      const at = spin + (i * Math.PI * 2) / STUDS
      if (Math.cos(at) > 0.15) p.circle(Math.sin(at) * (SEAT - 0.03) * k, (CUSHION / 2) * k, 0.03 * k)
    }
    p.pop()
  },
})
