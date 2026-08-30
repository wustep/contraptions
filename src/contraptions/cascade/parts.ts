import type p5 from 'p5'
import { LOOP } from '../../core/constants'
import { outline, solid } from '../../core/draw'
import { easeInOutCubic, easeOutCubic, mod, seg } from '../../core/ease'
import { ROLL_V, hold, pieceTime, roll, stopLane, type Lane, type LaneCtx, type Piece } from '../../core/lane'
import { LINK_DELAY, type Flow } from '../../core/wiring'

/**
 * The shared vocabulary of the cascade set.
 *
 * Every machine here is one beat in a chain reaction: the ball arrives, the
 * machine does its one thing, the ball leaves. **No machine draws the ball.**
 * A machine declares where the ball goes — a `lane`, in cell units, in the
 * canonical hand (west → east) — and the world draws every ball on the joined
 * path of the whole snake, from one clock. That is what makes object
 * permanence structural: a ball cannot vanish at a seam, be drawn twice, or
 * disagree with its neighbour, because there is exactly one drawing of it.
 *
 * A machine that is happy to be crossed in a straight line at floor height
 * declares nothing and gets the world's default. Declare a lane when the ball
 * should follow your geometry — wait in a throat, drop off a lip, ride a car,
 * rest in a cup — and `hold` where the machine acts, so `fireAt` lands there.
 *
 * Units are cells, y down, with the ball's centre line through the cell's
 * centre, because that is where the rails meet.
 */

/** What every machine in the set keeps: its fill, and its place in a run if it has one. */
export interface Beat {
  color: string
  flow?: Flow
}

export type Pt = [number, number]

/** Token diameter. */
export const TOKEN = 0.26
/** Height of a rolling ball's centre: the cell's own centre line. */
export const LANE_Y = 0
/** Cells per loop a ball rolls at. 24 frames to cross a cell. */
export const SPEED = ROLL_V
/** Loop fraction the ball takes to cross one cell. */
export const LINK = LINK_DELAY / LOOP
/** Loop fraction from an edge to the centre at that speed. */
export const HALF = LINK / 2
/** Top of the floor a rolling ball sits on: its centre is the cell's. */
export const FLOOR = TOKEN / 2
/** Height of the sheave in an elevator's top cell. The world hangs the car off it. */
export const SHEAVE_Y = -0.34

/** Cells per loop a ball falls at once it has left a lip. */
export const FALL_V = 16

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
 * The lane the world gives a machine that declares none, and the base for one
 * that only wants a pause: roll in, stop at `at` for `time`, roll on.
 */
export const rollLane = (ctx: LaneCtx, opts: { at?: number; time?: number; y?: number } = {}): Lane =>
  stopLane(ctx, SPEED, opts)

/**
 * The lane of a machine the ball leans on: roll in, ride whatever is under it
 * — a pedal, a lever, a pan — down by `by` and back up, roll on. Declaring the
 * dip instead of a flat hold is what keeps the ball *on* the part: a pedal
 * that gives way under a ball hanging in mid-air reads as two machines.
 * The machine fires as the ball lands, so `since(u, fireAt)` is the press.
 *
 * On a sink the ball never rolls on, so the dip and the rest after it come to
 * exactly `emit` and the seat is occupied at every instant of the loop.
 */
export function dipLane(
  ctx: LaneCtx,
  opts: { at?: number; by: number; down?: number; wait?: number; up?: number },
): Lane {
  const y = ctx.floorY
  const x = opts.at ?? 0
  const down = opts.down ?? 0.03
  const wait = opts.wait ?? 0.1
  const up = opts.up ?? 0.06
  const low: Pt = [x, y + opts.by]
  const pieces: Piece[] = [
    ctx.in === null ? hold([x, y], ctx.emit) : roll(ctx.in === 'N' ? [0, -0.5] : [-0.5, y], [x, y], SPEED),
    roll([x, y], low, opts.by / down),
    hold(low, wait),
    roll(low, [x, y], opts.by / up),
  ]
  if (ctx.out !== null) pieces.push(roll([x, y], ctx.out === 'S' ? [0, 0.5] : [0.5, y], SPEED))
  else pieces.push(hold([x, y], Math.max(0, ctx.emit - down - wait - up)))
  return { pieces, fire: pieceTime(pieces[0]) }
}

/**
 * A ball. The world draws every ball on a lane; this is for the multi-cell
 * machines that carry their own, and for the catalog sheet.
 */
export function token(p: p5, k: number, ink: string, weight: number, color: string, [x, y]: Pt): void {
  solid(p, ink, weight, color)
  p.circle(x * k, y * k, TOKEN * k)
}

/**
 * The floor the ball rolls along. A closed leftover (catalog, unused cell)
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
  const catchN = s.flow?.in === 'N'
  const x0 = dropS && !hasW ? -0.18 : catchN && !hasW ? 0.18 : hasW ? -0.5 : -0.36
  const x1 = dropS && !hasE ? 0.18 : catchN && !hasE ? -0.18 : hasE ? 0.5 : 0.4
  outline(p, ink, weight)
  if (gap > 0) {
    if (x0 < -gap) p.line(x0 * k, FLOOR * k, -gap * k, FLOOR * k)
    if (hasE && x1 > gap) p.line(gap * k, FLOOR * k, x1 * k, FLOOR * k)
  } else p.line(x0 * k, FLOOR * k, x1 * k, FLOOR * k)
}
