import type p5 from 'p5'
import { solid } from '../../../../../src/core/draw'
import { easeInOutSine, easeOutCubic } from '../../../../../src/core/ease'
import { FLOOR, R, ROLL, arrive, arriveAt, definePiece, over, post, rail, ramp, trace, wait, type Lane, type Pt } from '../../parts'
import { flash, glow, lamp, score } from './neon'

/**
 * A drop tower, two to four floors tall: the tallest there is room for. A
 * car waits at the top of the mast with its near door down as a gangway
 * from the rail's end; the ball rolls in and sits, and the door comes up
 * behind it. The hoist takes it a little higher with a clank, and holds
 * it there, the car starting to shiver on its latch — and lets go. Free
 * fall, under the one gravity whatever the height, so every floor more is
 * that much more speed: the lamps down the mast flare as the car passes
 * each, quicker and quicker, and the magnetic brakes at the foot catch
 * it: a hard stop and a bounce, two hundred. Off two floors that is one
 * hop. Off three and four the car is really moving, and the catch is as
 * much harder as the fall was longer: it is driven down the brakes past
 * where it rests, thrown back up higher, and hops again for every floor
 * more before it is still. The far door drops onto the rail and the ball
 * rolls out of the car and on. Later the car is winched back up, slowly,
 * a floor at a time, for the next one.
 *
 * The car's ride is one function of time, hoist, hold, fall, catch and
 * bounce, which the lane traces and the car is drawn from; there is one
 * for each height, and everything the taller ones add is nothing at two
 * floors, whose lane a saved show keeps time to. The shiver is side to
 * side and the car's alone: the ball sits still in it.
 */
/** The mast, its cap, and the lamps down it: from over the car to over the brakes, about this far apart. */
const MAST_W = 0.1
const CAP_Y = -0.46
const LAMP_TOP = -0.25
const LAMP_GAP = 0.3
/** The car: its width, its floor's thickness, how high its doors and its front stand over the floor. */
const CAR_W = 0.36
const CAR_HALF = CAR_W / 2
const SLAB = 0.05
const DOOR_H = 0.24
const DOOR_T = 0.05
const FRONT_H = 0.11
/** The brakes at the foot: a fin on either face of the mast. How far over the car's rest they take hold. */
const GRIP = 0.2
const FIN_W = 0.06
const FIN_X = MAST_W / 2 + FIN_W / 2
const ARRIVE = arriveAt(0)
const SHUT = 0.2
const HOIST = 0.4
const LIFT = 0.1
const HOLD = 0.5
const G = 10
/** The hop off the brakes after two floors, and how long it takes; of a hop's height, what the next one keeps. */
const HOP = 0.045
const HOP_T = 0.14
const REBOUND = 0.45
/** How far past its rest the car is driven, for each two-floor fall's worth of speed it has over the first. */
const DIP = 0.08
const SETTLE = 0.1
const OPEN = 0.15
const T_SHUT = ARRIVE
const T_HOIST = T_SHUT + SHUT
const T_HOLD = T_HOIST + HOIST
const T_RELEASE = T_HOLD + HOLD
/** The car shivers through the last of the hold, this far either way by the end. */
const SHIVER = 0.016
const SHIVER_T = 0.3
/** The car is winched back up from here, this long a floor. */
const RESET = 3
const WINCH = 1.1

/** A tower of one height: where the car is caught and stops, its clocks, its ride, and the lane that traces it. */
interface Tower {
  floors: number
  catchY: number
  stopY: number
  /** What it lands with, in two-floor falls: 1 for them. */
  hard: number
  dip: number
  brake: number
  tCatch: number
  tStill: number
  tOpen: number
  lamps: number[]
  /** The ball's centre line in the car at `t`: the car's ride. */
  ride: (t: number) => number
  lane: Lane
}

function tower(floors: number): Tower {
  const stopY = floors
  const catchY = floors - GRIP
  const fall = Math.sqrt((2 * (catchY + LIFT)) / G)
  const vCatch = G * fall
  const hard = (catchY + LIFT) / (2 - GRIP + LIFT)
  const dip = DIP * (hard - 1)
  const brake = (2 * (stopY + dip - catchY)) / vCatch
  const tCatch = T_RELEASE + fall
  const tStop = tCatch + brake
  // A hop for every floor past the first, each lower than the last and as much shorter as a hop that high is.
  // The first starts from as far down as the car was driven.
  const hops: { at: number; h: number; dur: number; sunk: number }[] = []
  let at = tStop
  for (let i = 0, h = HOP * hard; i < floors - 1; i++, h *= REBOUND) {
    const dur = HOP_T * Math.sqrt(h / HOP)
    hops.push({ at, h, dur, sunk: i ? 0 : dip })
    at += dur
  }
  const tStill = at + SETTLE
  const ride = (t: number): number => {
    if (t <= T_HOIST) return 0
    if (t < T_HOLD) return -LIFT * easeInOutSine(over(t, T_HOIST, T_HOLD))
    if (t < T_RELEASE) return -LIFT
    if (t < tCatch) {
      const s = t - T_RELEASE
      return -LIFT + (G / 2) * s * s
    }
    if (t < tStop) {
      const s = t - tCatch
      return catchY + vCatch * s - ((vCatch / brake) * s * s) / 2
    }
    for (const hop of hops) {
      if (t >= hop.at + hop.dur) continue
      return stopY + hop.sunk * (1 - easeOutCubic(over(t, hop.at, hop.at + hop.dur))) - hop.h * Math.sin((Math.PI * (t - hop.at)) / hop.dur)
    }
    const since = t - tCatch
    if (since < RESET) return stopY
    return stopY * (1 - easeInOutSine(over(since, RESET, RESET + WINCH * floors)))
  }
  const n = Math.round((floors - GRIP) / LAMP_GAP)
  return {
    floors,
    catchY,
    stopY,
    hard,
    dip,
    brake,
    tCatch,
    tStill,
    tOpen: tStill + OPEN,
    lamps: Array.from({ length: n + 1 }, (_, i) => LAMP_TOP + ((floors - GRIP) * i) / n),
    ride,
    lane: {
      segs: [
        ...arrive([-0.5, 0], [0, 0]),
        wait([0, 0], T_HOIST - ARRIVE),
        ...trace((t) => [0, ride(t)], T_HOIST, tStill, 32 * floors),
        wait([0, stopY], OPEN),
        ramp([0, stopY], [0.5, stopY], 0, ROLL),
      ],
      fire: tCatch,
    },
  }
}
/** Tallest first: the order they are tried in. */
const TOWERS = [4, 3, 2].map(tower)
/** A state that names no height is two floors: what a saved show holds is the colour and no more. */
const towerOf = (s: { floors?: number }): Tower => TOWERS.find((T) => T.floors === (s.floors ?? 2))!

/** How far up each door stands: 1 shut, 0 lying flat as a gangway. */
const nearDoor = (T: Tower, t: number) => {
  const up = RESET + WINCH * T.floors
  return t < T_SHUT ? 0 : t < T_HOIST ? easeOutCubic(over(t, T_SHUT, T_HOIST)) : t - T.tCatch < up ? 1 : 1 - easeOutCubic(over(t - T.tCatch, up, up + 0.3))
}
const farDoor = (T: Tower, t: number) => (t < T.tStill ? 1 : t - T.tCatch < RESET ? 1 - easeOutCubic(over(t, T.tStill, T.tOpen)) : easeOutCubic(over(t - T.tCatch, RESET, RESET + 0.3)))
/** The car's shiver on its latch, harder as the moment comes, and gone with it. */
const shiver = (t: number) => (t < T_RELEASE ? SHIVER * over(t, T_RELEASE - SHIVER_T, T_RELEASE) * Math.sin(t * 90) : 0)

/** A door on the car's end at `x` (its hinge at the floor's edge), `up` of the way from flat to shut. */
function door(p: p5, k: number, ink: string, weight: number, color: string, x: number, y: number, side: 1 | -1, up: number): void {
  p.push()
  p.translate(x * k, y * k)
  p.rotate(side * (Math.PI / 2) * (1 - up))
  solid(p, ink, weight, color)
  p.rect((side * DOOR_T) / 2 * k, (-DOOR_H / 2) * k, DOOR_T * k, DOOR_H * k, 0.01 * k)
  p.pop()
}

export const freefall = definePiece<{ color: string; floors?: number }>({
  name: 'freefall',
  points: 200,
  weight: 0.9,
  place: ({ color, fits }) => {
    for (const { floors, lane } of TOWERS) {
      const cells: Pt[] = []
      for (let i = 0; i <= floors; i++) cells.push([0, i])
      const exit: Pt = [1, floors]
      if (!fits(cells, exit)) continue
      return { cells, exit: { at: exit, dir: 1 }, lane, state: floors === 2 ? { color } : { color, floors } }
    }
    return null
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    const T = towerOf(s)
    const { floors, stopY } = T
    const y = T.ride(t)
    const floorY = y + R
    const x = shiver(t)
    const caught = since < 0 ? 0 : 1 - over(since, 1.2, 2.2)
    const ground = floors + 0.5
    const finTop = T.catchY - 0.1
    const finFoot = stopY + T.dip + R + SLAB + 0.08

    // The rail in, to the gangway; the rail out from the far door, on its post.
    rail(p, k, ink, weight, -0.5, -CAR_HALF - DOOR_H)
    rail(p, k, ink, weight, CAR_HALF + DOOR_H, 0.5, stopY + FLOOR)
    post(p, k, ink, weight, 0.44, stopY + FLOOR, ground)
    // The mast, from the floor to its cap, on a foot as much wider as it is taller; the hoist's house on top.
    solid(p, ink, weight, s.color)
    p.rect(0, ((CAP_Y + ground) / 2) * k, MAST_W * k, (ground - CAP_Y) * k, 0.01 * k)
    p.rect(0, (CAP_Y + 0.05) * k, 0.3 * k, 0.12 * k, 0.02 * k)
    p.rect(0, (ground - 0.03) * k, (0.3 + 0.05 * floors) * k, 0.06 * k)
    // The lamps down the mast: each flares as the car falls past it, and dies down.
    for (const ly of T.lamps) {
      const passed = t > T_RELEASE && y + R > ly
      const at = passed ? T_RELEASE + Math.sqrt((2 * Math.max(0, ly - R + LIFT)) / G) : 0
      const lit = passed ? 1 - over(t - at, 0.15, 0.7) : 0
      if (lit > 0.02) glow(p, k, s.color, MAST_W / 2 + 0.05, ly, 0.1, lit)
      lamp(p, k, ink, weight, s.color, bg, MAST_W / 2 + 0.05, ly, 0.03, lit)
    }
    // The brakes at the foot: a fin on either face of the mast, behind the car, from where they take hold down past where it is driven, lit at the catch.
    for (const side of [-1, 1]) {
      glow(p, k, s.color, side * FIN_X, (finTop + finFoot) / 2, 0.16, caught)
      solid(p, ink, weight, caught > 0.5 ? s.color : bg)
      p.rect(side * FIN_X * k, ((finTop + finFoot) / 2) * k, FIN_W * k, (finFoot - finTop) * k, 0.01 * k)
    }
    // The car's back, its floor, and its two doors: the near one a gangway at the top, the far one at the foot.
    solid(p, ink, weight, s.color)
    p.rect(x * k, (floorY - (DOOR_H - 0.04) / 2) * k, (CAR_W - 0.02) * k, (DOOR_H - 0.04) * k, 0.02 * k)
    p.rect(x * k, (floorY + SLAB / 2) * k, CAR_W * k, SLAB * k, 0.01 * k)
    door(p, k, ink, weight, s.color, x - CAR_HALF, floorY, -1, nearDoor(T, t))
    door(p, k, ink, weight, s.color, x + CAR_HALF, floorY, 1, farDoor(T, t))
    // The clank of the hoist, and the catch: as much bigger as the car came in faster.
    flash(p, k, s.color, weight, 0, CAP_Y + 0.12, t - T_HOLD, 0.2, 0.06, 0.2)
    flash(p, k, s.color, weight, 0, stopY + T.dip + R, since - T.brake, 0.25, 0.14, 0.34 * Math.sqrt(T.hard))
  },
  over: (p, s, { k, t, ink, weight }) => {
    // The car's front stands in front of the ball: it sits in the car.
    const y = towerOf(s).ride(t)
    const x = shiver(t)
    solid(p, ink, weight, s.color)
    p.rect(x * k, (y + R + SLAB - FRONT_H / 2) * k, CAR_W * k, FRONT_H * k, 0.015 * k)
    p.fill(ink)
    p.noStroke()
    p.rect(x * k, (y + R + SLAB - FRONT_H / 2) * k, (CAR_W - 0.08) * k, 0.025 * k)
  },
  // Beside the tower at the catch, over the rail out.
  scores: (p, s, { k, since, bg }) => score(p, k, s.color, bg, 0.5, towerOf(s).stopY - 0.5, '+200', since, 1),
})
