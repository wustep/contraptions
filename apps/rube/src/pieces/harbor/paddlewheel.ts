import { outline, solid } from '../../../../../src/core/draw'
import { FLOOR, ROLL, definePiece, puff, rail, ramp, roll, trace, type Lane, type Pt } from '../../parts'
import { WATER, bodyColor, piling, seaWater, water } from './sea'

/**
 * A paddle steamer's wheel. The steamer lies alongside with her side wheel
 * turning in the water between the two piers, her funnel puffing behind
 * it; the paddles come up out of the sea on the pier's side and go over
 * the top. The deck ends where they rise. The ball rolls off the deck's
 * end onto a paddle as it comes level, and the wheel carries it up the
 * near side and over, the paddle behind it pushing, until at the top it
 * rolls off onto the deck a floor up and on. The wheel never stops: it
 * was turning before the ball came and it turns after.
 *
 * The ball's lane is sampled from the wheel's own turning, at the seat a
 * paddle holds it in, so it rides the paddle and never floats off it.
 */
/** The wheel: its hub, its rim, where the paddles start along their arms, and where the ball sits on a paddle. */
const HUB: Pt = [0.5, -0.38]
const RIM = 0.8
const INNER = 0.47
const SEAT = 0.62
const PADDLES = 6
/** The ball rides this far ahead of its paddle, resting on the paddle's face. */
const AHEAD = 0.21
/** Where the ball gets on, and where its paddle is when it gets off at the top. */
const PICK = Math.PI - Math.asin(-HUB[1] / SEAT)
const TOP = 1.5 * Math.PI
/** The piers: the deck's end below, and the deck above. */
const WEST = -0.2
const EAST = 0.6
/** The funnel behind the wheel. */
const STACK: Pt = [1.12, -1.22]

/** Onto the paddle; the ride to the top; off along the upper deck. */
const ON: Pt = [HUB[0] + SEAT * Math.cos(PICK), HUB[1] + SEAT * Math.sin(PICK)]
const T_PICK = (ON[0] + 0.5) / ROLL
const RIDE = 1.6
const OMEGA = (TOP - (PICK - AHEAD)) / RIDE
const T_TOP = T_PICK + RIDE
const FIRE = T_PICK

/** Where the paddle that takes the ball is, at any time: the wheel turns steadily. */
const paddleAt = (t: number) => PICK - AHEAD + OMEGA * (t - T_PICK)
const onWheel = (t: number): Pt => {
  const a = paddleAt(t) + AHEAD
  return [HUB[0] + SEAT * Math.cos(a), HUB[1] + SEAT * Math.sin(a)]
}
const OFF = onWheel(T_TOP)
const LANE: Lane = {
  segs: [
    roll([-0.5, 0], ON, ROLL),
    ...trace(onWheel, T_PICK, T_TOP, 40),
    ramp(OFF, [0.92, -1], SEAT * OMEGA, 1.8),
    ramp([0.92, -1], [1.5, -1], 1.8, ROLL),
  ],
  fire: FIRE,
}

export const paddlewheel = definePiece<{ color: string }>({
  name: 'paddlewheel',
  weight: 0.9,
  place: ({ color, fits, theme, ball }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
      [0, -1],
      [1, -1],
    ]
    if (!fits(cells, [2, -1])) return null
    return { cells, exit: { at: [2, -1], dir: 1 }, lane: LANE, state: { color: bodyColor(theme, color, ball.color) } }
  },
  draw: (p, s, { k, t, ink, bg, weight, theme }) => {
    const a0 = paddleAt(t)
    const sea = seaWater(theme)

    // The steamer behind the wheel: a low hull on the water, and the funnel with its steam.
    solid(p, ink, weight, s.color)
    p.beginShape()
    p.vertex(0.3 * k, 0.24 * k)
    p.vertex(1.36 * k, 0.24 * k)
    p.vertex(1.46 * k, 0.32 * k)
    p.vertex(1.4 * k, 0.46 * k)
    p.vertex(0.36 * k, 0.46 * k)
    p.endShape(p.CLOSE)
    p.rect(STACK[0] * k, ((STACK[1] + 0.2) / 2) * k, 0.13 * k, (0.2 - STACK[1]) * k)
    solid(p, ink, weight, bg)
    p.rect(STACK[0] * k, (STACK[1] + 0.05) * k, 0.13 * k, 0.07 * k)
    for (let i = 0; i < 2; i++) {
      const f = ((t * 0.4 + i / 2) % 1 + 1) % 1
      puff(p, k, ink, weight * 0.8, bg, STACK[0] + 0.06 + 0.16 * f, STACK[1] - 0.09 - 0.2 * f, 0.03 + 0.07 * Math.sin(Math.PI * f))
    }

    // The wheel: a rim, an arm from the hub to the rim for every paddle, and the paddle at the arm's end with a lip
    // at its outer corner on the side it pushes.
    outline(p, ink, weight * 1.1)
    p.circle(HUB[0] * k, HUB[1] * k, RIM * 2 * k)
    p.push()
    p.translate(HUB[0] * k, HUB[1] * k)
    for (let i = 0; i < PADDLES; i++) {
      p.push()
      p.rotate(a0 + (i * Math.PI * 2) / PADDLES)
      outline(p, ink, weight * 0.9)
      p.line(0.08 * k, 0, (RIM - 0.01) * k, 0)
      solid(p, ink, weight, s.color)
      p.beginShape()
      p.vertex((INNER + 0.01) * k, -0.035 * k)
      p.vertex((RIM - 0.02) * k, -0.035 * k)
      p.vertex((RIM - 0.02) * k, 0.12 * k)
      p.vertex((RIM - 0.085) * k, 0.12 * k)
      p.vertex((RIM - 0.085) * k, 0.035 * k)
      p.vertex((INNER + 0.01) * k, 0.035 * k)
      p.endShape(p.CLOSE)
      p.pop()
    }
    p.pop()
    solid(p, ink, weight, s.color)
    p.circle(HUB[0] * k, HUB[1] * k, 0.18 * k)
    p.fill(ink)
    p.noStroke()
    p.circle(HUB[0] * k, HUB[1] * k, 0.04 * k)

    // The piers: the deck the ball comes off, and the deck above it lands on, standing in front of the wheel.
    water(p, k, ink, weight, -0.5, 1.5)
    rail(p, k, ink, weight, -0.5, WEST)
    piling(p, k, ink, weight, -0.36)
    rail(p, k, ink, weight, EAST, 1.5, -1 + FLOOR)
    piling(p, k, ink, weight, 1.38, -1 + FLOOR, 0.5)
    outline(p, ink, weight)
    p.line(1.38 * k, (-1 + FLOOR + 0.22) * k, 1.16 * k, (-1 + FLOOR) * k)

    // The churn: water thrown up where the paddles come up out of the sea, as long as the wheel turns.
    p.push()
    p.noStroke()
    p.fill(sea)
    for (let i = 0; i < 4; i++) {
      const f = ((t * 1.6 + i * 0.25) % 1 + 1) % 1
      const x = HUB[0] - RIM * 0.72 - 0.08 - 0.12 * f + 0.04 * i
      p.circle(x * k, (WATER - 0.02 - 0.16 * 4 * f * (1 - f) + 0.02 * i) * k, (0.03 - 0.015 * f) * k)
    }
    p.pop()
  },
})
