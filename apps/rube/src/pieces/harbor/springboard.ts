import { outline, solid } from '../../../../../src/core/draw'
import { easeOutSine } from '../../../../../src/core/ease'
import { FLOOR, R, ROLL, definePiece, fly, over, post, rail, ramp, roll, trace, type Lane, type Pt } from '../../parts'
import { WATER, bodyColor, piling, seaWater, seabed, splash, water } from './sea'

/**
 * A springboard. Where the deck stops a diving board stands out over the
 * water, bolted down at its root between two handrails and resting on a
 * roller at the deck's end. The ball rolls out along it and the board
 * bends under it, more the further out it gets; at the tip the board dips
 * deep and springs, and throws the ball up in a high dive out over the
 * open sea. It goes in with a splash and is gone, but not for long: a
 * slip runs down from the far pier into the water to the bed of the sea,
 * a string of bubbles runs along the surface to it, and the dive's own
 * pace brings the ball up the slip out of the water in a second splash,
 * slowing to the top, and over onto the deck. The board rings on after
 * it, tip up, tip down, dying away.
 *
 * The board's sag is one function of time, and the ball's lane along the
 * board is sampled from it, so the ball rides the plank down and up.
 */
/** The near deck, the board's root on it, the roller it rests on, and its tip. */
const WEST = -0.12
const ROOT = -0.34
const FULCRUM = 0.06
const TIP = 0.62
/** The plank is this thick; the handrail stands this high. */
const THICK = 0.065
const RAIL = -0.17
/** How far the tip sags under the ball at the end, and how much deeper it dips before the spring. */
const SAG = 0.13
const DIP = 1.5
/** The slip: from the far deck's end down to its foot on the bed of the sea. */
const EAST = 2.24
const FOOT: Pt = [1.72, 0.5]
const SLOPE = Math.atan2(FOOT[1] - FLOOR, EAST - FOOT[0])
/** The ball's centre on the slip, `y` down from the deck's line: a radius off the slope. */
const onSlip = (y: number): Pt => [EAST - R * Math.sin(SLOPE) - (y + R * Math.cos(SLOPE) - R) / Math.tan(SLOPE), y]
/** Where the ball goes in, and where on the slip it breaks the surface. */
const IN: Pt = [1.34, WATER - 0.01]
const UP = onSlip(WATER - 0.05)
const CREST = onSlip(R - R * Math.cos(SLOPE))

/** Onto the board at the roller; out to the tip, slowing; the dip; the spring; the dive; under; up the slip, slowing; over its crest. */
const V_TIP = 1
const T_ROOT = (FULCRUM + 0.5) / ROLL
const T_TIP = T_ROOT + (TIP - 0.02 - FULCRUM) / ((ROLL + V_TIP) / 2)
const T_LOW = T_TIP + 0.16
const FIRE = T_LOW + 0.16
const FLIGHT = 0.62
const LOFT = 0.62
const T_IN = FIRE + FLIGHT
const UNDER = 0.311
const T_UP = T_IN + UNDER
const V_UP = 3
const V_CREST = 1.2

/** Where the ball is along the board while it is on it: slowing evenly from the deck's pace to the tip's. */
const xOn = (t: number) => {
  const u = over(t, T_ROOT, T_TIP)
  return FULCRUM + (T_TIP - T_ROOT) * (ROLL * u - ((ROLL - V_TIP) * u * u) / 2)
}
/** The tip's sag: growing as the ball rolls out, deeper at the tip, sprung up through level, and ringing down after. */
function sagAt(t: number): number {
  if (t < T_ROOT) return 0
  if (t < T_TIP) return SAG * Math.pow((xOn(t) - FULCRUM) / (TIP - FULCRUM), 2)
  if (t < T_LOW) return SAG * (1 + (DIP - 1) * easeOutSine(over(t, T_TIP, T_LOW)))
  if (t < FIRE) return SAG * DIP * Math.cos((Math.PI / 2) * over(t, T_LOW, FIRE))
  const s = t - FIRE
  return -0.5 * SAG * Math.sin(s * 14) * Math.exp(-s * 2.6)
}
/** The board's top at `x`: level to the roller, bending beyond it. */
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
    { from: IN, to: [(IN[0] + UP[0]) / 2, 0.42], dur: UNDER * 0.5, hidden: true },
    { from: [(IN[0] + UP[0]) / 2, 0.42], to: UP, dur: UNDER * 0.5, hidden: true },
    ramp(UP, CREST, V_UP, V_CREST),
    roll(CREST, [EAST, 0], V_CREST),
    ramp([EAST, 0], [2.5, 0], V_CREST, ROLL),
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
  draw: (p, s, { k, t, ink, bg, weight, theme }) => {
    const sea = seaWater(theme)

    // The near pier; the far one, and the slip that runs down from its end to the bed of the sea.
    rail(p, k, ink, weight, -0.5, WEST)
    piling(p, k, ink, weight, -0.36)
    rail(p, k, ink, weight, EAST, 2.5)
    piling(p, k, ink, weight, EAST + 0.12)
    outline(p, ink, weight)
    p.line(EAST * k, FLOOR * k, FOOT[0] * k, FOOT[1] * k)
    seabed(p, k, ink, weight, FOOT[0] - 0.08, EAST + 0.18)

    // The handrail at the board's root, behind the ball: up from the deck, along, and down to the board.
    outline(p, ink, weight)
    p.noFill()
    p.beginShape()
    p.vertex((ROOT + 0.04) * k, FLOOR * k)
    p.vertex((ROOT + 0.04) * k, (RAIL + 0.07) * k)
    p.quadraticVertex((ROOT + 0.04) * k, RAIL * k, (ROOT + 0.11) * k, RAIL * k)
    p.vertex((FULCRUM - 0.13) * k, RAIL * k)
    p.quadraticVertex((FULCRUM - 0.04) * k, RAIL * k, (FULCRUM - 0.04) * k, (RAIL + 0.1) * k)
    p.vertex((FULCRUM - 0.04) * k, FLOOR * k)
    p.endShape()

    // The roller the board rests on, on its block on a post at the deck's end.
    post(p, k, ink, weight, FULCRUM, FLOOR + THICK + 0.09)
    solid(p, ink, weight, bg)
    p.rect(FULCRUM * k, (FLOOR + THICK + 0.085) * k, 0.13 * k, 0.04 * k)
    p.circle(FULCRUM * k, (FLOOR + THICK + 0.035) * k, 0.065 * k)

    // The board: a plank from its root on the deck, over the roller, out to the tip, bent by however far it sags.
    const n = 16
    solid(p, ink, weight, s.color)
    p.beginShape()
    for (let i = 0; i <= n; i++) {
      const x = ROOT + ((TIP - ROOT) * i) / n
      p.vertex(x * k, boardY(x, t) * k)
    }
    for (let i = n; i >= 0; i--) {
      const x = ROOT + ((TIP - ROOT) * i) / n
      p.vertex(x * k, (boardY(x, t) + THICK) * k)
    }
    p.endShape(p.CLOSE)

    // The sea, and what the ball does to it: in with a splash; bubbles breaking the surface in a line toward
    // the slip; up the slip with another.
    water(p, k, ink, weight, -0.5, 2.5)
    splash(p, k, sea, weight, IN[0] + 0.02, WATER, over(t, T_IN, T_IN + 0.55), 1.3)
    if (t > T_IN && t < T_UP + 0.25) {
      const front = IN[0] + 0.08 + (UP[0] - IN[0] - 0.12) * over(t, T_IN, T_UP)
      const fade = 1 - over(t, T_UP, T_UP + 0.25)
      solid(p, ink, weight * 0.7, bg)
      for (let i = 0; i < 3; i++) {
        const bx = front - i * 0.1
        if (bx > IN[0]) p.circle(bx * k, (WATER - 0.02 - 0.012 * ((i + 1) % 2)) * k, (0.045 - 0.008 * i) * fade * k)
      }
    }
    splash(p, k, sea, weight, UP[0] + 0.04, WATER, over(t, T_UP - 0.02, T_UP + 0.5), 0.9)
  },
})
