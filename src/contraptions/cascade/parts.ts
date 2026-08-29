import type p5 from 'p5'
import { LOOP } from '../../core/constants'
import { clipCell, outline, solid } from '../../core/draw'
import { easeInOutCubic, easeOutCubic, mod, seg } from '../../core/ease'
import { LINK_DELAY, type Flow } from '../../core/wiring'
import {
  BOARD,
  CLEAR as RIDE_CLEAR,
  RIDE0,
  RIDE1,
  buffers,
  cable,
  car,
  carLocalY,
  guides,
  rideTravel,
  sheave,
} from '../../worlds/goldberg/elevator'

/**
 * The shared vocabulary of the cascade set.
 *
 * Every machine here is one beat in a chain reaction. A token arrives at the
 * cell's centre, the machine does its one thing, and the token leaves.
 * Between machines each cell draws the token on its own side of the hand-off.
 * The engine's conduit is hidden in this world — a centre-to-centre rail
 * punched through paddles and ran off the rim. Unchained, a machine runs the
 * whole beat by itself, so a lone cell and the catalog sheet still tell the
 * story.
 *
 * Units are cells, y down, with the token's centre line through the cell's
 * centre, because that is where the rails meet.
 */

/** A cell's place on an elevator stack. The composer stamps this on the pair. */
export type Ride = {
  /** 0 at the top cell. */
  index: number
  /** How many cells the car descends. */
  floors: number
  /** Loop fraction the top machine fires — the shared clock. */
  at: number
}

/** What every machine in the set keeps: its fill, and its place in a run if it has one. */
export interface Beat {
  color: string
  flow?: Flow
  ride?: Ride
}

export type Pt = [number, number]

/** Token diameter. The same bead the engine runs along a wire. */
export const TOKEN = 0.26
/** Loop fraction the token takes to cross one cell along a wire. */
export const LINK = LINK_DELAY / LOOP
/** Cells per loop it travels at. */
export const SPEED = 1 / LINK
/** Loop fraction from an edge to the centre at that speed. */
export const HALF = LINK / 2
/** Loop fraction for the token to clear an edge once its centre is on it. */
export const OVER = TOKEN / 2 / SPEED
/** Top of the floor a rolling token sits on: its centre is the cell's. */
export const FLOOR = TOKEN / 2
/** Half-width of the old painted shaft — kept so the catalog cup still compiles. */
export const SHAFT = 0.12
/** Half-width of a cup mouth at the rail. */
export const THROAT = 0.1

export { BOARD, RIDE0, RIDE1, RIDE_CLEAR }
/** A wall stands this far from the centre line, a hair clear of the token. */
export const CLEAR = TOKEN / 2 + 0.05

/** A fall from rest over `dist` cells, then straight on at the exit speed. */
export const FALL_V = 16
export const dropTime = (dist: number) => (2 * dist) / FALL_V
export const drop = (from: number, dist: number, f: number) =>
  f <= 1 ? from + dist * f * f : from + dist + 2 * dist * (f - 1)

/** Loop fraction since the machine fired: 0 at the moment itself. */
export const since = (u: number, at: number) => mod(u - at, 1)

/** A sink on an elevator fires when the car arrives, not when the top boarded. */
export const beat = (s: Beat, u: number, fire: number) => since(u, s.ride ? RIDE1 : fire)
/** Loop fraction until it next fires. */
export const until = (u: number, at: number) => mod(at - u, 1)

/** A flick: out fast, back with a settle. 1 at full stroke. */
export const flick = (t: number, out = 0.05, back = 0.09, done = 0.3) =>
  easeOutCubic(seg(t, 0, out)) - easeInOutCubic(seg(t, back, done))

/** A cubic bezier's coordinate at `f`. */
export const bez = (a: number, b: number, c: number, d: number, f: number) => {
  const g = 1 - f
  return g * g * g * a + 3 * g * g * f * b + 3 * g * f * f * c + f * f * f * d
}

/**
 * Which way the token travels, +1 for east. A run that drops out or falls in
 * takes its direction from whichever edge is sideways; a lone machine faces
 * east and leaves mirroring to the composer.
 */
export function heading(flow?: Flow): number {
  if (!flow) return 1
  if (flow.out === 'E' || (flow.out !== 'W' && flow.in === 'W')) return 1
  if (flow.out === 'W' || flow.in === 'E') return -1
  return 1
}

/** The token's colour: the run's when chained, so it is one ball down the line. */
export const tokenColor = (s: Beat) => s.flow?.color ?? s.color

export function token(p: p5, k: number, ink: string, weight: number, color: string, [x, y]: Pt): void {
  solid(p, ink, weight, color)
  p.circle(x * k, y * k, TOKEN * k)
}

/**
 * A machine's own token rolling in from the west edge to the centre, arriving
 * at `at`. Null once the wire is carrying it instead — unless `own`, for a
 * feed the machine supplies itself — or once it is outside the cell.
 */
export function rollIn(s: Beat, u: number, at: number, own = false): Pt | null {
  const closed = !!s.flow && s.flow.in == null && s.flow.out == null
  if ((closed || (s.flow && s.flow.in == null)) && !own) return null
  if (s.flow?.in === 'N' || s.flow?.in === 'S') return null
  const t = until(u, at)
  if (t > HALF + OVER) return null
  const dir = s.flow?.in === 'E' ? 1 : -1
  return [dir * t * SPEED, 0]
}

/** The same token rolling on from the centre to the east edge after `at`. */
export function rollOut(s: Beat, u: number, at: number): Pt | null {
  if (s.flow && s.flow.out == null) return null
  if (s.flow?.out === 'S' || s.flow?.out === 'N') return null
  const t = since(u, at)
  if (t > HALF + OVER) return null
  const dir = s.flow?.out === 'W' ? -1 : 1
  return [dir * t * SPEED, 0]
}

/** A lone machine's own token falling in from the top edge to the centre, arriving at `at`. */
export function fallIn(s: Beat, u: number, at: number): Pt | null {
  if (s.flow && s.flow.in !== 'N') return null
  const t = until(u, at)
  return t > (0.5 + TOKEN / 2) / FALL_V ? null : [0, -t * FALL_V]
}

/**
 * The floor the token rolls along. A closed leftover (catalog, unused cell)
 * draws none. On a run the rail only extends toward ports that exist.
 *
 * A source still draws rail under the feeder (not a mid-cell stub the
 * hopper/crank then floats on). A sink takes the incoming rail into the
 * receiver and stops — it does not grow an east stub, and it must not draw
 * a second rail on the cell floor. `gap` clears the middle only for a
 * machine that puts its own deck there (belt, bellows); a paddle keeps the
 * rail continuous so the wheel is mounted on it, not sat in a hole.
 */
export function floor(p: p5, k: number, ink: string, weight: number, s: Beat, gap = 0): void {
  if (s.flow && s.flow.in == null && s.flow.out == null) return
  const hasW = !s.flow || s.flow.in === 'W' || s.flow.out === 'W'
  const hasE = !s.flow || s.flow.in === 'E' || s.flow.out === 'E'
  const dropS = s.flow?.out === 'S'
  const x0 = dropS && !hasW ? -0.12 : hasW ? -0.5 : -0.36
  const x1 = dropS && !hasE ? 0.12 : hasE ? 0.5 : 0.4
  outline(p, ink, weight)
  if (gap > 0) {
    if (x0 < -gap) p.line(x0 * k, FLOOR * k, -gap * k, FLOOR * k)
    if (hasE && x1 > gap) p.line(gap * k, FLOOR * k, x1 * k, FLOOR * k)
  } else p.line(x0 * k, FLOOR * k, x1 * k, FLOOR * k)
}

export function rideOf(s: Beat): Ride | undefined {
  if (s.ride) return s.ride
  if (s.flow?.out === 'S' && s.flow.in !== 'N') return { index: 0, floors: 1, at: 0 }
  if (s.flow?.in === 'N' && s.flow.out !== 'S') return { index: 1, floors: 1, at: 0 }
  if (s.flow?.in === 'N' && s.flow.out === 'S') return { index: 0, floors: 1, at: 0 }
  return undefined
}

/** Passenger centre on this cell's car, or a roll on/off the rail. */
export function rideToken(s: Beat, u: number, at: number): Pt | null {
  const ride = rideOf(s)
  if (!ride) return null
  const t = since(u, ride.at)
  const travel = rideTravel(t, ride.floors)
  const y = carLocalY(travel, ride.index)
  const top = ride.index === 0
  const bot = ride.index === ride.floors

  if (top && t < BOARD) return rollIn(s, u, at) ?? (y !== null ? [0, y] : [0, 0])
  if (bot && t > RIDE_CLEAR) return rollOut(s, u, at) ?? (y !== null ? [0, 0] : null)
  if (y === null) return null
  return [0, y]
}

/** Guides, sheave, car. The token is drawn by the caller so sinks can hide it. */
export function drawElevator(p: p5, k: number, ink: string, weight: number, s: Beat, u: number): number | null {
  const ride = rideOf(s)
  if (!ride) return null
  const t = since(u, ride.at)
  const travel = rideTravel(t, ride.floors)
  const y = carLocalY(travel, ride.index)
  const top = ride.index === 0
  const bot = ride.index === ride.floors
  const y0 = top ? -0.12 : -0.5
  const y1 = bot ? FLOOR + 0.06 : 0.5
  const paint = s.flow?.color ?? s.color

  guides(p, k, ink, weight, y0, y1)
  if (top) {
    sheave(p, k, ink, weight, -0.14, travel * 6)
    if (y !== null) cable(p, k, ink, weight, -0.14, y - 0.14)
  } else if (y !== null) {
    cable(p, k, ink, weight, -0.5, y - 0.14)
  }
  if (bot) buffers(p, k, ink, weight, FLOOR + 0.08)
  if (y !== null) car(p, k, ink, weight, paint, y, TOKEN / 2)
  return y
}

export function drawRideToken(p: p5, k: number, ink: string, weight: number, s: Beat, u: number, at: number): void {
  clipCell(p, k, () => {
    const pos = rideToken(s, u, at)
    if (pos) token(p, k, ink, weight, tokenColor(s), pos)
  })
}
