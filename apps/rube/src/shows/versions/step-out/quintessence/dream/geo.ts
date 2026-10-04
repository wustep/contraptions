import { laneAt, type Pt, type Seg } from '../../../../../parts'
import { carried, route, type Way } from '../kit'
import { at, SEAM } from '../music'
import { G } from '../physics'
import { drain, ease } from './pen'

/**
 * The daydream's clock and its ground (10.363 → 23.74, bars 1 to 8, the band coming in): where everything is, and
 * when, in the place's own cells (the ball comes in at (-0.5, 0), sitting on the lip of the platform).
 *
 * The ground, left to right: the night platform (its lip at `LIP`), the tracks sunk below it, a low fence, the
 * pavement, and the burning building across the way, drawn cut open: the room he leaps into on its first floor, the
 * dumbwaiter's shaft at the room's back, the shop below with its door onto the pavement. Cheryl waits on the pavement
 * by the fence.
 */

/* ------------------------------------------------------------------ the clock */

export const T0 = SEAM.dream
export const T1 = SEAM.office

/** On the band's first downbeat, the window across the way blows out, and he goes. */
export const BURST = at(1, 1)
/** He leaves the lip. */
export const TAKEOFF = at(1, 3)
/** Into the window, down on the room's floor. */
export const LAND_IN = at(2, 1)
/** A burning joist comes down behind him. */
export const BEAM = at(2, 3)
/** Into the dumbwaiter's car beside the dog: the car sags on its rope as it takes him. */
export const CAR_IN = at(3, 1)
/** The car's gate drops shut. */
export const GATE = at(3, 2)
/** The brake lets go: his weight takes the car down. */
export const BRAKE = at(3, 3)
/** The car comes down on its buffer in the shop below. */
export const CAR_DOWN = at(4, 3)
/** The gate goes up. */
export const GATE_UP = at(4, 4)
/** He bangs the shop's door open onto the pavement. */
export const DOOR = at(5, 3)
/** He stops beside Cheryl; the dog's last hop lands it at her side. */
export const DOG_HOME = at(6, 1)
/** The empty car, lighter than its counterweight, goes back up and knocks its top stop. */
export const CAR_BACK = at(6, 3)
/** The colour starts to go: the fire's last flare, and it greys. */
export const DRAIN = at(8, 1)
/** He leaps back across, and lands on the platform. */
export const LEAP_BACK = at(8, 2)
export const LAND_BACK = at(8, 4)

/** The fire's flares: a window blowing out, the roof going up. [show time, which source]. */
export const FLARES: [number, number][] = [
  [BURST, 0],
  [at(4, 1), 1],
  [at(5, 1), 2],
  [at(7, 1), 1],
  [at(7, 3), 0],
]

/** How far the colour has drained, 0 to 1: from the last bar's downbeat to just before the cut. */
export const drained = (t: number): number => ease((t - DRAIN) / 1.45)
/** Every colour in the daydream on its way to the canvas: past true until the last bar, then grey. */
export const toneAt = (t: number) => {
  const d = drained(t)
  return (hex: string) => (d <= 0 ? hex : drain(hex, d, 1 - 0.22 * d))
}

/* ------------------------------------------------------------------ the ground */

/** The platform's deck (he sits on it at y 0) and its lip. */
export const DECK = 0.13
export const LIP = -0.5 + (2.2 / 2) * (TAKEOFF - BURST)
export const PLAT_X0 = -9
/** The tracks: their bed, sunk below the deck, from the lip to the fence. */
export const BED = 1.0
export const FENCE = 2.2
/** The pavement and the shop floor, one level. */
export const STREET = 0.75
/** The building: its front wall's outer face, its thickness, and its floors. */
export const BX = 4.0
export const WALL = 0.35
export const ROOM = -1.6
export const SLAB = 0.3
export const CEIL = -4.0
export const TOP_FLOOR = CEIL - SLAB
export const ROOF = -6.6
export const BX1 = 8.8
/** The dumbwaiter's shaft. */
export const SX0 = 7.45
export const SX1 = 8.45
/** How far the car goes down: the room's floor to the shop's. */
export const DROP = STREET - ROOM
/** The window he goes in by, and the shop's door. */
export const WIN: [number, number] = [-2.95, ROOM]
export const DOORWAY: [number, number] = [-0.6, STREET]

/** Where he lands inside the window, where he rests in the car, where he stops beside Cheryl. */
const IN_X = 4.65
export const CAR_X = 7.65
export const STOP_X = 3.25
export const CHERYL_AT: Pt = [2.6, STREET - 0.13]
export const DOG_HOME_X = 2.93
export const DOG_IN_CAR = 8.17

/* ------------------------------------------------------------------ the car */

const knockRing = (s: number, f: number, tau: number) => (s < 0 ? 0 : Math.exp(-s / tau) * Math.sin(s * f * Math.PI * 2))

/** How far below the room's floor the car's floor is at `t`. */
export function carY(t: number): number {
  if (t < CAR_IN) return 0
  const sIn = t - CAR_IN
  // It sags as it takes him, and shivers at the gate.
  let y = 0.04 * (1 - Math.exp(-sIn / 0.05)) + 0.022 * knockRing(sIn, 4.5, 0.2) + 0.012 * knockRing(t - GATE, 6, 0.12)
  const sag = 0.04 * (1 - Math.exp(-(BRAKE - CAR_IN) / 0.05))
  if (t >= BRAKE) {
    const T = CAR_DOWN - BRAKE
    const u = Math.min(1, (t - BRAKE) / T)
    // Slow off the brake, gathering; onto the buffer with some speed left.
    const f = u * u * (2 - u)
    const D = DROP - sag
    y = sag + D * f
    if (t >= CAR_DOWN) {
      const v = (D * 1) / T
      const w = 3 * Math.PI * 2
      y = DROP + (v / w) * knockRing(t - CAR_DOWN, 3, 0.12)
    }
  }
  if (t >= CAR_BACK - 0.7) {
    // Empty, it goes back up, lighter than its weight, and knocks its top stop.
    const u = Math.min(1, (t - (CAR_BACK - 0.7)) / 0.7)
    const f = u * u * (2 - u)
    y = DROP * (1 - f)
    if (t >= CAR_BACK) y = -0.03 * knockRing(t - CAR_BACK, 3.5, 0.12)
  }
  return y
}

/* ------------------------------------------------------------------ the way */

const vLand = (IN_X - LIP) / (LAND_IN - TAKEOFF)
// Rolling through the room: from the landing's speed down to `vMid` at the joist, then to rest in the car.
const vMid = (CAR_X - IN_X - (vLand / 2) * (BEAM - LAND_IN)) / ((BEAM - LAND_IN) / 2 + (CAR_IN - BEAM) / 2)
const MID_X = IN_X + ((vLand + vMid) / 2) * (BEAM - LAND_IN)
// Out of the car: from rest to the door, banging it open; slowed by it, on to beside her.
const V_GO = 2.6
const GO_X = CAR_X - (V_GO / 2) * (at(5, 1) - GATE_UP)
const DOOR_X = BX + WALL + 0.13
const V_DOOR = (2 * (GO_X - DOOR_X)) / (DOOR - at(5, 1)) - V_GO
const V_AFTER = (2 * (DOOR_X - STOP_X)) / (DOG_HOME - DOOR)
// Back across: a flight onto the deck, and a roll to rest at the lip where he began.
const T_BACK = LAND_BACK - LEAP_BACK
const T_REST = T1 - LAND_BACK
// Land at L and roll to rest at -0.5: L + 0.5 = |vx| T_REST / 2, |vx| = (STOP_X - L) / T_BACK.
export const BACK_X = (-0.5 * 2 * T_BACK + STOP_X * T_REST) / (2 * T_BACK + T_REST)
const V_BACK = (STOP_X - BACK_X) / T_BACK
const Y_STREET = STREET - 0.13
const Y_ROOM = ROOM - 0.13

export interface DreamWay {
  segs: Seg[]
  /** Where he is at show time `t`. */
  at: (t: number) => Pt
}

export function dreamWay(): DreamWay {
  const ways1: Way[] = [
    { at: BURST, p: [-0.5, 0] },
    { at: TAKEOFF, p: [LIP, 0], ramp: [0, 2.2] },
    { at: LAND_IN, p: [IN_X, Y_ROOM], arc: (G * (LAND_IN - TAKEOFF) ** 2) / 8 },
    { at: BEAM, p: [MID_X, Y_ROOM], ramp: [vLand, vMid] },
    { at: CAR_IN, p: [CAR_X, Y_ROOM], ramp: [vMid, 0] },
  ]
  const inCar = (t: number): Pt => [CAR_X, Y_ROOM + carY(t)]
  const out = inCar(GATE_UP)
  const ways2: Way[] = [
    { at: GATE_UP, p: out },
    { at: at(5, 1), p: [GO_X, Y_STREET], ramp: [0, V_GO] },
    { at: DOOR, p: [DOOR_X, Y_STREET], ramp: [V_GO, V_DOOR] },
    { at: DOG_HOME, p: [STOP_X, Y_STREET], ramp: [V_AFTER, 0] },
    { at: LEAP_BACK, p: [STOP_X, Y_STREET] },
    { at: LAND_BACK, p: [BACK_X, 0], arc: (G * T_BACK ** 2) / 8 },
    { at: T1, p: [-0.5, 0], ramp: [V_BACK, 0] },
  ]
  const segs = [...route(ways1), ...carried(inCar, CAR_IN, GATE_UP, 90), ...route(ways2)]
  const pos = (t: number): Pt => {
    const q = laneAt({ segs, fire: 0 }, t - T0)
    return [q.x, q.y]
  }
  return { segs, at: pos }
}

/** The lane begins at the slot's start: he sits on the lip from the cut to the downbeat (the same instant here). */
export const WAY = dreamWay()

/* ------------------------------------------------------------------ the dog */

export interface DogPose {
  x: number
  /** The floor it stands on. */
  y: number
  /** 1 facing right, -1 left. */
  face: number
  /** 0 standing, 1 running (its lope), 2 sitting. */
  pose: 0 | 1 | 2
  /** The lope's phase, 0..1. */
  phase: number
  /** Lift off the floor (a hop). */
  lift: number
  /** How hard it is shaking (in the fire). */
  shake: number
}

const DOG_GO = GATE_UP + 0.12
/** The three-legged dog: in the car, carried down with him, then out past him to Cheryl. */
export function dogAt(t: number): DogPose {
  if (t < DOG_GO) {
    const y = ROOM + carY(t)
    return { x: DOG_IN_CAR, y, face: -1, pose: 0, phase: 0, lift: 0, shake: t < CAR_IN ? 1 : t < CAR_DOWN ? 0.6 : 0.2 }
  }
  if (t < DOG_HOME) {
    const s = (t - DOG_GO) / (DOG_HOME - DOG_GO)
    const f = s * s * (3 - 2 * s)
    const x = DOG_IN_CAR + (DOG_HOME_X - DOG_IN_CAR) * f
    // A three-legged lope: one long bound to every two of a dog's, a little hop each.
    const phase = ((t - DOG_GO) * 3.2) % 1
    const lift = Math.sin(phase * Math.PI) * 0.07 * Math.min(1, s * 6) * Math.min(1, (1 - s) * 8 + 0.2)
    return { x, y: STREET, face: -1, pose: 1, phase, lift, shake: 0 }
  }
  return { x: DOG_HOME_X, y: STREET, face: -1, pose: 0, phase: 0, lift: 0, shake: 0 }
}

/* ------------------------------------------------------------------ the joist */

/** The burning joist: in the ceiling, then down behind him on BEAM. Returns its top's y. */
export function joistY(t: number): number {
  const top = CEIL + 0.1
  const floor = ROOM - 0.12
  const t0 = BEAM - Math.sqrt((2 * (floor - top)) / G)
  if (t <= t0) return top
  if (t >= BEAM) return floor
  const s = t - t0
  return top + 0.5 * G * s * s
}
export const JOIST_X: [number, number] = [4.55, 5.8]

/* ------------------------------------------------------------------ strikes */

export const DREAM_STRIKES: number[] = [
  BURST,
  LAND_IN,
  BEAM,
  CAR_IN,
  GATE,
  BRAKE,
  ...FLARES.slice(1).map(([t]) => t),
  CAR_DOWN,
  GATE_UP,
  DOOR,
  DOG_HOME,
  CAR_BACK,
  DRAIN,
  LAND_BACK,
].sort((a, b) => a - b)
