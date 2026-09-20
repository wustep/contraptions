import { outline, solid } from '../../../../../src/core/draw'
import { easeInOutSine, easeOutCubic, lerp } from '../../../../../src/core/ease'
import { FLOOR, ROLL, definePiece, fly, laneAt, over, rail, ramp, rankBy, roll, type Lane, type Pt } from '../../parts'
import { WATER, bodyColor, bubbles, piling, seaWater, splash, water } from './sea'

/**
 * A fishing rod. A rod stands in a holder at the deck's end, leaning out
 * over the water, its line down to a float riding the swell. The ball
 * rolls off the deck's end and goes in with a splash right by the float;
 * the float ducks under — a bite — and the rod bends double toward it,
 * then whips up and back and hauls the ball out of the sea on the line,
 * water flying off it, up and over in an arc onto the deck a cell on, or
 * a floor up. The hook comes out as it lands and the line swings back to
 * hang from the tip, the float on it, dripping.
 *
 * The line runs from the rod's tip to wherever the ball is while it is
 * on the hook, so the ball is never off its line.
 */
export interface RodState {
  color: string
  /** 0: onto the deck a cell on. -1: onto the deck a floor up. */
  dy: 0 | -1
}

/** The deck's end, and where the holder stands on it. */
const WEST = -0.15
const BUTT: Pt = [-0.1, FLOOR + 0.05]
/** The rod: how long, and where its tip is at rest, bent to the bite, and whipped back. */
const ROD = 0.8
const TIP0: Pt = [0.4, -0.45]
const TIP_BENT: Pt = [0.62, -0.06]
const TIP_WHIP: Pt = [0.2, -0.53]
/** The float on the water, and where the ball goes in beside it. */
const FLOAT: Pt = [0.55, WATER - 0.01]
const IN: Pt = [0.42, WATER - 0.03]
const UNDER: Pt = [0.5, 0.45]
/** The far piers: a cell on, and a floor up. */
const EAST = 1.05
const EAST_UP = 1.0

/** Off the deck, into the water; a beat under; the bite; the bend; the whip. */
const T_EDGE = (WEST + 0.5) / ROLL
const FALL = 0.22
const T_IN = T_EDGE + FALL
const T_BITE = T_IN + 0.15
const BEND = 0.25
const FIRE = T_BITE + BEND
const WHIP = 0.12
const T_OUT = FIRE + 0.05
const FLIGHT = [0.45, 0.6]
const LOFT = [0.4, 0.5]
const flightOf = (dy: 0 | -1) => (dy === 0 ? FLIGHT[0] : FLIGHT[1])
const landOf = (dy: 0 | -1): Pt => (dy === 0 ? [EAST + 0.12, 0] : [EAST_UP + 0.12, -1])

function laneOf(dy: 0 | -1): Lane {
  const land = landOf(dy)
  return {
    segs: [
      roll([-0.5, 0], [WEST, 0], ROLL),
      fly([WEST, 0], IN, FALL, 0.085),
      { from: IN, to: UNDER, dur: T_OUT - T_IN - 0.12, hidden: true },
      { from: UNDER, to: [UNDER[0], WATER], dur: 0.12, hidden: true },
      fly([UNDER[0], WATER - 0.02], land, flightOf(dy), dy === 0 ? LOFT[0] : LOFT[1]),
      fly(land, [land[0] + 0.06, land[1]], 0.05, 0.012),
      ramp([land[0] + 0.06, land[1]], [1.5, land[1]], 1.8, ROLL),
    ],
    fire: FIRE,
  }
}
const LANES: Record<'0' | '-1', Lane> = { '0': laneOf(0), '-1': laneOf(-1) }
const tLand = (dy: 0 | -1) => T_OUT + flightOf(dy)

/** The rod's tip, and how far it bows: to the upward side of its chord when bent to the bite, the other way whipped back. */
function rodAt(t: number): { tip: Pt; bow: number } {
  const idle = 0.006 * Math.sin(t * 2.1)
  if (t < T_BITE) return { tip: [TIP0[0] + idle, TIP0[1] + idle * 0.5], bow: 0.02 }
  if (t < FIRE) {
    const f = easeInOutSine(over(t, T_BITE, FIRE))
    return { tip: [lerp(TIP0[0], TIP_BENT[0], f), lerp(TIP0[1], TIP_BENT[1], f)], bow: 0.02 + 0.13 * f }
  }
  if (t < FIRE + WHIP) {
    const f = easeOutCubic(over(t, FIRE, FIRE + WHIP))
    return { tip: [lerp(TIP_BENT[0], TIP_WHIP[0], f), lerp(TIP_BENT[1], TIP_WHIP[1], f)], bow: lerp(0.15, -0.08, f) }
  }
  const s = t - FIRE - WHIP
  const ring = Math.exp(-s * 3) * Math.cos(s * 10)
  return { tip: [TIP0[0] + (TIP_WHIP[0] - TIP0[0]) * ring, TIP0[1] + (TIP_WHIP[1] - TIP0[1]) * ring], bow: -0.08 * ring }
}
/** The float: on the water, ducked under at the bite, on the line as the ball is hauled, hanging from the line after. */
const dipAt = (t: number) => (t < T_BITE ? 0 : t < FIRE ? 0.06 * easeInOutSine(over(t, T_BITE, T_BITE + 0.1)) : 0)

export const rod = definePiece<RodState>({
  name: 'rod',
  weight: 0.9,
  flight: true,
  place: ({ rng, color, fits, theme, ball, taste }) => {
    const tall = taste.weights['lift-tall'] ?? 1
    for (const dy of rankBy(rng, [0, -1] as const, (d) => (d === -1 ? tall : 1))) {
      const cells: Pt[] = dy === 0 ? [[0, 0], [1, 0]] : [[0, 0], [1, 0], [1, -1]]
      const exit: Pt = [2, dy]
      if (!fits(cells, exit)) continue
      return { cells, exit: { at: exit, dir: 1 }, lane: LANES[`${dy}`], state: { color: bodyColor(theme, color, ball.color), dy } }
    }
    return null
  },
  draw: (p, s, { k, t, ink, bg, weight, theme }) => {
    const { tip, bow } = rodAt(t)
    const lane = LANES[`${s.dy}`]
    const landed = tLand(s.dy)
    const sea = seaWater(theme)
    const ball = laneAt(lane, t)

    // The near deck, and the far one: a cell on over the water, or a floor up on a tall piling.
    rail(p, k, ink, weight, -0.5, WEST)
    piling(p, k, ink, weight, -0.36)
    if (s.dy === 0) {
      rail(p, k, ink, weight, EAST, 1.5)
      piling(p, k, ink, weight, 1.32)
    } else {
      rail(p, k, ink, weight, EAST_UP, 1.5, -1 + FLOOR)
      piling(p, k, ink, weight, 1.32, -1 + FLOOR, 0.5)
      outline(p, ink, weight)
      p.line(1.32 * k, (-1 + FLOOR + 0.18) * k, (EAST_UP + 0.03) * k, (-1 + FLOOR) * k)
    }

    // The holder: a tube on the deck's end, leaning the way the rod does; the rod's butt in it.
    const lean = Math.atan2(tip[1] - BUTT[1], tip[0] - BUTT[0])
    p.push()
    p.translate(BUTT[0] * k, BUTT[1] * k)
    p.rotate(lean)
    solid(p, ink, weight, s.color)
    p.rect(0.04 * k, 0, 0.16 * k, 0.06 * k, 0.01 * k)
    p.pop()
    // The rod: one curve from the butt to the tip, bowed to the side its bend puts it.
    const cx = (BUTT[0] + tip[0]) / 2
    const cy = (BUTT[1] + tip[1]) / 2
    const chord = Math.hypot(tip[0] - BUTT[0], tip[1] - BUTT[1])
    const nx = -(tip[1] - BUTT[1]) / chord
    const ny = (tip[0] - BUTT[0]) / chord
    const up = ny < 0 ? 1 : -1
    const h = Math.max(bow, -0.1) + Math.sqrt(Math.max(0, (3 * (ROD - chord) * chord) / 8)) * Math.sign(bow || 1)
    outline(p, ink, weight * 1.4)
    p.noFill()
    p.beginShape()
    p.vertex(BUTT[0] * k, BUTT[1] * k)
    p.quadraticVertex((cx + up * nx * h) * k, (cy + up * ny * h) * k, tip[0] * k, tip[1] * k)
    p.endShape()

    // The line, and the float on it: down to the water; to the ball while it is hooked; swinging from the tip after.
    let end: Pt
    let floatAt: Pt
    if (t < T_OUT) {
      end = [FLOAT[0], FLOAT[1] + dipAt(t)]
      floatAt = end
    } else if (t < landed) {
      end = [ball.x, ball.y]
      const d = Math.hypot(tip[0] - end[0], tip[1] - end[1]) || 1
      floatAt = [end[0] + ((tip[0] - end[0]) / d) * 0.16, end[1] + ((tip[1] - end[1]) / d) * 0.16]
    } else {
      // The hook out: the line falls back and swings from the tip, dying away.
      const sw = t - landed
      const L = Math.hypot(TIP0[0] - FLOAT[0], TIP0[1] - FLOAT[1])
      const psi = 1.0 * Math.exp(-sw * 1.3) * Math.cos(sw * 4.6)
      const hang: Pt = [tip[0] + L * Math.sin(psi), tip[1] + L * Math.cos(psi)]
      const land = landOf(s.dy)
      const f = easeOutCubic(over(sw, 0, 0.3))
      end = [lerp(land[0], hang[0], f), lerp(land[1], hang[1], f)]
      const d = Math.hypot(tip[0] - end[0], tip[1] - end[1]) || 1
      floatAt = [end[0] + ((tip[0] - end[0]) / d) * 0.16, end[1] + ((tip[1] - end[1]) / d) * 0.16]
    }
    outline(p, ink, weight * 0.7)
    p.line(tip[0] * k, tip[1] * k, end[0] * k, end[1] * k)
    solid(p, ink, weight * 0.8, s.color)
    p.ellipse(floatAt[0] * k, floatAt[1] * k, 0.06 * k, 0.09 * k)

    // The sea in front; the ball's splash; bubbles while it is under; and the water off it as it is hauled out.
    water(p, k, ink, weight, -0.5, 1.5)
    splash(p, k, sea, weight, IN[0] + 0.03, WATER, over(t, T_IN, T_IN + 0.5), 1)
    if (t > T_IN + 0.05 && t < T_OUT) bubbles(p, k, ink, weight, bg, UNDER[0] + 0.03, 0.47, WATER - 0.02, t - T_IN, 3)
    splash(p, k, sea, weight, UNDER[0], WATER, over(t, T_OUT - 0.02, T_OUT + 0.4), 0.8)
    if (t > T_OUT && t < landed) {
      p.push()
      p.noStroke()
      p.fill(sea)
      for (const [dx, d] of [
        [-0.06, 0],
        [0.03, 0.35],
        [-0.01, 0.7],
      ]) {
        const f = (((t - T_OUT) * 2.2 + d) % 1 + 1) % 1
        p.ellipse((ball.x + dx) * k, (ball.y + 0.12 + 0.3 * f) * k, 0.025 * k, 0.04 * k)
      }
      p.pop()
    }
  },
})
