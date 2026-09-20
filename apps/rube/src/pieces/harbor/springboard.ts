import { solid } from '../../../../../src/core/draw'
import { easeOutSine } from '../../../../../src/core/ease'
import { FLOOR, ROLL, definePiece, fly, over, rail, ramp, roll, trace, type Lane, type Pt } from '../../parts'
import { WATER, bodyColor, bubbles, piling, seaWater, splash, water } from './sea'

/**
 * A springboard. Where the deck stops a diving board stands out over the
 * water, clamped at its root and resting on a fulcrum at the deck's end.
 * The ball rolls out along it and the board bends under it, more the
 * further out it gets; at the tip the board dips deep and springs, and
 * throws the ball up in a high arc out over two cells of open sea. It
 * goes in with a splash and is gone; bubbles come up where it went down;
 * and it pops up out of the water at the far pier with a second splash
 * onto the deck, and rolls on. The board rings on after it, tip up, tip
 * down, dying away.
 *
 * The board's sag is one function of time, and the ball's lane along the
 * board is sampled from it, so the ball rides the plank down and up.
 */
/** The near deck, the board's root on it, the fulcrum it rests on, and its tip. */
const WEST = -0.15
const ROOT = -0.24
const FULCRUM = 0.0
const TIP = 0.45
/** How far the tip sags under the ball at the end, and how much deeper it dips before the spring. */
const SAG = 0.13
const DIP = 1.5
/** The far pier. */
const EAST = 2.15
/** Where the ball goes in, and where it comes up. */
const IN: Pt = [1.72, WATER - 0.01]
const UP: Pt = [2.02, WATER]
const LAND: Pt = [EAST + 0.15, 0]

/** Onto the board at the fulcrum; out to the tip, slowing; the dip; the spring; the flight; under; the pop. */
const V_TIP = 1.2
const T_ROOT = (FULCRUM + 0.5) / ROLL
const T_TIP = T_ROOT + (TIP - 0.02 - FULCRUM) / ((ROLL + V_TIP) / 2)
const T_LOW = T_TIP + 0.12
const FIRE = T_LOW + 0.14
const FLIGHT = 0.62
const LOFT = 0.62
const T_IN = FIRE + FLIGHT
const UNDER = 0.5
const T_UP = T_IN + UNDER
const POP = 0.3

/** Where the ball is along the board while it is on it. */
const xOn = (t: number) => (t < T_TIP ? FULCRUM + (TIP - 0.02 - FULCRUM) * (1 - Math.pow(1 - over(t, T_ROOT, T_TIP), 2) * (1 - (V_TIP / ROLL) * over(t, T_ROOT, T_TIP))) : TIP - 0.02)
/** The tip's sag: growing as the ball rolls out, deeper at the tip, sprung up through level, and ringing down after. */
function sagAt(t: number): number {
  if (t < T_ROOT) return 0
  if (t < T_TIP) return SAG * Math.pow((xOn(t) - FULCRUM) / (TIP - FULCRUM), 2)
  if (t < T_LOW) return SAG * (1 + (DIP - 1) * easeOutSine(over(t, T_TIP, T_LOW)))
  if (t < FIRE) return SAG * DIP * Math.cos((Math.PI / 2) * over(t, T_LOW, FIRE))
  const s = t - FIRE
  return -0.5 * SAG * Math.sin(s * 14) * Math.exp(-s * 2.6)
}
/** The board's top at `x`: level to the fulcrum, bending beyond it. */
const boardY = (x: number, t: number) => FLOOR + (x <= FULCRUM ? 0 : sagAt(t) * Math.pow((x - FULCRUM) / (TIP - FULCRUM), 2))
/** The ball on the board: on its top, a radius up. */
const onBoard = (t: number): Pt => [xOn(t), boardY(xOn(t), t) - FLOOR]

const RIDE = [...trace(onBoard, T_ROOT, T_TIP, 10), ...trace(onBoard, T_TIP, FIRE, 8)]
const OFF = RIDE[RIDE.length - 1].to
const LANE: Lane = {
  segs: [
    roll([-0.5, 0], [FULCRUM, 0], ROLL),
    ...RIDE,
    fly(OFF, IN, FLIGHT, LOFT),
    { from: IN, to: [IN[0] + 0.12, 0.47], dur: UNDER * 0.5, hidden: true },
    { from: [IN[0] + 0.12, 0.47], to: UP, dur: UNDER * 0.5, hidden: true },
    fly(UP, LAND, POP, 0.3),
    fly(LAND, [LAND[0] + 0.06, 0], 0.05, 0.012),
    ramp([LAND[0] + 0.06, 0], [2.5, 0], 1.8, ROLL),
  ],
  fire: FIRE,
}

export const springboard = definePiece<{ color: string }>({
  name: 'springboard',
  weight: 1,
  flight: true,
  place: ({ color, fits, theme, ball }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
      [2, 0],
    ]
    if (!fits(cells, [3, 0])) return null
    return { cells, exit: { at: [3, 0], dir: 1 }, lane: LANE, state: { color: bodyColor(theme, color, ball.color) } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight, theme }) => {
    const sea = seaWater(theme)

    // The piers either side, and the sea between.
    rail(p, k, ink, weight, -0.5, WEST)
    rail(p, k, ink, weight, EAST, 2.5)
    piling(p, k, ink, weight, -0.36)
    piling(p, k, ink, weight, 2.38)
    // The fulcrum: a block on a piling at the deck's end, that the board rests on.
    piling(p, k, ink, weight, FULCRUM, FLOOR + 0.06)
    solid(p, ink, weight, bg)
    p.rect(FULCRUM * k, (FLOOR + 0.075) * k, 0.1 * k, 0.06 * k)

    // The board: a plank from its root on the deck, over the fulcrum, out to the tip, bent by however far it sags.
    const n = 16
    solid(p, ink, weight, s.color)
    p.beginShape()
    for (let i = 0; i <= n; i++) {
      const x = ROOT + ((TIP - ROOT) * i) / n
      p.vertex(x * k, boardY(x, t) * k)
    }
    for (let i = n; i >= 0; i--) {
      const x = ROOT + ((TIP - ROOT) * i) / n
      p.vertex(x * k, (boardY(x, t) + 0.045) * k)
    }
    p.endShape(p.CLOSE)
    // The clamp over the root.
    solid(p, ink, weight, ink)
    p.rect((ROOT + 0.04) * k, (FLOOR + 0.02) * k, 0.05 * k, 0.09 * k)

    // The sea, and what the ball does to it: in with a splash, bubbles from where it went down, up with another.
    water(p, k, ink, weight, -0.5, 2.5)
    splash(p, k, sea, weight, IN[0] + 0.02, WATER, over(t, T_IN, T_IN + 0.55), 1.3)
    if (t > T_IN + 0.1 && t < T_UP + 0.1) bubbles(p, k, ink, weight, bg, IN[0] + 0.14, 0.48, WATER - 0.02, t - T_IN - 0.1, 4)
    splash(p, k, sea, weight, UP[0], WATER, over(t, T_UP - 0.02, T_UP + 0.5), 0.9)
    // The spring: a twang of lines under the tip as it lets go.
    if (since > 0 && since < 0.2) {
      const f = since / 0.2
      p.push()
      p.stroke(ink)
      p.strokeWeight(weight * (1 - f))
      for (const a of [0.9, 1.35, 1.8]) {
        const r0 = 0.08 + 0.1 * f
        p.line((TIP - 0.06 + Math.cos(a) * r0) * k, (FLOOR + 0.05 + Math.sin(a) * r0) * k, (TIP - 0.06 + Math.cos(a) * (r0 + 0.07)) * k, (FLOOR + 0.05 + Math.sin(a) * (r0 + 0.07)) * k)
      }
      p.pop()
    }
  },
})
