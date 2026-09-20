import { outline, solid } from '../../../../../src/core/draw'
import { easeInOutSine, easeInQuad, easeOutCubic, easeOutQuad } from '../../../../../src/core/ease'
import { FLOOR, R, ROLL, arrive, arriveAt, definePiece, fly, laneAt, over, post, rail, ramp, wait, type Lane, type Pt } from '../../parts'
import { arcadeWater, flash, glow, lamp, score } from './neon'

/**
 * A dunk tank two floors tall. A glass tank of water stands on a plinth,
 * and its walls go on up as a frame to a bar under the cell's roof. A seat
 * lies across the frame level with the rail, hinged on the near upright;
 * its far end rests on a tooth on the target's stem, and the target, a
 * paddle on a lever pivoted low on the far upright, leans in over the seat
 * at the ball's height. The ball rolls out along the seat and into the
 * paddle, and stops dead: the paddle takes its pace, teeters up over its
 * pivot and falls away outward, the tooth slides out from under the seat,
 * and the seat drops on its hinge. The ball falls into the tank with a
 * splash in the water's colour and is gone under it. The drain flap at the
 * tank's foot swings out and it rolls out onto the rail a floor down, a few
 * drops with it. The seat hangs, the paddle lies over on its rest; then the
 * seat is winched up and the paddle cocked back under it, for the next one.
 */
export interface DunkState {
  color: string
  water: string
}

/** The tank: its outer faces, its inside floor a floor down, where the water stands, and the plinth under it. */
const TANK_X0 = -0.38
const TANK_X1 = 0.24
const TANK_FLOOR = 1 + FLOOR
const WATER_Y = 0.68
const PLINTH = 0.09
/** The walls, one line each, carried on up past the rim as the frame's uprights, to the bar. */
const UP_L = TANK_X0 + 0.03
const UP_R = TANK_X1 - 0.03
const BAR_Y = -0.42
/** The seat: a plank hinged on the near upright, out to just short of the target's stem. */
const SEAT_T = 0.05
const HINGE: Pt = [UP_L, FLOOR + SEAT_T / 2]
const SEAT_L = UP_R - 0.07 - HINGE[0]
/** Where the ball stops on the seat, and the beats. */
const SEAT_X = -0.06
const ARRIVE = arriveAt(SEAT_X)
const SAG = 0.012
const SAG_T = 0.15
const TRIP = 0.12
const FIRE = ARRIVE + SAG_T + TRIP
const DROP_T = 0.25
const G = 10
const SPLASH: Pt = [0.02, WATER_Y]
const FALL = Math.sqrt((2 * (WATER_Y - SAG)) / G)
const T_SPLASH = FIRE + FALL
const SINK = 0.25
const REST = 0.12
const TO_FLAP = 0.12
const T_FLAP = T_SPLASH + SINK + REST + TO_FLAP
/** The flap: the foot of the far wall, hinged at its top; the ball's centre as it comes out under it. */
const FLAP_TOP = 1 - R - 0.02
const OUT: Pt = [TANK_X1 + 0.06, 1]
/** The seat is winched up from here, and the paddle cocked back under it after. */
const WINCH = 1.2
const COCK = WINCH + 0.9

const LANE: Lane = {
  segs: [
    ...arrive([-0.5, 0], [SEAT_X, 0]),
    { from: [SEAT_X, 0], to: [SEAT_X, SAG], dur: SAG_T, ease: 'out' },
    wait([SEAT_X, SAG], TRIP),
    fly([SEAT_X, SAG], SPLASH, FALL, (WATER_Y - SAG) / 4),
    { from: SPLASH, to: [0.1, 1], dur: SINK, ease: 'out', hidden: true },
    wait([0.1, 1], REST, { hidden: true }),
    { from: [0.1, 1], to: OUT, dur: TO_FLAP, hidden: true },
    ramp(OUT, [0.5, 1], 1.4, ROLL),
  ],
  fire: FIRE,
}

/**
 * The target: a paddle on a stem pivoted low on the far upright, leaning in
 * so its face is this far short of where the ball would stop. Its angle is
 * from straight up, clockwise: leaning in at rest, up over the pivot, and
 * out to its rest on the peg.
 */
const PIVOT: Pt = [UP_R, 0.3]
const PADDLE = 0.075
const NUDGE = 0.035
const FACE: Pt = [SEAT_X - NUDGE + R + PADDLE, 0]
const STEM = Math.hypot(PIVOT[0] - FACE[0], PIVOT[1] - FACE[1])
const LEAN = -Math.atan2(PIVOT[0] - FACE[0], PIVOT[1] - FACE[1])
const SLIP = 0.06
const OVER = 0.66
/** The tooth the seat's end rests on: this far up from the pivot, and out from the stem just so far that it is clear of the seat's end at the slip. */
const TOOTH_AT = 0.1
const TOOTH_TIP = (TOOTH_AT * Math.sin(SLIP - LEAN) + PIVOT[0] - (HINGE[0] + SEAT_L)) / Math.cos(SLIP - LEAN)
/** The peg on the far upright that the stem comes down on, this far up the stem. */
const PEG_AT = 0.1

/** When the ball's front meets the paddle, on its way to a stop, and the pace it still has. */
const T_HIT = (() => {
  let lo = 0
  let hi = ARRIVE
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2
    if (laneAt(LANE, mid).x < SEAT_X - NUDGE) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
})()
const V_HIT = (laneAt(LANE, T_HIT + 1e-4).x - laneAt(LANE, T_HIT).x) / 1e-4
/**
 * The teeter, from the hit to the slip: the paddle leaves at the ball's
 * pace and spends it climbing, to just short of upright, and a push that
 * grows as the seat's end bears on the tooth takes it over the top.
 */
const TEETER = FIRE - T_HIT
const CLIMB = -LEAN - 0.03
const SPEND = CLIMB / ((V_HIT / (STEM * Math.cos(LEAN))) * TEETER)
const PUSH = SLIP - LEAN - CLIMB * (1 - Math.exp(-1 / SPEND))
const W_SLIP = ((CLIMB / SPEND) * Math.exp(-1 / SPEND) + 3 * PUSH) / TEETER
/** Falling away after the slip, radians a second squared. */
const TOPPLE = 40

/** How far the seat has swung down on its hinge, radians. */
function seatAt(t: number): number {
  const sag = t < ARRIVE ? 0 : (SAG / (SEAT_X - HINGE[0])) * easeOutQuad(over(t, ARRIVE, ARRIVE + SAG_T))
  const since = t - FIRE
  if (since < 0) return sag
  if (since < DROP_T) return sag + (1.35 - sag) * easeInQuad(since / DROP_T)
  if (since < DROP_T + 0.3) return 1.35 + 0.08 * Math.sin((since - DROP_T) * 20) * Math.exp(-(since - DROP_T) * 8)
  if (since < WINCH) return 1.35
  return 1.35 * (1 - easeInOutSine(over(since, WINCH, WINCH + 0.9)))
}
/** The stem's angle: leaning in, struck and teetering over, falling away onto the peg with a bounce, and, much later, cocked slowly back. */
function stemAt(t: number): number {
  if (t <= T_HIT) return LEAN
  if (t < FIRE) {
    const f = (t - T_HIT) / TEETER
    return LEAN + CLIMB * (1 - Math.exp(-f / SPEND)) + PUSH * f * f * f
  }
  const since = t - FIRE
  const land = (-W_SLIP + Math.sqrt(W_SLIP * W_SLIP + 2 * TOPPLE * (OVER - SLIP))) / TOPPLE
  if (since < land) return SLIP + W_SLIP * since + (TOPPLE / 2) * since * since
  if (since < COCK) return OVER - 0.1 * Math.exp(-(since - land) * 9) * Math.abs(Math.sin((since - land) * 24))
  return OVER + (LEAN - OVER) * easeInOutSine(over(since, COCK, COCK + 1.2))
}
/** The flap's swing out, pushed by the ball, and shut again behind it. */
function flapAt(t: number): number {
  const s = t - T_FLAP + 0.03
  if (s < 0) return 0
  if (s < 0.1) return 1.1 * easeOutCubic(s / 0.1)
  if (s < 0.35) return 1.1
  return 1.1 * (1 - easeOutCubic(over(s, 0.35, 0.7)))
}
/** The splash: drops up out of the water and back, each on its own arc. */
const DROPS: [number, number][] = [
  [-0.9, -2.4],
  [-0.5, -3.0],
  [-0.15, -3.4],
  [0.2, -3.2],
  [0.6, -2.7],
  [1.0, -2.2],
  [-0.3, -1.8],
]

export const dunk = definePiece<DunkState>({
  name: 'dunk',
  points: 200,
  weight: 0.9,
  place: ({ color, fits, theme }) => {
    const cells: Pt[] = [
      [0, 0],
      [0, 1],
    ]
    if (!fits(cells, [1, 1])) return null
    return { cells, exit: { at: [1, 1], dir: 1 }, lane: LANE, state: { color, water: arcadeWater(theme) } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    const seat = seatAt(t)
    const stem = stemAt(t)
    const dunked = since < FALL ? 0 : 1 - over(since, FALL + 1.4, FALL + 2.4)

    // The rail in, to the near upright; the rail out from the flap, on its post.
    rail(p, k, ink, weight, -0.5, UP_L)
    rail(p, k, ink, weight, UP_R, 0.5, TANK_FLOOR)
    post(p, k, ink, weight, 0.44, TANK_FLOOR, 1.5)
    // The plinth, on legs; the water goes in front, in the over pass.
    for (const x of [TANK_X0 + 0.06, TANK_X1 - 0.06]) post(p, k, ink, weight, x, TANK_FLOOR + PLINTH, 1.5)
    solid(p, ink, weight, s.color)
    p.rect(((TANK_X0 + TANK_X1) / 2) * k, (TANK_FLOOR + PLINTH / 2) * k, (TANK_X1 - TANK_X0) * k, PLINTH * k, 0.01 * k)
    // The tank's walls and the frame over them, one line a side: the near one whole, the far one down to the flap; the bar across, and its lamp, on at the dunk.
    outline(p, ink, weight * 1.2)
    p.line(UP_L * k, BAR_Y * k, UP_L * k, TANK_FLOOR * k)
    p.line(UP_R * k, BAR_Y * k, UP_R * k, FLAP_TOP * k)
    p.line(UP_L * k, BAR_Y * k, UP_R * k, BAR_Y * k)
    glow(p, k, s.color, (UP_L + UP_R) / 2, BAR_Y, 0.16, dunked)
    lamp(p, k, ink, weight, s.color, bg, (UP_L + UP_R) / 2, BAR_Y, 0.04, dunked)
    // The drain flap, hinged at its top, swung out by the ball and shut behind it.
    p.push()
    p.translate(UP_R * k, FLAP_TOP * k)
    p.rotate(-flapAt(t))
    outline(p, ink, weight * 1.2)
    p.line(0, 0, 0, (TANK_FLOOR - FLAP_TOP) * k)
    p.pop()
    // The peg the stem comes down on.
    const pegX = PIVOT[0] + PEG_AT * Math.sin(OVER) + 0.045 * Math.cos(OVER)
    const pegY = PIVOT[1] - PEG_AT * Math.cos(OVER) + 0.045 * Math.sin(OVER)
    outline(p, ink, weight)
    p.line(UP_R * k, pegY * k, pegX * k, pegY * k)
    // The target: the stem on its pivot, the tooth under the seat's end, the paddle on top.
    p.push()
    p.translate(PIVOT[0] * k, PIVOT[1] * k)
    p.rotate(stem)
    outline(p, ink, weight * 1.3)
    p.line(0, 0, 0, -STEM * k)
    p.rotate(-LEAN)
    outline(p, ink, weight * 1.1)
    p.line(TOOTH_AT * Math.tan(LEAN) * k, -TOOTH_AT * k, -TOOTH_TIP * k, -TOOTH_AT * k)
    p.pop()
    solid(p, ink, weight, s.color)
    p.circle((PIVOT[0] + STEM * Math.sin(stem)) * k, (PIVOT[1] - STEM * Math.cos(stem)) * k, PADDLE * 2 * k)
    p.noStroke()
    p.fill(ink)
    p.circle((PIVOT[0] + STEM * Math.sin(stem)) * k, (PIVOT[1] - STEM * Math.cos(stem)) * k, 0.04 * k)
    solid(p, ink, weight, ink)
    p.circle(PIVOT[0] * k, PIVOT[1] * k, 0.035 * k)
    flash(p, k, s.color, weight, FACE[0] - PADDLE, 0, t - T_HIT, 0.2, 0.06, 0.18)
    // The seat: a plank on its hinge, its end on the tooth.
    p.push()
    p.translate(HINGE[0] * k, HINGE[1] * k)
    p.rotate(seat)
    solid(p, ink, weight, ink)
    p.rect((SEAT_L / 2) * k, 0, SEAT_L * k, SEAT_T * k, 0.01 * k)
    p.pop()
  },
  over: (p, s, { k, t, ink, weight }) => {
    // The water, in front of the ball: it goes in and is gone. The level comes up a hair with it in.
    const inTank = t > T_SPLASH ? 1 - over(t, T_FLAP + 0.1, T_FLAP + 0.6) : 0
    const level = WATER_Y - 0.03 * easeOutQuad(inTank)
    const inset = (weight * 0.6) / k
    const bed = TANK_FLOOR - inset
    p.noStroke()
    p.fill(s.water)
    p.rect(((UP_L + UP_R) / 2) * k, ((level + bed) / 2) * k, (UP_R - UP_L - 2 * inset) * k, (bed - level) * k)
    outline(p, ink, weight * 0.8)
    p.line((UP_L + inset) * k, level * k, (UP_R - inset) * k, level * k)
    // The splash: drops up and back into the tank, and a ring on the surface.
    const splash = t - T_SPLASH
    if (splash > 0 && splash < 0.6) {
      p.noStroke()
      p.fill(s.water)
      for (const [vx, vy] of DROPS) {
        const y = SPLASH[1] + vy * splash + (G / 2) * splash * splash
        if (y > level) continue
        const x = Math.max(UP_L + 0.04, Math.min(UP_R - 0.04, SPLASH[0] + vx * splash))
        p.circle(x * k, y * k, 0.04 * k)
      }
      const f = over(splash, 0, 0.5)
      p.push()
      p.noFill()
      p.stroke(ink)
      p.strokeWeight(weight * 0.8 * (1 - f))
      p.ellipse(SPLASH[0] * k, level * k, (0.1 + (2 * (UP_R - SPLASH[0]) - 0.16) * f) * k, 0.05 * k)
      p.pop()
    }
    // Drops off the flap as the ball comes out.
    const dripping = t - T_FLAP
    if (dripping > 0 && dripping < 0.5) {
      p.noStroke()
      p.fill(s.water)
      for (let i = 0; i < 3; i++) {
        const s0 = dripping - i * 0.08
        if (s0 < 0) continue
        const y = FLAP_TOP + 0.1 + (G / 2) * s0 * s0
        if (y > TANK_FLOOR) continue
        p.circle((TANK_X1 + 0.04 + i * 0.05 + 0.3 * s0) * k, y * k, 0.028 * k)
      }
    }
  },
  // Over the frame's bar: on the tank it would lie across the water.
  scores: (p, s, { k, since, bg }) => score(p, k, s.color, bg, (UP_L + UP_R) / 2, BAR_Y + 0.1, '+200', since - FALL, 1),
})
