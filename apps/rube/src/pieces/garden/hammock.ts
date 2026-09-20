import { outline, solid } from '../../../../../src/core/draw'
import { easeInOutSine } from '../../../../../src/core/ease'
import { FLOOR, R, ROLL, definePiece, fly, post, rail, ramp, roll, trace, type Lane, type Pt } from '../../parts'
import { soil, tuft } from './green'

/**
 * A hammock slung between two posts across a gap where the path stops. The
 * ball rolls off the path's end onto the hammock's edge and down into it;
 * the cloth sags deep under it and brings it to rest just short of the
 * middle — and springs back, tossing it up and out in an arc onto the path
 * at the far side. Lightened, the hammock flaps up, sags, and bounces
 * itself still.
 *
 * The cloth is one curve: its own slack, and a dip that follows the ball
 * and deepens as the ball settles. The ball's lane while it is in the
 * hammock is that curve, sampled under the ball, so the ball is on the
 * cloth wherever the cloth is.
 */
/** The posts and the hooks the hammock hangs from, level with the path. */
const XA = -0.2
const XB = 1.2
const HY = FLOOR
/** The cloth's own slack in the middle; how deep the ball's dip gets; how far along the cloth the ball comes to rest. */
const SLACK = 0.11
const DIP = 0.19
const U_REST = 0.42
/** Rolling down into it, and the spring back up. */
const DOWN = 0.32
const OMEGA = 12
const DECAY = 2.4
/** Where it lands on the far path. */
const LAND: Pt = [1.32, 0]
const FLIGHT = 0.55
const ARC = 0.45

const T0 = (0.5 + XA) / ROLL
const T1 = T0 + DOWN
/** The toss: the cloth back through its own line on the way up, and the ball off it. */
const FIRE = T1 + Math.PI / 2 / OMEGA

/** How far along the cloth the ball is: rolling down the near side and slowing as the dip takes it. */
function ballU(t: number): number {
  if (t <= T0) return 0
  if (t >= T1) return U_REST
  const s = (t - T0) / DOWN
  return U_REST * (1 - Math.pow(1 - s, 1.6))
}

/** The dip's depth, and where along the cloth it is. */
function dipAt(t: number): { d: number; at: number } {
  if (t <= T0) return { d: 0, at: U_REST }
  if (t < T1) return { d: DIP * easeInOutSine((t - T0) / DOWN), at: ballU(t) }
  const tau = t - T1
  const d = DIP * Math.cos(OMEGA * tau) * (t > FIRE ? Math.exp(-DECAY * (t - FIRE)) : 1)
  return { d, at: t > FIRE ? 0.5 : U_REST }
}

/** The cloth's top edge at `u` of the way from the near hook to the far one, at piece time `t`. */
function clothY(u: number, t: number): number {
  const { d, at } = dipAt(t)
  const tent = Math.pow(u <= at ? u / at : (1 - u) / (1 - at), 0.8)
  return HY + SLACK * Math.sin(Math.PI * u) + d * tent
}

/** The ball on the cloth. */
function ballAt(t: number): Pt {
  const u = ballU(t)
  return [XA + (XB - XA) * u, clothY(u, t) - R + 0.02]
}

const LANE: Lane = (() => {
  const ride = trace(ballAt, T0, FIRE, 20)
  const off = ride[ride.length - 1].to
  return {
    segs: [
      roll([-0.5, 0], [XA, 0], ROLL),
      ...ride,
      fly(off, LAND, FLIGHT, ARC),
      fly(LAND, [LAND[0] + 0.05, 0], 0.04, 0.008),
      ramp([LAND[0] + 0.05, 0], [1.5, 0], 1.9, ROLL),
    ],
    fire: FIRE,
  }
})()

export const hammock = definePiece<{ color: string }>({
  name: 'hammock',
  weight: 1,
  flight: true,
  place: ({ color, fits }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
    ]
    if (!fits(cells, [2, 0])) return null
    return { cells, exit: { at: [2, 0], dir: 1 }, lane: LANE, state: { color } }
  },
  draw: (p, s, { k, t, ink, bg, weight }) => {
    // The path in to the near post and out from the far one, and the ground under the gap.
    rail(p, k, ink, weight, -0.5, XA - 0.03)
    rail(p, k, ink, weight, XB + 0.03, 1.5)
    soil(p, k, ink, weight, -0.5, 1.5)
    tuft(p, k, ink, weight, 0.5, 0.5, 0.11, 0.02)
    // The posts, with a knob on top and the hook the hammock's end is tied to.
    for (const x of [XA, XB]) {
      post(p, k, ink, weight, x, HY - 0.1, 0.5)
      solid(p, ink, weight, bg)
      p.circle(x * k, (HY - 0.12) * k, 0.06 * k)
    }
    // The hammock: one band from hook to hook, its top the cloth's line and its underside a little fuller, gathered to nothing at the ends.
    const n = 40
    solid(p, ink, weight, s.color)
    p.beginShape()
    for (let i = 0; i <= n; i++) {
      const u = i / n
      p.vertex((XA + (XB - XA) * u) * k, clothY(u, t) * k)
    }
    for (let i = n; i >= 0; i--) {
      const u = i / n
      p.vertex((XA + (XB - XA) * u) * k, (clothY(u, t) + 0.065 * Math.sin(Math.PI * u)) * k)
    }
    p.endShape(p.CLOSE)
    // A few of its cords, following the cloth.
    outline(p, ink, weight * 0.7)
    for (const u of [0.25, 0.5, 0.75]) {
      const x = (XA + (XB - XA) * u) * k
      p.line(x, (clothY(u, t) + 0.015) * k, x, (clothY(u, t) + 0.065 * Math.sin(Math.PI * u) - 0.015) * k)
    }
  },
})
