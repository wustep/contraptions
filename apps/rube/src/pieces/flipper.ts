import { outline, solid } from '../../../../src/core/draw'
import { easeInOutSine } from '../../../../src/core/ease'
import { FLOOR, R, ROLL, burst, definePiece, fly, over, rail, ramp, roll, wait, type Lane, type Pt } from '../parts'

/**
 * A pinball flipper. The bat droops from its hinge like a real one; the
 * ball rolls off the rail, down the bat, and into the lip at its tip, and
 * the bat sags onto the switch under it. The solenoid charges and fires:
 * the bat whips up, fastest as it passes level, and that is the moment the
 * ball leaves it — thrown along the bat's face, nearly straight up and a
 * little forward — while the bat follows through to its stop and shudders.
 * The ball goes up past the shelf a floor above, comes down onto it, and
 * rolls on. The bat drops back on its own.
 */
const HINGE: Pt = [-0.4, FLOOR + 0.045]
/** The bat's half thickness at the hinge; its face is flat and its underside tapers to the tip. */
const TH = 0.045
const BAT = 0.46
const LIP_W = 0.05
const LIP_H = 0.03
/** The bat's droop with nothing on it, and the extra sag under the ball that presses the switch. */
const REST0 = 0.25
const SAG = 0.08
const REST = REST0 + SAG
const UP = -0.72
const SWING = REST - UP
/** Where the ball sits along the bat: its edge on the lip. */
const SEAT_R = BAT - LIP_W - R
/** The bat's angle as the ball leaves it: just short of level, so the throw leans forward. */
const LAUNCH = 0.13
/** The fraction of the snap spent accelerating to that angle; the rest is the follow-through. */
const C = (REST - LAUNCH) / SWING
const SHELF_Y = -1
/** Cartoon gravity, and how far the flight peaks above the shelf's ball line. */
const G = 14
const OVER = 0.15
const SINK = 0.06
const CHARGE = 0.2
const HOLD = 0.45

/** The ball's centre when it sits `r` along a bat at angle `a`: a radius off the face. */
const onBat = (a: number, r: number): Pt => [HINGE[0] + r * Math.cos(a) + (TH + R) * Math.sin(a), HINGE[1] + r * Math.sin(a) - (TH + R) * Math.cos(a)]
/** A point on the bat's underside, `r` along it. */
const under = (a: number, r: number): Pt => {
  const th = TH * (1 - (0.5 * r) / BAT)
  return [HINGE[0] + r * Math.cos(a) - th * Math.sin(a), HINGE[1] + r * Math.sin(a) + th * Math.cos(a)]
}

const S0 = onBat(REST0, 0)
const S1 = onBat(REST0, SEAT_R)
const SEAT = onBat(REST, SEAT_R)
const LAUNCH_AT = onBat(LAUNCH, SEAT_R)
/** The flight: up from the launch point along the bat's face, over the shelf's line, and down onto it. */
const VY = Math.sqrt(2 * G * (LAUNCH_AT[1] - SHELF_Y + OVER))
const VX = VY * Math.tan(LAUNCH)
const FLIGHT = (VY + Math.sqrt(VY * VY - 2 * G * (LAUNCH_AT[1] - SHELF_Y))) / G
const LAND: Pt = [LAUNCH_AT[0] + VX * FLIGHT, SHELF_Y]
/** The bat's face moves at the ball's speed as it lets go; that sets how fast the snap is. */
const SNAP = (2 * SWING * SEAT_R) / (VY / Math.cos(LAUNCH))
/** The shelf starts clear of the ball on its way up past it. */
const RISE_PAST = (VY - Math.sqrt(VY * VY - 2 * G * (LAUNCH_AT[1] - (SHELF_Y + 2 * R)))) / G
const SHELF_X0 = LAUNCH_AT[0] + VX * RISE_PAST + R + 0.03
const ARRIVE = (S0[0] + 0.5) / ROLL + Math.hypot(S1[0] - S0[0], S1[1] - S0[1]) / (ROLL * 1.075)
const FIRE = ARRIVE + SINK + CHARGE

/** The snap, 0 → 1: a hard acceleration to the launch angle, then the follow-through to the stop. */
const snap = (u: number): number => (u < C ? C * (u / C) * (u / C) : C + (1 - C) * (1 - (1 - (u - C) / (1 - C)) ** 2))

const batAt = (t: number, since: number): number => {
  if (since < 0) return REST0 + SAG * (t < ARRIVE ? 0 : over(t, ARRIVE, ARRIVE + SINK))
  if (since < SNAP) return REST - SWING * snap(since / SNAP)
  if (since < HOLD) {
    const s = since - SNAP
    return UP + 0.05 * Math.exp(-s * 25) * Math.sin(s * 110)
  }
  return UP + (REST0 - UP) * easeInOutSine(over(since, HOLD, HOLD + 0.35))
}

export const flipper = definePiece<{ color: string }>({
  name: 'flipper',
  weight: 0.9,
  place: ({ color, fits }) => {
    const cells: Pt[] = [
      [0, 0],
      [0, -1],
    ]
    if (!fits(cells, [1, -1])) return null
    const lane: Lane = {
      segs: [
        roll([-0.5, 0], S0, ROLL),
        ramp(S0, S1, ROLL, ROLL * 1.15),
        { from: S1, to: SEAT, dur: SINK, ease: 'out' },
        wait(SEAT, CHARGE),
        { from: SEAT, to: LAUNCH_AT, dur: C * SNAP, ease: 'in' },
        fly(LAUNCH_AT, LAND, FLIGHT, (G * FLIGHT * FLIGHT) / 8),
        { ...ramp(LAND, [0.5, SHELF_Y], 1.2, ROLL), arc: 0.02 },
      ],
      fire: FIRE,
    }
    return { cells, exit: { at: [1, -1], dir: 1 }, lane, state: { color } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    const a = batAt(t, since)
    const pressed = since >= 0 || t < ARRIVE ? 0 : over(t, ARRIVE, ARRIVE + SINK)

    // The rail to the hinge; the shelf above on its post.
    rail(p, k, ink, weight, -0.5, HINGE[0])
    rail(p, k, ink, weight, SHELF_X0, 0.5, SHELF_Y + FLOOR)
    outline(p, ink, weight)
    p.line(0.44 * k, (SHELF_Y + FLOOR) * k, 0.44 * k, 0.5 * k)
    p.line(0.38 * k, 0.5 * k, 0.5 * k, 0.5 * k)
    // The solenoid under the bat: a box on the ground, its plunger up to the bat's underside.
    const push = under(a, 0.2)
    solid(p, ink, weight, bg)
    p.rect(push[0] * k, 0.43 * k, 0.2 * k, 0.14 * k, 0.02 * k)
    outline(p, ink, weight)
    p.line((push[0] - 0.14) * k, 0.5 * k, (push[0] + 0.14) * k, 0.5 * k)
    p.line(push[0] * k, 0.36 * k, push[0] * k, push[1] * k)
    solid(p, ink, weight, s.color)
    p.rect(push[0] * k, 0.36 * k, 0.07 * k, 0.03 * k)
    // The switch under the bat's tip: a tongue on a post that the sagging tip presses.
    const tongue = under(REST0, BAT)
    solid(p, ink, weight, s.color)
    p.rect(tongue[0] * k, (tongue[1] + 0.02 + 0.03 * pressed) * k, 0.1 * k, 0.025 * k)
    outline(p, ink, weight)
    p.line(tongue[0] * k, (tongue[1] + 0.03 + 0.03 * pressed) * k, tongue[0] * k, 0.5 * k)
    // The bat, hinged at its heel: a flat face, a tapered underside, a lip at the tip.
    p.push()
    p.translate(HINGE[0] * k, HINGE[1] * k)
    p.rotate(a)
    solid(p, ink, weight, s.color)
    p.beginShape()
    p.vertex(0, -TH * k)
    p.vertex((BAT - LIP_W) * k, -TH * k)
    p.vertex((BAT - LIP_W) * k, (-TH - LIP_H) * k)
    p.vertex(BAT * k, (-TH - LIP_H) * k)
    p.vertex(BAT * k, TH * 0.5 * k)
    p.vertex(0, TH * k)
    p.endShape(p.CLOSE)
    p.pop()
    solid(p, ink, weight, bg)
    p.circle(HINGE[0] * k, HINGE[1] * k, 0.06 * k)
    // The snap.
    if (since > 0 && since < 0.2) {
      const f = over(since, 0, 0.2)
      p.push()
      p.stroke(s.color)
      p.strokeWeight(weight)
      burst(p, LAUNCH_AT[0] * k, (LAUNCH_AT[1] - 0.04) * k, (0.12 + 0.16 * f) * k, (0.18 + 0.2 * f) * k, 5, 3.6)
      p.pop()
    }
  },
})
