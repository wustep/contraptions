import type p5 from 'p5'
import { LOOP } from '../../core/constants'
import { outline, solid } from '../../core/draw'
import { easeInOutCubic, easeOutCubic, mod, seg } from '../../core/ease'
import { LINK_DELAY, type Flow } from '../../core/wiring'

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

/** What every machine in the set keeps: its fill, and its place in a run if it has one. */
export interface Beat {
  color: string
  flow?: Flow
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
/** A wall stands this far from the centre line, a hair clear of the token. */
export const CLEAR = TOKEN / 2 + 0.05

/** A fall from rest over `dist` cells, then straight on at the exit speed. */
export const FALL_V = 16
export const dropTime = (dist: number) => (2 * dist) / FALL_V
export const drop = (from: number, dist: number, f: number) =>
  f <= 1 ? from + dist * f * f : from + dist + 2 * dist * (f - 1)

/** Loop fraction since the machine fired: 0 at the moment itself. */
export const since = (u: number, at: number) => mod(u - at, 1)
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
  const x0 = hasW ? -0.5 : -0.36
  const x1 = hasE ? 0.5 : 0.28
  outline(p, ink, weight)
  if (gap > 0) {
    if (x0 < -gap) p.line(x0 * k, FLOOR * k, -gap * k, FLOOR * k)
    if (hasE && x1 > gap) p.line(gap * k, FLOOR * k, x1 * k, FLOOR * k)
  } else p.line(x0 * k, FLOOR * k, x1 * k, FLOOR * k)
}
