import { outline, solid } from '../../../../../src/core/draw'
import { easeInOutSine, easeOutQuad, lerp } from '../../../../../src/core/ease'
import { FLOOR, R, ROLL, arrive, arriveAt, definePiece, fly, gallows, over, post, rail, ramp, trace, wait, type Lane, type Pt } from '../../parts'
import { soil, tuft } from './green'

/**
 * A garden swing: a seat on two ropes from a bough that reaches out over a
 * two-cell gap from a post on the far side. The swing hangs pulled back,
 * its seat level at the path's end and hooked to the last stake. The ball
 * rolls onto the seat and stops; the seat dips under it and the hook slips
 * — and the swing goes: down through the bottom of its arc, low over the
 * ground, and up the far side, until the seat's front edge meets a stop on
 * the far post. The seat tips forward over the stop and pitches the ball
 * off its front onto the far path. The swing falls back, swings, and hangs
 * itself still over the gap.
 *
 * The seat rides the ropes' angle — level while it is hooked, square to
 * the ropes once it swings — and the ball's lane is the seat's top under
 * it, from the dip to the tip.
 */
/** The bough's pivot over the gap's middle, the ropes' length, and the seat. */
const PIVOT: Pt = [0.5, FLOOR + 0.02 - Math.sqrt(0.9 * 0.9 - 0.7 * 0.7)]
const L = 0.9
const SEAT = 0.15
const TH = 0.04
/** Pulled back to the path's end, and where the stop on the far post meets it. */
const A0 = -Math.asin(0.7 / L)
const A_STOP = (36 / 180) * Math.PI
const G = 14
const OMEGA = Math.sqrt(G / L)
/** The dip that slips the hook, the tip over the stop, and the far post. */
const DIP = 0.15
const TIP = 0.12
const TIPPED = -(16 / 180) * Math.PI
const POST_X = 1.25
const LAND: Pt = [1.35, 0]

const HANG0: Pt = [PIVOT[0] + L * Math.sin(A0), PIVOT[1] + L * Math.cos(A0)]
const ARRIVE = arriveAt(HANG0[0])
const FIRE = ARRIVE + DIP
/** When the seat meets the stop: the pendulum from A0 has come round to A_STOP. */
const T_STOP = FIRE + Math.acos(-A_STOP / -A0) / OMEGA
const T_TIPPED = T_STOP + TIP
/** The swing's speed at the stop, and what the stop gives back. */
const RATE_STOP = -A0 * OMEGA * Math.sin((T_STOP - FIRE) * OMEGA)
const REBOUND = -0.35 * RATE_STOP

interface Pose {
  /** The ropes' angle from straight down, forward positive. */
  a: number
  /** The seat's tilt: forward is (cos tilt, -sin tilt). */
  tilt: number
  /** The middle of the seat's top. */
  c: Pt
}

const hang = (a: number): Pt => [PIVOT[0] + L * Math.sin(a), PIVOT[1] + L * Math.cos(a)]
/** Where the seat's front edge is at the stop. */
const STOP: Pt = (() => {
  const c = hang(A_STOP)
  return [c[0] + SEAT * Math.cos(A_STOP), c[1] - SEAT * Math.sin(A_STOP)]
})()

function poseAt(t: number): Pose {
  if (t < FIRE) {
    const dip = t > ARRIVE ? 0.02 * easeOutQuad(over(t, ARRIVE, FIRE)) : 0
    return { a: A0, tilt: 0, c: [HANG0[0], HANG0[1] + dip] }
  }
  if (t < T_STOP) {
    const tau = t - FIRE
    const a = A0 * Math.cos(OMEGA * tau)
    // The seat comes square to the ropes as the swing gets going.
    const tilt = lerp(0, a, easeInOutSine(over(tau, 0, 0.2)))
    return { a, tilt, c: hang(a) }
  }
  if (t < T_TIPPED) {
    // Tipping over the stop: the front edge held, the seat turning forward about it.
    const tilt = lerp(A_STOP, TIPPED, easeOutQuad(over(t, T_STOP, T_TIPPED)))
    return { a: A_STOP, tilt, c: [STOP[0] - SEAT * Math.cos(tilt), STOP[1] + SEAT * Math.sin(tilt)] }
  }
  // Falling back off the stop: a pendulum from the stop's angle with what the stop gave back, dying away.
  const tau = t - T_TIPPED
  const a = Math.exp(-tau * 0.55) * (A_STOP * Math.cos(OMEGA * tau) + (REBOUND / OMEGA) * Math.sin(OMEGA * tau))
  const tilt = lerp(TIPPED, a, easeInOutSine(over(tau, 0, 0.35)))
  return { a, tilt, c: hang(a) }
}

/** The ball on the seat: over its middle, off it along its normal; sliding forward as it tips. */
function ballAt(t: number): Pt {
  const { tilt, c } = poseAt(t)
  const slide = t > T_STOP ? 0.11 * easeOutQuad(over(t, T_STOP, T_TIPPED)) : 0
  const up = R + TH / 2
  return [c[0] + slide * Math.cos(tilt) - up * Math.sin(tilt), c[1] - slide * Math.sin(tilt) - up * Math.cos(tilt)]
}

const LANE: Lane = (() => {
  const seat0 = ballAt(ARRIVE - 0.01)
  const ride = [...trace(ballAt, ARRIVE, FIRE, 4), ...trace(ballAt, FIRE, T_STOP, 24), ...trace(ballAt, T_STOP, T_STOP + TIP * 0.7, 5)]
  const go = ride[ride.length - 1].to
  return {
    segs: [...arrive([-0.5, 0], [seat0[0], 0]), wait([seat0[0], 0], 0.001), ...ride, fly(go, LAND, 0.15, 0.08), fly(LAND, [LAND[0] + 0.03, 0], 0.03, 0.006), ramp([LAND[0] + 0.03, 0], [1.5, 0], 1.8, ROLL)],
    fire: FIRE,
  }
})()

export const swing = definePiece<{ color: string }>({
  name: 'swing',
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
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    const { tilt, c } = poseAt(t)
    const railEnd = HANG0[0] - SEAT - 0.02

    // The path in to its last stake, the ground under the gap, and the path out from the far post.
    rail(p, k, ink, weight, -0.5, railEnd)
    post(p, k, ink, weight, railEnd)
    rail(p, k, ink, weight, POST_X - 0.03, 1.5)
    soil(p, k, ink, weight, -0.5, 1.5)
    tuft(p, k, ink, weight, 0.5, 0.5, 0.11, 0.02)
    // The bough out over the gap from the far post, and the stop on the post's near face.
    gallows(p, k, ink, weight, PIVOT[0] - 0.1, POST_X + 0.02, POST_X, PIVOT[1])
    solid(p, ink, weight, bg)
    p.rect(((STOP[0] + POST_X) / 2) * k, (STOP[1] + 0.02) * k, (POST_X - STOP[0] + 0.02) * k, 0.05 * k, 0.01 * k)
    // The hook on the stake that held the swing back; it stays there once the seat has slipped it.
    outline(p, ink, weight)
    p.noFill()
    const hookX = railEnd + 0.02
    p.arc(hookX * k, (FLOOR + 0.07) * k, 0.06 * k, 0.06 * k, -Math.PI / 2, Math.PI / 2)
    if (since < 0) p.line((hookX + 0.03) * k, (FLOOR + 0.07) * k, (c[0] - SEAT) * k, (c[1] + TH / 2) * k)

    // The ropes, from the pivot to the seat's ends, and the seat between them with a lip at its front.
    const fx = Math.cos(tilt)
    const fy = -Math.sin(tilt)
    const ends: Pt[] = [
      [c[0] - SEAT * fx, c[1] - SEAT * fy],
      [c[0] + SEAT * fx, c[1] + SEAT * fy],
    ]
    outline(p, ink, weight * 0.9)
    for (const e of ends) p.line(PIVOT[0] * k, PIVOT[1] * k, e[0] * k, e[1] * k)
    p.push()
    p.translate(c[0] * k, c[1] * k)
    p.rotate(-tilt)
    solid(p, ink, weight, s.color)
    p.rect(0, (TH / 2) * k, SEAT * 2 * k, TH * k, 0.01 * k)
    p.rect((SEAT - 0.02) * k, -0.015 * k, 0.03 * k, 0.045 * k, 0.008 * k)
    p.pop()
    // The pivot's ring on the bough.
    solid(p, ink, weight, bg)
    p.circle(PIVOT[0] * k, PIVOT[1] * k, 0.05 * k)
  },
})
