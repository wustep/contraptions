import type { Rng } from '../../../src/core/rng'
import type { Theme } from '../../../src/core/themes'
import { ballAt, type BallChange, type BallState, type Lane, type Piece, type Placement, type Pt, type Taste } from './parts'
import { portalPlacement } from './pieces/portal'

/**
 * The planner: one map, one chain, carved into a box of cells.
 *
 * A map is a self-avoiding walk of pieces from a portal to a portal. Each
 * piece proposes its own footprint and hand-off, the planner checks the
 * cells are free and inside the box, and the ball's heading is carried
 * along — a piece that reverses (a scoop, a drop that turns back) flips it,
 * and the next piece is mirrored to match. The ball's state rides along
 * too: a piece that recolours it, or hands the thread to another ball, is
 * told what arrives and says what leaves. When nothing fits, or the map has
 * had its beats, the walk ends in a portal, and a portal is always a door
 * to a whole new map. Dead ends are what portals are for.
 */

export interface Box {
  x0: number
  y0: number
  x1: number
  y1: number
}

/** One placed piece, in world cells, with its lane still in the canonical hand. */
export interface Placed {
  piece: Piece<any>
  state: unknown
  /** The entry cell. */
  col: number
  row: number
  /** 1 eastbound, -1 westbound. The piece draws canonically either way. */
  mirror: 1 | -1
  /** World cells occupied. */
  cells: Pt[]
  lane: Lane
  /** Seconds from the universe's start at which the ball enters. Set by the universe. */
  start: number
  span: number
  /** The ball as it arrives, and what this piece does to it. */
  ballIn: BallState
  changes: BallChange[]
}

export interface PlanCtx {
  rng: Rng
  theme: Theme
  taste: Taste
  catalog: Piece<any>[]
  /** Colours a piece may take. */
  colors: string[]
  /** Colour of the portals. */
  portalColor: string
  /** The ball as it comes out of the first portal. */
  ball: BallState
  /** How keen this map is on the pieces that change the ball, and how many it may have. */
  dynamics: { boost: number; cap: number }
}

/** The pieces that change the ball itself. Rare enough to stay special. */
export const DYNAMIC = new Set(['painter', 'cradle', 'inverter'])
/** The pieces that throw, fling or carry the ball somewhere else: the tempo's accents. */
export const FLIGHT = new Set(['cannon', 'trebuchet', 'trampoline', 'plunger', 'flipper', 'rocket', 'zipline', 'trapeze', 'toaster', 'loop'])

export interface ChainSpec {
  box: Box
  /** Beats to aim for; the box may cut it short. */
  beats: number
}

const key = (c: number, r: number) => `${c}:${r}`

/** Turn a canonical placement into world cells for a heading. */
export const worldCells = (cells: Pt[], col: number, row: number, mirror: 1 | -1): Pt[] =>
  cells.map(([dx, dy]) => [col + mirror * dx, row + dy])

function placeOne(
  placement: Placement<unknown>,
  piece: Piece<any>,
  col: number,
  row: number,
  mirror: 1 | -1,
  ball: BallState,
): Placed {
  const changes = [...(placement.changes ?? [])].sort((a, b) => a.at - b.at)
  return {
    piece,
    state: placement.state,
    col,
    row,
    mirror,
    cells: worldCells(placement.cells, col, row, mirror),
    lane: placement.lane,
    start: 0,
    span: placement.lane.segs.reduce((sum, s) => sum + s.dur, 0),
    ballIn: ball,
    changes,
  }
}

/** Plan one map. Returns its pieces in order, portal to portal, or fewer beats than asked if the box ran out. */
export function planChain(ctx: PlanCtx, spec: ChainSpec): Placed[] {
  const { rng, box, beats } = { ...ctx, ...spec }
  const occupied = new Set<string>()
  const inBox = (c: number, r: number) => c >= box.x0 && c <= box.x1 && r >= box.y0 && r <= box.y1
  const free = (c: number, r: number) => inBox(c, r) && !occupied.has(key(c, r))

  let col = box.x0 + rng.int(0, 2)
  let row = rng.int(box.y0 + 1, box.y1 + 1)
  let mirror: 1 | -1 = 1
  let ball = ctx.ball
  const out: Placed[] = []

  const commit = (piece: Piece<any>, placement: Placement<unknown>) => {
    const placed = placeOne(placement, piece, col, row, mirror, ball)
    for (const [c, r] of placed.cells) occupied.add(key(c, r))
    out.push(placed)
    const [ex, ey] = placement.exit.at
    col += mirror * ex
    row += ey
    mirror = (mirror * placement.exit.dir) as 1 | -1
    ball = ballAt(placed.ballIn, placed.changes, Infinity)
  }

  const portalPiece = ctx.catalog.find((c) => c.name === 'portal')!
  commit(portalPiece, portalPlacement('in', ctx.portalColor))

  const pool = ctx.catalog.filter((c) => c.weight > 0)
  let prev = ''
  let rails = 0
  let placed = 0
  let dynamics = 0
  // The tempo: a run of two or three beats back to back, then a flight if
  // one fits, then a breath of rail before the next run.
  let phase: 'run' | 'flight' | 'breathe' = 'run'
  let runLeft = rng.int(2, 4)
  let breathLeft = 0
  while (placed < beats) {
    const fits = (cells: Pt[], exit: Pt) => {
      const world = worldCells(cells, col, row, mirror)
      if (!world.every(([c, r]) => free(c, r))) return false
      const ec = col + mirror * exit[0]
      const er = row + exit[1]
      return free(ec, er)
    }
    const candidates = pool.filter((c) => {
      if (c.name === prev) return false
      // Rail is for breathing between beats, unless it is all there is: a
      // solo of rail, or of portal, is a rail between two portals.
      if (c.name === 'rail') return (phase === 'breathe' || pool.length === 1) && rails < 3
      if (DYNAMIC.has(c.name) && dynamics >= ctx.dynamics.cap) return false
      return phase !== 'breathe'
    })
    const tempo = (name: string) => {
      if (name === 'rail') return 1
      let w = DYNAMIC.has(name) ? ctx.dynamics.boost : 1
      if (phase === 'flight') w *= FLIGHT.has(name) ? 6 : 0.2
      return w
    }
    let chosen: { piece: Piece<any>; placement: Placement<unknown> } | null = null
    const tried = new Set<string>()
    while (tried.size < candidates.length) {
      const untried = candidates.filter((c) => !tried.has(c.name))
      const piece = rng.weighted(untried, (c) => c.weight * (ctx.taste.weights[c.name] ?? 1) * tempo(c.name))
      tried.add(piece.name)
      const placement = piece.place({
        rng: rng.fork(`${placed}:${piece.name}`),
        color: rng.pick(ctx.colors),
        theme: ctx.theme,
        taste: ctx.taste,
        ball,
        fits,
      })
      if (placement) {
        chosen = { piece, placement }
        break
      }
    }
    if (!chosen) {
      // Nothing fits in this phase; let the next phase try before giving up.
      if (phase === 'breathe') { phase = 'run'; runLeft = rng.int(2, 4); continue }
      if (phase === 'flight') { phase = 'breathe'; breathLeft = rng.int(1, 4); continue }
      break
    }
    commit(chosen.piece, chosen.placement)
    const name = chosen.piece.name
    rails = name === 'rail' ? rails + 1 : 0
    prev = name
    if (DYNAMIC.has(name)) dynamics++
    if (name !== 'rail') placed++
    // Advance the tempo.
    if (phase === 'run') {
      runLeft--
      if (runLeft <= 0) phase = 'flight'
    } else if (phase === 'flight') {
      phase = 'breathe'
      breathLeft = rng.int(1, 4)
    } else {
      breathLeft--
      if (breathLeft <= 0) { phase = 'run'; runLeft = rng.int(2, 4) }
    }
  }

  // A map should not end on plain rail; a portal after a beat reads as the
  // beat's consequence. Unless rail is all there is.
  while (out.length > 1 && pool.length > 1 && out[out.length - 1].piece.name === 'rail') {
    const last = out.pop()!
    for (const [c, r] of last.cells) occupied.delete(key(c, r))
    col = last.col
    row = last.row
    mirror = last.mirror
    ball = last.ballIn
  }
  commit(portalPiece, portalPlacement('out', ctx.portalColor))
  return out
}

/** Beats in a chain that are neither rail nor portal. */
export const beatCount = (pieces: Placed[]): number =>
  pieces.filter((p) => p.piece.name !== 'rail' && p.piece.name !== 'portal').length
