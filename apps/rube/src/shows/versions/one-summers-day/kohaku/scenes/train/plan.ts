import { R } from '../../../../../../parts'
import { M } from '../../music'
import { lerp, smooth, type Pt } from '../../paint'
import { bez } from '../../path'
import { BATH, HALT, SEA_Y, SWAMP } from '../../geo'
import { trail } from '../../world/dragon'

/**
 * The plan of the train's run, as functions of show time: where the car is, when its door is open, where the seated
 * sit, and where the dragon's head goes at Swamp Bottom. Everything the scene's drawings and moves are built on, so
 * the car and the people in it, and the dragon and the girl on his back, cannot part.
 *
 * The run is cut by two dissolves (into the dusk at the lonely station, into the night at Swamp Bottom), across which
 * the train is somewhere further on: time has passed. Between them it is one smooth run: in from under the
 * bathhouse braking to the halt, away east at a steady pace, into the station braking, away again, and in to Swamp
 * Bottom.
 */

/** The car: its length, how high its floor is over the water, where its door is from its middle. */
export const CAR = { len: 4.6, floor: SEA_Y - 0.28, roof: SEA_Y - 1.28, door: 1.15, doorW: 0.5 }

/** The dissolves: into the car's dusk at the lonely station, and into the night at Swamp Bottom. */
export const INTO_DUSK = M.hush
export const INTO_NIGHT = M.return

/** Where the car stops: the halt, the lonely station, Swamp Bottom (its middle). */
export const HALT_STOP = 75.6 - CAR.door
export const LONELY_STOP = 150.4
export const SWAMP_STOP = 237.6 - CAR.door

/**
 * The lonely station's platform: across the track from us, long; its shelter and the girl at its west end, so the
 * car comes in past her, stops beyond her, and goes away east leaving her in the frame.
 */
export const STATION = { x0: 144.0, x1: 153.4, y: SEA_Y - 0.3, girl: 146.0, shelter: [144.5, 147.4] as [number, number] }

/** The times the car comes to rest and sets off again. */
export const ARRIVE_HALT = 147.52
export const LEAVE_HALT = 149.6
export const ARRIVE_LONELY = 162.97
export const LEAVE_LONELY = 164.6
export const ARRIVE_SWAMP = 175.75
export const LEAVE_SWAMP = 178.5

/** Its pace between stations, cells a second (about fifteen metres a second), and how fast it gets up to it. */
const V = 3.3
const ACCEL = 1.4

/** How long it takes to brake from V to rest. */
const BRAKE = 2.8

/** Steady at V, then braking evenly to rest at `x1` by `t1`: where it is at `t`. */
function braking(t: number, t1: number, x1: number): number {
  const s = t1 - t
  if (s <= 0) return x1
  if (s >= BRAKE) return x1 - (V * BRAKE) / 2 - V * (s - BRAKE)
  // The speed falls linearly to nothing: the distance still to go is V s² / (2 BRAKE).
  return x1 - (V * s * s) / (2 * BRAKE)
}

/** Setting off from rest at `x0` at `t0`: up to speed V at ACCEL, then steady. */
function leaving(t: number, t0: number, x0: number): number {
  const s = Math.max(0, t - t0)
  const ta = V / ACCEL
  if (s <= ta) return x0 + 0.5 * ACCEL * s * s
  return x0 + 0.5 * ACCEL * ta * ta + V * (s - ta)
}

/** The car's middle at `t`. */
export function carX(t: number): number {
  if (t < LEAVE_HALT) return braking(t, ARRIVE_HALT, HALT_STOP)
  if (t < INTO_DUSK) return leaving(t, LEAVE_HALT, HALT_STOP)
  if (t < LEAVE_LONELY) return braking(t, ARRIVE_LONELY, LONELY_STOP)
  if (t < INTO_NIGHT) return leaving(t, LEAVE_LONELY, LONELY_STOP)
  if (t < LEAVE_SWAMP) return braking(t, ARRIVE_SWAMP, SWAMP_STOP)
  return leaving(t, LEAVE_SWAMP, SWAMP_STOP)
}

/** How far the door is open (0 shut, 1 open): at each stop, a little after it comes to rest and before it goes. */
export function doorOpen(t: number): number {
  const at = (a: number, b: number) => smooth(t, a + 0.25, a + 0.6) * (1 - smooth(t, b - 0.7, b - 0.35))
  return Math.max(at(ARRIVE_HALT, LEAVE_HALT), at(ARRIVE_LONELY, LEAVE_LONELY), at(ARRIVE_SWAMP, LEAVE_SWAMP))
}

/** The bench along the car's far side: where a ball sits on it, `dx` from the car's middle. */
export const BENCH_Y = CAR.floor - 0.3
export const seatAt = (t: number, dx: number, r = R): Pt => [carX(t) + dx, BENCH_Y - r]
/** Their places on the bench, from the car's middle. */
export const HER_SEAT = 0.52
export const HIS_SEAT = 0.02

/** The halt: its deck's top, where a ball on it has its middle. */
export const HALT_TOP = HALT.y
/** Swamp Bottom's ground: the raised path from the platform's east end into the wood, and the cottage's clearing. */
export const GROUND_Y = SEA_Y - 0.18
export const ISLAND = { x0: SWAMP.x1 - 0.2, x1: 259.5 }
export const COTTAGE = { x0: 250.9, x1: 253.9, gate: 250.35 }

/** The boiler room's landing, at the bathhouse's east foot: a few boards at the water. */
export const LANDING = { x0: BATH.boiler.x1 - 0.9, x1: BATH.boiler.x1 + 1.1, y: SEA_Y - 0.28 }

/* ------------------------------------------------------------------ the lamp */

/** The lamp's hops: out of the trees to meet them (a hop an eighth), and back along the path ahead of them. */
export const LAMP_OUT: number[] = [179.88, 180.28, 180.65, 181.07, 181.44, 181.78, 182.15, 182.58, 182.98, 183.36]
export const LAMP_BACK: number[] = [184.49, 184.89, 185.28, 185.64, 186.0, 186.38, 186.76, 187.14, 187.51, 187.86, 188.22]
const LAMP_FROM = 245.7
const LAMP_MEET = SWAMP.x1 + 0.75
const LAMP_HOME = COTTAGE.gate + 0.15
const LAMP_AIR = 0.27

/** The lamp: where its foot is, how far through a hop (0 on the ground), and how far it leans in its bow. */
export function lampAt(t: number): { x: number; lift: number; bow: number; squash: number } {
  const hops = [...LAMP_OUT, ...LAMP_BACK]
  const xs: number[] = []
  LAMP_OUT.forEach((_, i) => xs.push(lerp(LAMP_FROM, LAMP_MEET, (i + 1) / LAMP_OUT.length)))
  LAMP_BACK.forEach((_, i) => xs.push(lerp(LAMP_MEET, LAMP_HOME, (i + 1) / LAMP_BACK.length)))
  let x = LAMP_FROM
  let lift = 0
  let squash = 0
  for (let i = 0; i < hops.length; i++) {
    const land = hops[i]
    const off = land - LAMP_AIR
    const from = i === 0 ? LAMP_FROM : xs[i - 1]
    if (t < off) {
      x = from
      // Crouching before it goes.
      squash = smooth(t, off - 0.12, off) * 0.6
      break
    }
    if (t < land) {
      const u = (t - off) / LAMP_AIR
      x = lerp(from, xs[i], u)
      lift = 4 * u * (1 - u) * 0.32
      squash = -0.25 * Math.sin(Math.PI * u)
      break
    }
    x = xs[i]
    // Landing: a squash that springs back.
    const s = t - land
    squash = s < 0.25 ? 0.8 * Math.sin((Math.PI * s) / 0.25) * (1 - s / 0.25) : 0
  }
  // It bows to her when it has come to her, and again at the cottage's gate as the dragon comes down.
  const bow = smooth(t, LAMP_OUT[LAMP_OUT.length - 1] + 0.15, LAMP_OUT[LAMP_OUT.length - 1] + 0.55) * (1 - smooth(t, 183.9, 184.3))
  return { x, lift, bow, squash }
}

/* ------------------------------------------------------------------ the dragon */

/** When he comes down over the trees, comes to rest by her, takes her up, and goes. */
export const DRAGON_FROM = 188.4
export const DRAGON_DOWN = 190.82
export const BOARD_OFF = 191.63
export const BOARD = 191.98
const DOWN_AT: Pt = [248.05, 3.0]
const HOVER_AT: Pt = [247.55, 3.04]

/** The dragon's head: in from high over the trees to the east, down to her, drifting, and up away west. */
export function headAt(t: number): Pt {
  if (t < DRAGON_FROM) {
    // Before he is seen: further back along the way he comes, high in the east.
    const s = DRAGON_FROM - t
    return [258.2 + s * 3.2, -3.9 - s * 1.2]
  }
  if (t < DRAGON_DOWN) {
    const u = (t - DRAGON_FROM) / (DRAGON_DOWN - DRAGON_FROM)
    const e = 1 - Math.pow(1 - u, 2.2)
    return bez([258.2, -3.9], [254.5, -2.8], [250.4, 2.9], DOWN_AT, e)
  }
  if (t < BOARD) {
    const u = smooth(t, DRAGON_DOWN, BOARD)
    return [lerp(DOWN_AT[0], HOVER_AT[0], u), lerp(DOWN_AT[1], HOVER_AT[1], u) - 0.04 * Math.sin(Math.PI * u)]
  }
  // Up and away west, gathering speed: the moon's way, home.
  const s = t - BOARD
  const vx = -0.5 - 1.6 * s
  return [HOVER_AT[0] + vx * s - 0.15 * s, HOVER_AT[1] - 0.25 * s - 1.05 * s * s]
}

/** He is flying west the whole time he is seen: his back to the sky that way. */
export const DRAGON_UP = -1

/** His spine at `t`. */
export const spineAt = (t: number): Pt[] => trail(headAt, t)

export const DRAGON_TO = M.summit
