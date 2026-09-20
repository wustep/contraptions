import { outline, solid } from '../../../../../src/core/draw'
import { easeInOutSine, easeInQuad, easeOutCubic, easeOutQuad } from '../../../../../src/core/ease'
import { FLOOR, R, ROLL, arrive, arriveAt, definePiece, fly, over, post, rail, ramp, wait, type Lane, type Pt } from '../../parts'
import { arcadeWater, flash, glow, lamp, score } from './neon'

/**
 * A dunk tank two floors tall. A seat stands over a tank of water on a
 * frame, level with the rail, hinged at the near upright and latched at
 * the far one; a target on an arm stands up off the far upright. The ball
 * rolls out onto the seat and stops; its weight sags the seat and pulls
 * the rod under it, the target arm swings over as if struck, the latch
 * lets go, and the seat drops away on its hinge: the ball falls into the
 * tank with a splash in the water's colour and is gone under it. The
 * drain flap at the tank's foot swings out and it rolls out onto the rail
 * a floor down, a few drops with it. The seat hangs; the target arm rises
 * slowly back, and the seat is winched up after it, for the next one.
 */
export interface DunkState {
  color: string
  water: string
}

/** The tank: its walls, its rim, its inside floor a floor down, where the water stands. */
const TANK_X0 = -0.38
const TANK_X1 = 0.24
const WALL = 0.04
const TANK_TOP = 0.55
const TANK_FLOOR = 1 + FLOOR
const WATER_Y = 0.68
/** The frame over it: uprights on the tank's rim to a bar under the cell's roof. */
const UP_W = 0.05
const UP_L = TANK_X0 + 0.03
const UP_R = TANK_X1 - 0.03
const BAR_Y = -0.42
/** The seat: hinged on the near upright, its plank out to the latch on the far one. */
const HINGE: Pt = [UP_L + UP_W / 2, FLOOR + 0.025]
const SEAT_L = UP_R - UP_W / 2 - HINGE[0] - 0.02
const SEAT_T = 0.05
/** The target: on an arm off the far upright, standing up when armed, swung over when struck. */
const PIVOT: Pt = [UP_R, -0.08]
const ARM = 0.22
const ARMED = -1.4
const STRUCK = 0.7
const TARGET = 0.075
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
/** The flap in the tank's far wall, hinged at its top; the ball's centre as it comes out under it. */
const FLAP_TOP = 1 - R - 0.02
const OUT: Pt = [TANK_X1 + 0.06, 1]
/** The arm goes back up from here, and the seat is winched up after it. */
const RESET = 1.2
const WINCH = RESET + 1.2

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
/** The target arm's angle: armed, swung over on the trip, and slowly back. */
function armAt(t: number): number {
  const s = t - (FIRE - TRIP)
  if (s < 0) return ARMED
  if (s < 0.12) return ARMED + (STRUCK - ARMED) * easeInQuad(s / 0.12)
  const since = t - FIRE
  if (since < RESET) return STRUCK
  return STRUCK + (ARMED - STRUCK) * easeInOutSine(over(since, RESET, RESET + 1.4))
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
    const arm = armAt(t)
    const dunked = since < FALL ? 0 : 1 - over(since, FALL + 1.4, FALL + 2.4)

    // The rail in, to the near upright; the rail out from the flap, on its post.
    rail(p, k, ink, weight, -0.5, UP_L)
    rail(p, k, ink, weight, TANK_X1, 0.5, TANK_FLOOR)
    post(p, k, ink, weight, 0.44, TANK_FLOOR, 1.5)
    // The tank: two walls and a floor in the colour, on legs; the water goes in front, in the over pass.
    solid(p, ink, weight, s.color)
    p.rect((TANK_X0 + WALL / 2) * k, ((TANK_TOP + TANK_FLOOR + 0.06) / 2) * k, WALL * k, (TANK_FLOOR + 0.06 - TANK_TOP) * k, 0.01 * k)
    p.rect((TANK_X1 - WALL / 2) * k, ((TANK_TOP + FLAP_TOP) / 2) * k, WALL * k, (FLAP_TOP - TANK_TOP) * k, 0.01 * k)
    p.rect(((TANK_X0 + TANK_X1) / 2) * k, (TANK_FLOOR + 0.03) * k, (TANK_X1 - TANK_X0) * k, 0.06 * k, 0.01 * k)
    for (const x of [TANK_X0 + 0.06, TANK_X1 - 0.06]) post(p, k, ink, weight, x, TANK_FLOOR + 0.06, 1.5)
    // The frame: uprights on the rim, the bar over, and a lamp on it that comes on at the dunk.
    solid(p, ink, weight, s.color)
    p.rect(UP_L * k, ((BAR_Y + TANK_TOP) / 2) * k, UP_W * k, (TANK_TOP - BAR_Y) * k, 0.01 * k)
    p.rect(UP_R * k, ((BAR_Y + TANK_TOP) / 2) * k, UP_W * k, (TANK_TOP - BAR_Y) * k, 0.01 * k)
    p.rect(((UP_L + UP_R) / 2) * k, BAR_Y * k, (UP_R - UP_L + UP_W) * k, 0.06 * k, 0.01 * k)
    glow(p, k, s.color, (UP_L + UP_R) / 2, BAR_Y, 0.16, dunked)
    lamp(p, k, ink, weight, s.color, bg, (UP_L + UP_R) / 2, BAR_Y, 0.04, dunked)
    // The latch on the far upright: a hook under the seat's end, dropped open at the trip.
    p.push()
    p.translate((UP_R - UP_W / 2) * k, (FLOOR + SEAT_T + 0.02) * k)
    p.rotate(since < 0 ? 0 : 1.3 * easeOutCubic(over(since, 0, 0.08)))
    outline(p, ink, weight * 1.1)
    p.line(0, 0, -0.07 * k, 0)
    p.line(-0.07 * k, 0, -0.07 * k, -0.04 * k)
    p.pop()
    // The seat: a plank on its hinge, and the rod under it that the sag pulls, to the far upright.
    p.push()
    p.translate(HINGE[0] * k, HINGE[1] * k)
    p.rotate(seat)
    solid(p, ink, weight, s.color)
    p.rect((SEAT_L / 2) * k, 0, SEAT_L * k, SEAT_T * k, 0.01 * k)
    outline(p, ink, weight * 0.8)
    p.line((SEAT_L * 0.55) * k, (SEAT_T / 2 + 0.01) * k, (SEAT_L * 0.55) * k, (SEAT_T / 2 + 0.06) * k)
    p.line((SEAT_L * 0.55) * k, (SEAT_T / 2 + 0.06) * k, (SEAT_L + 0.02) * k, (SEAT_T / 2 + 0.06) * k)
    p.pop()
    solid(p, ink, weight, ink)
    p.circle(HINGE[0] * k, HINGE[1] * k, 0.035 * k)
    // The target on its arm off the far upright: up when armed, over when struck.
    const tx = PIVOT[0] + ARM * Math.cos(arm)
    const ty = PIVOT[1] + ARM * Math.sin(arm)
    outline(p, ink, weight * 1.3)
    p.line(PIVOT[0] * k, PIVOT[1] * k, tx * k, ty * k)
    p.push()
    p.translate(tx * k, ty * k)
    p.rotate(Math.PI / 4)
    solid(p, ink, weight, s.color)
    p.rect(0, 0, TARGET * 2 * k, TARGET * 2 * k, 0.012 * k)
    p.pop()
    solid(p, ink, weight, ink)
    p.circle(PIVOT[0] * k, PIVOT[1] * k, 0.035 * k)
    flash(p, k, s.color, weight, PIVOT[0] + ARM * Math.cos(STRUCK), PIVOT[1] + ARM * Math.sin(STRUCK), t - FIRE + 0.02, 0.2, 0.08, 0.2)
    // The drain flap in the far wall, hinged at its top, swung out by the ball and shut behind it.
    p.push()
    p.translate((TANK_X1 - WALL / 2) * k, FLAP_TOP * k)
    p.rotate(-flapAt(t))
    solid(p, ink, weight, s.color)
    p.rect(0, ((TANK_FLOOR - FLAP_TOP) / 2) * k, WALL * k, (TANK_FLOOR - FLAP_TOP) * k, 0.01 * k)
    p.pop()
  },
  over: (p, s, { k, t, since, ink, weight }) => {
    // The water, in front of the ball: it goes in and is gone. The level comes up a hair with it in.
    const inTank = t > T_SPLASH ? 1 - over(t, T_FLAP + 0.1, T_FLAP + 0.6) : 0
    const level = WATER_Y - 0.03 * easeOutQuad(inTank)
    solid(p, ink, weight * 0.8, s.water)
    p.rect(((TANK_X0 + TANK_X1) / 2) * k, ((level + TANK_FLOOR) / 2) * k, (TANK_X1 - TANK_X0 - 2 * WALL + 0.01) * k, (TANK_FLOOR - level) * k)
    // The splash: drops up and back into the tank, and a ring on the surface.
    const splash = t - T_SPLASH
    if (splash > 0 && splash < 0.6) {
      p.noStroke()
      p.fill(s.water)
      for (const [vx, vy] of DROPS) {
        const y = SPLASH[1] + vy * splash + (G / 2) * splash * splash
        if (y > level) continue
        const x = Math.max(TANK_X0 + WALL + 0.02, Math.min(TANK_X1 - WALL - 0.02, SPLASH[0] + vx * splash))
        p.circle(x * k, y * k, 0.04 * k)
      }
      const f = over(splash, 0, 0.5)
      p.push()
      p.noFill()
      p.stroke(ink)
      p.strokeWeight(weight * 0.8 * (1 - f))
      p.ellipse(SPLASH[0] * k, level * k, (0.1 + 0.4 * f) * k, 0.05 * k)
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
    void since
  },
  // Over the frame's bar: on the tank it would lie across the water.
  scores: (p, s, { k, since, bg }) => score(p, k, s.color, bg, (UP_L + UP_R) / 2, BAR_Y + 0.1, '+200', since - FALL, 1),
})
