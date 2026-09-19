import type { Rng } from '../../../src/core/rng'
import type { Theme } from '../../../src/core/themes'
import { ballAt, pointsOf, type BallChange, type BallState, type Lane, type Piece, type Placement, type Pt, type Taste } from './parts'
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
 *
 * A world that keeps score pays out once, at the end: a `finale` piece is
 * never drawn from the pool, and is placed after the last beat, told what
 * the map earned, if it fits there. Points are earned along the way and
 * turned into tickets at the door, not sprinkled through the run.
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
  /** What the pass through it scores. */
  points: number
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
  /** The beats the last visit to this world was built from, so this one can reach for others. */
  lastVisit?: ReadonlySet<string>
}

/**
 * Which pieces change the ball, and which throw it, is each piece's to
 * declare (`dynamic`, `flight`): the planner reads the flags off whatever
 * pool it is handed, so a world's vocabulary is the only place its pieces
 * are listed.
 */
export const isDynamic = (piece: Piece<any>): boolean => !!piece.dynamic
export const isFlight = (piece: Piece<any>): boolean => !!piece.flight

/**
 * Freshness. A chain reaction is a run of different causes, so a map says a
 * thing once before it says it twice: every use of a piece in this map cuts
 * its weight, and a piece seen in the last few beats is all but out of the
 * draw, so when a small world does have to repeat itself the repeat lands
 * far enough on to read as a callback rather than a stutter. What the last
 * visit to this world was built from is a little stale too, so two visits
 * reach for different halves of a large pool. These are weights and never
 * bans: the taste still says what a visit leans on, and a piece that is the
 * only thing that fits is still placed.
 */
const USED = 0.3
const RECENT = 0.08
/** Beats before a piece may come round again at its used weight. */
const COOLDOWN = 5
const LAST_VISIT = 0.6

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
    points: pointsOf(piece, placement.state),
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

  const pool = ctx.catalog.filter((c) => c.weight > 0 && !c.finale)
  const finale = ctx.catalog.find((c) => c.finale)
  const fitsAt = (cells: Pt[], exit: Pt) => {
    const world = worldCells(cells, col, row, mirror)
    if (!world.every(([c, r]) => free(c, r))) return false
    return free(col + mirror * exit[0], row + exit[1])
  }
  const earned = () => out.reduce((sum, p) => sum + p.points, 0)
  /** How many times each piece is in this map so far, and the beat it was last placed on. */
  const uses = new Map<string, number>()
  const lastAt = new Map<string, number>()
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
    const fits = fitsAt
    const candidates = pool.filter((c) => {
      if (c.name === prev) return false
      // Rail is for breathing between beats, unless it is all there is: a
      // solo of rail, or of portal, is a rail between two portals.
      if (c.name === 'rail') return (phase === 'breathe' || pool.length === 1) && rails < 3
      if (isDynamic(c) && dynamics >= ctx.dynamics.cap) return false
      return phase !== 'breathe'
    })
    const tempo = (c: Piece<any>) => {
      if (c.name === 'rail') return 1
      let w = isDynamic(c) ? ctx.dynamics.boost : 1
      if (phase === 'flight') w *= isFlight(c) ? 6 : 0.2
      return w
    }
    const fresh = (c: Piece<any>) => {
      if (c.name === 'rail') return 1
      let w = USED ** (uses.get(c.name) ?? 0)
      const last = lastAt.get(c.name)
      if (last !== undefined && placed - last < COOLDOWN) w *= RECENT
      if (ctx.lastVisit?.has(c.name)) w *= LAST_VISIT
      return w
    }
    let chosen: { piece: Piece<any>; placement: Placement<unknown> } | null = null
    const tried = new Set<string>()
    while (tried.size < candidates.length) {
      const untried = candidates.filter((c) => !tried.has(c.name))
      const piece = rng.weighted(untried, (c) => c.weight * (ctx.taste.weights[c.name] ?? 1) * tempo(c) * fresh(c))
      tried.add(piece.name)
      // A piece is never handed the colour the ball arrives in. The pool
      // leaves out the colour the ball started with, but a piece upstream
      // may have made it another, and a ball must not vanish into what
      // holds it. One draw either way, so the map's shape is untouched.
      const palette = ctx.colors.filter((c) => c !== ball.color)
      const placement = piece.place({
        rng: rng.fork(`${placed}:${piece.name}`),
        color: rng.pick(palette.length ? palette : ctx.colors),
        theme: ctx.theme,
        taste: ctx.taste,
        ball,
        earned: earned(),
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
    if (isDynamic(chosen.piece)) dynamics++
    if (name !== 'rail') {
      uses.set(name, (uses.get(name) ?? 0) + 1)
      lastAt.set(name, placed)
      placed++
    }
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
  // The finale: the run's points paid out, last thing before the door. If
  // it does not fit where the walk ended — the bottom row, a corner — the
  // walk steps back a beat, and another, to where it does; a run that is
  // not paid out is worse than one a beat shorter. Failing that, the map
  // ends as it was.
  if (finale) {
    const palette = ctx.colors.filter((c) => c !== ball.color)
    const color = rng.fork('finale:color').pick(palette.length ? palette : ctx.colors)
    const resume = { col, row, mirror, ball }
    const undone: Placed[] = []
    let done = false
    for (let back = 0; back <= 3 && !done; back++) {
      const placement = finale.place({ rng: rng.fork(`finale:${finale.name}:${back}`), color, theme: ctx.theme, taste: ctx.taste, ball, earned: earned(), fits: fitsAt })
      if (placement) {
        commit(finale, placement)
        done = true
      } else if (out.length > 2) {
        const last = out.pop()!
        undone.push(last)
        for (const [c, r] of last.cells) occupied.delete(key(c, r))
        col = last.col
        row = last.row
        mirror = last.mirror
        ball = last.ballIn
      } else break
    }
    if (!done) {
      // Put back what was stepped over, in order.
      for (const again of undone.reverse()) {
        for (const [c, r] of again.cells) occupied.add(key(c, r))
        out.push(again)
      }
      ;({ col, row, mirror, ball } = resume)
    }
  }
  commit(portalPiece, portalPlacement('out', ctx.portalColor))
  return out
}

/** Beats in a chain that are neither rail nor portal. */
export const beatCount = (pieces: Placed[]): number =>
  pieces.filter((p) => p.piece.name !== 'rail' && p.piece.name !== 'portal').length
