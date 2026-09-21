import { outline, solid } from '../../../../../../src/core/draw'
import { FLOOR, R, ROLL, definePiece, fly, rail, ramp, trace, type Lane, type Pt } from '../../../parts'
import { body, ride, rounded, trackOf } from './parts-b'
import { gearColor, powder, snow, snowWhite } from './snow'

/**
 * A ski jump. The rail runs onto the head of an in-run on a trestle: over
 * the brink, steeply down, and round into a short table that tips a little
 * up. The ball goes down it gathering pace and leaves the table's lip, and
 * flies, long and low, out over the knoll of a snow hill built to the
 * shape of its flight: the hill falls away under it nearly as fast as it
 * comes down, so that it touches down on the landing slope at a glance,
 * with a puff of powder, runs on down into the out-run, and slows there
 * onto the rail a floor below where it began.
 *
 * One gravity for all of it. The in-run's pace is its slope's, the flight
 * is a thrown thing's from the pace and the angle the lip gave it, where
 * it lands is where that flight meets the hill, and what it lands with is
 * the part of its pace that lies along the slope.
 */
const G = 7.5
const DRAG = 0.12
/** The in-run, from the rail to the table's lip. */
const BRINK = -0.3
const LIP: Pt = [0.42, 0.775]
const DECK = 0.06
const INRUN = trackOf(rounded([[-0.5, FLOOR], [BRINK, FLOOR, 0.12], [0.2, 0.8, 0.32], LIP]))
/** The hill: a knoll under the lip, the landing slope, the out-run level with the rail below, and down to the snow's own line. */
const FLAT = 1 + FLOOR
const RAIL_X = 2.22
const HILL = rounded([[0.16, 1.352], [0.4, 1.0, 0.16], [1.2, 0.94, 0.6], [1.98, FLAT, 0.55], [RAIL_X, FLAT, 0.12], [2.5, 1.352]])
const SLOPE = trackOf(HILL)

/** Down the in-run. */
const IN = ride(INRUN, 0, ROLL, G, DRAG, (s) => s >= INRUN.length)
const OFF = INRUN.at(INRUN.length, R)
const V_OFF = IN.v(IN.dur)
const VX = V_OFF * Math.cos(OFF.slope)
const VY = V_OFF * Math.sin(OFF.slope)
/** The flight, until it meets the line a ball's radius off the hill. */
const flightAt = (tau: number): Pt => [OFF.at[0] + VX * tau, OFF.at[1] + VY * tau + 0.5 * G * tau * tau]
const { T_AIR, S_DOWN } = (() => {
  for (let tau = 0.05; tau < 2; tau += 1 / 2000) {
    const at = flightAt(tau)
    const s = SLOPE.reach(at[0])
    // The hill's line under the ball, where the ball's centre would be if it were rolling there.
    let lo = s - 0.15
    let hi = s + 0.15
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2
      if (SLOPE.at(mid, R).at[0] < at[0]) lo = mid
      else hi = mid
    }
    if (at[1] >= SLOPE.at(lo, R).at[1]) return { T_AIR: tau, S_DOWN: lo }
  }
  return { T_AIR: 0.3, S_DOWN: SLOPE.length / 2 }
})()
const DOWN = SLOPE.at(S_DOWN, R)
/** What it lands with: its pace along the slope. Then down into the out-run, the soft snow there taking its way off. */
const V_DOWN = VX * Math.cos(DOWN.slope) + (VY + G * T_AIR) * Math.sin(DOWN.slope)
const S_RAIL = SLOPE.reach(RAIL_X)
const S_SOFT = SLOPE.reach(1.95)
const RUN = ride(SLOPE, S_DOWN, V_DOWN, G, DRAG, (s) => s >= S_RAIL, (s, v) => (s > S_SOFT ? -3.2 * v : 0))
const V_RAIL = Math.max(ROLL, RUN.v(RUN.dur))

const T_DOWN = IN.dur + T_AIR
const LANE: Lane = {
  segs: [
    ...trace((t) => INRUN.at(IN.s(t), R).at, 0, IN.dur, 28),
    fly(OFF.at, DOWN.at, T_AIR, (G * T_AIR * T_AIR) / 8),
    ...trace((t) => SLOPE.at(RUN.s(t - T_DOWN), R).at, T_DOWN, T_DOWN + RUN.dur, 28),
    ramp([SLOPE.at(S_RAIL, R).at[0], 1], [2.5, 1], V_RAIL, ROLL),
  ],
  fire: IN.dur,
}

export const skijump = definePiece<{ color: string; white: string }>({
  name: 'skijump',
  weight: 0.9,
  flight: true,
  place: ({ color, fits, theme, ball }) => {
    const cells: Pt[] = [
      [0, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ]
    if (!fits(cells, [3, 1])) return null
    return { cells, exit: { at: [3, 1], dir: 1 }, lane: LANE, state: { color: gearColor(theme, color, ball.color), white: snowWhite(theme) } }
  },
  draw: (p, s, { k, ink, weight }) => {
    // The trestle: two legs to the ground behind the hill's head, and a brace between them.
    const under = (x: number): Pt => INRUN.at(INRUN.reach(x), -DECK).at
    outline(p, ink, weight)
    for (const x of [-0.24, 0.12]) {
      p.line(x * k, under(x)[1] * k, x * k, 1.5 * k)
      p.line((x - 0.06) * k, 1.5 * k, (x + 0.06) * k, 1.5 * k)
    }
    p.line(-0.24 * k, 0.62 * k, 0.12 * k, 1.2 * k)

    // The hill, and the rail out of the out-run.
    snow(p, k, ink, weight, -0.5, 0.16, 1.36)
    body(p, k, ink, weight, s.white, HILL, 1.5, 1.9)
    rail(p, k, ink, weight, RAIL_X - 0.02, 2.5, FLAT)

    // The in-run: the rail onto its head, and its deck from the brink to the lip.
    rail(p, k, ink, weight, -0.5, BRINK - 0.06)
    const from = INRUN.reach(BRINK - 0.08)
    const n = 32
    solid(p, ink, weight, s.color)
    p.beginShape()
    for (let i = 0; i <= n; i++) {
      const { at } = INRUN.at(from + ((INRUN.length - from) * i) / n)
      p.vertex(at[0] * k, at[1] * k)
    }
    for (let i = n; i >= 0; i--) {
      const { at } = INRUN.at(from + ((INRUN.length - from) * i) / n, -DECK)
      p.vertex(at[0] * k, at[1] * k)
    }
    p.endShape(p.CLOSE)
  },
  over: (p, s, { k, since, ink, weight }) => {
    const hit = SLOPE.at(S_DOWN).at
    powder(p, k, ink, weight, s.white, hit[0] + 0.05, hit[1], (since - T_AIR) / 0.45, 1.1)
  },
})
