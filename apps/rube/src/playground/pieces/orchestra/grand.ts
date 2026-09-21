import { outline, solid } from '../../../../../../src/core/draw'
import { clamp } from '../../../../../../src/core/ease'
import { FLOOR, R, ROLL, definePiece, post, rail, ramp, roll, trace, type Lane, type Pt } from '../../../parts'
import { feltColor, ivory } from './hall'

/**
 * A grand piano seen from the keyboard, its lid propped wide open: hinged
 * down the far side of the case a floor below, and raised until its free
 * edge stands level with the rail. The ball rolls off the rail's end onto
 * that edge, and the weight is more than the prop will bear: its head skids
 * along the lid's underside and the lid comes down, the ball running down
 * it as it falls, faster than a lid should. Boom: it slams on the case, the
 * piano drops on its legs, every key jumps, the lid bounces once; and the
 * ball rolls on along the closed lid, easing to the rail's pace, and off
 * its hinge end onto the rail. The piano stays shut.
 *
 * The lid's angle is one function of the piece's clock, and the ball's way
 * down it is worked from the slope that angle gives it at every instant, so
 * the lane is the lid's own top with a ball on it.
 */
/** The hinge, on the lid's top at the case's far side; the lid's length and thickness. */
const HX = 1.38
const HY = 1 + FLOOR
const L = 1.7
const THICK = 0.075
/** How deep the case is under the lid. */
const CASE = 0.16
/** Open, its free edge is a floor up, level with the rail. */
const OPEN = Math.asin(1 / L)
/** The slam, the bounce after it, and how hard the slope pulls the ball. */
const SLAM = 0.32
const BOUNCE = 0.16
const PULL = 6
/** The rail's end, and where on the lid the ball comes onto it, measured from the hinge. */
const RAIL_END = -0.06
const S0 = L - 0.03
const T_EDGE = (RAIL_END + 0.5) / ROLL + 0.06

/** The lid's angle, `t` seconds after the ball came onto it. */
function angle(t: number): number {
  if (t <= 0) return OPEN
  if (t < SLAM) return OPEN * (1 - (t / SLAM) ** 2)
  const b = (t - SLAM) / BOUNCE
  return b < 1 ? 0.04 * Math.sin(Math.PI * b) : 0
}
/** A ball's centre on the lid's top, `s` from the hinge, with the lid at angle `a`. */
const seatOn = (s: number, a: number): Pt => [HX - s * Math.cos(a) + R * Math.sin(a), HY - s * Math.sin(a) - R * Math.cos(a)]

/** How far from the hinge the ball is, and how fast, every 1/480 s from the moment it comes onto the lid. */
const RUN: { s: number; v: number }[] = (() => {
  const out = [{ s: S0, v: ROLL }]
  const dt = 1 / 480
  for (let i = 1; i <= Math.ceil((SLAM + BOUNCE) / dt); i++) {
    const last = out[i - 1]
    const v = last.v + PULL * Math.sin(angle((i - 1) * dt)) * dt
    out.push({ s: last.s - v * dt, v })
  }
  return out
})()
const END = RUN[RUN.length - 1]
function ballOn(t: number): Pt {
  const f = clamp(t / (SLAM + BOUNCE)) * (RUN.length - 1)
  const i = Math.min(RUN.length - 2, Math.floor(f))
  const s = RUN[i].s + (RUN[i + 1].s - RUN[i].s) * (f - i)
  return seatOn(s, angle(t))
}

const LANE: Lane = {
  segs: [
    roll([-0.5, 0], [RAIL_END, 0], ROLL),
    roll([RAIL_END, 0], seatOn(S0, OPEN), ROLL),
    ...trace(ballOn, 0, SLAM + BOUNCE, 36),
    ramp(seatOn(END.s, 0), [1.5, 1], END.v, ROLL),
  ],
  fire: T_EDGE,
}

/** The prop: its foot on the case's rim, and where under the open lid its head bears. */
const FOOT: Pt = [0.52, HY + THICK]
const BEARS = 1.22
const propHead = (a: number): Pt => [HX - BEARS * Math.cos(a) + THICK * Math.sin(a) * -1, HY - BEARS * Math.sin(a) + THICK * Math.cos(a)]
const PROP = Math.hypot(propHead(OPEN)[0] - FOOT[0], propHead(OPEN)[1] - FOOT[1])

export const grand = definePiece<{ color: string }>({
  name: 'grand',
  weight: 0.9,
  place: ({ color, fits, theme, ball }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ]
    if (!fits(cells, [2, 1])) return null
    return { cells, exit: { at: [2, 1], dir: 1 }, lane: LANE, state: { color: feltColor(theme, color, ball.color) } }
  },
  draw: (p, s, { k, since, ink, weight, theme }) => {
    const a = angle(since)
    // The slam drops the piano on its legs for an instant, and every key jumps.
    const boom = since - SLAM
    const jolt = boom > 0 && boom < 0.3 ? 0.02 * Math.sin((Math.PI * boom) / 0.3) * Math.exp(-boom * 6) : 0
    const keysUp = boom > 0 && boom < 0.35 ? 0.022 * Math.sin((Math.PI * boom) / 0.35) : 0

    // The rail in on its post, and the stub of rail the lid's hinge end runs onto.
    rail(p, k, ink, weight, -0.5, RAIL_END)
    post(p, k, ink, weight, -0.42, FLOOR, 1.5)
    rail(p, k, ink, weight, HX, 1.5, HY)

    p.push()
    p.translate(0, jolt * k)
    // Two turned legs to the floor, which the jolt does not move, and the pedal lyre between them.
    const under = HY + THICK + CASE
    solid(p, ink, weight, s.color)
    for (const x of [-0.14, 1.22]) p.quad((x - 0.05) * k, under * k, (x + 0.05) * k, under * k, (x + 0.022) * k, (1.5 - jolt) * k, (x - 0.022) * k, (1.5 - jolt) * k)
    p.quad(0.5 * k, under * k, 0.62 * k, under * k, 0.6 * k, (1.47 - jolt) * k, 0.52 * k, (1.47 - jolt) * k)

    // The prop: its foot stays on the rim, and its head rides out along the lid's underside as the lid
    // comes down, until it lies along the rim with the lid shut over it.
    const ux = HX - THICK * Math.sin(a)
    const uy = HY + THICK * Math.cos(a)
    const wx = ux - FOOT[0]
    const wy = uy - FOOT[1]
    const wd = -wx * Math.cos(a) - wy * Math.sin(a)
    const along = -wd + Math.sqrt(Math.max(0, wd * wd - wx * wx - wy * wy + PROP * PROP))
    outline(p, ink, weight * 1.2)
    p.line(FOOT[0] * k, FOOT[1] * k, (ux - along * Math.cos(a)) * k, (uy - along * Math.sin(a)) * k)

    // The case, and the keyboard across its front.
    solid(p, ink, weight, s.color)
    p.rect(((-0.3 + HX) / 2) * k, (HY + THICK + CASE / 2) * k, (HX + 0.3) * k, CASE * k, 0.03 * k)
    solid(p, ink, weight * 0.8, ivory(theme))
    p.rect(0.56 * k, (HY + THICK + CASE / 2) * k, 1.08 * k, 0.085 * k, 0.01 * k)
    p.fill(ink)
    p.noStroke()
    for (let i = 0; i < 12; i++) {
      // Black keys in twos and threes.
      if (i % 7 === 2 || i % 7 === 6) continue
      p.rect((0.1 + i * 0.084) * k, (HY + THICK + CASE / 2 - 0.016 - keysUp) * k, 0.044 * k, 0.052 * k)
    }

    // The lid, turning on its hinge: one slab of lacquer.
    p.push()
    p.translate(HX * k, HY * k)
    p.rotate(a)
    solid(p, ink, weight, s.color)
    p.rect((-L / 2) * k, (THICK / 2) * k, L * k, THICK * k, 0.015 * k)
    p.pop()
    p.pop()
  },
})
