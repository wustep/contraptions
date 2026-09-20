import type p5 from 'p5'
import { solid } from '../../../../../src/core/draw'
import { easeInOutSine, easeOutCubic } from '../../../../../src/core/ease'
import { FLOOR, R, ROLL, arrive, arriveAt, definePiece, over, post, rail, ramp, trace, wait, type Lane, type Pt } from '../../parts'
import { flash, glow, lamp, score } from './neon'

/**
 * A drop tower two floors tall. A car waits at the top of the mast with
 * its near door down as a gangway from the rail's end; the ball rolls in
 * and sits, and the door comes up behind it. The hoist takes it a little
 * higher with a clank, and holds it there — and lets go. Two floors of
 * free fall, the lamps down the mast flaring as the car passes each, and
 * the magnetic brakes at the foot catch it: a hard stop and a bounce,
 * two hundred. The far door drops onto the rail and the ball rolls out
 * of the car and on. Later the car is winched back up, slowly, for the
 * next one.
 *
 * The car's ride is one function of time, hoist, hold, fall, catch and
 * bounce, which the lane traces and the car is drawn from.
 */
/** The mast, its cap, and the lamps up it. */
const MAST_W = 0.1
const CAP_Y = -0.46
const LAMPS = [-0.25, 0.05, 0.35, 0.65, 0.95, 1.25, 1.55]
/** The car: its width, its floor's thickness, how high its doors and its front stand over the floor. */
const CAR_W = 0.36
const CAR_HALF = CAR_W / 2
const SLAB = 0.05
const DOOR_H = 0.24
const DOOR_T = 0.05
const FRONT_H = 0.11
/** Where the car is caught and stops; and the brakes at the foot: a fin on either face of the mast, from where they take hold down past where the car stops. */
const CATCH_Y = 1.8
const STOP_Y = 2
const FIN_W = 0.06
const FIN_X = MAST_W / 2 + FIN_W / 2
const FIN_TOP = CATCH_Y - 0.1
const FIN_FOOT = STOP_Y + R + SLAB + 0.08
const ARRIVE = arriveAt(0)
const SHUT = 0.2
const HOIST = 0.4
const LIFT = 0.1
const HOLD = 0.5
const G = 10
const FALL = Math.sqrt((2 * (CATCH_Y + LIFT)) / G)
const V_CATCH = G * FALL
const BRAKE = (2 * (STOP_Y - CATCH_Y)) / V_CATCH
const BOUNCE = 0.14
const SETTLE = 0.1
const OPEN = 0.15
const T_SHUT = ARRIVE
const T_HOIST = T_SHUT + SHUT
const T_HOLD = T_HOIST + HOIST
const T_RELEASE = T_HOLD + HOLD
const T_CATCH = T_RELEASE + FALL
const T_STOP = T_CATCH + BRAKE
const T_STILL = T_STOP + BOUNCE + SETTLE
const T_OPEN = T_STILL + OPEN
/** The car is winched back up from here. */
const RESET = 3

/** The ball's centre line in the car at `t`: the car's ride. */
function carY(t: number): number {
  if (t <= T_HOIST) return 0
  if (t < T_HOLD) return -LIFT * easeInOutSine(over(t, T_HOIST, T_HOLD))
  if (t < T_RELEASE) return -LIFT
  if (t < T_CATCH) {
    const s = t - T_RELEASE
    return -LIFT + (G / 2) * s * s
  }
  if (t < T_STOP) {
    const s = t - T_CATCH
    return CATCH_Y + V_CATCH * s - ((V_CATCH / BRAKE) * s * s) / 2
  }
  if (t < T_STOP + BOUNCE) return STOP_Y - 0.045 * Math.sin((Math.PI * (t - T_STOP)) / BOUNCE)
  const since = t - T_CATCH
  if (since < RESET) return STOP_Y
  return STOP_Y * (1 - easeInOutSine(over(since, RESET, RESET + 2.2)))
}
/** How far up each door stands: 1 shut, 0 lying flat as a gangway. */
const nearDoor = (t: number) => (t < T_SHUT ? 0 : t < T_HOIST ? easeOutCubic(over(t, T_SHUT, T_HOIST)) : t - T_CATCH < RESET + 2.2 ? 1 : 1 - easeOutCubic(over(t - T_CATCH, RESET + 2.2, RESET + 2.5)))
const farDoor = (t: number) => (t < T_STILL ? 1 : t - T_CATCH < RESET ? 1 - easeOutCubic(over(t, T_STILL, T_OPEN)) : easeOutCubic(over(t - T_CATCH, RESET, RESET + 0.3)))

const LANE: Lane = {
  segs: [
    ...arrive([-0.5, 0], [0, 0]),
    wait([0, 0], T_HOIST - ARRIVE),
    ...trace((t) => [0, carY(t)], T_HOIST, T_STILL, 64),
    wait([0, STOP_Y], OPEN),
    ramp([0, STOP_Y], [0.5, STOP_Y], 0, ROLL),
  ],
  fire: T_CATCH,
}

/** A door on the car's end at `x` (its hinge at the floor's edge), `up` of the way from flat to shut. */
function door(p: p5, k: number, ink: string, weight: number, color: string, x: number, y: number, side: 1 | -1, up: number): void {
  p.push()
  p.translate(x * k, y * k)
  p.rotate(side * (Math.PI / 2) * (1 - up))
  solid(p, ink, weight, color)
  p.rect((side * DOOR_T) / 2 * k, (-DOOR_H / 2) * k, DOOR_T * k, DOOR_H * k, 0.01 * k)
  p.pop()
}

export const freefall = definePiece<{ color: string }>({
  name: 'freefall',
  points: 200,
  weight: 0.9,
  place: ({ color, fits }) => {
    const cells: Pt[] = [
      [0, 0],
      [0, 1],
      [0, 2],
    ]
    if (!fits(cells, [1, 2])) return null
    return { cells, exit: { at: [1, 2], dir: 1 }, lane: LANE, state: { color } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    const y = carY(t)
    const floorY = y + R
    const caught = since < 0 ? 0 : 1 - over(since, 1.2, 2.2)

    // The rail in, to the gangway; the rail out from the far door, on its post.
    rail(p, k, ink, weight, -0.5, -CAR_HALF - DOOR_H)
    rail(p, k, ink, weight, CAR_HALF + DOOR_H, 0.5, STOP_Y + FLOOR)
    post(p, k, ink, weight, 0.44, STOP_Y + FLOOR, 2.5)
    // The mast, from the floor to its cap; the hoist's house on top.
    solid(p, ink, weight, s.color)
    p.rect(0, ((CAP_Y + 2.5) / 2) * k, MAST_W * k, (2.5 - CAP_Y) * k, 0.01 * k)
    p.rect(0, (CAP_Y + 0.05) * k, 0.3 * k, 0.12 * k, 0.02 * k)
    p.rect(0, 2.47 * k, 0.4 * k, 0.06 * k)
    // The lamps up the mast: each flares as the car falls past it, and dies down.
    for (const ly of LAMPS) {
      const passed = t > T_RELEASE && y + R > ly
      const at = passed ? T_RELEASE + Math.sqrt((2 * Math.max(0, ly - R + LIFT)) / G) : 0
      const lit = passed ? 1 - over(t - at, 0.15, 0.7) : 0
      if (lit > 0.02) glow(p, k, s.color, MAST_W / 2 + 0.05, ly, 0.1, lit)
      lamp(p, k, ink, weight, s.color, bg, MAST_W / 2 + 0.05, ly, 0.03, lit)
    }
    // The brakes at the foot: a fin on either face of the mast, behind the car, lit at the catch.
    for (const side of [-1, 1]) {
      glow(p, k, s.color, side * FIN_X, (FIN_TOP + FIN_FOOT) / 2, 0.16, caught)
      solid(p, ink, weight, caught > 0.5 ? s.color : bg)
      p.rect(side * FIN_X * k, ((FIN_TOP + FIN_FOOT) / 2) * k, FIN_W * k, (FIN_FOOT - FIN_TOP) * k, 0.01 * k)
    }
    // The car's back, its floor, and its two doors: the near one a gangway at the top, the far one at the foot.
    solid(p, ink, weight, s.color)
    p.rect(0, (floorY - (DOOR_H - 0.04) / 2) * k, (CAR_W - 0.02) * k, (DOOR_H - 0.04) * k, 0.02 * k)
    p.rect(0, (floorY + SLAB / 2) * k, CAR_W * k, SLAB * k, 0.01 * k)
    door(p, k, ink, weight, s.color, -CAR_HALF, floorY, -1, nearDoor(t))
    door(p, k, ink, weight, s.color, CAR_HALF, floorY, 1, farDoor(t))
    // The clank of the hoist, and the catch.
    flash(p, k, s.color, weight, 0, CAP_Y + 0.12, t - T_HOLD, 0.2, 0.06, 0.2)
    flash(p, k, s.color, weight, 0, STOP_Y + R, since - BRAKE, 0.25, 0.14, 0.34)
  },
  over: (p, s, { k, t, ink, weight }) => {
    // The car's front stands in front of the ball: it sits in the car.
    const y = carY(t)
    solid(p, ink, weight, s.color)
    p.rect(0, (y + R + SLAB - FRONT_H / 2) * k, CAR_W * k, FRONT_H * k, 0.015 * k)
    p.fill(ink)
    p.noStroke()
    p.rect(0, (y + R + SLAB - FRONT_H / 2) * k, (CAR_W - 0.08) * k, 0.025 * k)
  },
  // Beside the tower at the catch, over the rail out.
  scores: (p, s, { k, since, bg }) => score(p, k, s.color, bg, 0.5, STOP_Y - 0.5, '+200', since, 1),
})
