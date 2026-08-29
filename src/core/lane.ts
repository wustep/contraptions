/**
 * Token travel as a primitive.
 *
 * A lane is a machine's declaration of how a token crosses it: straight
 * pieces in cell units (origin at the cell centre, y down, canonical hand
 * west → east), each with a speed, plus pauses where the machine does its
 * one thing. The world concatenates the lanes of a run, draws every token
 * once from the joined path, and sets each machine's phase so its clock
 * reads `fireAt` at the instant the token reaches its fire point.
 *
 * A machine never draws the token. That is what makes permanence and
 * hand-offs structural: a token cannot vanish at a seam, be drawn twice, or
 * disagree with its neighbour, because there is exactly one drawing of it,
 * on one path, by one clock. Same idea the tracks world uses for its balls.
 */

export type Pt = [number, number]

/** One straight piece of a token's path through a cell. */
export interface Piece {
  from: Pt
  to: Pt
  /** Cells per loop along the piece. Ignored when `hold` is set. */
  v: number
  /** A pause: the token sits at `from` for this loop fraction. `to` is ignored. */
  hold?: number
  /** The token is riding an elevator car on this piece; the world draws the car under it. */
  ride?: boolean
}

export interface Lane {
  pieces: Piece[]
  /**
   * Loop fraction into the lane at which the machine fires — the strike, the
   * catch, the release. Defaults to the start of the first hold, else the
   * moment the token first reaches x >= 0, else the end of the lane.
   */
  fire?: number
}

/** What a machine is told when asked for its lane. Sides are canonical (post-mirror). */
export interface LaneCtx {
  /** null: this cell is the feeder, the token starts here. */
  in: 'W' | 'N' | null
  /** null: this cell is the sink, the token ends here. */
  out: 'E' | 'S' | null
  /**
   * Loop fraction between consecutive tokens on this run. A feeder that holds
   * its next token for exactly this long, or a sink that rests the last one
   * for exactly this long, shows a token at all times: the next arrival
   * replaces the one that leaves at the same instant.
   */
  emit: number
  /** Height of the token's centre when it rolls on this catalog's floor. */
  floorY: number
  /** Place on an elevator stack, for shaft cells. */
  ride?: { index: number; floors: number }
}

/** Cells per loop a token rolls on a plain rail: 24 frames a cell at LOOP 240. */
export const ROLL_V = 10

export const roll = (from: Pt, to: Pt, v = ROLL_V): Piece => ({ from, to, v })
export const hold = (at: Pt, time: number): Piece => ({ from: at, to: at, v: 1, hold: time })
export const ride = (from: Pt, to: Pt, v: number): Piece => ({ from, to, v, ride: true })

/**
 * The shape of nearly every machine on a lane: roll in from the edge the
 * world hands the token over on, stop at `at` for `time` while the machine
 * does its one thing, roll on out the other edge.
 *
 * A closed inlet means this cell is the feeder, so the token waits in it for
 * exactly `emit` instead of rolling in; a closed outlet means it is the sink,
 * so the token rests for exactly `emit` at the end. That is what keeps a
 * token visible in the throat and in the cup at all times: the next one
 * replaces it at the same instant, at the same point.
 */
export function stopLane(
  ctx: LaneCtx,
  v: number,
  opts: { at?: number; time?: number; y?: number } = {},
): Lane {
  const y = opts.y ?? ctx.floorY
  const x = opts.at ?? 0
  const time = opts.time ?? 0
  const pieces: Piece[] = []
  if (ctx.in === null) pieces.push(hold([x, y], ctx.emit))
  else {
    pieces.push(roll(ctx.in === 'N' ? [0, -0.5] : [-0.5, y], [x, y], v))
    if (time > 0) pieces.push(hold([x, y], time))
  }
  if (ctx.out === null) pieces.push(hold([x, y], ctx.emit))
  else pieces.push(roll([x, y], ctx.out === 'S' ? [0, 0.5] : [0.5, y], v))
  return { pieces, fire: ctx.in === null ? ctx.emit : undefined }
}

const len = (p: Piece) => Math.hypot(p.to[0] - p.from[0], p.to[1] - p.from[1])

/** Loop fraction a piece takes. */
export const pieceTime = (p: Piece): number => (p.hold !== undefined ? p.hold : len(p) / p.v)

/** Loop fraction a whole lane takes. */
export const laneTime = (lane: Lane): number => lane.pieces.reduce((sum, p) => sum + pieceTime(p), 0)

export interface LanePoint {
  x: number
  y: number
  /** Riding a car. */
  ride: boolean
  /** Index of the piece the token is on. */
  piece: number
}

/** Where the token is `t` loop fractions into the lane. Clamped to the lane's ends. */
export function laneAt(lane: Lane, t: number): LanePoint {
  const { pieces } = lane
  let want = Math.max(0, t)
  for (let i = 0; i < pieces.length; i++) {
    const p = pieces[i]
    const dt = pieceTime(p)
    if (want <= dt || i === pieces.length - 1) {
      if (p.hold !== undefined) return { x: p.from[0], y: p.from[1], ride: !!p.ride, piece: i }
      const s = dt === 0 ? 1 : Math.min(1, want / dt)
      return {
        x: p.from[0] + (p.to[0] - p.from[0]) * s,
        y: p.from[1] + (p.to[1] - p.from[1]) * s,
        ride: !!p.ride,
        piece: i,
      }
    }
    want -= dt
  }
  const last = pieces[pieces.length - 1]
  return { x: last.to[0], y: last.to[1], ride: !!last.ride, piece: pieces.length - 1 }
}

/** Loop fraction into the lane at which its machine fires. See `Lane.fire`. */
export function laneFire(lane: Lane): number {
  if (lane.fire !== undefined) return lane.fire
  let acc = 0
  for (const p of lane.pieces) {
    if (p.hold !== undefined) return acc
    acc += pieceTime(p)
  }
  acc = 0
  for (const p of lane.pieces) {
    const dt = pieceTime(p)
    if (p.hold === undefined && p.from[0] < 0 && p.to[0] >= 0) {
      return acc + dt * ((0 - p.from[0]) / (p.to[0] - p.from[0]))
    }
    if (p.from[0] >= 0) return acc
    acc += dt
  }
  return acc
}

/** The same lane with x negated: the other hand. */
export const mirrorLane = (lane: Lane): Lane => ({
  fire: lane.fire,
  pieces: lane.pieces.map((p) => ({ ...p, from: [-p.from[0], p.from[1]], to: [-p.to[0], p.to[1]] })),
})
